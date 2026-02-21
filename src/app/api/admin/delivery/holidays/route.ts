import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || !user?.role || !isAdminRole(user.role)) return null
  return user
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')
    const upcoming = searchParams.get('upcoming')

    const where: Record<string, unknown> = {}
    if (cityId) where.cityId = cityId
    if (upcoming === 'true') {
      where.date = { gte: new Date() }
    }

    const holidays = await prisma.deliveryHoliday.findMany({
      where,
      include: {
        city: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ success: true, data: holidays })
  } catch (error) {
    console.error('GET /api/admin/delivery/holidays error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch holidays' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, cityId, blockedSlots, reason } = body

    if (!date || !reason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Date and reason are required' },
        { status: 400 }
      )
    }

    const holiday = await prisma.deliveryHoliday.create({
      data: {
        date: new Date(date),
        cityId: cityId || null,
        reason: reason.trim(),
        mode: !blockedSlots || blockedSlots.length === 0 ? 'FULL_BLOCK' : 'CUSTOM',
        slotOverrides: blockedSlots && blockedSlots.length > 0 ? { blockedSlots } : undefined,
      },
      include: {
        city: { select: { name: true } },
      },
    })

    return NextResponse.json({ success: true, data: holiday }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/delivery/holidays error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create holiday' }, { status: 500 })
  }
}
