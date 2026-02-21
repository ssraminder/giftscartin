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

export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const surcharges = await prisma.deliverySurcharge.findMany({
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json({ success: true, data: surcharges })
  } catch (error) {
    console.error('GET /api/admin/delivery/surcharges error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch surcharges' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, startDate, endDate, amount, appliesTo, isActive } = body

    if (!name?.trim() || !startDate || !endDate || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, dates, and amount are required' },
        { status: 400 }
      )
    }

    const surcharge = await prisma.deliverySurcharge.create({
      data: {
        name: name.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        amount,
        appliesTo: appliesTo || 'all',
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json({ success: true, data: surcharge }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/delivery/surcharges error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create surcharge' }, { status: 500 })
  }
}
