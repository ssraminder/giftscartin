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

    // Build Mappls Autosuggest URL
    const params = new URLSearchParams({
      query: q.trim(),
      bridge: 'true',
      explain: 'true',
    })

    if (lat && lng) {
      params.set('location', `${lat},${lng}`)
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
