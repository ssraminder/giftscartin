import { headers } from 'next/headers'

export type PaymentRegion = 'india' | 'international'

/**
 * Detect if the visitor is from India based on request headers.
 * Priority:
 * 1. Cloudflare CF-IPCountry header (most reliable on Cloudflare/Netlify)
 * 2. Vercel x-vercel-ip-country header
 * 3. Explicit x-country header (from CDN/proxy)
 * 4. Falls back to 'india' (safe default for an Indian gifting platform)
 */
export function getPaymentRegion(): PaymentRegion {
  const headersList = headers()

  // Cloudflare sets this on every request
  const cfCountry = headersList.get('cf-ipcountry')
  if (cfCountry) {
    return cfCountry.toUpperCase() === 'IN' ? 'india' : 'international'
  }

  // Vercel sets this
  const vercelCountry = headersList.get('x-vercel-ip-country')
  if (vercelCountry) {
    return vercelCountry.toUpperCase() === 'IN' ? 'india' : 'international'
  }

  // Explicit header from CDN/proxy
  const explicitCountry = headersList.get('x-country')
  if (explicitCountry) {
    return explicitCountry.toUpperCase() === 'IN' ? 'india' : 'international'
  }

  // Default to india (primary market)
  return 'india'
}

/**
 * Get payment region from a request object (for API routes).
 */
export function getPaymentRegionFromRequest(request: Request): PaymentRegion {
  const cfCountry = request.headers.get('cf-ipcountry')
  if (cfCountry) {
    return cfCountry.toUpperCase() === 'IN' ? 'india' : 'international'
  }

  const vercelCountry = request.headers.get('x-vercel-ip-country')
  if (vercelCountry) {
    return vercelCountry.toUpperCase() === 'IN' ? 'india' : 'international'
  }

  const explicitCountry = request.headers.get('x-country')
  if (explicitCountry) {
    return explicitCountry.toUpperCase() === 'IN' ? 'india' : 'international'
  }

  return 'india'
}

// INR to USD approximate conversion rate (updated periodically)
// In production, use a real-time forex API
const INR_TO_USD_RATE = 0.012

/**
 * Convert INR amount to USD for international payments.
 */
export function inrToUsd(inrAmount: number): number {
  return Math.round(inrAmount * INR_TO_USD_RATE * 100) / 100
}

/**
 * Format price based on region.
 */
export function formatRegionalPrice(amount: number, region: PaymentRegion): string {
  if (region === 'india') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(inrToUsd(amount))
}
