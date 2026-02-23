import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export const runtime = 'edge'

export async function POST() {
  const cookie = clearSessionCookie()

  const response = NextResponse.json({
    success: true,
    data: { message: 'Logged out successfully' },
  })

  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    maxAge: cookie.maxAge,
    path: cookie.path,
  })

  return response
}
