import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Today's orders count
    const todayOrders = await prisma.order.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
    })

    // Today's revenue (paid orders only)
    const revenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: today, lt: tomorrow },
        paymentStatus: 'PAID',
      },
    })
    const todayRevenue = Number(revenueResult._sum.total ?? 0)

    // HITL pending count (orders in PENDING status needing review)
    const hitlPending = await prisma.order.count({
      where: { status: 'PENDING' },
    })

    // Recent activity — last 10 order updates
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        updatedAt: true,
        user: { select: { name: true, phone: true } },
      },
    })

    const recentActivity = recentOrders.map((order) => ({
      id: order.id,
      type: 'order',
      description: `Order ${order.orderNumber} — ${order.status}${
        order.user?.name ? ` by ${order.user.name}` : ''
      }`,
      time: order.updatedAt.toISOString(),
    }))

    // Today's quotes — no quotes table yet, return 0
    const todayQuotes = 0

    return NextResponse.json({
      success: true,
      data: {
        todayQuotes,
        todayOrders,
        todayRevenue,
        hitlPending,
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
