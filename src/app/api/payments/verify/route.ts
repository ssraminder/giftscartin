import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { getStripeSession } from '@/lib/stripe'
import { getPayPalOrder } from '@/lib/paypal'
import { z } from 'zod/v4'

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  gateway: z.enum(['razorpay', 'stripe', 'paypal']),
  // Razorpay-specific
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const body = await request.json()
    const parsed = verifyPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { orderId, gateway } = parsed.data

    // Verify the order exists and belongs to the user (or is a guest order)
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

    // Verify ownership: logged-in user must own the order, guest orders are allowed
    if (session?.user?.id) {
      if (order.userId && order.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'Not authorized' },
          { status: 403 }
        )
      }
    } else if (order.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // ─── RAZORPAY VERIFICATION ───
    if (gateway === 'razorpay') {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json(
          { success: false, error: 'Missing Razorpay payment details' },
          { status: 400 }
        )
      }

      const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)

      if (!isValid) {
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

      // Sequential queries (no interactive transaction — pgbouncer compatible)
      await prisma.payment.update({
        where: { orderId: order.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'PAID',
        },
      })

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: 'razorpay',
          status: 'CONFIRMED',
        },
      })

      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: 'CONFIRMED',
          note: 'Payment verified via Razorpay',
        },
      })

      return NextResponse.json({
        success: true,
        data: { verified: true, gateway: 'razorpay', orderId, orderNumber: order.orderNumber },
      })
    }

    // ─── STRIPE VERIFICATION ───
    // (Stripe is primarily verified via webhook, but this route can check status)
    if (gateway === 'stripe') {
      if (!order.payment?.stripeSessionId) {
        return NextResponse.json(
          { success: false, error: 'No Stripe session found for this order' },
          { status: 400 }
        )
      }

      const stripeSession = await getStripeSession(order.payment.stripeSessionId)

      if (stripeSession.payment_status === 'paid') {
        // Sequential queries (no interactive transaction — pgbouncer compatible)
        // Webhook may have already updated, but ensure consistency
        await prisma.payment.update({
          where: { orderId: order.id },
          data: {
            stripePaymentIntentId: stripeSession.payment_intent as string,
            status: 'PAID',
          },
        })

        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            paymentMethod: 'stripe',
            status: 'CONFIRMED',
          },
        })

        return NextResponse.json({
          success: true,
          data: { verified: true, gateway: 'stripe', orderId, orderNumber: order.orderNumber },
        })
      }

      return NextResponse.json(
        { success: false, error: 'Stripe payment not yet completed' },
        { status: 400 }
      )
    }

    // ─── PAYPAL VERIFICATION ───
    // (PayPal capture happens in the capture route, but this can check status)
    if (gateway === 'paypal') {
      if (!order.payment?.paypalOrderId) {
        return NextResponse.json(
          { success: false, error: 'No PayPal order found' },
          { status: 400 }
        )
      }

      const paypalOrder = await getPayPalOrder(order.payment.paypalOrderId)

      if (paypalOrder.status === 'COMPLETED') {
        return NextResponse.json({
          success: true,
          data: { verified: true, gateway: 'paypal', orderId, orderNumber: order.orderNumber },
        })
      }

      return NextResponse.json(
        { success: false, error: 'PayPal payment not yet completed' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported gateway' },
      { status: 400 }
    )
  } catch (error) {
    console.error('POST /api/payments/verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
