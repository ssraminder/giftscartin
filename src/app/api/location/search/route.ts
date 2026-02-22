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

    // ── Text search: Google-first approach (FNP style) ──
    // Fire Google Places and DB search in parallel
    const [googleResults, dbResults] = await Promise.all([
      fetchGooglePlaces(q),
      searchByText(q),
    ])

    if (googleResults.length === 0 && dbResults.length === 0) {
      console.warn(`[location/search] No results for "${q}" — Google: 0, DB: 0`)
    }

    // Merge: Google results first (locality-level), then DB results (area/city)
    const combined: LocationResult[] = [...googleResults]

    for (const dbr of dbResults) {
      const dbrLabelLower = dbr.label.toLowerCase()
      const isDuplicate = combined.some((gr) => {
        const grLabelLower = gr.label.toLowerCase()
        return (
          grLabelLower === dbrLabelLower ||
          (dbr.pincode && gr.label.includes(dbr.pincode)) ||
          // Fuzzy: if Google label contains the DB area name or vice versa
          (dbr.areaName && grLabelLower.includes(dbr.areaName.toLowerCase())) ||
          (gr.areaName && dbrLabelLower.includes(gr.areaName.toLowerCase()))
        )
      })
      if (!isDuplicate) {
        combined.push(dbr)
      }
    }

    return NextResponse.json(
      { success: true, data: { results: combined.slice(0, 10) } },
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
 *
 * Strategy:
 * 1. Search for the full query in service_areas.name and altNames
 * 2. For multi-word queries, also search for EACH word individually
 *    (e.g. "Khalsa Mohalla" → search for "Khalsa" AND "Mohalla" separately)
 * 3. Rank: exact full-query matches first, then per-word area matches, then cities
 */
async function searchByText(q: string): Promise<LocationResult[]> {
  const results: LocationResult[] = []
  const qLower = q.toLowerCase()

  // Split query into meaningful words (ignore very short words like "of", "in")
  const words = q.split(/\s+/).filter(w => w.length >= 2)
  const hasMultipleWords = words.length > 1

  // Build per-word service_area queries for multi-word searches
  const wordAreaQueries = hasMultipleWords
    ? words.map(word =>
        prisma.serviceArea.findMany({
          where: {
            name: { contains: word, mode: 'insensitive' },
            isActive: true,
          },
          include: { city: true },
          take: 4,
          orderBy: { name: 'asc' },
        })
      )
    : []

  const [areas, altNameAreas, cities, ...wordAreaResults] = await Promise.all([
    // Full-query match on name
    prisma.serviceArea.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isActive: true,
      },
      include: { city: true },
      take: 4,
      orderBy: { name: 'asc' },
    }),
    // Full-query match on altNames
    prisma.serviceArea.findMany({
      where: {
        OR: [
          { altNames: { has: qLower } },
          // Also check per-word altNames for multi-word queries
          ...(hasMultipleWords
            ? words.map(w => ({ altNames: { has: w.toLowerCase() } }))
            : []),
        ],
        isActive: true,
      },
      include: { city: true },
      take: 3,
    }),
    // City name + aliases
    prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { aliases: { has: qLower } },
          // Also match per-word for multi-word queries (e.g. "Khalsa Mohalla Patiala")
          ...(hasMultipleWords
            ? words.map(w => ({ name: { contains: w, mode: 'insensitive' as const } }))
            : []),
        ],
      },
      take: 3,
      orderBy: { name: 'asc' },
    }),
    ...wordAreaQueries,
  ])

  // De-duplicate areas: full-query matches first, then per-word matches
  const seenAreaIds = new Set<string>()

  // Priority 1: full-query exact matches (name contains full query)
  const fullMatchAreas = [...areas, ...altNameAreas].filter(a => {
    if (seenAreaIds.has(a.id)) return false
    seenAreaIds.add(a.id)
    return true
  })

  // Priority 2: per-word matches (e.g. areas matching "Khalsa" or "Mohalla")
  // Score by how many words match the area name
  const wordMatchAreas: Array<{ area: typeof areas[0]; score: number }> = []
  if (hasMultipleWords) {
    const allWordAreas = wordAreaResults.flat()
    for (const a of allWordAreas) {
      if (seenAreaIds.has(a.id)) continue
      seenAreaIds.add(a.id)
      const nameLower = a.name.toLowerCase()
      const score = words.filter(w => nameLower.includes(w.toLowerCase())).length
      wordMatchAreas.push({ area: a, score })
    }
    // Sort by score descending (areas matching more words rank higher)
    wordMatchAreas.sort((a, b) => b.score - a.score)
  }

  // Build area results
  const allSortedAreas = [
    ...fullMatchAreas,
    ...wordMatchAreas.map(w => w.area),
  ].slice(0, 5)

  for (const a of allSortedAreas) {
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

  // De-duplicate cities: skip if already covered by area results for that city
  // For multi-word queries, only show city if the city name matches a word
  // (avoid showing "Chandigarh" for "Khalsa Mohalla" just because DB returned it)
  const seenCityIds = new Set(results.map(r => r.cityId))
  for (const c of cities) {
    if (seenCityIds.has(c.id)) continue
    seenCityIds.add(c.id)

    // For multi-word queries, only show a city if its name actually matches
    // the full query or at least one word is a meaningful substring of the city name
    if (hasMultipleWords) {
      const cityNameLower = c.name.toLowerCase()
      const fullMatch = cityNameLower.includes(qLower)
      const wordMatch = words.some(w => cityNameLower.includes(w.toLowerCase()))
      if (!fullMatch && !wordMatch) continue
    }

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

  return results
}

/**
 * Google Places Autocomplete API (New) — primary search for text queries.
 */
async function fetchGooglePlaces(query: string): Promise<LocationResult[]> {
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('[location/search] Google Places API key not configured — locality search disabled')
    return []
  }

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
