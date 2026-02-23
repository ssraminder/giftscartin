import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// GET: All master products NOT yet assigned to this vendor
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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const categorySlug = searchParams.get('categorySlug') || ''

    const supabase = getSupabaseAdmin()

    // Verify vendor exists
    const { data: vendor } = await supabase.from('vendors').select('id').eq('id', id).maybeSingle()
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Get IDs of products already assigned to this vendor
    const { data: assignedProducts } = await supabase
      .from('vendor_products')
      .select('productId')
      .eq('vendorId', id)

    const excludeIds = (assignedProducts || []).map((vp: Record<string, unknown>) => vp.productId)

    // Build query for available products
    let query = supabase
      .from('products')
      .select('id, name, basePrice, categories(id, name, slug)')
      .eq('isActive', true)
      .order('name', { ascending: true })
      .limit(200)

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: products, error } = await query
    if (error) throw error

    // Filter by category slug in JS if needed (supabase doesn't easily do nested filters)
    let filtered = products || []
    if (categorySlug) {
      filtered = filtered.filter((p: Record<string, unknown>) => (p.categories as Record<string, unknown> | null)?.slug === categorySlug)
    }

    return NextResponse.json({
      success: true,
      data: {
        items: filtered.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          basePrice: Number(p.basePrice),
          category: p.categories,
        })),
      },
    })
  } catch (error) {
    console.error('Admin vendor available products GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available products' },
      { status: 500 }
    )
  }
}
