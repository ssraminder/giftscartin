import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { capturePayPalOrder } from '@/lib/paypal'

/**
 * GET /api/payments/paypal/capture?orderId=xxx
 * PayPal redirects here after buyer approves payment.
 * Captures the payment and redirects to order page.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  if (!orderId) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_order`)
  }

  try {
    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { orderId },
    })

    if (!payment || !payment.paypalOrderId) {
      return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=error`)
    }

    // Capture the PayPal payment
    const capture = await capturePayPalOrder(payment.paypalOrderId)

    if (capture.status === 'COMPLETED') {
      // Update payment and order in transaction
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { orderId },
          data: {
            paypalCaptureId: capture.captureId,
            status: 'PAID',
          },
        })

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            paymentMethod: 'paypal',
            status: 'CONFIRMED',
          },
        })

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: 'CONFIRMED',
            note: 'Payment verified via PayPal',
          },
        })
      })

      return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=success&gateway=paypal`)
    } else {
      // Payment not completed
      await prisma.payment.update({
        where: { orderId },
        data: { status: 'FAILED' },
      })

      return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=failed`)
    }
  } catch (error) {
    console.error('PayPal capture error:', error)
    return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=error`)
  }
}
