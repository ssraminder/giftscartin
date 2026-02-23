import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-razorpay-signature')
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret || !signature) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  const supabase = getSupabaseAdmin()

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const razorpayOrderId = event.payload.payment?.entity?.order_id ||
                             event.payload.order?.entity?.id

    if (razorpayOrderId) {
      // Find payment record and update order
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('razorpayOrderId', razorpayOrderId)
        .limit(1)
        .single()

      if (payment) {
        // Sequential queries (no interactive transaction — pgbouncer compatible)
        await supabase
          .from('payments')
          .update({
            status: 'PAID',
            razorpayPaymentId: event.payload.payment?.entity?.id,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', payment.id)

        await supabase
          .from('orders')
          .update({
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', payment.orderId)

        await supabase
          .from('order_status_history')
          .insert({
            orderId: payment.orderId,
            status: 'CONFIRMED',
            note: 'Payment confirmed via Razorpay webhook',
          })

        console.log('[webhook] order confirmed:', payment.orderId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
