import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get('citySlug')

    // Build product filter for city
    const productWhere: Prisma.ProductWhereInput = { isActive: true }
    if (citySlug) {
      productWhere.vendorProducts = {
        some: {
          isAvailable: true,
          vendor: {
            city: { slug: citySlug },
            status: 'APPROVED',
          },
        },
      }
    }

    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: { where: productWhere },
          },
        },
      },
    })

    // Map to include productCount at top level
    // If citySlug is set, filter out categories with 0 products in that city
    let data = categories.map((cat) => ({
      ...cat,
      productCount: cat._count.products,
      children: cat.children.map((child) => ({
        ...child,
      })),
    }))

    if (citySlug) {
      data = data.filter((cat) => cat.productCount > 0)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
