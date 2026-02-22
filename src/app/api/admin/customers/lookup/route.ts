import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { isAdminRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const phone = request.nextUrl.searchParams.get('phone')
    if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'Valid Indian phone number required (+91 followed by 10 digits)' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, email: true, phone: true },
    })

    return NextResponse.json({ success: true, data: user || null })
  } catch (error) {
    console.error('GET /api/admin/customers/lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lookup customer' },
      { status: 500 }
    )
  }
}
