import Razorpay from 'razorpay'
import crypto from 'crypto'

let _razorpay: Razorpay | null = null

function getRazorpay(): Razorpay {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
  }
  return _razorpay
}

export async function createRazorpayOrder(
  amount: number,
  currency: string = 'INR',
  receipt: string
) {
  const amountInPaise = Math.round(Number(amount) * 100)
  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error(`Invalid Razorpay amount: ${amount} (paise: ${amountInPaise})`)
  }

  try {
    const order = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: currency.toUpperCase(),
      receipt: receipt.substring(0, 40), // Razorpay max receipt length is 40
      notes: {
        source: 'giftscart',
      },
    })
    return order
  } catch (error: unknown) {
    console.error('[razorpay] order create failed:', JSON.stringify(error))
    throw error
  }
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}
