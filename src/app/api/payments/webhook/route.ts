import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

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

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const razorpayOrderId = event.payload.payment?.entity?.order_id ||
                             event.payload.order?.entity?.id

    if (razorpayOrderId) {
      // Find payment record and update order
      const payment = await prisma.payment.findFirst({
        where: { razorpayOrderId },
      })

      if (payment) {
        // Sequential queries (no interactive transaction — pgbouncer compatible)
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            razorpayPaymentId: event.payload.payment?.entity?.id,
          },
        })

        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
          },
        })

        await prisma.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            status: 'CONFIRMED',
            note: 'Payment confirmed via Razorpay webhook',
          },
        })

        console.log('[webhook] order confirmed:', payment.orderId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
