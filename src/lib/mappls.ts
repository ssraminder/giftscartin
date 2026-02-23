// In-memory token cache for Mappls OAuth
let cachedToken: { access_token: string; expires_at: number } | null = null

export async function getMapplsToken(): Promise<{ access_token: string; expires_in: number }> {
  // Return cached token if still valid (with 1hr buffer)
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    const remaining = Math.floor((cachedToken.expires_at - Date.now()) / 1000)
    return { access_token: cachedToken.access_token, expires_in: remaining }
  }

  const clientId = process.env.MAPPLS_CLIENT_ID
  const clientSecret = process.env.MAPPLS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Mappls credentials not configured')
  }

  const res = await fetch('https://outpost.mapmyindia.com/api/security/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[mappls] OAuth failed:', res.status, text)
    throw new Error('Failed to obtain Mappls token')
  }

  const data = await res.json()
  const expiresIn = data.expires_in ?? 86400 // default 24hrs

  // Cache for 23hrs (1hr buffer before expiry)
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (expiresIn - 3600) * 1000,
  }

  return { access_token: data.access_token, expires_in: expiresIn }
}
