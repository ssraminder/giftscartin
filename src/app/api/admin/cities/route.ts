import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
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

    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { zones: true, vendors: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: cities.map((c) => ({
        ...c,
        baseDeliveryCharge: Number(c.baseDeliveryCharge),
        freeDeliveryAbove: Number(c.freeDeliveryAbove),
        lat: Number(c.lat),
        lng: Number(c.lng),
      })),
    })
  } catch (error) {
    console.error('Admin cities GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
