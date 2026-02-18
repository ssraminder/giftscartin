import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

/**
 * GET /api/admin/currencies/rate?code=USD
 *
 * Fetches the live exchange rate for a single currency relative to INR.
 * Used by the admin UI when selecting a currency from the preset dropdown.
 */
export async function GET(request: NextRequest) {
  try {
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

    const code = request.nextUrl.searchParams.get('code')?.toUpperCase()
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Missing ?code= parameter' },
        { status: 400 }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/INR', {
        signal: controller.signal,
        cache: 'no-store',
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      const rate = data.rates?.[code]

      if (rate == null) {
        return NextResponse.json(
          { success: false, error: `Currency code "${code}" not found in exchange rate data` },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          code,
          rate,
          source: 'ExchangeRate-API',
          lastUpdated: data.time_last_update_utc,
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Currency rate fetch error:', detail)
    return NextResponse.json(
      {
        success: false,
        error: 'Could not fetch exchange rate. You can enter it manually.',
        detail,
      },
      { status: 502 }
    )
  }
}
