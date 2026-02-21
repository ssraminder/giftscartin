import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
})

// GET — Return all master products NOT yet assigned to this vendor
export async function GET(
  request: NextRequest,
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

    const { id: vendorId } = await params
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Get IDs of products already assigned to this vendor
    const assignedProducts = await prisma.vendorProduct.findMany({
      where: { vendorId },
      select: { productId: true },
    })
    const assignedIds = assignedProducts.map((vp) => vp.productId)

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    }
    if (assignedIds.length > 0) {
      where.id = { notIn: assignedIds }
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    if (query.category) {
      where.categoryId = query.category
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        images: true,
        isSameDayEligible: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
      take: 200,
    })

    const data = products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/admin/vendors/[id]/products/available error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available products' },
      { status: 500 }
    )
  }
}
