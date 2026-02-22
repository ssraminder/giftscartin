import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isAdminRole(user.role)) return null
  return user
}

// GET: All vendor_products for this vendor
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
      select: { id: true, businessName: true, status: true, cityId: true, city: { select: { name: true, slug: true } } },
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
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    })

    const workingHours = await prisma.vendorWorkingHours.findMany({
      where: { vendorId: id },
      orderBy: { dayOfWeek: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          businessName: vendor.businessName,
          status: vendor.status,
          city: vendor.city,
        },
        vendorProducts: vendorProducts.map((vp) => ({
          id: vp.id,
          costPrice: Number(vp.costPrice),
          sellingPrice: vp.sellingPrice ? Number(vp.sellingPrice) : null,
          preparationTime: vp.preparationTime,
          dailyLimit: vp.dailyLimit,
          isAvailable: vp.isAvailable,
          isSameDayEligible: vp.isSameDayEligible,
          product: {
            id: vp.product.id,
            name: vp.product.name,
            slug: vp.product.slug,
            basePrice: Number(vp.product.basePrice),
            category: vp.product.category,
          },
        })),
        workingHours: workingHours.map((wh) => ({
          dayOfWeek: wh.dayOfWeek,
          openTime: wh.openTime,
          closeTime: wh.closeTime,
          isClosed: wh.isClosed,
        })),
      },
    })
  } catch (error) {
    console.error('Admin vendor products GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor products' },
      { status: 500 }
    )
  }
}
