import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

const bulkAssignSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    costPrice: z.number().min(0).optional(),
    preparationTime: z.number().int().min(0).optional(),
    dailyLimit: z.number().int().min(1).nullable().optional(),
  })).min(1, 'At least one product required'),
})

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isAdminRole(user.role)) return null
  return user
}

// POST: Bulk assign products to vendor
export async function POST(
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
    const body = await request.json()
    const parsed = bulkAssignSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true, businessName: true },
    })

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const { items } = parsed.data

    // Fetch all referenced products to get basePrices for default costPrice
    const productIds = items.map((i) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, basePrice: true },
    })

    const productMap = new Map(products.map((p) => [p.id, Number(p.basePrice)]))

    // Check which are already assigned
    const existingAssignments = await prisma.vendorProduct.findMany({
      where: { vendorId: id, productId: { in: productIds } },
      select: { productId: true },
    })
    const existingSet = new Set(existingAssignments.map((e) => e.productId))

    let assigned = 0
    let skipped = 0

    // Run all upserts in a single transaction
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const basePrice = productMap.get(item.productId)
        if (basePrice === undefined) {
          skipped++
          continue
        }

        if (existingSet.has(item.productId)) {
          // Update existing assignment
          await tx.vendorProduct.updateMany({
            where: { vendorId: id, productId: item.productId },
            data: {
              costPrice: item.costPrice ?? Math.round(basePrice * 0.68),
              preparationTime: item.preparationTime ?? 240,
              dailyLimit: item.dailyLimit ?? null,
            },
          })
          skipped++
        } else {
          // Create new assignment
          await tx.vendorProduct.create({
            data: {
              vendorId: id,
              productId: item.productId,
              costPrice: item.costPrice ?? Math.round(basePrice * 0.68),
              preparationTime: item.preparationTime ?? 240,
              dailyLimit: item.dailyLimit ?? null,
              isAvailable: true,
            },
          })
          assigned++
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { assigned, skipped },
    })
  } catch (error) {
    console.error('Admin vendor bulk-assign error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign products' },
      { status: 500 }
    )
  }
}
