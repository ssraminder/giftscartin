import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { recalculateCitySlotCutoff } from '@/lib/recalculate-city-slots'
import { z } from 'zod/v4'

const updateVendorSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED']).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  categories: z.array(z.string()).optional(),
  isOnline: z.boolean().optional(),
})

const fullUpdateVendorSchema = z.object({
  businessName: z.string().min(2).max(200).optional(),
  ownerName: z.string().min(2).max(200).optional(),
  phone: z.string()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Must be a 10-digit Indian mobile number starting with 6-9')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email address').optional(),
  cityId: z.string().optional(),
  address: z.string().min(5).max(500).optional(),
  categories: z.array(z.string()).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  autoAccept: z.boolean().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED']).optional(),
  isOnline: z.boolean().optional(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  workingHours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string(),
    closeTime: z.string(),
    isClosed: z.boolean().default(false),
  })).optional(),
  pincodes: z.array(z.object({
    pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
    deliveryCharge: z.number().min(0).default(0),
  })).optional(),
})

// GET: Single vendor detail
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

    const { data: vendor } = await supabase
      .from('vendors')
      .select('*, cities(*)')
      .eq('id', id)
      .maybeSingle()

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const [
      { data: workingHours },
      { data: slots },
      { data: pincodes },
      { count: orderCount },
      { count: productCount },
    ] = await Promise.all([
      supabase.from('vendor_working_hours').select('*').eq('vendorId', id).order('dayOfWeek', { ascending: true }),
      supabase.from('vendor_slots').select('*, delivery_slots(*)').eq('vendorId', id),
      supabase.from('vendor_pincodes').select('*').eq('vendorId', id).eq('isActive', true),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendorId', id),
      supabase.from('vendor_products').select('*', { count: 'exact', head: true }).eq('vendorId', id),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...vendor,
        city: vendor.cities,
        workingHours: workingHours || [],
        slots: (slots || []).map((s: Record<string, unknown>) => ({ ...s, slot: s.delivery_slots })),
        pincodes: (pincodes || []).map((p: Record<string, unknown>) => ({
          ...p,
          deliveryCharge: Number(p.deliveryCharge),
        })),
        commissionRate: Number(vendor.commissionRate),
        rating: Number(vendor.rating),
        _count: { orders: orderCount ?? 0, products: productCount ?? 0 },
      },
    })
  } catch (error) {
    console.error('Admin vendor GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor' },
      { status: 500 }
    )
  }
}

// PATCH: Quick update vendor (status, commission, online toggle)
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

    const { id } = await params
    const body = await request.json()
    const parsed = updateVendorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: vendor } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const data = parsed.data

    // If suspending, also go offline
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === 'SUSPENDED' || data.status === 'TERMINATED') {
        updateData.isOnline = false
      }
    }
    if (data.commissionRate !== undefined) updateData.commissionRate = data.commissionRate
    if (data.categories !== undefined) updateData.categories = data.categories
    if (data.isOnline !== undefined) updateData.isOnline = data.isOnline

    const { data: updated, error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', id)
      .select('*, cities!inner(id, name, slug)')
      .single()

    if (error) throw error

    // Recalculate city slot cutoffs when vendor status changes
    if (data.status) {
      await recalculateCitySlotCutoff(updated.cityId)
    }

    // Get counts
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendorId', id)
    const { count: productCount } = await supabase.from('vendor_products').select('*', { count: 'exact', head: true }).eq('vendorId', id)

    // Log the action
    await supabase.from('audit_logs').insert({
      adminId: user.id,
      adminRole: user.role,
      actionType: data.status ? `vendor_${data.status.toLowerCase()}` : 'vendor_update',
      entityType: 'vendor',
      entityId: id,
      fieldChanged: Object.keys(data).join(', '),
      oldValue: { status: vendor.status, commissionRate: Number(vendor.commissionRate), isOnline: vendor.isOnline },
      newValue: data,
      reason: `Admin ${data.status ? data.status.toLowerCase() : 'updated'} vendor`,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        city: updated.cities,
        commissionRate: Number(updated.commissionRate),
        rating: Number(updated.rating),
        _count: { orders: orderCount ?? 0, products: productCount ?? 0 },
      },
    })
  } catch (error) {
    console.error('Admin vendor PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor' },
      { status: 500 }
    )
  }
}

