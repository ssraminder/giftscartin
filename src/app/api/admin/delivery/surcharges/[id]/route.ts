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
    const { name, startDate, endDate, amount, appliesTo, isActive } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (startDate !== undefined) data.startDate = new Date(startDate)
    if (endDate !== undefined) data.endDate = new Date(endDate)
    if (amount !== undefined) data.amount = amount
    if (appliesTo !== undefined) data.appliesTo = appliesTo
    if (isActive !== undefined) data.isActive = isActive

    const surcharge = await prisma.deliverySurcharge.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: surcharge })
  } catch (error) {
    console.error('PATCH /api/admin/delivery/surcharges/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update surcharge' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.deliverySurcharge.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/delivery/surcharges/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete surcharge' }, { status: 500 })
  }
}
