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

// GET: All master products NOT yet assigned to this vendor
export async function GET(
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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const categorySlug = searchParams.get('categorySlug') || ''

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Get IDs of products already assigned to this vendor
    const assignedProductIds = await prisma.vendorProduct.findMany({
      where: { vendorId: id },
      select: { productId: true },
    })

    const excludeIds = assignedProductIds.map((vp) => vp.productId)

    // Build filter
    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds }
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    if (categorySlug) {
      where.category = { slug: categorySlug }
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        basePrice: true,
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { name: 'asc' },
      take: 200,
    })

    return NextResponse.json({
      success: true,
      data: {
        items: products.map((p) => ({
          id: p.id,
          name: p.name,
          basePrice: Number(p.basePrice),
          category: p.category,
        })),
      },
    })
  } catch (error) {
    console.error('Admin vendor available products GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available products' },
      { status: 500 }
    )
  }
}
