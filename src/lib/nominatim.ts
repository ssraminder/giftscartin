interface NominatimResult {
  address: string
  pincode: string
  city: string
  state: string
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<NominatimResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          // Required by Nominatim usage policy
          'User-Agent': 'GiftsCart/1.0 (giftscart.in)'
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

export function parseGoogleAddressComponents(
  components: google.maps.GeocoderAddressComponent[]
): { pincode: string; city: string; state: string } {
  let pincode = ''
  let city = ''
  let state = ''

  for (const component of components) {
    if (component.types.includes('postal_code')) {
      pincode = component.long_name
    }
    if (
      component.types.includes('locality') ||
      component.types.includes('administrative_area_level_2')
    ) {
      city = component.long_name
    }
    if (component.types.includes('administrative_area_level_1')) {
      state = component.long_name
    }
  }

  return { pincode, city, state }
}
