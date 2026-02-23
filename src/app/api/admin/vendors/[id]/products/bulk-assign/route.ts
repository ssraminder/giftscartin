import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
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

// POST: Bulk assign products to vendor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
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

    const supabase = getSupabaseAdmin()

    // Verify vendor exists
    const { data: vendor } = await supabase.from('vendors').select('id, businessName').eq('id', id).maybeSingle()
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

    const results = await Promise.all(
      items.map(async (item) => {
        const { data: product } = await supabase
          .from('products')
          .select('basePrice')
          .eq('id', item.productId)
          .maybeSingle()

        if (!product) return { status: 'skipped' as const }

        const costPrice = item.costPrice ?? Math.round(Number(product.basePrice) * 0.68)
        const preparationTime = item.preparationTime ?? 240

        // Check if already assigned
        const { data: existing } = await supabase
          .from('vendor_products')
          .select('id')
          .eq('vendorId', vendorId)
          .eq('productId', item.productId)
          .maybeSingle()

        if (existing) {
          return { status: 'skipped' as const }
        }

        await supabase.from('vendor_products').insert({
          vendorId,
          productId: item.productId,
          costPrice,
          preparationTime,
          dailyLimit: item.dailyLimit ?? null,
          isAvailable: true,
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
