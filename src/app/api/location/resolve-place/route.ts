import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const placeId = request.nextUrl.searchParams.get('placeId')

    if (!placeId) {
      return NextResponse.json(
        { success: false, error: 'placeId parameter is required' },
        { status: 400 }
      )
    }

    const apiKey =
      process.env.GOOGLE_PLACES_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Places API key not configured' },
        { status: 500 }
      )
    }

    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'location,formattedAddress,addressComponents',
        },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) {
      console.error('[resolve-place] Google Places Details error:', res.status)
      return NextResponse.json(
        { success: false, error: 'Failed to resolve place' },
        { status: 502 }
      )
    }

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
      if (
        types.includes('locality') ||
        types.includes('administrative_area_level_2')
      ) {
        if (!city) city = comp.longText || null
      }
      if (types.includes('administrative_area_level_1')) {
        state = comp.longText || null
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        lat: location?.latitude ?? null,
        lng: location?.longitude ?? null,
        formattedAddress: data.formattedAddress || null,
        pincode,
        city,
        state,
      },
    })
  } catch (error) {
    console.error('[resolve-place] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve place' },
      { status: 500 }
    )
  }
}
