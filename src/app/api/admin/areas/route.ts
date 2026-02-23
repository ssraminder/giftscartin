import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { lookupPincode } from '@/lib/nominatim'

export const dynamic = 'force-dynamic'

// GET: list areas with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user?.role || !['ADMIN', 'SUPER_ADMIN', 'CITY_MANAGER', 'OPERATIONS'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const city = request.nextUrl.searchParams.get('city')
    const status = request.nextUrl.searchParams.get('status')
    const search = request.nextUrl.searchParams.get('search')
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '50')

    const supabase = getSupabaseAdmin()

    // Build filtered query
    let query = supabase.from('service_areas').select('*', { count: 'exact' })

    if (city) query = query.eq('city_id', city)
    if (status === 'active') query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)
    if (search) {
      query = query.or(`name.ilike.%${search}%,pincode.ilike.%${search}%`)
    }

    const offset = (page - 1) * pageSize
    query = query
      .order('is_active', { ascending: true })
      .order('city_name', { ascending: true })
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1)

    const { data: areas, count: total, error } = await query
    if (error) throw error

    // Stats
    const [totalRes, activeRes, inactiveRes, cityCountRes] = await Promise.all([
      supabase.from('service_areas').select('*', { count: 'exact', head: true }),
      supabase.from('service_areas').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('service_areas').select('*', { count: 'exact', head: true }).eq('is_active', false),
      supabase.from('service_areas').select('city_name'),
    ])

    const cityCount = cityCountRes.data
      ? new Set(cityCountRes.data.map((r: { city_name: string }) => r.city_name)).size
      : 0

    return NextResponse.json({
      success: true,
      data: {
        areas,
        total: total || 0,
        page,
        pageSize,
        stats: {
          totalAreas: totalRes.count || 0,
          activeAreas: activeRes.count || 0,
          inactiveAreas: inactiveRes.count || 0,
          cityCount,
        },
      },
    })
  } catch (error) {
    console.error('Areas list error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch areas' },
      { status: 500 }
    )
  }
}

// POST: add new area manually
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, pincode, cityId, isActive = true } = body

    if (!name || !pincode || !cityId) {
      return NextResponse.json(
        { success: false, error: 'Name, pincode, and cityId are required' },
        { status: 400 }
      )
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { success: false, error: 'Valid 6-digit pincode required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get city details
    const { data: cityData, error: cityError } = await supabase
      .from('cities')
      .select('*')
      .eq('id', cityId)
      .single()

    if (cityError || !cityData) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 400 }
      )
    }

    // Lookup coords if not provided
    let lat = body.lat
    let lng = body.lng
    if (!lat || !lng) {
      const nominatim = await lookupPincode(pincode)
      if (nominatim) {
        lat = nominatim.lat
        lng = nominatim.lng
      } else {
        lat = Number(cityData.lat)
        lng = Number(cityData.lng)
      }
    }

    const { data: area, error: createError } = await supabase
      .from('service_areas')
      .insert({
        name,
        pincode,
        city_id: cityId,
        city_name: cityData.name,
        state: cityData.state,
        lat,
        lng,
        is_active: isActive,
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json({ success: true, data: area })
  } catch (error) {
    console.error('Create area error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create area' },
      { status: 500 }
    )
  }
}
