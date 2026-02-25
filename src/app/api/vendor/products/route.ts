import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
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

async function getVendor(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session?.id) return null
  if (!isVendorRole(session.role) && !isAdminRole(session.role)) return null
  const supabase = getSupabaseAdmin()
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('userId', session.id)
    .single()
  return vendor
}

// GET: List vendor's products (linked via vendor_products)
export async function GET(request: NextRequest) {
  try {
    const vendor = await getVendor(request)
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor access required' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: vendorProducts, error } = await supabase
      .from('vendor_products')
      .select('*, products(*, categories(id, name, slug), product_variations(*))')
      .eq('vendorId', vendor.id)
      .order('createdAt', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: (vendorProducts || []).map((vp: Record<string, unknown>) => {
        const product = vp.products as Record<string, unknown> | null
        const variations = (product?.product_variations as Record<string, unknown>[] | null) || []
        return {
          id: vp.id,
          productId: vp.productId,
          costPrice: Number(vp.costPrice),
          sellingPrice: vp.sellingPrice ? Number(vp.sellingPrice) : null,
          isAvailable: vp.isAvailable,
          preparationTime: vp.preparationTime,
          dailyLimit: vp.dailyLimit,
          product: product ? {
            ...product,
            basePrice: Number(product.basePrice),
            avgRating: Number(product.avgRating),
            category: product.categories,
            variations: variations
              .filter((v: Record<string, unknown>) => v.isActive)
              .map((v: Record<string, unknown>) => ({
                ...v,
                price: Number(v.price),
              })),
          } : null,
        }
      }),
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
    const vendor = await getVendor(request)
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
    const supabase = getSupabaseAdmin()

    // Find existing vendor product
    const { data: existing } = await supabase
      .from('vendor_products')
      .select('*')
      .eq('vendorId', vendor.id)
      .eq('productId', productId)
      .single()

    let vendorProduct
    if (existing) {
      const updateData: Record<string, unknown> = {
        costPrice,
      }
      if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice
      if (isAvailable !== undefined) updateData.isAvailable = isAvailable
      if (preparationTime !== undefined) updateData.preparationTime = preparationTime
      if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit

      const { data, error } = await supabase
        .from('vendor_products')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      vendorProduct = data
    } else {
      const { data, error } = await supabase
        .from('vendor_products')
        .insert({
          vendorId: vendor.id,
          productId,
          costPrice,
          sellingPrice: sellingPrice ?? null,
          isAvailable: isAvailable ?? true,
          preparationTime: preparationTime ?? 120,
          dailyLimit: dailyLimit ?? null,
        })
        .select()
        .single()

      if (error) throw error
      vendorProduct = data
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
