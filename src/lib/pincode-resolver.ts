import { getSupabaseAdmin } from '@/lib/supabase'

export interface PincodeResolution {
  name: string
  lat: number
  lng: number
  cityName: string
  state: string
  cityId?: string
}

/**
 * Resolve a 6-digit Indian pincode to area name, coordinates, city, and state.
 * Uses a 3-layer fallback:
 *   1. service_areas table (already known pincodes)
 *   2. pincode_city_map table
 *   3. Nominatim (OpenStreetMap) geocoding API
 */
export async function resolvePincode(pincode: string): Promise<PincodeResolution | null> {
  const supabase = getSupabaseAdmin()

  // Layer 1: service_areas
  const { data: area } = await supabase
    .from('service_areas')
    .select('name, lat, lng, city_name, state, city_id')
    .eq('pincode', pincode)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (area) {
    return {
      name: area.name,
      lat: Number(area.lat),
      lng: Number(area.lng),
      cityName: area.city_name,
      state: area.state,
      cityId: area.city_id,
    }
  }

  // Layer 2: pincode_city_map
  const { data: pin } = await supabase
    .from('pincode_city_map')
    .select('area_name, lat, lng, cities(id, name, state)')
    .eq('pincode', pincode)
    .maybeSingle()

  if (pin) {
    const citiesRaw = pin.cities as unknown
    const city = Array.isArray(citiesRaw) ? citiesRaw[0] as { id: string; name: string; state: string } | undefined : citiesRaw as { id: string; name: string; state: string } | null
    return {
      name: pin.area_name || pincode,
      lat: Number(pin.lat || 0),
      lng: Number(pin.lng || 0),
      cityName: city?.name || '',
      state: city?.state || '',
      cityId: city?.id,
    }
  }

  // Layer 3: Nominatim geocoding
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1&addressdetails=1`,
      {
        headers: { 'User-Agent': 'GiftsCart/1.0 (giftscart.in)' },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (res.ok) {
      const results = await res.json()
      if (results.length > 0) {
        const r = results[0]
        const addr = r.address || {}
        return {
          name: addr.suburb || addr.city_district || addr.town || addr.village || pincode,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          cityName: addr.city || addr.town || addr.state_district || '',
          state: addr.state || '',
        }
      }
    }
  } catch {
    // Nominatim failed — return null, caller handles gracefully
  }

  return null
}

/**
 * Ensure service_areas rows exist for the given pincodes.
 * For any pincode not already in service_areas, resolve via Nominatim and insert.
 * Requires a cityId to associate with (from the vendor's city).
 */
export async function ensureServiceAreas(
  pincodes: string[],
  vendorCityId: string
): Promise<{ created: number; failed: string[] }> {
  if (pincodes.length === 0) return { created: 0, failed: [] }

  const supabase = getSupabaseAdmin()

  // Find which pincodes already have service_areas
  const { data: existing } = await supabase
    .from('service_areas')
    .select('pincode')
    .in('pincode', pincodes)

  const existingSet = new Set((existing || []).map((e: { pincode: string }) => e.pincode))
  const missing = pincodes.filter(p => !existingSet.has(p))

  if (missing.length === 0) return { created: 0, failed: [] }

  // Get city info for fallback
  const { data: city } = await supabase
    .from('cities')
    .select('id, name, state')
    .eq('id', vendorCityId)
    .single()

  let created = 0
  const failed: string[] = []

  for (const pincode of missing) {
    const resolved = await resolvePincode(pincode)

    const row = {
      pincode,
      name: resolved?.name || pincode,
      lat: resolved?.lat || (city ? 0 : 0),
      lng: resolved?.lng || (city ? 0 : 0),
      city_id: resolved?.cityId || vendorCityId,
      city_name: resolved?.cityName || city?.name || '',
      state: resolved?.state || city?.state || '',
      is_active: true,
    }

    const { error } = await supabase.from('service_areas').insert(row)
    if (error) {
      console.error(`[ensureServiceAreas] Failed to create area for ${pincode}:`, error.message)
      failed.push(pincode)
    } else {
      created++
    }
  }

  return { created, failed }
}
