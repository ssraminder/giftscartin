import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { updateOrderStatusSchema } from '@/lib/validations'

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return null
  return user
}

// PATCH: Update order status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateOrderStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status, note } = parsed.data

    // Verify order exists
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Prevent status changes on already completed/cancelled orders
    if (order.status === 'DELIVERED' || order.status === 'REFUNDED') {
      return NextResponse.json(
        { success: false, error: `Cannot change status of a ${order.status.toLowerCase()} order` },
        { status: 400 }
      )
    }

    // Update order status and create history entry in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status,
          ...(status === 'CANCELLED' ? { paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : 'FAILED' } : {}),
        },
      })

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          note: note || null,
          changedBy: admin.id,
        },
      })

      return updatedOrder
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/admin/orders/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}
