import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

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
      const supabase = getSupabaseAdmin()

      // Find a currency config that includes this country
      const { data: allCurrencies } = await supabase
        .from('currency_configs')
        .select('*')
        .eq('isActive', true)

      const currencies = allCurrencies || []

      const countryMatch = currencies.find((c: Record<string, unknown>) =>
        (c.countries as string[]).includes(country)
      )

      if (countryMatch) {
        matched = {
          code: countryMatch.code as string,
          name: countryMatch.name as string,
          symbol: countryMatch.symbol as string,
          symbolPosition: countryMatch.symbolPosition as string,
          exchangeRate: Number(countryMatch.exchangeRate),
          markup: Number(countryMatch.markup),
          rounding: countryMatch.rounding as string,
          roundTo: Number(countryMatch.roundTo),
          locale: countryMatch.locale as string,
        }
      } else {
        // Use the default currency
        const defaultCurrency = currencies.find((c: Record<string, unknown>) => c.isDefault) || currencies[0]
        if (defaultCurrency) {
          matched = {
            code: defaultCurrency.code as string,
            name: defaultCurrency.name as string,
            symbol: defaultCurrency.symbol as string,
            symbolPosition: defaultCurrency.symbolPosition as string,
            exchangeRate: Number(defaultCurrency.exchangeRate),
            markup: Number(defaultCurrency.markup),
            rounding: defaultCurrency.rounding as string,
            roundTo: Number(defaultCurrency.roundTo),
            locale: defaultCurrency.locale as string,
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
