interface NominatimReverseResult {
  address: string
  pincode: string
  city: string
  state: string
}

interface NominatimLookupResult {
  pincode: string
  city: string
  state: string
  areaName: string
  lat: number
  lng: number
  valid: boolean
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<NominatimReverseResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GiftsCart/1.0 (noreply@cethos.com)'
        }
      }
    )
    if (!response.ok) return null
    const data = await response.json()

    const a = data.address || {}

    return {
      address: data.display_name || '',
      pincode: a.postcode || '',
      city: a.city || a.town || a.village || a.county || '',
      state: a.state || '',
    }
  } catch {
    return null
  }
}

// Rate limit: 1 req/sec per Nominatim usage policy.
// Only called as fallback when pincode not in service_areas.
export async function lookupPincode(
  pincode: string
): Promise<NominatimLookupResult | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?postalcode=${pincode}&country=IN&format=json&addressdetails=1&limit=1`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'GiftsCart/1.0 (noreply@cethos.com)' },
      next: { revalidate: 86400 }, // cache 24hrs in Next.js
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data.length) return null

    const result = data[0]
    const addr = result.address

    return {
      pincode,
      city: addr.city || addr.town || addr.county || '',
      state: addr.state || '',
      areaName: addr.suburb || addr.neighbourhood || addr.city || '',
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      valid: true,
    }
  } catch {
    return null
  }
}

export function parseGoogleAddressComponents(
  components: Array<{
    types?: string[]
    longText?: string      // New API uses longText
    long_name?: string     // Legacy API uses long_name
  }>
): { pincode: string; city: string; state: string } {
  let pincode = ''
  let city = ''
  let state = ''

  for (const component of components) {
    const types = component.types || []
    // Support both new API (longText) and legacy (long_name)
    const value = component.longText || component.long_name || ''

    if (types.includes('postal_code')) {
      pincode = value
    }
    if (
      types.includes('locality') ||
      types.includes('administrative_area_level_2')
    ) {
      if (!city) city = value
    }
    if (types.includes('administrative_area_level_1')) {
      state = value
    }
  }

  return { pincode, city, state }
}
