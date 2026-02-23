import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Netlify sets x-nf-country, Cloudflare sets cf-ipcountry
  const country = (
    request.headers.get('x-nf-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-country') ||
    'IN'
  ).toUpperCase()

  const isIndia = country === 'IN'

  return NextResponse.json({
    country,
    isIndia,
    gateway: isIndia ? 'razorpay' : 'stripe',
    usdRate: 84,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
