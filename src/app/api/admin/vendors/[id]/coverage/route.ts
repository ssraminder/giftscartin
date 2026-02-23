import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PUT: save vendor coverage (replaces all vendor_pincodes)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'CITY_MANAGER', 'OPERATIONS'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { method, pincodes, radiusKm, lat, lng } = body
    const supabase = getSupabaseAdmin()

    let finalPincodes: string[] = []

    if (method === 'pincode') {
      finalPincodes = pincodes || []
    } else if (method === 'radius' && lat && lng && radiusKm) {
      // Find all service_areas within radius using Haversine via RPC or raw query
      // Using supabase, we need to fetch all active areas and filter in JS
      const { data: areas } = await supabase
        .from('service_areas')
        .select('pincode, lat, lng')
        .eq('is_active', true)

      if (areas) {
        const toRad = (deg: number) => deg * Math.PI / 180
        finalPincodes = Array.from(new Set(
          areas.filter((a: Record<string, unknown>) => {
            const aLat = parseFloat(a.lat as string)
            const aLng = parseFloat(a.lng as string)
            if (isNaN(aLat) || isNaN(aLng)) return false
            const dLat = toRad(aLat - lat)
            const dLng = toRad(aLng - lng)
            const sinDLat = Math.sin(dLat / 2)
            const sinDLng = Math.sin(dLng / 2)
            const h = sinDLat * sinDLat + Math.cos(toRad(lat)) * Math.cos(toRad(aLat)) * sinDLng * sinDLng
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
            return dist <= radiusKm
          }).map((a: Record<string, unknown>) => a.pincode as string)
        ))
      }
    }

    // Get vendor
    const { data: vendor } = await supabase.from('vendors').select('id').eq('id', params.id).maybeSingle()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Replace all vendor_pincodes sequentially
    await supabase.from('vendor_pincodes').delete().eq('vendorId', params.id)

    if (finalPincodes.length > 0) {
      const rows = finalPincodes.map(pincode => ({
        vendorId: params.id,
        pincode,
        deliveryCharge: 0,
        isActive: true,
      }))
      await supabase.from('vendor_pincodes').insert(rows)
    }

    // Update vendor coverage method
    const vendorUpdate: Record<string, unknown> = {
      coverageMethod: method,
      updatedAt: new Date().toISOString(),
    }
    if (method === 'radius') {
      vendorUpdate.coverage_radius_km = radiusKm
    }
    await supabase.from('vendors').update(vendorUpdate).eq('id', params.id)

    return NextResponse.json({
      success: true,
      data: { pincodeCount: finalPincodes.length },
    })
  } catch (error) {
    console.error('Vendor coverage update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update coverage' },
      { status: 500 }
    )
  }
}
