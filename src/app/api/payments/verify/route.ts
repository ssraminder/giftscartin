import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { verifyPaymentSchema } from '@/lib/validations'

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
    const parsed = verifyPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data

    // Verify the order exists and belongs to the user
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

    // Verify the Razorpay signature
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)

    if (!isValid) {
      // Update payment as failed
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: 'FAILED' },
        })
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      })

      return NextResponse.json(
        { success: false, error: 'Payment verification failed' },
        { status: 400 }
      )
    }

    // Update payment and order status in a transaction
    await prisma.$transaction(async (tx) => {
      // Update payment record
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'PAID',
        },
      })

      // Update order payment status
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: 'razorpay',
          status: 'CONFIRMED',
        },
      })

      // Add status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'CONFIRMED',
          note: 'Payment verified successfully',
        },
      })
    })

    return NextResponse.json({
      success: true,
      data: { verified: true, orderId, orderNumber: order.orderNumber },
    })
  } catch (error) {
    console.error('POST /api/payments/verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
