import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const updateVendorSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED']).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  categories: z.array(z.string()).optional(),
})

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return null
  return user
}

// GET: Single vendor detail
export async function GET(
  _request: NextRequest,
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

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        city: true,
        products: {
          include: { product: { select: { id: true, name: true, slug: true } } },
        },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        pincodes: true,
        _count: {
          select: { orders: true },
        },
      },
    })

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...vendor,
        commissionRate: Number(vendor.commissionRate),
        rating: Number(vendor.rating),
      },
    })
  } catch (error) {
    console.error('Admin vendor GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor' },
      { status: 500 }
    )
  }
}

// PATCH: Update vendor (approve, suspend, change commission, etc.)
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
    const parsed = updateVendorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const vendor = await prisma.vendor.findUnique({ where: { id } })
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const data = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.commissionRate !== undefined ? { commissionRate: data.commissionRate } : {}),
          ...(data.categories !== undefined ? { categories: data.categories } : {}),
        },
      })

      // Log the action
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          adminRole: admin.role,
          actionType: data.status ? `vendor_${data.status.toLowerCase()}` : 'vendor_update',
          entityType: 'vendor',
          entityId: id,
          fieldChanged: Object.keys(data).join(', '),
          oldValue: { status: vendor.status, commissionRate: Number(vendor.commissionRate) },
          newValue: data,
          reason: `Admin ${data.status ? data.status.toLowerCase() : 'updated'} vendor`,
        },
      })

      return updatedVendor
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        commissionRate: Number(updated.commissionRate),
        rating: Number(updated.rating),
      },
    })
  } catch (error) {
    console.error('Admin vendor PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor' },
      { status: 500 }
    )
  }
}
