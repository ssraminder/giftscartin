import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { autoAssignVendorProducts } from '@/lib/auto-assign-vendor-products'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const vendorListSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED']).optional(),
  cityId: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const createVendorSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').max(200),
  ownerName: z.string().min(2, 'Owner name is required').max(200),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number (+91 followed by 10 digits)'),
  email: z.string().email('Invalid email address'),
  cityId: z.string().min(1, 'City is required'),
  address: z.string().min(5, 'Address is required').max(500),
  categories: z.array(z.string()).default([]),
  commissionRate: z.number().min(0).max(100).default(12),
  autoAccept: z.boolean().default(false),
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

// GET — list vendors with filters, search, pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const parsed = vendorListSchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status, cityId, search, page, pageSize } = parsed.data
    const supabase = getSupabaseAdmin()

    let query = supabase.from('vendors').select('*, cities!inner(id, name, slug)', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (cityId) query = query.eq('cityId', cityId)
    if (search) {
      query = query.or(`businessName.ilike.%${search}%,ownerName.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const skip = (page - 1) * pageSize
    query = query.order('createdAt', { ascending: false }).range(skip, skip + pageSize - 1)

    const { data: vendors, count: total, error } = await query
    if (error) throw error

    // Get order and product counts
    const vendorIds = (vendors || []).map((v: Record<string, unknown>) => v.id)
    const orderCounts: Record<string, number> = {}
    const productCounts: Record<string, number> = {}

    if (vendorIds.length > 0) {
      const { data: orderRows } = await supabase.from('orders').select('vendorId').in('vendorId', vendorIds)
      for (const row of orderRows || []) {
        if (row.vendorId) orderCounts[row.vendorId] = (orderCounts[row.vendorId] || 0) + 1
      }
      const { data: vpRows } = await supabase.from('vendor_products').select('vendorId').in('vendorId', vendorIds)
      for (const row of vpRows || []) {
        productCounts[row.vendorId] = (productCounts[row.vendorId] || 0) + 1
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        items: (vendors || []).map((v: Record<string, unknown>) => ({
          ...v,
          city: v.cities,
          commissionRate: Number(v.commissionRate),
          rating: Number(v.rating),
          _count: { orders: orderCounts[v.id as string] || 0, products: productCounts[v.id as string] || 0 },
        })),
        total: total ?? 0,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('Admin vendors GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

// POST — create vendor + user account + default working hours
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createVendorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = getSupabaseAdmin()

    // Check if user with this email or phone already exists
    const { data: existingByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()

    const { data: existingByPhone } = await supabase
      .from('users')
      .select('id')
      .eq('phone', data.phone)
      .maybeSingle()

    if (existingByEmail || existingByPhone) {
      return NextResponse.json(
        { success: false, error: 'A user with this email or phone already exists' },
        { status: 409 }
      )
    }

    // Check if city exists
    const { data: city } = await supabase.from('cities').select('id').eq('id', data.cityId).maybeSingle()
    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 400 }
      )
    }

    // 1. Create user with VENDOR role
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: data.email,
        phone: data.phone,
        name: data.ownerName,
        role: 'VENDOR',
      })
      .select()
      .single()

    if (userError) throw userError

    // 2. Create vendor linked to user
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        userId: newUser.id,
        businessName: data.businessName,
        ownerName: data.ownerName,
        phone: data.phone,
        email: data.email,
        cityId: data.cityId,
        address: data.address,
        categories: data.categories,
        commissionRate: data.commissionRate,
        autoAccept: data.autoAccept,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        status: 'APPROVED',
      })
      .select()
      .single()

    if (vendorError) throw vendorError

    // 3. Create working hours (custom or default 9AM-9PM all days)
    const workingHours = data.workingHours && data.workingHours.length === 7
      ? data.workingHours
      : Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          openTime: '09:00',
          closeTime: '21:00',
          isClosed: false,
        }))

    for (const wh of workingHours) {
      await supabase.from('vendor_working_hours').insert({
        vendorId: vendor.id,
        dayOfWeek: wh.dayOfWeek,
        openTime: wh.openTime,
        closeTime: wh.closeTime,
        isClosed: wh.isClosed,
      })
    }

    // 4. Create pincodes if provided
    if (data.pincodes && data.pincodes.length > 0) {
      for (const pc of data.pincodes) {
        await supabase.from('vendor_pincodes').insert({
          vendorId: vendor.id,
          pincode: pc.pincode,
          deliveryCharge: pc.deliveryCharge,
        })
      }
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      adminId: user.id,
      adminRole: user.role,
      actionType: 'vendor_create',
      entityType: 'vendor',
      entityId: vendor.id,
      fieldChanged: 'all',
      newValue: { businessName: data.businessName, ownerName: data.ownerName, email: data.email },
      reason: 'Admin created vendor',
    })

    // 5. Auto-assign products from vendor's selected categories
    if (data.categories.length > 0) {
      const assignResult = await autoAssignVendorProducts(vendor.id, data.categories)
      console.log(
        `[vendor-create] Auto-assigned products for vendor ${vendor.id}: ` +
        `${assignResult.attempted} attempted` +
        (assignResult.error ? `, error: ${assignResult.error}` : '')
      )
    }

    // Fetch the full vendor with relations
    const { data: fullVendor } = await supabase
      .from('vendors')
      .select('*, cities!inner(id, name, slug)')
      .eq('id', vendor.id)
      .single()

    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('vendorId', vendor.id)
    const { count: productCount } = await supabase.from('vendor_products').select('*', { count: 'exact', head: true }).eq('vendorId', vendor.id)

    return NextResponse.json({
      success: true,
      data: fullVendor ? {
        ...fullVendor,
        city: fullVendor.cities,
        commissionRate: Number(fullVendor.commissionRate),
        rating: Number(fullVendor.rating),
        _count: { orders: orderCount ?? 0, products: productCount ?? 0 },
      } : vendor,
    }, { status: 201 })
  } catch (error) {
    console.error('Admin vendor POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}
