import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

interface ExchangeRateResponse {
  result: string
  base_code: string
  rates: Record<string, number>
  time_last_update_utc: string
}

/**
 * Fetch exchange rates from an API URL with a timeout.
 * Returns the parsed response or throws with a descriptive error.
 */
async function fetchRatesFromSource(
  apiUrl: string,
  timeoutMs: number = 10000
): Promise<ExchangeRateResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${apiUrl}`)
    }

    const data: ExchangeRateResponse = await response.json()

    if (data.result !== 'success') {
      throw new Error(`API returned result="${data.result}" from ${apiUrl}`)
    }

    if (!data.rates || Object.keys(data.rates).length === 0) {
      throw new Error(`API returned empty rates from ${apiUrl}`)
    }

    return data
  } finally {
    clearTimeout(timeout)
  }
}

// Ordered list of free exchange-rate API sources (base: INR)
const RATE_SOURCES = [
  'https://open.er-api.com/v6/latest/INR',
  'https://api.exchangerate-api.com/v4/latest/INR',
]

/**
 * Try each source in order until one succeeds.
 */
async function fetchRatesWithFallback(): Promise<{
  data: ExchangeRateResponse
  sourceUrl: string
}> {
  const errors: string[] = []

  for (const url of RATE_SOURCES) {
    try {
      const data = await fetchRatesFromSource(url)
      return { data, sourceUrl: url }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${url}: ${message}`)
    }
  }

  throw new Error(
    `All exchange rate sources failed:\n${errors.join('\n')}`
  )
}

/**
 * POST /api/admin/currencies/sync-rates
 *
 * Fetches live exchange rates from ExchangeRate-API (open access, no key required)
 * and updates all non-default (non-INR) currencies in the database.
 *
 * Auth: admin session OR CRON_SECRET header (for scheduled function calls).
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: either admin session or cron secret
    const cronSecret = request.headers.get('x-cron-secret')
    const isAuthedViaCron =
      cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET

    if (!isAuthedViaCron) {
      const session = await getServerSession(authOptions)
      if (
        !session?.user ||
        !['ADMIN', 'SUPER_ADMIN'].includes(
          (session.user as { role?: string }).role || ''
        )
      ) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Fetch latest rates, trying multiple sources
    let rateData: ExchangeRateResponse
    let sourceUrl: string

    try {
      const result = await fetchRatesWithFallback()
      rateData = result.data
      sourceUrl = result.sourceUrl
    } catch (fetchError) {
      const detail = fetchError instanceof Error ? fetchError.message : String(fetchError)
      console.error('Exchange rate fetch failed:', detail)
      return NextResponse.json(
        {
          success: false,
          error: 'Could not reach any exchange rate service. You can still edit rates manually via the edit button on each currency.',
          detail,
        },
        { status: 502 }
      )
    }

    // Get all non-default currencies from our DB
    const currencies = await prisma.currencyConfig.findMany({
      where: { isDefault: false },
    })

    if (currencies.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          source: sourceUrl,
          lastUpdated: rateData.time_last_update_utc,
          baseCurrency: rateData.base_code,
          updated: [],
          skipped: [],
          message: 'No non-default currencies configured to update.',
        },
      })
    }

    const updated: string[] = []
    const skipped: string[] = []

    for (const currency of currencies) {
      const newRate = rateData.rates[currency.code]

      if (newRate != null && newRate > 0) {
        await prisma.currencyConfig.update({
          where: { id: currency.id },
          data: { exchangeRate: newRate },
        })
        updated.push(`${currency.code}: ${Number(currency.exchangeRate)} → ${newRate}`)
      } else {
        skipped.push(currency.code)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        source: sourceUrl,
        lastUpdated: rateData.time_last_update_utc,
        baseCurrency: rateData.base_code,
        updated,
        skipped,
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Currency sync error:', detail)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync exchange rates',
        detail,
      },
      { status: 500 }
    )
  }
}
