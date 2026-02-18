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
        variations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        addons: { where: { isActive: true } },
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

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
