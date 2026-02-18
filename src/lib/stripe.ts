import Stripe from 'stripe'

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return _stripe
}

/**
 * Create a Stripe Checkout Session for an order.
 * Returns the session URL for redirect.
 */
export async function createStripeCheckoutSession(params: {
  orderId: string
  orderNumber: string
  amountInr: number
  customerEmail?: string
  successUrl: string
  cancelUrl: string
}): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe()

  // Convert INR to USD cents (Stripe expects smallest currency unit)
  const usdAmount = Math.round(params.amountInr * 0.012 * 100)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    currency: 'usd',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Gifts Cart India - Order ${params.orderNumber}`,
            description: 'Gift delivery order',
          },
          unit_amount: usdAmount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
    },
    customer_email: params.customerEmail || undefined,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })

  return {
    sessionId: session.id,
    url: session.url!,
  }
}

/**
 * Verify a Stripe webhook event signature.
 */
export function constructStripeEvent(
  body: string,
  signature: string
): Stripe.Event {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

/**
 * Retrieve a Stripe Checkout Session by ID.
 */
export async function getStripeSession(sessionId: string) {
  const stripe = getStripe()
  return stripe.checkout.sessions.retrieve(sessionId)
}
