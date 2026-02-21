import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

const bulkAssignSchema = z.object({
  products: z.array(z.object({
    productId: z.string().min(1),
    costPrice: z.number().min(0).optional(),
    preparationTime: z.number().int().min(0).optional(),
    dailyLimit: z.number().int().min(1).nullable().optional(),
  })).min(1),
})

// POST — Bulk assign products to vendor
export async function POST(
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

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = bulkAssignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { products } = parsed.data

    // Get existing vendor_products to skip duplicates
    const existingVPs = await prisma.vendorProduct.findMany({
      where: {
        vendorId,
        productId: { in: products.map((p) => p.productId) },
      },
      select: { productId: true },
    })
    const existingProductIds = new Set(existingVPs.map((vp) => vp.productId))

    // Get product base prices for default cost calculation
    const productIds = products
      .filter((p) => !existingProductIds.has(p.productId))
      .map((p) => p.productId)

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { assigned: 0, skipped: products.length },
      })
    }

    const masterProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, basePrice: true },
    })
    const priceMap = new Map(masterProducts.map((p) => [p.id, Number(p.basePrice)]))

    // Sequential creates (pgbouncer compatible)
    let assigned = 0
    for (const item of products) {
      if (existingProductIds.has(item.productId)) continue

      const basePrice = priceMap.get(item.productId) ?? 0
      const costPrice = item.costPrice ?? Math.round(basePrice * 0.68)
      const preparationTime = item.preparationTime ?? 240

      await prisma.vendorProduct.create({
        data: {
          vendorId,
          productId: item.productId,
          costPrice,
          preparationTime,
          dailyLimit: item.dailyLimit ?? null,
          isAvailable: true,
        },
      })
      assigned++
    }

    return NextResponse.json({
      success: true,
      data: {
        assigned,
        skipped: products.length - assigned,
      },
    })
  } catch (error) {
    console.error('POST /api/admin/vendors/[id]/products/bulk-assign error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign products' },
      { status: 500 }
    )
  }
}
