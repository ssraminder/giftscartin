import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { ensureServiceAreas, resolvePincode } from '@/lib/pincode-resolver'
import { lookupPincode } from '@/lib/nominatim'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const serviceAreaActionSchema = z.object({
  vendorServiceAreaId: z.string().min(1, 'vendorServiceAreaId is required'),
  action: z.enum(['activate', 'reject', 'deactivate', 'reconsider']),
  rejectionReason: z.string().max(500).optional(),
})

const adminAddAreasSchema = z.object({
  serviceAreaIds: z.array(z.string().min(1)).min(1, 'At least one service area is required'),
  deliverySurcharge: z.number().min(0).default(0),
})

const adminCreateAreaSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit pincode required'),
  areaName: z.string().min(1).max(100).optional(),
  deliverySurcharge: z.number().min(0).default(0),
})

// GET: Fetch all vendor_service_areas for a vendor (admin review)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Verify vendor exists
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, businessName, cityId')
      .eq('id', id)
      .maybeSingle()

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const { data: areas, error } = await supabase
      .from('vendor_service_areas')
      .select('*, service_areas(name, pincode, city_name)')
      .eq('vendor_id', id)
      .order('requested_at', { ascending: false })

    if (error) throw error

    const mapped = (areas || []).map((row: Record<string, unknown>) => {
      const sa = row.service_areas as { name: string; pincode: string; city_name: string } | null
      return {
        id: row.id,
        serviceAreaId: row.service_area_id,
        name: sa?.name || '',
        pincode: sa?.pincode || '',
        cityName: sa?.city_name || '',
        deliverySurcharge: Number(row.delivery_surcharge),
        status: row.status,
        isActive: row.is_active,
        requestedAt: row.requested_at,
        activatedAt: row.activated_at,
        activatedBy: row.activated_by,
        rejectionReason: row.rejection_reason,
      }
    })

    // Optionally include available service areas for the vendor's city
    const includeAvailable = request.nextUrl.searchParams.get('include') === 'available'
    let availableAreas: { id: string; name: string; pincode: string; cityName: string }[] | undefined
    if (includeAvailable) {
      const { data: allAreas } = await supabase
        .from('service_areas')
        .select('id, name, pincode, city_name')
        .eq('city_id', vendor.cityId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      availableAreas = (allAreas || []).map((a: { id: string; name: string; pincode: string; city_name: string }) => ({
        id: a.id,
        name: a.name,
        pincode: a.pincode,
        cityName: a.city_name,
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: { id: vendor.id, businessName: vendor.businessName, cityId: vendor.cityId },
        areas: mapped,
        ...(availableAreas ? { availableAreas } : {}),
      },
    })
  } catch (error) {
    console.error('Admin vendor coverage GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor coverage' },
      { status: 500 }
    )
  }
}

