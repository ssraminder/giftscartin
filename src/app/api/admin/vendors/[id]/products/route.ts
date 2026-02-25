import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// GET: All vendor_products for this vendor
export async function GET(
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
    const supabase = getSupabaseAdmin()

    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, businessName, status, cityId, cities(name, slug)')
      .eq('id', id)
      .maybeSingle()

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    const { data: vendorProducts } = await supabase
      .from('vendor_products')
      .select('*, products(id, name, slug, basePrice, categories(name, slug))')
      .eq('vendorId', id)

    // Sort by product name in JS
    const sorted = (vendorProducts || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      (((a.products as Record<string, unknown> | null)?.name as string) || '').localeCompare(((b.products as Record<string, unknown> | null)?.name as string) || '')
    )

    const { data: workingHours } = await supabase
      .from('vendor_working_hours')
      .select('*')
      .eq('vendorId', id)
      .order('dayOfWeek', { ascending: true })

    const response = NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          businessName: vendor.businessName,
          status: vendor.status,
          city: (vendor as Record<string, unknown>).cities,
        },
        vendorProducts: sorted.map((vp: Record<string, unknown>) => ({
          id: vp.id,
          costPrice: Number(vp.costPrice),
          sellingPrice: vp.sellingPrice ? Number(vp.sellingPrice) : null,
          preparationTime: vp.preparationTime,
          dailyLimit: vp.dailyLimit,
          isAvailable: vp.isAvailable,
          isSameDayEligible: vp.isSameDayEligible ?? false,
          isExpressEligible: vp.isExpressEligible ?? false,
          product: vp.products ? (() => {
            const prod = vp.products as Record<string, unknown>
            return {
              id: prod.id,
              name: prod.name,
              slug: prod.slug,
              basePrice: Number(prod.basePrice as string | number),
              category: prod.categories,
            }
          })() : null,
        })),
        workingHours: (workingHours || []).map((wh: Record<string, unknown>) => ({
          dayOfWeek: wh.dayOfWeek,
          openTime: wh.openTime,
          closeTime: wh.closeTime,
          isClosed: wh.isClosed,
        })),
      },
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    console.error('Admin vendor products GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor products' },
      { status: 500 }
    )
  }
}
