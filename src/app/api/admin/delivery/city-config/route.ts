import { NextResponse } from 'next/server'
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

    const cities = await prisma.city.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        baseDeliveryCharge: true,
        freeDeliveryAbove: true,
        deliveryConfig: {
          include: {
            slot: {
              select: { id: true, name: true, slug: true, baseCharge: true, startTime: true, endTime: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: cities })
  } catch (error) {
    console.error('GET /api/admin/delivery/city-config error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch city configs' }, { status: 500 })
  }
}
