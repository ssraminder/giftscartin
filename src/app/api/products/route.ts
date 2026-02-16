import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { productListSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = productListSchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      page,
      pageSize,
      categorySlug,
      city,
      minPrice,
      maxPrice,
      isVeg,
      occasion,
      sortBy,
      search,
    } = parsed.data

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    }

    // Filter by category slug (include subcategories)
    if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true, children: { select: { id: true } } },
      })
      if (category) {
        const categoryIds = [category.id, ...category.children.map((c) => c.id)]
        where.categoryId = { in: categoryIds }
      }
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {}
      if (minPrice !== undefined) where.basePrice.gte = minPrice
      if (maxPrice !== undefined) where.basePrice.lte = maxPrice
    }

    // Filter by veg/non-veg
    if (isVeg !== undefined) {
      where.isVeg = isVeg
    }

    // Filter by occasion
    if (occasion) {
      where.occasion = { has: occasion }
    }

    // Search by name or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ]
    }

    // Filter by city: only show products available from vendors in that city
    if (city) {
      where.vendorProducts = {
        some: {
          isAvailable: true,
          vendor: {
            city: { slug: city },
            status: 'APPROVED',
          },
        },
      }
    }

    // Determine sort order
    let orderBy: Prisma.ProductOrderByWithRelationInput
    switch (sortBy) {
      case 'price_asc':
        orderBy = { basePrice: 'asc' }
        break
      case 'price_desc':
        orderBy = { basePrice: 'desc' }
        break
      case 'rating':
        orderBy = { avgRating: 'desc' }
        break
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' }
        break
    }

    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          addons: { where: { isActive: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { items, total, page, pageSize },
    })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
