import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: preview which areas a radius covers (no save)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'CITY_MANAGER', 'OPERATIONS'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Validate vendor exists
    const { data: vendor } = await supabase.from('vendors').select('id').eq('id', params.id).maybeSingle()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const radius = parseFloat(request.nextUrl.searchParams.get('radius') || '8')
    const lat = parseFloat(request.nextUrl.searchParams.get('lat') || '0')
    const lng = parseFloat(request.nextUrl.searchParams.get('lng') || '0')

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'lat/lng required' },
        { status: 400 }
      )
    }

    // Fetch all active service areas and filter by Haversine distance in JS
    const { data: allAreas } = await supabase
      .from('service_areas')
      .select('name, pincode, lat, lng')
      .eq('is_active', true)
      .order('name', { ascending: true })

    const toRad = (deg: number) => deg * Math.PI / 180
    const areas = (allAreas || []).filter((a: Record<string, unknown>) => {
      const aLat = parseFloat(a.lat as string)
      const aLng = parseFloat(a.lng as string)
      if (isNaN(aLat) || isNaN(aLng)) return false
      const dLat = toRad(aLat - lat)
      const dLng = toRad(aLng - lng)
      const sinDLat = Math.sin(dLat / 2)
      const sinDLng = Math.sin(dLng / 2)
      const h = sinDLat * sinDLat + Math.cos(toRad(lat)) * Math.cos(toRad(aLat)) * sinDLng * sinDLng
      const dist = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
      return dist <= radius
    })

    return NextResponse.json({
      success: true,
      data: {
        count: areas.length,
        pincodes: Array.from(new Set(areas.map((a: Record<string, unknown>) => a.pincode))),
        areas: areas.map((a: Record<string, unknown>) => a.name),
      },
    })
  } catch (error) {
    console.error('Coverage preview error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to preview coverage' },
      { status: 500 }
    )
  }
}
