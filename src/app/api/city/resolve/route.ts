import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = (body.query || '').trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    const supabase = getSupabaseAdmin()
    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    }

    // Exact 6-digit pincode
    if (/^\d{6}$/.test(query)) {
      // Layer 1: service_areas (primary source, always seeded)
      // Note: service_areas uses @map columns: city_id, is_active, created_at
      const { data: area } = await supabase
        .from('service_areas')
        .select('*, cities(*)')
        .eq('pincode', query)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (area) {
        const city = area.cities as Record<string, unknown>
        return NextResponse.json({
          success: true,
          data: [{
            cityId: (city as { id: string }).id,
            cityName: (city as { name: string }).name,
            citySlug: (city as { slug: string }).slug,
            pincode: area.pincode,
            areaName: area.name,
            isActive: (city as { isActive: boolean }).isActive,
            isComingSoon: (city as { is_coming_soon: boolean }).is_coming_soon,
          }],
        }, { headers: cacheHeaders })
      }

      // Layer 2: pincode_city_map
      // Note: pincode_city_map uses @map columns: city_id, area_name, is_active, created_at
      const { data: pin } = await supabase
        .from('pincode_city_map')
        .select('*, cities(*)')
        .eq('pincode', query)
        .maybeSingle()

      if (pin) {
        const city = pin.cities as Record<string, unknown>
        return NextResponse.json({
          success: true,
          data: [{
            cityId: (city as { id: string }).id,
            cityName: (city as { name: string }).name,
            citySlug: (city as { slug: string }).slug,
            pincode: pin.pincode,
            areaName: pin.area_name,
            isActive: (city as { isActive: boolean }).isActive,
            isComingSoon: (city as { is_coming_soon: boolean }).is_coming_soon,
          }],
        }, { headers: cacheHeaders })
      }

      // Layer 3: city_zones (pincodes[] array)
      const { data: zones } = await supabase
        .from('city_zones')
        .select('*, cities(*)')
        .contains('pincodes', [query])
        .eq('isActive', true)
        .limit(1)

      if (zones && zones.length > 0) {
        const zone = zones[0]
        const city = zone.cities as Record<string, unknown>
        return NextResponse.json({
          success: true,
          data: [{
            cityId: (city as { id: string }).id,
            cityName: (city as { name: string }).name,
            citySlug: (city as { slug: string }).slug,
            pincode: query,
            areaName: zone.name,
            isActive: (city as { isActive: boolean }).isActive,
            isComingSoon: (city as { is_coming_soon: boolean }).is_coming_soon,
          }],
        }, { headers: cacheHeaders })
      }

      // Layer 4: cities.pincodePrefixes
      // Note: cities uses @map column pincode_prefix for pincodePrefixes
      const prefix = query.slice(0, 3)
      const { data: allCities } = await supabase
        .from('cities')
        .select('*')

      const prefixCity = (allCities || []).find((c: Record<string, unknown>) => {
        const prefixes = (c.pincode_prefix as string[]) || []
        return prefixes.includes(prefix)
      })

      if (prefixCity) {
        return NextResponse.json({
          success: true,
          data: [{
            cityId: prefixCity.id,
            cityName: prefixCity.name,
            citySlug: prefixCity.slug,
            pincode: query,
            areaName: null,
            isActive: prefixCity.isActive,
            isComingSoon: prefixCity.is_coming_soon,
          }],
        }, { headers: cacheHeaders })
      }

      return NextResponse.json({ success: true, data: [] }, { headers: cacheHeaders })
    }

    // Partial pincode (2-5 digits)
    if (/^\d{2,5}$/.test(query)) {
      // Try service_areas first
      const { data: areas } = await supabase
        .from('service_areas')
        .select('*, cities(*)')
        .like('pincode', `${query}%`)
        .eq('is_active', true)
        .limit(8)

      if (areas && areas.length > 0) {
        const seen = new Set<string>()
        const data = areas
          .filter((a: Record<string, unknown>) => {
            const city = a.cities as { id: string }
            if (seen.has(city.id)) return false
            seen.add(city.id)
            return true
          })
          .map((a: Record<string, unknown>) => {
            const city = a.cities as Record<string, unknown>
            return {
              cityId: (city as { id: string }).id,
              cityName: (city as { name: string }).name,
              citySlug: (city as { slug: string }).slug,
              pincode: a.pincode,
              areaName: a.name,
              isActive: (city as { isActive: boolean }).isActive,
              isComingSoon: (city as { is_coming_soon: boolean }).is_coming_soon,
            }
          })
        return NextResponse.json({ success: true, data }, { headers: cacheHeaders })
      }

      // Fallback: pincode_city_map
      const { data: pins } = await supabase
        .from('pincode_city_map')
        .select('*, cities(*)')
        .like('pincode', `${query}%`)
        .eq('is_active', true)
        .limit(8)

      if (pins && pins.length > 0) {
        const seen = new Set<string>()
        const data = pins
          .filter((p: Record<string, unknown>) => {
            const city = p.cities as { id: string }
            if (seen.has(city.id)) return false
            seen.add(city.id)
            return true
          })
          .map((p: Record<string, unknown>) => {
            const city = p.cities as Record<string, unknown>
            return {
              cityId: (city as { id: string }).id,
              cityName: (city as { name: string }).name,
              citySlug: (city as { slug: string }).slug,
              pincode: p.pincode,
              areaName: p.area_name,
              isActive: (city as { isActive: boolean }).isActive,
              isComingSoon: (city as { is_coming_soon: boolean }).is_coming_soon,
            }
          })
        return NextResponse.json({ success: true, data }, { headers: cacheHeaders })
      }

      // Fallback: cities.pincodePrefixes
      const { data: allCities } = await supabase
        .from('cities')
        .select('*')

      const matchingCities = (allCities || []).filter((c: Record<string, unknown>) => {
        const prefixes = (c.pincode_prefix as string[]) || []
        return prefixes.includes(query)
      }).slice(0, 5)

      if (matchingCities.length > 0) {
        const data = matchingCities.map((c: Record<string, unknown>) => ({
          cityId: c.id,
          cityName: c.name,
          citySlug: c.slug,
          pincode: null,
          areaName: null,
          isActive: c.isActive,
          isComingSoon: c.is_coming_soon,
        }))
        return NextResponse.json({ success: true, data }, { headers: cacheHeaders })
      }

      return NextResponse.json({ success: true, data: [] }, { headers: cacheHeaders })
    }

    // City name text search (also search aliases)
    const { data: cities } = await supabase
      .from('cities')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(8)

    // Also search by aliases -- aliases is an array, use contains for exact match
    const { data: aliasCities } = await supabase
      .from('cities')
      .select('*')
      .contains('aliases', [query.toLowerCase()])
      .limit(8)

    // Merge and deduplicate
    const allResults = [...(cities || []), ...(aliasCities || [])]
    const seen = new Set<string>()
    const dedupedCities = allResults.filter((c: { id: string }) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    }).slice(0, 8)

    const data = dedupedCities.map((c: Record<string, unknown>) => ({
      cityId: c.id,
      cityName: c.name,
      citySlug: c.slug,
      pincode: null,
      areaName: null,
      isActive: c.isActive,
      isComingSoon: c.is_coming_soon,
    }))

    return NextResponse.json({ success: true, data }, { headers: cacheHeaders })

  } catch (err) {
    console.error('[city/resolve] error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
