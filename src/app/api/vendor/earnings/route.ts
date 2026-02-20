import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isVendorRole, isAdminRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

async function getVendor() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isVendorRole(user.role) && !isAdminRole(user.role)) return null
  return prisma.vendor.findUnique({ where: { userId: user.id } })
}

export async function GET(request: NextRequest) {
  try {
    const vendor = await getVendor()
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

    // Calculate earnings from delivered/paid orders
    const earningsWhere: Record<string, unknown> = {
      vendorId: vendor.id,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
    }
    if (startDate) {
      earningsWhere.createdAt = { gte: startDate }
    }

    const orders = await prisma.order.findMany({
      where: earningsWhere,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        vendorCost: true,
        commissionAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const commissionRate = Number(vendor.commissionRate)
    let totalRevenue = 0
    let totalCommission = 0

    const orderEarnings = orders.map((o) => {
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
        date: o.createdAt.toISOString(),
      }
    })

    // Get payouts
    const payouts = await prisma.vendorPayout.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Pending payout (delivered orders not yet in a payout)
    const allDeliveredTotal = await prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: {
        vendorId: vendor.id,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
      },
    })

    const totalPaidOut = await prisma.vendorPayout.aggregate({
      _sum: { netAmount: true },
      where: {
        vendorId: vendor.id,
        status: 'PAID',
      },
    })

    const lifetimeRevenue = Number(allDeliveredTotal._sum.total ?? 0)
    const lifetimeCommission = (lifetimeRevenue * commissionRate) / 100
    const lifetimeNet = lifetimeRevenue - lifetimeCommission
    const alreadyPaid = Number(totalPaidOut._sum.netAmount ?? 0)
    const pendingPayout = lifetimeNet - alreadyPaid

    return NextResponse.json({
      success: true,
      data: {
        period,
        commissionRate,
        totalRevenue,
        totalCommission,
        netEarnings: totalRevenue - totalCommission,
        orderCount: orders.length,
        pendingPayout: Math.max(0, pendingPayout),
        lifetimeRevenue,
        lifetimeNet,
        orders: orderEarnings,
        payouts: payouts.map((p) => ({
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
