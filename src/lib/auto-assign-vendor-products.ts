import { getSupabaseAdmin } from './supabase'

interface AutoAssignResult {
  attempted: number
  error?: string
}

/**
 * Auto-assign all active products from the given category slugs
 * (and their subcategories) to a vendor via batch upsert.
 *
 * Uses ON CONFLICT DO NOTHING to skip already-assigned products.
 * Never throws — logs errors and returns gracefully.
 */
export async function autoAssignVendorProducts(
  vendorId: string,
  categorySlugs: string[]
): Promise<AutoAssignResult> {
  if (!categorySlugs.length) {
    return { attempted: 0 }
  }

  const supabase = getSupabaseAdmin()

  try {
    // 1. Resolve category slugs → category IDs
    const { data: parentCategories, error: catError } = await supabase
      .from('categories')
      .select('id')
      .in('slug', categorySlugs)
      .eq('isActive', true)

    if (catError || !parentCategories?.length) {
      console.error('[auto-assign] Category resolution failed:', catError)
      return { attempted: 0, error: catError?.message || 'No matching categories' }
    }

    const parentIds = parentCategories.map((c: { id: string }) => c.id)

    // 2. Find subcategories (children where parentId is in our parent set)
    const { data: childCategories } = await supabase
      .from('categories')
      .select('id')
      .in('parentId', parentIds)
      .eq('isActive', true)

    const allCategoryIds = [
      ...parentIds,
      ...(childCategories || []).map((c: { id: string }) => c.id),
    ]

    // 3. Fetch all active products in those categories
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, basePrice')
      .in('categoryId', allCategoryIds)
      .eq('isActive', true)

    if (prodError) {
      console.error('[auto-assign] Product fetch error:', prodError)
      return { attempted: 0, error: prodError.message }
    }

    if (!products?.length) {
      return { attempted: 0 }
    }

    // 4. Build vendor_products rows with default pricing
    const rows = products.map((product: { id: string; basePrice: number }) => ({
      vendorId,
      productId: product.id,
      costPrice: Math.round(Number(product.basePrice) * 0.68),
      isAvailable: true,
      preparationTime: 240,
      isSameDayEligible: false,
      isExpressEligible: false,
    }))

    // 5. Batch upsert — ignoreDuplicates maps to ON CONFLICT DO NOTHING
    const { error: upsertError } = await supabase
      .from('vendor_products')
      .upsert(rows, {
        onConflict: 'vendorId,productId',
        ignoreDuplicates: true,
      })

    if (upsertError) {
      console.error('[auto-assign] Upsert error:', upsertError)
      return { attempted: products.length, error: upsertError.message }
    }

    return { attempted: products.length }
  } catch (err) {
    console.error('[auto-assign] Unexpected error:', err)
    return { attempted: 0, error: String(err) }
  }
}

/**
 * Auto-assign a single product to all APPROVED vendors whose categories
 * array contains the product's category slug (or parent category slug).
 *
 * Called when a new product is created or an existing product changes category / is reactivated.
 * Never throws — logs errors and returns gracefully.
 */
export async function autoAssignProductToVendors(
  productId: string,
  categoryId: string
): Promise<AutoAssignResult> {
  const supabase = getSupabaseAdmin()

  try {
    // 1. Resolve categoryId → slug, also get parent slug if exists
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('slug, parentId')
      .eq('id', categoryId)
      .maybeSingle()

    if (catError || !category) {
      console.error('[auto-assign-product] Category lookup failed:', catError)
      return { attempted: 0, error: catError?.message || 'Category not found' }
    }

    const slugsToMatch: string[] = [category.slug]

    // If this is a subcategory, also match vendors who have the parent category
    if (category.parentId) {
      const { data: parent } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', category.parentId)
        .maybeSingle()

      if (parent) {
        slugsToMatch.push(parent.slug)
      }
    }

    // 2. Find all APPROVED vendors whose categories array overlaps with our slugs
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('status', 'APPROVED')
      .overlaps('categories', slugsToMatch)

    if (vendorError) {
      console.error('[auto-assign-product] Vendor lookup error:', vendorError)
      return { attempted: 0, error: vendorError.message }
    }

    if (!vendors?.length) {
      return { attempted: 0 }
    }

    // 3. Fetch product basePrice for cost calculation
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('basePrice')
      .eq('id', productId)
      .maybeSingle()

    if (prodError || !product) {
      console.error('[auto-assign-product] Product lookup error:', prodError)
      return { attempted: 0, error: prodError?.message || 'Product not found' }
    }

    const costPrice = Math.round(Number(product.basePrice) * 0.68)

    // 4. Build vendor_products rows for all matching vendors
    const rows = vendors.map((vendor: { id: string }) => ({
      vendorId: vendor.id,
      productId,
      costPrice,
      isAvailable: true,
      preparationTime: 240,
      isSameDayEligible: false,
      isExpressEligible: false,
    }))

    // 5. Batch upsert — ignoreDuplicates skips already-assigned vendor-product pairs
    const { error: upsertError } = await supabase
      .from('vendor_products')
      .upsert(rows, {
        onConflict: 'vendorId,productId',
        ignoreDuplicates: true,
      })

    if (upsertError) {
      console.error('[auto-assign-product] Upsert error:', upsertError)
      return { attempted: vendors.length, error: upsertError.message }
    }

    return { attempted: vendors.length }
  } catch (err) {
    console.error('[auto-assign-product] Unexpected error:', err)
    return { attempted: 0, error: String(err) }
  }
}
