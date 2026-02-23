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

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month' // week, month, all

    const now = new Date()
    let startDate: Date | undefined
    if (period === 'week') {
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === 'month') {
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 1)
    }

    const supabase = getSupabaseAdmin()

    // Calculate earnings from delivered/paid orders
    let ordersQuery = supabase
      .from('orders')
      .select('id, orderNumber, total, vendorCost, commissionAmount, createdAt')
      .eq('vendorId', vendor.id)
      .eq('status', 'DELIVERED')
      .eq('paymentStatus', 'PAID')
      .order('createdAt', { ascending: false })

    if (startDate) {
      ordersQuery = ordersQuery.gte('createdAt', startDate.toISOString())
    }

    const { data: orders } = await ordersQuery

    const commissionRate = Number(vendor.commissionRate)
    let totalRevenue = 0
    let totalCommission = 0

    const orderEarnings = (orders || []).map((o: Record<string, unknown>) => {
      const orderTotal = Number(o.total)
      const commission = o.commissionAmount
        ? Number(o.commissionAmount)
        : (orderTotal * commissionRate) / 100
      const netEarning = orderTotal - commission

      totalRevenue += orderTotal
      totalCommission += commission

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        orderTotal,
        commission,
        netEarning,
        date: (o.createdAt as string),
      }
    })

    // Get payouts
    const { data: payouts } = await supabase
      .from('vendor_payouts')
      .select('*')
      .eq('vendorId', vendor.id)
      .order('createdAt', { ascending: false })
      .limit(10)

    // Pending payout (delivered orders not yet in a payout)
    const { data: allDeliveredOrders } = await supabase
      .from('orders')
      .select('total')
      .eq('vendorId', vendor.id)
      .eq('status', 'DELIVERED')
      .eq('paymentStatus', 'PAID')

    const lifetimeRevenue = (allDeliveredOrders || []).reduce((sum, o) => sum + Number(o.total), 0)

    const { data: paidPayouts } = await supabase
      .from('vendor_payouts')
      .select('netAmount')
      .eq('vendorId', vendor.id)
      .eq('status', 'PAID')

    const alreadyPaid = (paidPayouts || []).reduce((sum, p) => sum + Number(p.netAmount), 0)

    const lifetimeCommission = (lifetimeRevenue * commissionRate) / 100
    const lifetimeNet = lifetimeRevenue - lifetimeCommission
    const pendingPayout = lifetimeNet - alreadyPaid

    return NextResponse.json({
      success: true,
      data: {
        period,
        commissionRate,
        totalRevenue,
        totalCommission,
        netEarnings: totalRevenue - totalCommission,
        orderCount: (orders || []).length,
        pendingPayout: Math.max(0, pendingPayout),
        lifetimeRevenue,
        lifetimeNet,
        orders: orderEarnings,
        payouts: (payouts || []).map((p: Record<string, unknown>) => ({
          ...p,
          amount: Number(p.amount),
          deductions: Number(p.deductions),
          tdsAmount: Number(p.tdsAmount),
          netAmount: Number(p.netAmount),
        })),
      },
    })
  } catch (error) {
    console.error('Vendor earnings GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch earnings data' },
      { status: 500 }
    )
  }
}
