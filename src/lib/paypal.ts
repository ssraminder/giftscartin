const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

/**
 * Get an OAuth2 access token from PayPal.
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal auth failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  return data.access_token
}

/**
 * Create a PayPal order.
 * Returns the PayPal order ID and approval URL.
 */
export async function createPayPalOrder(params: {
  orderId: string
  orderNumber: string
  amountInr: number
  returnUrl: string
  cancelUrl: string
}): Promise<{ paypalOrderId: string; approvalUrl: string }> {
  const accessToken = await getAccessToken()

  // Convert INR to USD
  const usdAmount = (params.amountInr * 0.012).toFixed(2)

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.orderId,
          description: `Gifts Cart India - Order ${params.orderNumber}`,
          amount: {
            currency_code: 'USD',
            value: usdAmount,
          },
          custom_id: params.orderId,
        },
      ],
      application_context: {
        brand_name: 'Gifts Cart India',
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        user_action: 'PAY_NOW',
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal create order failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const approvalUrl = data.links?.find(
    (link: { rel: string; href: string }) => link.rel === 'approve'
  )?.href

  if (!approvalUrl) {
    throw new Error('PayPal approval URL not found in response')
  }

  return {
    paypalOrderId: data.id,
    approvalUrl,
  }
}

/**
 * Capture a PayPal order after buyer approval.
 */
export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  captureId: string
  status: string
}> {
  const accessToken = await getAccessToken()

  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal capture failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const captureId =
    data.purchase_units?.[0]?.payments?.captures?.[0]?.id || data.id

  return {
    captureId,
    status: data.status,
  }
}

/**
 * Get PayPal order details.
 */
export async function getPayPalOrder(paypalOrderId: string) {
  const accessToken = await getAccessToken()

  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal get order failed: ${res.status} ${text}`)
  }

  return res.json()
}
