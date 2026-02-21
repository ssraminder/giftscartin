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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, startTime, endTime, baseCharge, isActive } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (startTime !== undefined) data.startTime = startTime
    if (endTime !== undefined) data.endTime = endTime
    if (baseCharge !== undefined) data.baseCharge = baseCharge
    if (isActive !== undefined) data.isActive = isActive

    const slot = await prisma.deliverySlot.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: slot })
  } catch (error) {
    console.error('PATCH /api/admin/delivery/slots/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update delivery slot' }, { status: 500 })
  }
}
