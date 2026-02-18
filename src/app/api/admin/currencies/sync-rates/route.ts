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

    // Fetch latest rates from ExchangeRate-API (base: INR)
    const apiUrl = 'https://open.er-api.com/v6/latest/INR'
    const response = await fetch(apiUrl, { next: { revalidate: 0 } })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Exchange rate API returned ${response.status}` },
        { status: 502 }
      )
    }

    const data: ExchangeRateResponse = await response.json()

    if (data.result !== 'success') {
      return NextResponse.json(
        { success: false, error: 'Exchange rate API returned an error' },
        { status: 502 }
      )
    }

    // Get all non-default currencies from our DB
    const currencies = await prisma.currencyConfig.findMany({
      where: { isDefault: false },
    })

    const updated: string[] = []
    const skipped: string[] = []

    for (const currency of currencies) {
      const newRate = data.rates[currency.code]

      if (newRate != null && newRate > 0) {
        await prisma.currencyConfig.update({
          where: { id: currency.id },
          data: { exchangeRate: newRate },
        })
        updated.push(`${currency.code}: ${Number(currency.exchangeRate)} -> ${newRate}`)
      } else {
        skipped.push(currency.code)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        source: apiUrl,
        lastUpdated: data.time_last_update_utc,
        baseCurrency: data.base_code,
        updated,
        skipped,
      },
    })
  } catch (error) {
    console.error('Currency sync error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync exchange rates' },
      { status: 500 }
    )
  }
}
