import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// GET — List all vendor_products for this vendor
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !isAdminRole(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { id } = await params

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    })

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const vendorProducts = await prisma.vendorProduct.findMany({
      where: { vendorId: id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            images: true,
            isActive: true,
            isSameDayEligible: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    })

    const data = vendorProducts.map((vp) => ({
      id: vp.id,
      vendorId: vp.vendorId,
      productId: vp.productId,
      costPrice: Number(vp.costPrice),
      sellingPrice: vp.sellingPrice ? Number(vp.sellingPrice) : null,
      isAvailable: vp.isAvailable,
      preparationTime: vp.preparationTime,
      dailyLimit: vp.dailyLimit,
      product: {
        ...vp.product,
        basePrice: Number(vp.product.basePrice),
      },
    }))

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          businessName: vendor.businessName,
          workingHours: vendor.workingHours,
        },
        items: data,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/vendors/[id]/products error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor products' },
      { status: 500 }
    )
  }
}
