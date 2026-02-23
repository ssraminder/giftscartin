import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { capturePayPalOrder } from '@/lib/paypal'

/**
 * GET /api/payments/paypal/capture?orderId=xxx
 * PayPal redirects here after buyer approves payment.
 * Captures the payment and redirects to order page.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://giftscart.netlify.app'

  if (!orderId) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_order`)
  }

  try {
    const supabase = getSupabaseAdmin()

    // Find the payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('orderId', orderId)
      .single()

    if (!payment || !payment.paypalOrderId) {
      return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=error`)
    }

    // Capture the PayPal payment
    const capture = await capturePayPalOrder(payment.paypalOrderId)

    if (capture.status === 'COMPLETED') {
      // Sequential queries (no interactive transaction — pgbouncer compatible)
      await supabase
        .from('payments')
        .update({
          paypalCaptureId: capture.captureId,
          status: 'PAID',
          updatedAt: new Date().toISOString(),
        })
        .eq('orderId', orderId)

      await supabase
        .from('orders')
        .update({
          paymentStatus: 'PAID',
          paymentMethod: 'paypal',
          status: 'CONFIRMED',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId)

      await supabase
        .from('order_status_history')
        .insert({
          orderId,
          status: 'CONFIRMED',
          note: 'Payment verified via PayPal',
        })

      return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=success&gateway=paypal`)
    } else {
      // Payment not completed
      await supabase
        .from('payments')
        .update({ status: 'FAILED', updatedAt: new Date().toISOString() })
        .eq('orderId', orderId)

      return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=failed`)
    }
  } catch (error) {
    console.error('PayPal capture error:', error)
    return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=error`)
  }
}
