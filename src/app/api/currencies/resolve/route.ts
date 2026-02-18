import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Hardcoded INR fallback so the site never breaks even if the DB is unreachable
const INR_FALLBACK = {
  code: 'INR',
  name: 'Indian Rupee',
  symbol: '\u20B9',
  symbolPosition: 'before',
  exchangeRate: 1,
  markup: 0,
  rounding: 'nearest',
  roundTo: 1,
  locale: 'en-IN',
}

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

    let matched: typeof INR_FALLBACK | null = null

    try {
      // Find a currency config that includes this country
      const allCurrencies = await prisma.currencyConfig.findMany({
        where: { isActive: true },
      })

      const countryMatch = allCurrencies.find((c) =>
        c.countries.includes(country)
      )

      if (countryMatch) {
        matched = {
          code: countryMatch.code,
          name: countryMatch.name,
          symbol: countryMatch.symbol,
          symbolPosition: countryMatch.symbolPosition,
          exchangeRate: Number(countryMatch.exchangeRate),
          markup: Number(countryMatch.markup),
          rounding: countryMatch.rounding,
          roundTo: Number(countryMatch.roundTo),
          locale: countryMatch.locale,
        }
      } else {
        // Use the default currency
        const defaultCurrency = allCurrencies.find((c) => c.isDefault) || allCurrencies[0]
        if (defaultCurrency) {
          matched = {
            code: defaultCurrency.code,
            name: defaultCurrency.name,
            symbol: defaultCurrency.symbol,
            symbolPosition: defaultCurrency.symbolPosition,
            exchangeRate: Number(defaultCurrency.exchangeRate),
            markup: Number(defaultCurrency.markup),
            rounding: defaultCurrency.rounding,
            roundTo: Number(defaultCurrency.roundTo),
            locale: defaultCurrency.locale,
          }
        }
      }
    } catch (dbError) {
      console.error('Currency resolve DB error:', dbError)
      // Fall through to INR_FALLBACK below
    }

    if (!matched) {
      matched = INR_FALLBACK
    }

    const region = country === 'IN' ? 'india' : 'international'
    const gateways = region === 'india' ? ['razorpay', 'cod'] : ['stripe', 'paypal']

    return NextResponse.json({
      success: true,
      data: {
        country,
        region,
        gateways,
        currency: matched,
      },
    })
  } catch (error) {
    console.error('Currency resolve error:', error)
    // Even on total failure, return INR fallback so the site keeps working
    return NextResponse.json({
      success: true,
      data: {
        country: 'IN',
        region: 'india',
        gateways: ['razorpay', 'cod'],
        currency: INR_FALLBACK,
      },
    })
  }
}
