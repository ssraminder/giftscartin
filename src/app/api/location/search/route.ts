import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { LocationResult } from '@/types'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

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
    const dbResults: LocationResult[] = []

    if (isDigits) {
      // ── Pincode search: multi-layer resolution ──
      if (isExactPincode) {
        // Layer 1: service_areas (granular area-level with lat/lng)
        const exactAreas = await prisma.serviceArea.findMany({
          where: { pincode: q, isActive: true },
          include: { city: true },
          take: 8,
          orderBy: { name: 'asc' },
        })

        for (const a of exactAreas) {
          dbResults.push({
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

        // Layer 2: city_zones (zone-level pincodes[] arrays)
        if (dbResults.length === 0) {
          const zones = await prisma.cityZone.findMany({
            where: { pincodes: { has: q }, isActive: true },
            include: { city: true },
            take: 5,
          })

          const seenCityIds = new Set<string>()
          for (const z of zones) {
            if (seenCityIds.has(z.city.id)) continue
            seenCityIds.add(z.city.id)
            dbResults.push({
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

        // Layer 3: pincode_city_map (standalone pincode→city mapping)
        if (dbResults.length === 0) {
          const pinMap = await prisma.pincodeCityMap.findUnique({
            where: { pincode: q },
            include: { city: true },
          })

          if (pinMap) {
            dbResults.push({
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

        // Layer 4: cities.pincodePrefixes (prefix-based city matching)
        if (dbResults.length === 0) {
          const prefix = q.slice(0, 3) // e.g. "147" from "147001"
          const matchingCities = await prisma.city.findMany({
            where: { pincodePrefixes: { has: prefix } },
            take: 3,
          })

          for (const c of matchingCities) {
            dbResults.push({
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
        // Partial pincode (2-5 digits): service_areas prefix match
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
          dbResults.push({
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

        // Fallback: cities by pincode prefix
        if (dbResults.length === 0) {
          const matchingCities = await prisma.city.findMany({
            where: { pincodePrefixes: { has: q } },
            take: 5,
          })

          for (const c of matchingCities) {
            dbResults.push({
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
    } else {
      // ── Text search: areas by name/altNames, then cities by name/aliases ──
      const qLower = q.toLowerCase()
      const [areas, altNameAreas, cities] = await Promise.all([
        prisma.serviceArea.findMany({
          where: {
            name: { contains: q, mode: 'insensitive' },
            isActive: true,
          },
          include: { city: true },
          take: 5,
          orderBy: { name: 'asc' },
        }),
        // altNames is a String[] — check if any element matches
        prisma.serviceArea.findMany({
          where: {
            altNames: { has: qLower },
            isActive: true,
          },
          include: { city: true },
          take: 3,
        }),
        prisma.city.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { aliases: { has: qLower } },
            ],
          },
          take: 3,
          orderBy: { name: 'asc' },
        }),
      ])

      // Merge area results, dedup by id
      const seenAreaIds = new Set<string>()
      const allAreas = [...areas, ...altNameAreas].filter(a => {
        if (seenAreaIds.has(a.id)) return false
        seenAreaIds.add(a.id)
        return true
      })

      for (const a of allAreas) {
        dbResults.push({
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
        const alreadyHasCity = dbResults.some(
          (r) => r.type === 'city' && r.cityId === c.id
        )
        if (!alreadyHasCity) {
          dbResults.push({
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

    // If fewer than 3 DB results, supplement with Google Places
    let googleResults: LocationResult[] = []
    if (dbResults.length < 3) {
      googleResults = await fetchGooglePlaces(q)
      // Remove duplicates against DB results
      googleResults = googleResults.filter((gr) => {
        const grLabelLower = gr.label.toLowerCase()
        return !dbResults.some(
          (dr) =>
            dr.label.toLowerCase() === grLabelLower ||
            (gr.pincode && dr.pincode === gr.pincode)
        )
      })
    }

    // Merge: areas first, then cities, then google_place results — max 8
    const areaResults = dbResults.filter((r) => r.type === 'area')
    const cityResults = dbResults.filter((r) => r.type === 'city')
    const combined = [...areaResults, ...cityResults, ...googleResults].slice(0, 8)

    return NextResponse.json(
      { success: true, data: { results: combined } },
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
 * Call Google Places Autocomplete API (New) to fill gaps when DB has < 3 results.
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
    const topSuggestions = suggestions.slice(0, 3)

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