// PUT: Full vendor update (from edit form)
export async function PUT(
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
    const body = await request.json()
    const parsed = fullUpdateVendorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: vendor } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const data = parsed.data

    // Strip +91 prefix from phone so DB always stores 10-digit format
    const cleanPhone = data.phone ? data.phone.replace(/^\+91/, '') : data.phone

    // Build vendor update data (exclude working hours and pincodes)
    const vendorUpdate: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (data.businessName !== undefined) vendorUpdate.businessName = data.businessName
    if (data.ownerName !== undefined) vendorUpdate.ownerName = data.ownerName
    if (cleanPhone !== undefined) vendorUpdate.phone = cleanPhone
    if (data.email !== undefined) vendorUpdate.email = data.email
    if (data.cityId !== undefined) vendorUpdate.cityId = data.cityId
    if (data.address !== undefined) vendorUpdate.address = data.address
    if (data.categories !== undefined) vendorUpdate.categories = data.categories
    if (data.commissionRate !== undefined) vendorUpdate.commissionRate = data.commissionRate
    if (data.autoAccept !== undefined) vendorUpdate.autoAccept = data.autoAccept
    if (data.status !== undefined) {
      vendorUpdate.status = data.status
      if (data.status === 'SUSPENDED' || data.status === 'TERMINATED') {
        vendorUpdate.isOnline = false
      }
    }
    if (data.isOnline !== undefined) vendorUpdate.isOnline = data.isOnline
    if (data.lat !== undefined) vendorUpdate.lat = data.lat
    if (data.lng !== undefined) vendorUpdate.lng = data.lng

    // Update vendor
    await supabase.from('vendors').update(vendorUpdate).eq('id', id)

    // Update working hours (delete all then recreate)
    if (data.workingHours && data.workingHours.length > 0) {
      await supabase.from('vendor_working_hours').delete().eq('vendorId', id)
      for (const wh of data.workingHours) {
        await supabase.from('vendor_working_hours').insert({
          vendorId: id,
          dayOfWeek: wh.dayOfWeek,
          openTime: wh.openTime,
          closeTime: wh.closeTime,
          isClosed: wh.isClosed,
        })
      }
    }

    // Update pincodes (delete all then recreate)
    if (data.pincodes !== undefined) {
      await supabase.from('vendor_pincodes').delete().eq('vendorId', id)
      if (data.pincodes.length > 0) {
        for (const pc of data.pincodes) {
          await supabase.from('vendor_pincodes').insert({
            vendorId: id,
            pincode: pc.pincode,
            deliveryCharge: pc.deliveryCharge,
          })
        }
      }
    }

    // Recalculate city slot cutoffs when vendor status, slots, or city changes
    const needsRecalc = data.status || data.cityId
    const targetCityId = data.cityId || vendor.cityId
    if (needsRecalc) {
      await recalculateCitySlotCutoff(targetCityId)
      // If city changed, also recalculate the old city
      if (data.cityId && data.cityId !== vendor.cityId) {
        await recalculateCitySlotCutoff(vendor.cityId)
      }
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      adminId: user.id,
      adminRole: user.role,
      actionType: 'vendor_update',
      entityType: 'vendor',
      entityId: id,
      fieldChanged: Object.keys(data).join(', '),
      oldValue: { businessName: vendor.businessName, status: vendor.status },
      newValue: data,
      reason: 'Admin updated vendor',
    })

    // Fetch the updated vendor
    const { data: updated } = await supabase
      .from('vendors')
      .select('*, cities(*)')
      .eq('id', id)
      .single()

    const [
      { data: workingHours },
      { data: pincodes },
      { count: orderCount },
      { count: productCount },
    ] = await Promise.all([
      supabase.from('vendor_working_hours').select('*').eq('vendorId', id).order('dayOfWeek', { ascending: true }),
      supabase.from('vendor_pincodes').select('*').eq('vendorId', id).eq('isActive', true),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendorId', id),
      supabase.from('vendor_products').select('*', { count: 'exact', head: true }).eq('vendorId', id),
    ])

    return NextResponse.json({
      success: true,
      data: updated ? {
        ...updated,
        city: updated.cities,
        workingHours: workingHours || [],
        commissionRate: Number(updated.commissionRate),
        rating: Number(updated.rating),
        pincodes: (pincodes || []).map((p: Record<string, unknown>) => ({
          ...p,
          deliveryCharge: Number(p.deliveryCharge),
        })),
        _count: { orders: orderCount ?? 0, products: productCount ?? 0 },
      } : null,
    })
  } catch (error) {
    console.error('Admin vendor PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor' },
      { status: 500 }
    )
  }
}

// DELETE: Soft delete — set status to TERMINATED (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Super Admins can terminate vendors' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data: vendor } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    await supabase.from('vendors').update({
      status: 'TERMINATED',
      isOnline: false,
      updatedAt: new Date().toISOString(),
    }).eq('id', id)

    await supabase.from('audit_logs').insert({
      adminId: user.id,
      adminRole: user.role,
      actionType: 'vendor_terminated',
      entityType: 'vendor',
      entityId: id,
      fieldChanged: 'status, isOnline',
      oldValue: { status: vendor.status, isOnline: vendor.isOnline },
      newValue: { status: 'TERMINATED', isOnline: false },
      reason: 'Super Admin terminated vendor',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin vendor DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to terminate vendor' },
      { status: 500 }
    )
  }
}
