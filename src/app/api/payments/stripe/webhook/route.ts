import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
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
    const supabase = getSupabaseAdmin()

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

      // Sequential queries (no interactive transaction — pgbouncer compatible)
      await supabase
        .from('payments')
        .update({
          stripePaymentIntentId: (session.payment_intent as string) || undefined,
          status: 'PAID',
          updatedAt: new Date().toISOString(),
        })
        .eq('orderId', orderId)

      await supabase
        .from('orders')
        .update({
          paymentStatus: 'PAID',
          paymentMethod: 'stripe',
          status: 'CONFIRMED',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId)

      await supabase
        .from('order_status_history')
        .insert({
          orderId,
          status: 'CONFIRMED',
          note: 'Payment verified via Stripe',
        })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as unknown as {
        id: string
        metadata: Record<string, string> | null
      }

      const orderId = paymentIntent.metadata?.orderId
      if (orderId) {
        await supabase
          .from('payments')
          .update({ status: 'FAILED', updatedAt: new Date().toISOString() })
          .eq('orderId', orderId)

        await supabase
          .from('orders')
          .update({ paymentStatus: 'FAILED', updatedAt: new Date().toISOString() })
          .eq('id', orderId)
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
