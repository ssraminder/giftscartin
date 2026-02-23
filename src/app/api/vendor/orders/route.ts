import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isVendorRole, isAdminRole } from '@/lib/roles'
import { paginationSchema } from '@/lib/validations'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const vendorOrdersQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
})

async function getVendor(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session?.id) return null
  if (!isVendorRole(session.role) && !isAdminRole(session.role)) return null
  const supabase = getSupabaseAdmin()
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('userId', session.id)
    .single()
  return vendor
}

// GET: List vendor's orders
export async function GET(request: NextRequest) {
  try {
    const vendor = await getVendor(request)
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = vendorOrdersQuerySchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { page, pageSize, status } = parsed.data
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const supabase = getSupabaseAdmin()

    // Build query for items
    let itemsQuery = supabase
      .from('orders')
      .select('*, order_items(*, products(id, name, slug, images)), addresses(*), users(id, name, phone)', { count: 'exact' })
      .eq('vendorId', vendor.id)
      .order('createdAt', { ascending: false })
      .range(from, to)

    if (status) {
      itemsQuery = itemsQuery.eq('status', status)
    }

    const { data: items, count: total, error } = await itemsQuery

    if (error) {
      console.error('Vendor orders query error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        items: (items || []).map((o: Record<string, unknown>) => ({
          ...o,
          subtotal: Number(o.subtotal),
          deliveryCharge: Number(o.deliveryCharge),
          discount: Number(o.discount),
          surcharge: Number(o.surcharge),
          total: Number(o.total),
          items: o.order_items,
          address: o.addresses,
          user: o.users,
        })),
        total: total ?? 0,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('Vendor orders GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
