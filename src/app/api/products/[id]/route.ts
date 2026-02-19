import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Support lookup by both id (cuid) and slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        // Attributes and their options (for VARIABLE products)
        attributes: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: { orderBy: { sortOrder: 'asc' } },
          },
        },
        // Variations (active only)
        variations: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        // Addon groups with active options
        addonGroups: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        // Upsell products (active only)
        upsells: {
          orderBy: { sortOrder: 'asc' },
          include: {
            upsellProduct: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                basePrice: true,
                isActive: true,
                category: { select: { name: true } },
              },
            },
          },
        },
        // Legacy addons
        addons: { where: { isActive: true } },
        // Reviews
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        vendorProducts: {
          where: {
            isAvailable: true,
            vendor: { status: 'APPROVED' },
          },
          select: {
            sellingPrice: true,
            preparationTime: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
                rating: true,
                city: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Filter upsells to only active products and flatten
    const upsells = product.upsells
      .filter((u) => u.upsellProduct.isActive)
      .map((u) => ({
        id: u.upsellProduct.id,
        name: u.upsellProduct.name,
        slug: u.upsellProduct.slug,
        images: u.upsellProduct.images,
        basePrice: u.upsellProduct.basePrice,
        category: u.upsellProduct.category,
      }))

    // Build response with flattened upsells
    const responseData = {
      ...product,
      upsells,
    }

    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
