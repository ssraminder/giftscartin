import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { constructStripeEvent } from '@/lib/stripe'

/**
 * POST /api/payments/stripe/webhook
 * Stripe sends webhook events here after payment completion.
 * Must use raw body for signature verification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const event = constructStripeEvent(body, signature)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as unknown as {
        id: string
        payment_intent: string | null
        metadata: Record<string, string> | null
      }

      const orderId = session.metadata?.orderId
      if (!orderId) {
        console.error('Stripe webhook: no orderId in metadata')
        return NextResponse.json({ received: true })
      }

      // Update payment and order in transaction
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { orderId },
          data: {
            stripePaymentIntentId: (session.payment_intent as string) || undefined,
            status: 'PAID',
          },
        })

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            paymentMethod: 'stripe',
            status: 'CONFIRMED',
          },
        })

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: 'CONFIRMED',
            note: 'Payment verified via Stripe',
          },
        })
      })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as unknown as {
        id: string
        metadata: Record<string, string> | null
      }

      const orderId = paymentIntent.metadata?.orderId
      if (orderId) {
        await prisma.payment.update({
          where: { orderId },
          data: { status: 'FAILED' },
        })

        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'FAILED' },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}
