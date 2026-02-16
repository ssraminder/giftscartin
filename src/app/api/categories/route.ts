import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
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
            products: { where: { isActive: true } },
          },
        },
      },
    })

    // Map to include productCount at top level
    const data = categories.map((cat) => ({
      ...cat,
      productCount: cat._count.products,
      children: cat.children.map((child) => ({
        ...child,
      })),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
