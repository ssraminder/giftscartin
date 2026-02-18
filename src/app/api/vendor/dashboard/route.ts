import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getVendor() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (user.role !== 'VENDOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return null
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } })
  return vendor
}

export async function GET() {
  try {
    const vendor = await getVendor()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    // Today's orders
    const todayOrders = await prisma.order.count({
      where: {
        vendorId: vendor.id,
        createdAt: { gte: today, lt: tomorrow },
      },
    })

    // Pending orders (need attention)
    const pendingOrders = await prisma.order.count({
      where: {
        vendorId: vendor.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })

    // This week's earnings (paid orders)
    const weekEarnings = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        vendorId: vendor.id,
        createdAt: { gte: weekAgo },
        paymentStatus: 'PAID',
      },
    })

    // This month's earnings
    const monthEarnings = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        vendorId: vendor.id,
        createdAt: { gte: monthAgo },
        paymentStatus: 'PAID',
      },
    })

    // Total orders completed
    const totalDelivered = await prisma.order.count({
      where: {
        vendorId: vendor.id,
        status: 'DELIVERED',
      },
    })

    // Active products count
    const activeProducts = await prisma.vendorProduct.count({
      where: {
        vendorId: vendor.id,
        isAvailable: true,
      },
    })

    // Recent orders (last 5)
    const recentOrders = await prisma.order.findMany({
      where: { vendorId: vendor.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        deliveryDate: true,
        deliverySlot: true,
        createdAt: true,
        items: {
          select: { name: true, quantity: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        todayOrders,
        pendingOrders,
        weekEarnings: Number(weekEarnings._sum.total ?? 0),
        monthEarnings: Number(monthEarnings._sum.total ?? 0),
        totalDelivered,
        activeProducts,
        rating: Number(vendor.rating),
        status: vendor.status,
        isOnline: vendor.isOnline,
        recentOrders: recentOrders.map((o) => ({
          ...o,
          total: Number(o.total),
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
