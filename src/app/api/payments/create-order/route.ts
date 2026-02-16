import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { createRazorpayOrder } from '@/lib/razorpay'
import { createPaymentOrderSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createPaymentOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { orderId } = parsed.data

    // Fetch the order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Order is already paid' },
        { status: 400 }
      )
    }

    // Create Razorpay order
    const amount = Number(order.total)
    const razorpayOrder = await createRazorpayOrder(amount, 'INR', order.orderNumber)

    // Create or update payment record
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        amount: order.total,
        razorpayOrderId: razorpayOrder.id,
        status: 'PENDING',
      },
      create: {
        orderId: order.id,
        amount: order.total,
        razorpayOrderId: razorpayOrder.id,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    })
  } catch (error) {
    console.error('POST /api/payments/create-order error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment order' },
      { status: 500 }
    )
  }
}
