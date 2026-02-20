import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isVendorRole, isAdminRole } from '@/lib/roles'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const updateVendorProductSchema = z.object({
  productId: z.string().min(1),
  costPrice: z.number().min(0),
  sellingPrice: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().min(0).optional(),
  dailyLimit: z.number().int().min(0).nullable().optional(),
})

async function getVendor() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isVendorRole(user.role) && !isAdminRole(user.role)) return null
  return prisma.vendor.findUnique({ where: { userId: user.id } })
}

// GET: List vendor's products (linked via vendor_products)
export async function GET() {
  try {
    const vendor = await getVendor()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const vendorProducts = await prisma.vendorProduct.findMany({
      where: { vendorId: vendor.id },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            variations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    })

    return NextResponse.json({
      success: true,
      data: vendorProducts.map((vp) => ({
        id: vp.id,
        productId: vp.productId,
        costPrice: Number(vp.costPrice),
        sellingPrice: vp.sellingPrice ? Number(vp.sellingPrice) : null,
        isAvailable: vp.isAvailable,
        preparationTime: vp.preparationTime,
        dailyLimit: vp.dailyLimit,
        product: {
          ...vp.product,
          basePrice: Number(vp.product.basePrice),
          avgRating: Number(vp.product.avgRating),
          variations: vp.product.variations.map((v) => ({
            ...v,
            price: Number(v.price),
          })),
        },
      })),
    })
  } catch (error) {
    console.error('Vendor products GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// PUT: Update vendor product (availability, pricing, prep time)
export async function PUT(request: NextRequest) {
  try {
    const vendor = await getVendor()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateVendorProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { productId, costPrice, sellingPrice, isAvailable, preparationTime, dailyLimit } = parsed.data

    // Find existing vendor product or create new
    const existing = await prisma.vendorProduct.findUnique({
      where: { vendorId_productId: { vendorId: vendor.id, productId } },
    })

    let vendorProduct
    if (existing) {
      vendorProduct = await prisma.vendorProduct.update({
        where: { id: existing.id },
        data: {
          costPrice,
          ...(sellingPrice !== undefined ? { sellingPrice } : {}),
          ...(isAvailable !== undefined ? { isAvailable } : {}),
          ...(preparationTime !== undefined ? { preparationTime } : {}),
          ...(dailyLimit !== undefined ? { dailyLimit } : {}),
        },
      })
    } else {
      vendorProduct = await prisma.vendorProduct.create({
        data: {
          vendorId: vendor.id,
          productId,
          costPrice,
          sellingPrice: sellingPrice ?? null,
          isAvailable: isAvailable ?? true,
          preparationTime: preparationTime ?? 120,
          dailyLimit: dailyLimit ?? null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...vendorProduct,
        costPrice: Number(vendorProduct.costPrice),
        sellingPrice: vendorProduct.sellingPrice ? Number(vendorProduct.sellingPrice) : null,
      },
    })
  } catch (error) {
    console.error('Vendor products PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    )
  }
}
