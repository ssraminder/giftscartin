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
})

// PATCH — Edit single vendor_product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vpId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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

    const existing = await prisma.vendorProduct.findUnique({ where: { id: vpId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Vendor product not found' },
        { status: 404 }
      )
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}
    if (data.costPrice !== undefined) updateData.costPrice = data.costPrice
    if (data.preparationTime !== undefined) updateData.preparationTime = data.preparationTime
    if (data.dailyLimit !== undefined) updateData.dailyLimit = data.dailyLimit
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable

    const updated = await prisma.vendorProduct.update({
      where: { id: vpId },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        costPrice: Number(updated.costPrice),
        sellingPrice: updated.sellingPrice ? Number(updated.sellingPrice) : null,
        product: {
          ...updated.product,
          basePrice: Number(updated.product.basePrice),
        },
      },
    })
  } catch (error) {
    console.error('PATCH /api/admin/vendor-products/[vpId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor product' },
      { status: 500 }
    )
  }
}

// DELETE — Remove product from vendor (hard delete vendor_product row)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ vpId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { vpId } = await params

    const existing = await prisma.vendorProduct.findUnique({ where: { id: vpId } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Vendor product not found' },
        { status: 404 }
      )
    }

    await prisma.vendorProduct.delete({ where: { id: vpId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/vendor-products/[vpId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove vendor product' },
      { status: 500 }
    )
  }
}
