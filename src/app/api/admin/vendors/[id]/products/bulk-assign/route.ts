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
    isSameDayEligible: z.boolean().default(false),
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
    const vendorId = id

    let assigned = 0
    let skipped = 0

    // Use Promise.all instead of interactive transaction (P2028 with pgBouncer)
    const results = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { basePrice: true },
        })

        if (!product) return { status: 'skipped' as const }

        const costPrice = item.costPrice ?? Math.round(Number(product.basePrice) * 0.68)
        const preparationTime = item.preparationTime ?? 240

        const existing = await prisma.vendorProduct.findUnique({
          where: { vendorId_productId: { vendorId, productId: item.productId } },
        })

        if (existing) {
          return { status: 'skipped' as const }
        }

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

        return { status: 'assigned' as const }
      })
    )

    assigned = results.filter((r) => r.status === 'assigned').length
    skipped = results.filter((r) => r.status === 'skipped').length

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
