import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

const updateSchema = z.object({
  costPrice: z.number().min(0).optional(),
  preparationTime: z.number().int().min(0).optional(),
  dailyLimit: z.number().int().min(1).nullable().optional(),
  isAvailable: z.boolean().optional(),
  isSameDayEligible: z.boolean().optional(),
})

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isAdminRole(user.role)) return null
  return user
}

// PATCH: Update vendor product fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vpId: string }> }
) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { vpId } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const existing = await prisma.vendorProduct.findUnique({
      where: { id: vpId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Vendor product not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.costPrice !== undefined) data.costPrice = parsed.data.costPrice
    if (parsed.data.preparationTime !== undefined) data.preparationTime = parsed.data.preparationTime
    if (parsed.data.dailyLimit !== undefined) data.dailyLimit = parsed.data.dailyLimit
    if (parsed.data.isAvailable !== undefined) data.isAvailable = parsed.data.isAvailable
    if (parsed.data.isSameDayEligible !== undefined) data.isSameDayEligible = parsed.data.isSameDayEligible

    const updated = await prisma.vendorProduct.update({
      where: { id: vpId },
      data,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        costPrice: Number(updated.costPrice),
        sellingPrice: updated.sellingPrice ? Number(updated.sellingPrice) : null,
        preparationTime: updated.preparationTime,
        dailyLimit: updated.dailyLimit,
        isAvailable: updated.isAvailable,
        isSameDayEligible: updated.isSameDayEligible,
      },
    })
  } catch (error) {
    console.error('Admin vendor-product PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor product' },
      { status: 500 }
    )
  }
}

// DELETE: Hard delete vendor_product record
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ vpId: string }> }
) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { vpId } = await params

    const existing = await prisma.vendorProduct.findUnique({
      where: { id: vpId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Vendor product not found' },
        { status: 404 }
      )
    }

    await prisma.vendorProduct.delete({
      where: { id: vpId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin vendor-product DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove vendor product' },
      { status: 500 }
    )
  }
}
