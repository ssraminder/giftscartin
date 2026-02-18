import type { Config } from '@netlify/functions'

/**
 * Netlify Scheduled Function — runs daily at 6:00 AM IST (00:30 UTC).
 * Calls the sync-rates API to update exchange rates from ExchangeRate-API.
 */
export default async () => {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.URL || 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET env var is not set — skipping sync')
    return new Response('CRON_SECRET not configured', { status: 500 })
  }

  try {
    const res = await fetch(`${baseUrl}/api/admin/currencies/sync-rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
    })

    const data = await res.json()
    console.log('Exchange rate sync result:', JSON.stringify(data, null, 2))

    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Exchange rate sync failed:', error)
    return new Response('Sync failed', { status: 500 })
  }
}

export const config: Config = {
  // Every day at 00:30 UTC (6:00 AM IST)
  schedule: '30 0 * * *',
}