// POST: Admin adds service areas on behalf of a vendor (auto-ACTIVE)
// Supports two modes:
//   1. Add existing areas: { serviceAreaIds: [...], deliverySurcharge }
//   2. Create new area by pincode: { pincode: "110001", areaName?, deliverySurcharge }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id: vendorId } = await params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    // Verify vendor exists
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, cityId')
      .eq('id', vendorId)
      .maybeSingle()

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Mode 2: Create new area by pincode
    if (body.pincode) {
      const parsed = adminCreateAreaSchema.safeParse(body)
      if (!parsed.success) {
        console.error('Admin coverage POST (create area) validation error:', parsed.error.issues, 'body:', JSON.stringify(body))
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0].message },
          { status: 400 }
        )
      }

      const { pincode, areaName, deliverySurcharge } = parsed.data

      // Check if service_area already exists for this pincode
      const { data: existingArea } = await supabase
        .from('service_areas')
        .select('id, name, pincode, city_name')
        .eq('pincode', pincode)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      let serviceAreaId: string
      let serviceAreaCreated = false

      if (existingArea) {
        serviceAreaId = existingArea.id
      } else {
        // Resolve pincode
        const resolved = await resolvePincode(pincode)

        // Get vendor's city info for fallback
        const { data: city } = await supabase
          .from('cities')
          .select('id, name, state, lat, lng')
          .eq('id', vendor.cityId)
          .single()

        const name = areaName || resolved?.name || pincode
        let lat = resolved?.lat || 0
        let lng = resolved?.lng || 0
        if (!lat || !lng) {
          const nominatim = await lookupPincode(pincode)
          if (nominatim) { lat = nominatim.lat; lng = nominatim.lng }
          else { lat = Number(city?.lat || 0); lng = Number(city?.lng || 0) }
        }
        const cityId = resolved?.cityId || vendor.cityId
        const cityName = resolved?.cityName || city?.name || ''
        const state = resolved?.state || city?.state || ''

        const { data: newArea, error: createError } = await supabase
          .from('service_areas')
          .insert({
            name,
            pincode,
            city_id: cityId,
            city_name: cityName,
            state,
            lat,
            lng,
            is_active: true,
          })
          .select('id')
          .single()

        if (createError) {
          console.error('Create service_area error:', createError)
          return NextResponse.json(
            { success: false, error: 'Failed to create service area' },
            { status: 500 }
          )
        }

        serviceAreaId = newArea.id
        serviceAreaCreated = true
      }

      // Check if vendor already has this area
      const { data: existingVsa } = await supabase
        .from('vendor_service_areas')
        .select('id, status')
        .eq('vendor_id', vendorId)
        .eq('service_area_id', serviceAreaId)
        .maybeSingle()

      if (existingVsa) {
        return NextResponse.json({
          success: false,
          error: `This area is already assigned to vendor (${existingVsa.status})`,
        }, { status: 409 })
      }

      // Create vendor_service_area as ACTIVE (admin-added)
      const now = new Date().toISOString()
      const { data: vsa, error: vsaError } = await supabase
        .from('vendor_service_areas')
        .insert({
          vendor_id: vendorId,
          service_area_id: serviceAreaId,
          delivery_surcharge: deliverySurcharge,
          status: 'ACTIVE',
          is_active: true,
          requested_at: now,
          activated_at: now,
          activated_by: user.id,
        })
        .select('*, service_areas(name, pincode, city_name)')
        .single()

      if (vsaError) throw vsaError

      const sa = vsa.service_areas as { name: string; pincode: string; city_name: string } | null

      // Audit log
      await supabase.from('audit_logs').insert({
        adminId: user.id,
        adminRole: user.role,
        actionType: 'vendor_coverage_admin_create',
        entityType: 'vendor',
        entityId: vendorId,
        fieldChanged: 'vendor_service_areas',
        oldValue: null,
        newValue: { pincode, serviceAreaId, serviceAreaCreated },
        reason: `Admin created area ${pincode} for vendor`,
      })

      return NextResponse.json({
        success: true,
        data: {
          added: 1,
          serviceAreaCreated,
          area: {
            id: vsa.id,
            serviceAreaId: vsa.service_area_id,
            name: sa?.name || '',
            pincode: sa?.pincode || '',
            cityName: sa?.city_name || '',
            deliverySurcharge: Number(vsa.delivery_surcharge),
            status: vsa.status,
            isActive: vsa.is_active,
          },
        },
      })
    }

    // Mode 1: Add existing service areas by ID
    const parsed = adminAddAreasSchema.safeParse(body)

    if (!parsed.success) {
      console.error('Admin coverage POST (add areas) validation error:', parsed.error.issues, 'body:', JSON.stringify(body))
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { serviceAreaIds, deliverySurcharge } = parsed.data

    // Get existing service area IDs for this vendor to skip duplicates
    const { data: existing } = await supabase
      .from('vendor_service_areas')
      .select('service_area_id')
      .eq('vendor_id', vendorId)

    const existingSet = new Set(
      (existing || []).map((r: { service_area_id: string }) => r.service_area_id)
    )

    const toInsert = serviceAreaIds.filter(id => !existingSet.has(id))

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        data: { added: 0, message: 'All selected areas are already assigned' },
      })
    }

    const now = new Date().toISOString()
    const rows = toInsert.map(serviceAreaId => ({
      vendor_id: vendorId,
      service_area_id: serviceAreaId,
      delivery_surcharge: deliverySurcharge,
      status: 'ACTIVE',
      is_active: true,
      requested_at: now,
      activated_at: now,
      activated_by: user.id,
    }))

    const { error: insertError } = await supabase
      .from('vendor_service_areas')
      .insert(rows)

    if (insertError) throw insertError

    // Audit log
    await supabase.from('audit_logs').insert({
      adminId: user.id,
      adminRole: user.role,
      actionType: 'vendor_coverage_admin_add',
      entityType: 'vendor',
      entityId: vendorId,
      fieldChanged: 'vendor_service_areas',
      oldValue: null,
      newValue: { added: toInsert.length, serviceAreaIds: toInsert },
      reason: `Admin added ${toInsert.length} service areas for vendor`,
    })

    return NextResponse.json({
      success: true,
      data: { added: toInsert.length },
    })
  } catch (error) {
    console.error('Admin add coverage POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add service areas' },
      { status: 500 }
    )
  }
}

