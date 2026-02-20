import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isAdminRole(user.role)) return null
  return user
}

// POST: Record manual payment for an order
export async function POST(
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
    const { paymentMethodId, amount, transactionRef, notes, paidAt } = body

    if (!paymentMethodId || !amount || !paidAt) {
      return NextResponse.json(
        { success: false, error: 'Payment method, amount, and payment date are required' },
        { status: 400 }
      )
    }

    const parsedPaidAt = new Date(paidAt)
    if (isNaN(parsedPaidAt.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment date' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Verify order exists and payment is not already recorded
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Payment already recorded for this order' },
        { status: 400 }
      )
    }

    // Verify payment method exists
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    })
    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    // Update order payment status and method
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod.name,
      },
    })

    // Upsert payment record
    await prisma.payment.upsert({
      where: { orderId: id },
      update: {
        amount,
        method: paymentMethod.slug,
        status: 'PAID',
        paidAt: parsedPaidAt,
      },
      create: {
        orderId: id,
        amount,
        currency: 'INR',
        gateway: 'COD',
        method: paymentMethod.slug,
        status: 'PAID',
        paidAt: parsedPaidAt,
      },
    })

    // Add status history entry
    const historyNote = [
      `Payment recorded manually by admin`,
      paymentMethod.name ? ` — ${paymentMethod.name}` : '',
      transactionRef ? ` (Ref: ${transactionRef})` : '',
      notes ? ` — ${notes}` : '',
    ].join('')

    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status: order.status,
        note: historyNote,
        changedBy: admin.id,
      },
    })

    return NextResponse.json({ success: true, data: updatedOrder })
  } catch (error) {
    console.error('POST /api/admin/orders/[id]/payment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
