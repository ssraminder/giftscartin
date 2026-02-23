import { NextRequest, NextResponse } from 'next/server'
import { getMapplsToken } from '@/lib/mappls'

interface MapplsSuggestion {
  eLoc: string
  placeName: string
  placeAddress: string
  type: string
  latitude?: string
  longitude?: string
  distance?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (!q || q.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 3 characters' },
        { status: 400 }
      )
    }

    const clientId = process.env.MAPPLS_CLIENT_ID
    const clientSecret = process.env.MAPPLS_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Mappls credentials not configured' },
        { status: 503 }
      )
    }

    // Get token (uses in-memory cache)
    let token: { access_token: string }
    try {
      token = await getMapplsToken()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to authenticate with Mappls' },
        { status: 503 }
      )
    }

    // Optional radius for bounding box (default 40km, max 100km)
    const radiusParam = searchParams.get('radius')
    const radiusKm = radiusParam
      ? Math.min(Math.max(parseFloat(radiusParam) || 40, 1), 100)
      : 40

    // Build Mappls Autosuggest URL
    const params = new URLSearchParams({
      query: q.trim(),
      bridge: 'true',
      explain: 'true',
    })

    if (lat && lng) {
      const latNum = parseFloat(lat)
      const lngNum = parseFloat(lng)

      params.set('location', `${lat},${lng}`)

      // Add bounds filter to hard-restrict results to a geographic box
      // This prevents generic queries like "sector" from returning Delhi results
      // when biased to Chandigarh
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        const latOffset = radiusKm / 111
        const lngOffset = radiusKm / (111 * Math.cos((latNum * Math.PI) / 180))

        const swLat = (latNum - latOffset).toFixed(4)
        const swLng = (lngNum - lngOffset).toFixed(4)
        const neLat = (latNum + latOffset).toFixed(4)
        const neLng = (lngNum + lngOffset).toFixed(4)

        params.set('filter', `bounds:${swLng},${swLat};${neLng},${neLat}`)
      }
    }

    const mapplsRes = await fetch(
      `https://atlas.mapmyindia.com/api/places/search/json?${params.toString()}`,
      {
        headers: {
          Authorization: `bearer ${token.access_token}`,
        },
      }
    )

    if (!mapplsRes.ok) {
      const text = await mapplsRes.text()
      console.error('[mappls/search] API error:', mapplsRes.status, text)
      return NextResponse.json(
        { success: false, error: 'Search request failed' },
        { status: 502 }
      )
    }

    const data = await mapplsRes.json()
    const suggestions: MapplsSuggestion[] = data.suggestedLocations ?? []

    // Extract 6-digit pincode from placeAddress
    const extractPincode = (address: string): string | undefined => {
      const match = address.match(/\b\d{6}\b/)
      return match ? match[0] : undefined
    }

    const results = suggestions.map((s) => ({
      placeId: s.eLoc ?? '',
      name: s.placeName ?? '',
      address: s.placeAddress ?? '',
      type: s.type ?? '',
      pincode: s.placeAddress ? extractPincode(s.placeAddress) : undefined,
      lat: s.latitude ? parseFloat(s.latitude) : undefined,
      lng: s.longitude ? parseFloat(s.longitude) : undefined,
      distance: s.distance ? parseFloat(s.distance) : undefined,
    }))

    return NextResponse.json(
      { success: true, data: { results } },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('[mappls/search] error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
