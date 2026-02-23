import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { createRazorpayOrder } from '@/lib/razorpay'
import { createStripeCheckoutSession } from '@/lib/stripe'
import { createPayPalOrder } from '@/lib/paypal'
import { getPaymentRegionFromRequest, inrToUsd } from '@/lib/geo'
import { z } from 'zod/v4'

const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  gateway: z.enum(['razorpay', 'stripe', 'paypal', 'cod']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const body = await request.json()
    const parsed = createPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { orderId, gateway: requestedGateway } = parsed.data

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

    // Verify ownership: logged-in user must own the order, guest orders are allowed
    // (guest orders were just created moments ago in the same checkout flow)
    if (session?.user?.id) {
      if (order.userId && order.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'Not authorized' },
          { status: 403 }
        )
      }
    } else if (order.userId) {
      // Guest trying to pay for a logged-in user's order
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Order is already paid' },
        { status: 400 }
      )
    }

    // Determine gateway: use requested gateway, or auto-detect from IP
    const region = getPaymentRegionFromRequest(request)
    const gateway = requestedGateway || (region === 'india' ? 'razorpay' : 'stripe')
    const amount = Number(order.total)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // ─── COD ───
    if (gateway === 'cod') {
      await prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          amount: order.total,
          currency: 'INR',
          gateway: 'COD',
          status: 'PENDING',
        },
        create: {
          orderId: order.id,
          amount: order.total,
          currency: 'INR',
          gateway: 'COD',
          status: 'PENDING',
        },
      })

      // Confirm order directly for COD
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: 'cod',
          status: 'CONFIRMED',
        },
      })

      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: 'CONFIRMED',
          note: 'Cash on delivery order confirmed',
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          gateway: 'cod',
          orderId,
          orderNumber: order.orderNumber,
        },
      })
    }

    // ─── RAZORPAY ───
    if (gateway === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder(amount, 'INR', order.orderNumber)

      await prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          amount: order.total,
          currency: 'INR',
          gateway: 'RAZORPAY',
          razorpayOrderId: razorpayOrder.id,
          status: 'PENDING',
        },
        create: {
          orderId: order.id,
          amount: order.total,
          currency: 'INR',
          gateway: 'RAZORPAY',
          razorpayOrderId: razorpayOrder.id,
          status: 'PENDING',
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          gateway: 'razorpay',
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
        },
      })
    }

    // ─── STRIPE ───
    if (gateway === 'stripe') {
      const usdAmount = inrToUsd(amount)

      const stripeSession = await createStripeCheckoutSession({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountInr: amount,
        customerEmail: (session?.user as { email?: string } | undefined)?.email || undefined,
        successUrl: `${baseUrl}/orders/${order.id}?payment=success&gateway=stripe`,
        cancelUrl: `${baseUrl}/orders/${order.id}?payment=cancelled`,
      })

      await prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          amount: usdAmount,
          currency: 'USD',
          gateway: 'STRIPE',
          stripeSessionId: stripeSession.sessionId,
          status: 'PENDING',
        },
        create: {
          orderId: order.id,
          amount: usdAmount,
          currency: 'USD',
          gateway: 'STRIPE',
          stripeSessionId: stripeSession.sessionId,
          status: 'PENDING',
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          gateway: 'stripe',
          sessionId: stripeSession.sessionId,
          url: stripeSession.url,
        },
      })
    }

    // ─── PAYPAL ───
    if (gateway === 'paypal') {
      const usdAmount = inrToUsd(amount)

      const paypalOrder = await createPayPalOrder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountInr: amount,
        returnUrl: `${baseUrl}/api/payments/paypal/capture?orderId=${order.id}`,
        cancelUrl: `${baseUrl}/orders/${order.id}?payment=cancelled`,
      })

      await prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          amount: usdAmount,
          currency: 'USD',
          gateway: 'PAYPAL',
          paypalOrderId: paypalOrder.paypalOrderId,
          status: 'PENDING',
        },
        create: {
          orderId: order.id,
          amount: usdAmount,
          currency: 'USD',
          gateway: 'PAYPAL',
          paypalOrderId: paypalOrder.paypalOrderId,
          status: 'PENDING',
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          gateway: 'paypal',
          paypalOrderId: paypalOrder.paypalOrderId,
          approvalUrl: paypalOrder.approvalUrl,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: `Unsupported gateway: ${gateway}` },
      { status: 400 }
    )
  } catch (error) {
    console.error('POST /api/payments/create-order error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment order' },
      { status: 500 }
    )
  }
}
