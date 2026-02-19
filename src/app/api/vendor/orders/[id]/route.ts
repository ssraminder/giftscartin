import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const vendorUpdateOrderSchema = z.object({
  action: z.enum(['accept', 'reject', 'preparing', 'out_for_delivery', 'delivered']),
  note: z.string().max(500).optional(),
})

async function getVendor() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (user.role !== 'VENDOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return null
  return prisma.vendor.findUnique({ where: { userId: user.id } })
}

// GET: Single order detail for vendor
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const vendor = await getVendor()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    const order = await prisma.order.findFirst({
      where: { id, vendorId: vendor.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: true },
            },
          },
        },
        address: true,
        user: { select: { id: true, name: true, phone: true, email: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        payment: { select: { status: true, method: true } },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        subtotal: Number(order.subtotal),
        deliveryCharge: Number(order.deliveryCharge),
        discount: Number(order.discount),
        surcharge: Number(order.surcharge),
        total: Number(order.total),
        vendorCost: order.vendorCost ? Number(order.vendorCost) : null,
        commissionAmount: order.commissionAmount ? Number(order.commissionAmount) : null,
      },
    })
  } catch (error) {
    console.error('Vendor order GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH: Vendor actions on an order (accept, reject, update status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const vendor = await getVendor()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = vendorUpdateOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { action, note } = parsed.data

    // Verify order belongs to vendor
    const order = await prisma.order.findFirst({
      where: { id, vendorId: vendor.id },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Map action to status and validate transitions
    const actionToStatus: Record<string, string> = {
      accept: 'CONFIRMED',
      reject: 'CANCELLED',
      preparing: 'PREPARING',
      out_for_delivery: 'OUT_FOR_DELIVERY',
      delivered: 'DELIVERED',
    }

    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['accept', 'reject'],
      CONFIRMED: ['preparing', 'reject'],
      PREPARING: ['out_for_delivery'],
      OUT_FOR_DELIVERY: ['delivered'],
    }

    const allowed = allowedTransitions[order.status] || []
    if (!allowed.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Cannot ${action} an order with status ${order.status}` },
        { status: 400 }
      )
    }

    const newStatus = actionToStatus[action]

    // Sequential queries (no interactive transaction — pgbouncer compatible)
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus as OrderStatus,
        ...(action === 'reject' && order.paymentStatus === 'PAID'
          ? { paymentStatus: 'REFUNDED' as const }
          : {}),
      },
    })

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: newStatus as OrderStatus,
        note: note || `Vendor ${action}ed the order`,
        changedBy: vendor.userId,
      },
    })

    // Update vendor total orders count on delivery
    if (action === 'delivered') {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { totalOrders: { increment: 1 } },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        total: Number(updated.total),
        subtotal: Number(updated.subtotal),
      },
    })
  } catch (error) {
    console.error('Vendor order PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
