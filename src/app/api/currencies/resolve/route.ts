import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/currencies/resolve
 * Resolves the best currency config for the visitor based on their country code.
 * Uses geo headers (CF-IPCountry, x-vercel-ip-country, x-country) to detect country.
 * Returns the matching CurrencyConfig or the default (INR).
 */
export async function GET(request: NextRequest) {
  try {
    // Detect country from headers
    const country = (
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('x-country') ||
      'IN'
    ).toUpperCase()

    // Find a currency config that includes this country
    const allCurrencies = await prisma.currencyConfig.findMany({
      where: { isActive: true },
    })

    let matched = allCurrencies.find((c) =>
      c.countries.includes(country)
    )

    // If no country match, use the default currency (INR)
    if (!matched) {
      matched = allCurrencies.find((c) => c.isDefault)
    }

    // Final fallback if somehow no default exists
    if (!matched) {
      matched = allCurrencies.find((c) => c.code === 'INR') || allCurrencies[0]
    }

    const region = country === 'IN' ? 'india' : 'international'
    const gateways = region === 'india' ? ['razorpay', 'cod'] : ['stripe', 'paypal']

    return NextResponse.json({
      success: true,
      data: {
        country,
        region,
        gateways,
        currency: matched
          ? {
              code: matched.code,
              name: matched.name,
              symbol: matched.symbol,
              symbolPosition: matched.symbolPosition,
              exchangeRate: Number(matched.exchangeRate),
              markup: Number(matched.markup),
              rounding: matched.rounding,
              roundTo: Number(matched.roundTo),
              locale: matched.locale,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Currency resolve error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve currency' },
      { status: 500 }
    )
  }
}
