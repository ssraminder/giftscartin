import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isAdminRole(user.role)) return null
  return user
}

// PATCH: Update a payment method
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, isActive, sortOrder } = body

    // Verify it exists
    const existing = await prisma.paymentMethod.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description || null
    if (isActive !== undefined) data.isActive = isActive
    if (sortOrder !== undefined) data.sortOrder = sortOrder

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/admin/payment-methods/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payment method' },
      { status: 500 }
    )
  }
}
