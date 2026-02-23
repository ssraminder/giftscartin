import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)

  if (!session) {
    // Return null user for unauthenticated — not a 401 (useAuth hook fetches this)
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      phone: session.phone,
    },
  })
}
