import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isVendorRole, isAdminRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  try {
    const vendor = await getVendor(request)
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    // Today's orders
    const { count: todayOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('vendorId', vendor.id)
      .gte('createdAt', today.toISOString())
      .lt('createdAt', tomorrow.toISOString())

    // Pending orders (need attention)
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('vendorId', vendor.id)
      .in('status', ['PENDING', 'CONFIRMED'])

    // This week's earnings (paid orders)
    const { data: weekOrders } = await supabase
      .from('orders')
      .select('total')
      .eq('vendorId', vendor.id)
      .gte('createdAt', weekAgo.toISOString())
      .eq('paymentStatus', 'PAID')

    const weekEarnings = (weekOrders || []).reduce((sum, o) => sum + Number(o.total), 0)

    // This month's earnings
    const { data: monthOrders } = await supabase
      .from('orders')
      .select('total')
      .eq('vendorId', vendor.id)
      .gte('createdAt', monthAgo.toISOString())
      .eq('paymentStatus', 'PAID')

    const monthEarnings = (monthOrders || []).reduce((sum, o) => sum + Number(o.total), 0)

    // Total orders completed
    const { count: totalDelivered } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('vendorId', vendor.id)
      .eq('status', 'DELIVERED')

    // Active products count
    const { count: activeProducts } = await supabase
      .from('vendor_products')
      .select('*', { count: 'exact', head: true })
      .eq('vendorId', vendor.id)
      .eq('isAvailable', true)

    // Recent orders (last 5)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, orderNumber, status, total, deliveryDate, deliverySlot, createdAt, order_items(name, quantity)')
      .eq('vendorId', vendor.id)
      .order('createdAt', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      data: {
        todayOrders: todayOrders ?? 0,
        pendingOrders: pendingOrders ?? 0,
        weekEarnings,
        monthEarnings,
        totalDelivered: totalDelivered ?? 0,
        activeProducts: activeProducts ?? 0,
        rating: Number(vendor.rating),
        status: vendor.status,
        isOnline: vendor.isOnline,
        recentOrders: (recentOrders || []).map((o: Record<string, unknown>) => ({
          ...o,
          total: Number(o.total),
          items: o.order_items,
        })),
      },
    })
  } catch (error) {
    console.error('Vendor dashboard GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
