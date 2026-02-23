import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Fetch main product with category — lookup by id or slug
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, categories(id, name, slug)')
      .or(`id.eq.${id},slug.eq.${id}`)
      .eq('isActive', true)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Fetch attributes with options (for VARIABLE products)
    const { data: attributes } = await supabase
      .from('product_attributes')
      .select('*, product_attribute_options(*)')
      .eq('productId', product.id)
      .order('sortOrder', { ascending: true })

    // Sort attribute options by sortOrder
    const sortedAttributes = (attributes || []).map((attr: Record<string, unknown>) => ({
      ...attr,
      options: ((attr.product_attribute_options as Array<{ sortOrder: number }>) || []).sort(
        (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder
      ),
      product_attribute_options: undefined,
    }))

    // Fetch variations (active only)
    const { data: variations } = await supabase
      .from('product_variations')
      .select('*')
      .eq('productId', product.id)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })

    // Fetch addon groups with options (active only)
    const { data: addonGroups } = await supabase
      .from('product_addon_groups')
      .select('*, product_addon_options(*)')
      .eq('productId', product.id)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })

    // Filter addon options to active only and sort
    const sortedAddonGroups = (addonGroups || []).map((group: Record<string, unknown>) => ({
      ...group,
      options: ((group.product_addon_options as Array<{ isActive: boolean; sortOrder: number }>) || [])
        .filter((opt: { isActive: boolean }) => opt.isActive)
        .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder),
      product_addon_options: undefined,
    }))

    // Fetch upsell products (active only)
    const { data: upsellRecords } = await supabase
      .from('product_upsells')
      .select('sortOrder, upsellProductId')
      .eq('productId', product.id)
      .order('sortOrder', { ascending: true })

    let upsells: Array<{
      id: string
      name: string
      slug: string
      images: string[]
      basePrice: number
      category: { name: string } | null
    }> = []

    if (upsellRecords && upsellRecords.length > 0) {
      const upsellIds = upsellRecords.map((u: { upsellProductId: string }) => u.upsellProductId)

      const { data: upsellProducts } = await supabase
        .from('products')
        .select('id, name, slug, images, basePrice, isActive, categories(name)')
        .in('id', upsellIds)
        .eq('isActive', true)

      // Maintain sort order from upsell records
      const upsellMap = new Map(
        (upsellProducts || []).map((p: Record<string, unknown>) => [p.id as string, p])
      )

      upsells = upsellRecords
        .map((u: { upsellProductId: string }) => upsellMap.get(u.upsellProductId))
        .filter((p: unknown): p is Record<string, unknown> => !!p)
        .map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          slug: p.slug as string,
          images: p.images as string[],
          basePrice: p.basePrice as number,
          category: p.categories as { name: string } | null,
        }))
    }

    // Fetch reviews (verified only)
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, users(name)')
      .eq('productId', product.id)
      .eq('isVerified', true)
      .order('createdAt', { ascending: false })
      .limit(10)

    // Map reviews to include user name
    const mappedReviews = (reviews || []).map((r: Record<string, unknown>) => ({
      ...r,
      user: r.users ? { name: (r.users as { name: string }).name } : null,
      users: undefined,
    }))

    // Fetch vendor products (available, approved vendors)
    const { data: vendorProducts } = await supabase
      .from('vendor_products')
      .select('sellingPrice, preparationTime, vendors(id, businessName, rating, cities(name, slug))')
      .eq('productId', product.id)
      .eq('isAvailable', true)

    // Filter to only approved vendors and reshape
    const filteredVendorProducts = (vendorProducts || [])
      .filter((vp: Record<string, unknown>) => {
        const vendor = vp.vendors as Record<string, unknown> | null
        return vendor !== null
      })
      .map((vp: Record<string, unknown>) => {
        const vendor = vp.vendors as Record<string, unknown>
        return {
          sellingPrice: vp.sellingPrice,
          preparationTime: vp.preparationTime,
          vendor: {
            id: vendor.id,
            businessName: vendor.businessName,
            rating: vendor.rating,
            city: vendor.cities || null,
          },
        }
      })

    // Build response
    const responseData = {
      ...product,
      attributes: sortedAttributes,
      variations: variations || [],
      addonGroups: sortedAddonGroups,
      upsells,
      reviews: mappedReviews,
      vendorProducts: filteredVendorProducts,
    }

    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
