import { NextRequest, NextResponse } from 'next/server'
import { getPaymentRegionFromRequest, getCountryFromRequest } from '@/lib/geo'

/**
 * GET /api/geo
 * Returns the detected payment region and country based on visitor IP.
 * Frontend uses this to decide which payment options to show.
 */
export async function GET(request: NextRequest) {
  const region = getPaymentRegionFromRequest(request)
  const country = getCountryFromRequest(request)

  return NextResponse.json({
    success: true,
    data: {
      region,
      country,
      currency: region === 'india' ? 'INR' : 'USD',
      gateways: region === 'india'
        ? ['razorpay', 'cod']
        : ['stripe', 'paypal'],
    },
  })
}
