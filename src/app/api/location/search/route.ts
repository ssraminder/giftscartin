import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface UnifiedResult {
  name: string
  pincode: string | null
  cityName: string | null
  cityId: string | null
  citySlug: string | null
  lat: number | null
  lng: number | null
  state: string | null
  isActive: boolean
  isComingSoon: boolean
  source: 'db' | 'google'
  type: 'area' | 'city' | 'place'
}

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim()

    if (!q || q.length < 2) {
      return NextResponse.json(
        { success: true, data: { results: [], areas: [], cities: [] } },
        { headers: CACHE_HEADERS }
      )
    }

    const isDigits = /^\d+$/.test(q)
    const dbResults: UnifiedResult[] = []

    if (isDigits) {
      // Pincode search — query service_areas by pincode prefix
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
          name: a.name,
          pincode: a.pincode,
          cityName: a.city.name,
          cityId: a.city.id,
          citySlug: a.city.slug,
          lat: a.lat ? Number(a.lat) : null,
          lng: a.lng ? Number(a.lng) : null,
          state: a.state,
          isActive: a.city.isActive,
          isComingSoon: a.city.isComingSoon,
          source: 'db',
          type: 'area',
        })
      }
    } else {
      // Text search — search service_areas by name AND cities by name
      const [areas, cities] = await Promise.all([
        prisma.serviceArea.findMany({
          where: {
            name: { contains: q, mode: 'insensitive' },
            isActive: true,
          },
          include: { city: true },
          take: 5,
          orderBy: { name: 'asc' },
        }),
        prisma.city.findMany({
          where: { name: { contains: q, mode: 'insensitive' } },
          take: 3,
          orderBy: { name: 'asc' },
        }),
      ])

      for (const a of areas) {
        dbResults.push({
          name: a.name,
          pincode: a.pincode,
          cityName: a.city.name,
          cityId: a.city.id,
          citySlug: a.city.slug,
          lat: a.lat ? Number(a.lat) : null,
          lng: a.lng ? Number(a.lng) : null,
          state: a.state,
          isActive: a.city.isActive,
          isComingSoon: a.city.isComingSoon,
          source: 'db',
          type: 'area',
        })
      }

      for (const c of cities) {
        // Avoid duplicates — if city already in results from area match, skip
        const alreadyHasCity = dbResults.some(
          (r) => r.type === 'city' && r.cityId === c.id
        )
        if (!alreadyHasCity) {
          dbResults.push({
            name: c.name,
            pincode: null,
            cityName: c.name,
            cityId: c.id,
            citySlug: c.slug,
            lat: Number(c.lat),
            lng: Number(c.lng),
            state: c.state,
            isActive: c.isActive,
            isComingSoon: c.isComingSoon,
            source: 'db',
            type: 'city',
          })
        }
      }
    }

    // If fewer than 3 DB results, supplement with Google Places Autocomplete
    let googleResults: UnifiedResult[] = []
    if (dbResults.length < 3) {
      googleResults = await fetchGooglePlaces(q)
      // Remove Google results that duplicate DB results (by name similarity)
      googleResults = googleResults.filter((gr) => {
        const grNameLower = gr.name.toLowerCase()
        return !dbResults.some(
          (dr) =>
            dr.name.toLowerCase() === grNameLower ||
            (gr.pincode && dr.pincode === gr.pincode)
        )
      })
    }

    // Merge: DB first, then Google, limit 8
    const combined = [...dbResults, ...googleResults].slice(0, 8)

    // Also build legacy grouped format for backward compatibility
    const areas = combined
      .filter((r) => r.type === 'area' || r.type === 'place')
      .map((r) => ({
        id: r.type === 'area' ? r.name : `google-${r.name}`,
        name: r.name,
        pincode: r.pincode,
        cityId: r.cityId,
        cityName: r.cityName,
        citySlug: r.citySlug,
        state: r.state,
        lat: r.lat,
        lng: r.lng,
        isActive: r.isActive,
        isComingSoon: r.isComingSoon,
        source: r.source,
      }))

    const cityResults = combined
      .filter((r) => r.type === 'city')
      .map((r) => ({
        cityId: r.cityId,
        cityName: r.cityName,
        citySlug: r.citySlug,
        state: r.state,
        lat: r.lat,
        lng: r.lng,
        isActive: r.isActive,
        isComingSoon: r.isComingSoon,
        source: r.source,
      }))

    return NextResponse.json(
      {
        success: true,
        data: {
          results: combined,
          areas,
          cities: cityResults,
        },
      },
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
 * Uses the server-side key: GOOGLE_PLACES_API_KEY or falls back to NEXT_PUBLIC_GOOGLE_PLACES_API_KEY.
 */
async function fetchGooglePlaces(query: string): Promise<UnifiedResult[]> {
  // NOTE: Requires GOOGLE_PLACES_API_KEY (server-side) or NEXT_PUBLIC_GOOGLE_PLACES_API_KEY to be set
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
        signal: AbortSignal.timeout(3000), // 3s timeout to avoid slowing search
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

    // Fetch place details for each to get lat/lng and pincode
    const results: UnifiedResult[] = []
    // Only fetch details for up to 3 suggestions to limit API calls
    const topSuggestions = suggestions.slice(0, 3)

    for (const suggestion of topSuggestions) {
      if (!suggestion.placePrediction?.placeId) continue

      const detail = await fetchPlaceDetails(
        suggestion.placePrediction.placeId,
        apiKey
      )

      const mainText =
        suggestion.placePrediction.structuredFormat?.mainText?.text ||
        suggestion.placePrediction.text?.text ||
        ''

      results.push({
        name: mainText,
        pincode: detail?.pincode || null,
        cityName: detail?.city || null,
        cityId: null,
        citySlug: null,
        lat: detail?.lat || null,
        lng: detail?.lng || null,
        state: detail?.state || null,
        isActive: false,
        isComingSoon: false,
        source: 'google',
        type: 'place',
      })
    }

    return results
  } catch (err) {
    console.error('[location/search] Google Places fetch failed:', err)
    return []
  }
}

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<{
  lat: number
  lng: number
  pincode: string | null
  city: string | null
  state: string | null
} | null> {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'location,addressComponents',
        },
        signal: AbortSignal.timeout(3000),
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    const location = data.location as
      | { latitude: number; longitude: number }
      | undefined
    const components = (data.addressComponents || []) as Array<{
      types: string[]
      longText?: string
    }>

    let pincode: string | null = null
    let city: string | null = null
    let state: string | null = null

    for (const comp of components) {
      const types = comp.types || []
      if (types.includes('postal_code')) {
        pincode = comp.longText || null
      }
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        if (!city) city = comp.longText || null
      }
      if (types.includes('administrative_area_level_1')) {
        state = comp.longText || null
      }
    }

    return {
      lat: location?.latitude || 0,
      lng: location?.longitude || 0,
      pincode,
      city,
      state,
    }
  } catch {
    return null
  }
}
