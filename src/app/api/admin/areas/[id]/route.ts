import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH: activate / deactivate / update name
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.name) data.name = body.name

    const area = await prisma.serviceArea.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ success: true, data: area })
  } catch (error) {
    console.error('Update area error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update area' },
      { status: 500 }
    )
  }
}

// DELETE
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.serviceArea.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete area error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete area' },
      { status: 500 }
    )
  }
}
