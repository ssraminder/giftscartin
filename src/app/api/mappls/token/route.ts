import { NextResponse } from 'next/server'
import { getMapplsToken } from '@/lib/mappls'

export async function GET() {
  try {
    const clientId = process.env.MAPPLS_CLIENT_ID
    const clientSecret = process.env.MAPPLS_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Mappls credentials not configured' },
        { status: 503 }
      )
    }

    const token = await getMapplsToken()

    return NextResponse.json({
      success: true,
      data: {
        access_token: token.access_token,
        expires_in: token.expires_in,
      },
    })
  } catch (error) {
    console.error('[mappls/token] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to obtain Mappls token' },
      { status: 500 }
    )
  }
}