// PUT: save vendor coverage (replaces all vendor_pincodes) — legacy pincode management
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'CITY_MANAGER', 'OPERATIONS'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id: vendorIdParam } = await paramsPromise
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
      .eq('id', vendorIdParam)
      .maybeSingle()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Replace all vendor_pincodes
    const { error: deleteError } = await supabase.from('vendor_pincodes').delete().eq('vendorId', vendorIdParam)
    if (deleteError) {
      console.error('Failed to delete vendor_pincodes:', deleteError)
      throw deleteError
    }

    if (finalPincodeCharges.length > 0) {
      const rows = finalPincodeCharges.map(pc => ({
        vendorId: vendorIdParam,
        pincode: pc.pincode,
        deliveryCharge: pc.deliveryCharge,
        pendingCharge: null,
        isActive: true,
      }))
      const { error: insertError } = await supabase.from('vendor_pincodes').insert(rows)
      if (insertError) {
        console.error('Failed to insert vendor_pincodes:', insertError)
        throw insertError
      }
    }

    // Update vendor coverage method
    const vendorUpdate: Record<string, unknown> = {
      coverageMethod: method,
      updatedAt: new Date().toISOString(),
    }
    if (method === 'radius') {
      vendorUpdate.coverage_radius_km = radiusKm
    }
    await supabase.from('vendors').update(vendorUpdate).eq('id', vendorIdParam)

    // Auto-create service_areas for any new pincodes
    const allPincodes = finalPincodeCharges.map(pc => pc.pincode)
    const areaResult = await ensureServiceAreas(allPincodes, vendor.cityId)
    if (areaResult.created > 0) {
      console.log(`[coverage] Auto-created ${areaResult.created} service areas for vendor ${vendorIdParam}`)
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

// PATCH: Activate, reject, deactivate, or reconsider a vendor service area request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id: vendorId } = await params
    const body = await request.json()

    // New service area action (has vendorServiceAreaId)
    if (body.vendorServiceAreaId) {
      const parsed = serviceAreaActionSchema.safeParse(body)
      if (!parsed.success) {
        console.error('Admin coverage PATCH validation error:', parsed.error.issues, 'body:', JSON.stringify(body))
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0].message },
          { status: 400 }
        )
      }

      const { vendorServiceAreaId, action, rejectionReason } = parsed.data
      const supabase = getSupabaseAdmin()

      // Verify the row belongs to this vendor
      const { data: row } = await supabase
        .from('vendor_service_areas')
        .select('id, vendor_id, status')
        .eq('id', vendorServiceAreaId)
        .eq('vendor_id', vendorId)
        .maybeSingle()

      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Service area record not found' },
          { status: 404 }
        )
      }

      let updateData: Record<string, unknown> = {}

      switch (action) {
        case 'activate':
          updateData = {
            status: 'ACTIVE',
            is_active: true,
            activated_at: new Date().toISOString(),
            activated_by: user.id,
            rejection_reason: null,
          }
          break
        case 'reject':
          updateData = {
            status: 'REJECTED',
            is_active: false,
            rejection_reason: rejectionReason || null,
          }
          break
        case 'deactivate':
          updateData = {
            status: 'REJECTED',
            is_active: false,
            rejection_reason: 'Deactivated by admin',
          }
          break
        case 'reconsider':
          updateData = {
            status: 'PENDING',
            is_active: false,
            rejection_reason: null,
            requested_at: new Date().toISOString(),
          }
          break
      }

      const { data: updated, error } = await supabase
        .from('vendor_service_areas')
        .update(updateData)
        .eq('id', vendorServiceAreaId)
        .select('*, service_areas(name, pincode, city_name)')
        .single()

      if (error) throw error

      const sa = updated.service_areas as { name: string; pincode: string; city_name: string } | null

      // Audit log
      await supabase.from('audit_logs').insert({
        adminId: user.id,
        adminRole: user.role,
        actionType: `vendor_coverage_${action}`,
        entityType: 'vendor_service_area',
        entityId: vendorServiceAreaId,
        fieldChanged: 'status, is_active',
        oldValue: { status: row.status },
        newValue: updateData,
        reason: `Admin ${action}d vendor service area`,
      })

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          serviceAreaId: updated.service_area_id,
          name: sa?.name || '',
          pincode: sa?.pincode || '',
          cityName: sa?.city_name || '',
          deliverySurcharge: Number(updated.delivery_surcharge),
          status: updated.status,
          isActive: updated.is_active,
          requestedAt: updated.requested_at,
          activatedAt: updated.activated_at,
          activatedBy: updated.activated_by,
          rejectionReason: updated.rejection_reason,
        },
      })
    }

    // Legacy: approve/reject vendor-proposed pincode surcharges
    const { action, pincodes: targetPincodes } = body as {
      action: 'approve' | 'reject'
      pincodes?: string[]
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('vendor_pincodes')
      .select('id, pincode, pendingCharge')
      .eq('vendorId', vendorId)
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

    let updatedCount = 0
    for (const row of pending) {
      if (action === 'approve') {
        await supabase
          .from('vendor_pincodes')
          .update({ deliveryCharge: row.pendingCharge, pendingCharge: null })
          .eq('id', row.id)
      } else {
        await supabase
          .from('vendor_pincodes')
          .update({ pendingCharge: null })
          .eq('id', row.id)
      }
      updatedCount++
    }

    return NextResponse.json({
      success: true,
      data: { updated: updatedCount, action },
    })
  } catch (error) {
    console.error('Vendor coverage PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update coverage' },
      { status: 500 }
    )
  }
}
