import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { ensureServiceAreas } from '@/lib/pincode-resolver'

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
    const { method, pincodes, pincodeCharges, radiusKm, lat, lng, defaultCharge } = body
    const supabase = getSupabaseAdmin()

    // Build final pincode list with charges
    let finalPincodeCharges: Array<{ pincode: string; deliveryCharge: number }> = []

    if (method === 'pincode') {
      if (pincodeCharges && Array.isArray(pincodeCharges)) {
        // New format: per-pincode charges
        finalPincodeCharges = pincodeCharges.map((pc: { pincode: string; deliveryCharge?: number }) => ({
          pincode: pc.pincode,
          deliveryCharge: pc.deliveryCharge ?? 0,
        }))
      } else if (pincodes && Array.isArray(pincodes)) {
        // Legacy format: just pincode strings, default charge 0
        finalPincodeCharges = (pincodes as string[]).map(pincode => ({
          pincode,
          deliveryCharge: 0,
        }))
      }
    } else if (method === 'radius' && lat && lng && radiusKm) {
      const { data: areas } = await supabase
        .from('service_areas')
        .select('pincode, lat, lng')
        .eq('is_active', true)

      if (areas) {
        const toRad = (deg: number) => deg * Math.PI / 180
        const uniquePincodes = Array.from(new Set(
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
        const charge = typeof defaultCharge === 'number' ? defaultCharge : 0
        finalPincodeCharges = uniquePincodes.map(pincode => ({
          pincode,
          deliveryCharge: charge,
        }))
      }
    }

    // Get vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, cityId')
      .eq('id', params.id)
      .maybeSingle()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Replace all vendor_pincodes
    await supabase.from('vendor_pincodes').delete().eq('vendorId', params.id)

    if (finalPincodeCharges.length > 0) {
      const rows = finalPincodeCharges.map(pc => ({
        vendorId: params.id,
        pincode: pc.pincode,
        deliveryCharge: pc.deliveryCharge,
        pendingCharge: null,
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

    // Auto-create service_areas for any new pincodes
    const allPincodes = finalPincodeCharges.map(pc => pc.pincode)
    const areaResult = await ensureServiceAreas(allPincodes, vendor.cityId)
    if (areaResult.created > 0) {
      console.log(`[coverage] Auto-created ${areaResult.created} service areas for vendor ${params.id}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        pincodeCount: finalPincodeCharges.length,
        serviceAreasCreated: areaResult.created,
      },
    })
  } catch (error) {
    console.error('Vendor coverage update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update coverage' },
      { status: 500 }
    )
  }
}

// PATCH: approve/reject vendor-proposed surcharges
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'CITY_MANAGER', 'OPERATIONS'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, pincodes: targetPincodes } = body as {
      action: 'approve' | 'reject'
      pincodes?: string[]
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "approve" or "reject".' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get pending charges for this vendor
    let query = supabase
      .from('vendor_pincodes')
      .select('id, pincode, pendingCharge')
      .eq('vendorId', params.id)
      .not('pendingCharge', 'is', null)

    if (targetPincodes && targetPincodes.length > 0) {
      query = query.in('pincode', targetPincodes)
    }

    const { data: pending } = await query

    if (!pending || pending.length === 0) {
      return NextResponse.json({
        success: true,
        data: { updated: 0, message: 'No pending charges to process' },
      })
    }

    let updated = 0
    for (const row of pending) {
      if (action === 'approve') {
        // Copy pendingCharge → deliveryCharge, clear pendingCharge
        await supabase
          .from('vendor_pincodes')
          .update({ deliveryCharge: row.pendingCharge, pendingCharge: null })
          .eq('id', row.id)
      } else {
        // Reject: just clear pendingCharge
        await supabase
          .from('vendor_pincodes')
          .update({ pendingCharge: null })
          .eq('id', row.id)
      }
      updated++
    }

    return NextResponse.json({
      success: true,
      data: { updated, action },
    })
  } catch (error) {
    console.error('Vendor charge approval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process charge approval' },
      { status: 500 }
    )
  }
}
