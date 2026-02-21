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

    const slots = await prisma.deliverySlot.findMany({
      include: {
        cityConfigs: {
          include: {
            city: { select: { name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: slots })
  } catch (error) {
    console.error('GET /api/admin/delivery/slots error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch delivery slots' }, { status: 500 })
  }
}
