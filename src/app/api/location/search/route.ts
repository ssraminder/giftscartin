import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { LocationResult } from '@/types'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

/**
 * Google-first location search (FNP approach).
 *
 * Strategy:
 * 1. For text queries → Google Places Autocomplete is PRIMARY, DB results supplement
 * 2. For pincode queries → DB is primary (Google can't resolve Indian pincodes well)
 * 3. Results merged: Google results shown first for text, DB areas enrich with serviceability
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim()

    if (!q || q.length < 2) {
      return NextResponse.json(
        { success: true, data: { results: [] } },
        { headers: CACHE_HEADERS }
      )
    }

    const isDigits = /^\d+$/.test(q)
    const isExactPincode = /^\d{6}$/.test(q)

    if (isDigits) {
      // ── Pincode search: DB is best for Indian pincodes ──
      const dbResults = await searchByPincode(q, isExactPincode)
      return NextResponse.json(
        { success: true, data: { results: dbResults.slice(0, 8) } },
        { headers: CACHE_HEADERS }
      )
    }

    // ── Text search: Google-first approach ──
    // Fire Google Places and DB search in parallel
    const [googleResults, dbResults] = await Promise.all([
      fetchGooglePlaces(q),
      searchByText(q),
    ])

    // Merge: Google results first, then DB results that aren't duplicates
    const combined: LocationResult[] = [...googleResults]

    for (const dbr of dbResults) {
      const isDuplicate = combined.some(
        (gr) =>
          gr.label.toLowerCase() === dbr.label.toLowerCase() ||
          (dbr.pincode && gr.label.includes(dbr.pincode))
      )
      if (!isDuplicate) {
        combined.push(dbr)
      }
    }

    return NextResponse.json(
      { success: true, data: { results: combined.slice(0, 8) } },
      { headers: CACHE_HEADERS }
    )
  } catch (err) {
    console.error('[location/search] error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}

/**
 * Search by pincode — DB is authoritative for Indian pincodes.
 * Multi-layer resolution: service_areas → city_zones → pincode_city_map → prefix match.
 */
async function searchByPincode(q: string, isExact: boolean): Promise<LocationResult[]> {
  const results: LocationResult[] = []

  if (isExact) {
    // Layer 1: service_areas (granular area-level with lat/lng)
    const exactAreas = await prisma.serviceArea.findMany({
      where: { pincode: q, isActive: true },
      include: { city: true },
      take: 8,
      orderBy: { name: 'asc' },
    })

    for (const a of exactAreas) {
      results.push({
        type: 'area',
        label: `${a.name}, ${a.city.name} \u2014 ${a.pincode}`,
        cityId: a.city.id,
        cityName: a.city.name,
        citySlug: a.city.slug,
        pincode: a.pincode,
        areaName: a.name,
        lat: a.lat ? Number(a.lat) : null,
        lng: a.lng ? Number(a.lng) : null,
        placeId: null,
        isActive: a.city.isActive,
        isComingSoon: a.city.isComingSoon,
      })
    }

    // Layer 2: city_zones
    if (results.length === 0) {
      const zones = await prisma.cityZone.findMany({
        where: { pincodes: { has: q }, isActive: true },
        include: { city: true },
        take: 5,
      })

      const seenCityIds = new Set<string>()
      for (const z of zones) {
        if (seenCityIds.has(z.city.id)) continue
        seenCityIds.add(z.city.id)
        results.push({
          type: 'city',
          label: z.city.state
            ? `${z.city.name}, ${z.city.state} \u2014 ${q}`
            : `${z.city.name} \u2014 ${q}`,
          cityId: z.city.id,
          cityName: z.city.name,
          citySlug: z.city.slug,
          pincode: q,
          areaName: z.name,
          lat: Number(z.city.lat),
          lng: Number(z.city.lng),
          placeId: null,
          isActive: z.city.isActive,
          isComingSoon: z.city.isComingSoon,
        })
      }
    }

    // Layer 3: pincode_city_map
    if (results.length === 0) {
      const pinMap = await prisma.pincodeCityMap.findUnique({
        where: { pincode: q },
        include: { city: true },
      })

      if (pinMap) {
        results.push({
          type: 'city',
          label: pinMap.city.state
            ? `${pinMap.city.name}, ${pinMap.city.state} \u2014 ${q}`
            : `${pinMap.city.name} \u2014 ${q}`,
          cityId: pinMap.city.id,
          cityName: pinMap.city.name,
          citySlug: pinMap.city.slug,
          pincode: q,
          areaName: pinMap.areaName,
          lat: Number(pinMap.city.lat),
          lng: Number(pinMap.city.lng),
          placeId: null,
          isActive: pinMap.city.isActive,
          isComingSoon: pinMap.city.isComingSoon,
        })
      }
    }

    // Layer 4: cities.pincodePrefixes
    if (results.length === 0) {
      const prefix = q.slice(0, 3)
      const matchingCities = await prisma.city.findMany({
        where: { pincodePrefixes: { has: prefix } },
        take: 3,
      })

      for (const c of matchingCities) {
        results.push({
          type: 'city',
          label: c.state
            ? `${c.name}, ${c.state} \u2014 ${q}`
            : `${c.name} \u2014 ${q}`,
          cityId: c.id,
          cityName: c.name,
          citySlug: c.slug,
          pincode: q,
          areaName: null,
          lat: Number(c.lat),
          lng: Number(c.lng),
          placeId: null,
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
        })
      }
    }
  } else {
    // Partial pincode (2-5 digits)
    const areas = await prisma.serviceArea.findMany({
      where: {
        pincode: { startsWith: q },
        isActive: true,
      },
      include: { city: true },
      take: 8,
      orderBy: { pincode: 'asc' },
    })

    for (const a of areas) {
      results.push({
        type: 'area',
        label: `${a.name}, ${a.city.name} \u2014 ${a.pincode}`,
        cityId: a.city.id,
        cityName: a.city.name,
        citySlug: a.city.slug,
        pincode: a.pincode,
        areaName: a.name,
        lat: a.lat ? Number(a.lat) : null,
        lng: a.lng ? Number(a.lng) : null,
        placeId: null,
        isActive: a.city.isActive,
        isComingSoon: a.city.isComingSoon,
      })
    }

    if (results.length === 0) {
      const matchingCities = await prisma.city.findMany({
        where: { pincodePrefixes: { has: q } },
        take: 5,
      })

      for (const c of matchingCities) {
        results.push({
          type: 'city',
          label: c.state ? `${c.name}, ${c.state}` : c.name,
          cityId: c.id,
          cityName: c.name,
          citySlug: c.slug,
          pincode: null,
          areaName: null,
          lat: Number(c.lat),
          lng: Number(c.lng),
          placeId: null,
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
        })
      }
    }
  }

  return results
}

