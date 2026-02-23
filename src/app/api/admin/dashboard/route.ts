import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'CITY_MANAGER', 'OPERATIONS'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayISO = today.toISOString()
    const tomorrowISO = tomorrow.toISOString()

    // Today's orders count
    const { count: todayOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('createdAt', todayISO)
      .lt('createdAt', tomorrowISO)

    // Today's revenue (paid orders only)
    const { data: revenueRows } = await supabase
      .from('orders')
      .select('total')
      .gte('createdAt', todayISO)
      .lt('createdAt', tomorrowISO)
      .eq('paymentStatus', 'PAID')

    const todayRevenue = (revenueRows || []).reduce((sum, r) => sum + Number(r.total ?? 0), 0)

    // HITL pending count (orders in PENDING status needing review)
    const { count: hitlPending } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')

    // Recent activity — last 10 order updates
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, orderNumber, status, updatedAt, userId')
      .order('updatedAt', { ascending: false })
      .limit(10)

    // Fetch user names for the recent orders
    const userIds = (recentOrders || []).map(o => o.userId).filter(Boolean)
    let userMap: Record<string, { name: string | null; phone: string | null }> = {}
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, phone')
        .in('id', userIds)
      if (users) {
        userMap = Object.fromEntries(users.map(u => [u.id, { name: u.name, phone: u.phone }]))
      }
    }

    const recentActivity = (recentOrders || []).map((order) => {
      const u = order.userId ? userMap[order.userId] : null
      return {
        id: order.id,
        type: 'order',
        description: `Order ${order.orderNumber} — ${order.status}${
          u?.name ? ` by ${u.name}` : ''
        }`,
        time: order.updatedAt,
      }
    })

    // Today's quotes — no quotes table yet, return 0
    const todayQuotes = 0

    // Pending area review count (inactive service areas needing admin review)
    const { count: pendingAreaReviewCount } = await supabase
      .from('service_areas')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false)

    return NextResponse.json({
      success: true,
      data: {
        todayQuotes,
        todayOrders: todayOrders ?? 0,
        todayRevenue,
        hitlPending: hitlPending ?? 0,
        pendingAreaReviewCount: pendingAreaReviewCount ?? 0,
        recentActivity,
      },
    })
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
