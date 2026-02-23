import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
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
    const session = await getSessionFromRequest(request)

    const body = await request.json()
    const parsed = verifyPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { orderId, gateway } = parsed.data
    const supabase = getSupabaseAdmin()

    // Verify the order exists and belongs to the user (or is a guest order)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, payments(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // The payments relation returns an array; pick the first one
    const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments

    // Verify ownership: logged-in user must own the order, guest orders are allowed
    if (session?.id) {
      if (order.userId && order.userId !== session.id) {
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
        if (payment) {
          await supabase
            .from('payments')
            .update({ status: 'FAILED', updatedAt: new Date().toISOString() })
            .eq('id', payment.id)
        }

        await supabase
          .from('orders')
          .update({ paymentStatus: 'FAILED', updatedAt: new Date().toISOString() })
          .eq('id', orderId)

        return NextResponse.json(
          { success: false, error: 'Payment verification failed' },
          { status: 400 }
        )
      }

      // Sequential queries (no interactive transaction — pgbouncer compatible)
      await supabase
        .from('payments')
        .update({
          razorpayPaymentId,
          razorpaySignature,
          status: 'PAID',
          updatedAt: new Date().toISOString(),
        })
        .eq('orderId', order.id)

      await supabase
        .from('orders')
        .update({
          paymentStatus: 'PAID',
          paymentMethod: 'razorpay',
          status: 'CONFIRMED',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId)

      await supabase
        .from('order_status_history')
        .insert({
          orderId,
          status: 'CONFIRMED',
          note: 'Payment verified via Razorpay',
        })

      return NextResponse.json({
        success: true,
        data: { verified: true, gateway: 'razorpay', orderId, orderNumber: order.orderNumber },
      })
    }

    // ─── STRIPE VERIFICATION ───
    // (Stripe is primarily verified via webhook, but this route can check status)
    if (gateway === 'stripe') {
      if (!payment?.stripeSessionId) {
        return NextResponse.json(
          { success: false, error: 'No Stripe session found for this order' },
          { status: 400 }
        )
      }

      const stripeSession = await getStripeSession(payment.stripeSessionId)

      if (stripeSession.payment_status === 'paid') {
        // Sequential queries (no interactive transaction — pgbouncer compatible)
        // Webhook may have already updated, but ensure consistency
        await supabase
          .from('payments')
          .update({
            stripePaymentIntentId: stripeSession.payment_intent as string,
            status: 'PAID',
            updatedAt: new Date().toISOString(),
          })
          .eq('orderId', order.id)

        await supabase
          .from('orders')
          .update({
            paymentStatus: 'PAID',
            paymentMethod: 'stripe',
            status: 'CONFIRMED',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', orderId)

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
      if (!payment?.paypalOrderId) {
        return NextResponse.json(
          { success: false, error: 'No PayPal order found' },
          { status: 400 }
        )
      }

      const paypalOrder = await getPayPalOrder(payment.paypalOrderId)

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