/**
 * Search DB by text — used as supplement to Google results.
 */
async function searchByText(q: string): Promise<LocationResult[]> {
  const results: LocationResult[] = []
  const qLower = q.toLowerCase()

  const [areas, altNameAreas, cities] = await Promise.all([
    prisma.serviceArea.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isActive: true,
      },
      include: { city: true },
      take: 3,
      orderBy: { name: 'asc' },
    }),
    prisma.serviceArea.findMany({
      where: {
        altNames: { has: qLower },
        isActive: true,
      },
      include: { city: true },
      take: 2,
    }),
    prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { aliases: { has: qLower } },
        ],
      },
      take: 2,
      orderBy: { name: 'asc' },
    }),
  ])

  const seenAreaIds = new Set<string>()
  const allAreas = [...areas, ...altNameAreas].filter(a => {
    if (seenAreaIds.has(a.id)) return false
    seenAreaIds.add(a.id)
    return true
  })

  for (const a of allAreas) {
    results.push({
      type: 'area',
      label: a.pincode
        ? `${a.name}, ${a.city.name} \u2014 ${a.pincode}`
        : `${a.name}, ${a.city.name}`,
      cityId: a.city.id,
      cityName: a.city.name,
      citySlug: a.city.slug,
      pincode: a.pincode,
      areaName: a.name,
      lat: a.lat ? Number(a.lat) : null,
      lng: a.lng ? Number(a.lng) : null,
      placeId: null,
      isActive: a.city.isActive,
      isComingSoon: a.city.isComingSoon,
    })
  }

  for (const c of cities) {
    const alreadyHasCity = results.some(
      (r) => r.type === 'city' && r.cityId === c.id
    )
    if (!alreadyHasCity) {
      results.push({
        type: 'city',
        label: c.state ? `${c.name}, ${c.state}` : c.name,
        cityId: c.id,
        cityName: c.name,
        citySlug: c.slug,
        pincode: null,
        areaName: null,
        lat: Number(c.lat),
        lng: Number(c.lng),
        placeId: null,
        isActive: c.isActive,
        isComingSoon: c.isComingSoon,
      })
    }
  }

  return results
}

/**
 * Google Places Autocomplete API (New) — primary search for text queries.
 */
async function fetchGooglePlaces(query: string): Promise<LocationResult[]> {
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: query,
          includedRegionCodes: ['in'],
          languageCode: 'en',
        }),
        signal: AbortSignal.timeout(3000),
      }
    )

    if (!res.ok) {
      console.error('[location/search] Google Places error:', res.status)
      return []
    }

    const data = await res.json()
    const suggestions: Array<{
      placePrediction?: {
        placeId: string
        text?: { text: string }
        structuredFormat?: {
          mainText?: { text: string }
          secondaryText?: { text: string }
        }
      }
    }> = data.suggestions || []

    const results: LocationResult[] = []
    const topSuggestions = suggestions.slice(0, 5)

    for (const suggestion of topSuggestions) {
      if (!suggestion.placePrediction?.placeId) continue

      const mainText =
        suggestion.placePrediction.structuredFormat?.mainText?.text ||
        suggestion.placePrediction.text?.text ||
        ''
      const secondaryText =
        suggestion.placePrediction.structuredFormat?.secondaryText?.text || ''

      const label = secondaryText ? `${mainText}, ${secondaryText}` : mainText

      results.push({
        type: 'google_place',
        label,
        cityId: null,
        cityName: null,
        citySlug: null,
        pincode: null,
        areaName: mainText,
        lat: null,
        lng: null,
        placeId: suggestion.placePrediction.placeId,
        isActive: false,
        isComingSoon: false,
      })
    }

    return results
  } catch (err) {
    console.error('[location/search] Google Places fetch failed:', err)
    return []
  }
}
