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
      // Pincode search
      if (isExactPincode) {
        // Exact 6-digit pincode match first
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
      } else {
        // Partial pincode prefix match
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
      }
    } else {
      // Text search: areas by name (case-insensitive), then cities by name
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
        // Skip if city already covered by an area result
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
