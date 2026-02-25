import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { productListSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = productListSchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      page,
      pageSize,
      categorySlug,
      city,
      citySlug,
      pincode,
      vendorId,
      minPrice,
      maxPrice,
      isVeg,
      occasion,
      sameDay,
      sortBy,
      search,
    } = parsed.data

    const effectiveCitySlug = citySlug || city
    const supabase = getSupabaseAdmin()

    // Collect category IDs to filter by (include subcategories)
    let categoryIds: string[] | null = null
    if (categorySlug) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (category) {
        const { data: children } = await supabase
          .from('categories')
          .select('id')
          .eq('parentId', category.id)

        categoryIds = [category.id, ...(children || []).map((c: { id: string }) => c.id)]
      }
    }

    // Filter by city: find product IDs available from vendors in that city
    let productIdsInCity: string[] | null = null
    if (effectiveCitySlug) {
      const { data: cityData } = await supabase
        .from('cities')
        .select('id')
        .eq('slug', effectiveCitySlug)
        .single()

      if (cityData) {
        // Find approved vendors in that city
        const vendorQuery = supabase
          .from('vendors')
          .select('id')
          .eq('cityId', cityData.id)
          .eq('status', 'APPROVED')

        const { data: vendors } = await vendorQuery
        const vIds = (vendors || []).map((v: { id: string }) => v.id)

        if (vIds.length > 0) {
          // If pincode is also provided, filter to vendors serving that pincode
          let filteredVIds = vIds
          if (pincode) {
            const { data: vendorPincodes } = await supabase
              .from('vendor_pincodes')
              .select('vendorId')
              .in('vendorId', vIds)
              .eq('pincode', pincode)
              .eq('isActive', true)

            filteredVIds = (vendorPincodes || []).map((vp: { vendorId: string }) => vp.vendorId)
          }

          if (filteredVIds.length > 0) {
            const { data: vps } = await supabase
              .from('vendor_products')
              .select('productId')
              .in('vendorId', filteredVIds)
              .eq('isAvailable', true)

            productIdsInCity = Array.from(new Set((vps || []).map((vp: { productId: string }) => vp.productId)))
          } else {
            productIdsInCity = []
          }
        } else {
          productIdsInCity = []
        }
      } else {
        productIdsInCity = []
      }
    } else if (pincode) {
      // Pincode-only filter (no city slug): find vendors serving this pincode
      const { data: vendorPincodes } = await supabase
        .from('vendor_pincodes')
        .select('vendorId')
        .eq('pincode', pincode)
        .eq('isActive', true)

      const vpVendorIds = (vendorPincodes || []).map((vp: { vendorId: string }) => vp.vendorId)

      if (vpVendorIds.length > 0) {
        // Further filter to APPROVED vendors
        const { data: approvedVendors } = await supabase
          .from('vendors')
          .select('id')
          .in('id', vpVendorIds)
          .eq('status', 'APPROVED')

        const approvedIds = (approvedVendors || []).map((v: { id: string }) => v.id)

        if (approvedIds.length > 0) {
          const { data: vps } = await supabase
            .from('vendor_products')
            .select('productId')
            .in('vendorId', approvedIds)
            .eq('isAvailable', true)

          productIdsInCity = Array.from(new Set((vps || []).map((vp: { productId: string }) => vp.productId)))
        } else {
          productIdsInCity = []
        }
      } else {
        productIdsInCity = []
      }
    }

    // Filter by vendor: find product IDs from that vendor
    let productIdsByVendor: string[] | null = null
    if (vendorId) {
      const vendorFilter: { vendorId: string; isAvailable: boolean } = {
        vendorId,
        isAvailable: true,
      }

      const { data: vps } = await supabase
        .from('vendor_products')
        .select('productId')
        .eq('vendorId', vendorFilter.vendorId)
        .eq('isAvailable', vendorFilter.isAvailable)

      productIdsByVendor = (vps || []).map((vp: { productId: string }) => vp.productId)
    }

    // Merge productIdsInCity and productIdsByVendor if both are set
    let filteredProductIds: string[] | null = null
    if (productIdsInCity !== null && productIdsByVendor !== null) {
      // Intersection
      const citySet = new Set(productIdsInCity)
      filteredProductIds = productIdsByVendor.filter((id) => citySet.has(id))
    } else if (productIdsInCity !== null) {
      filteredProductIds = productIdsInCity
    } else if (productIdsByVendor !== null) {
      filteredProductIds = productIdsByVendor
    }

    // Apply sameDay filter: find products where any vendor has isSameDayEligible = true
    if (sameDay) {
      const { data: eligibleVPs } = await supabase
        .from('vendor_products')
        .select('productId')
        .eq('isSameDayEligible', true)
        .eq('isAvailable', true)

      const eligibleProductIds = Array.from(
        new Set((eligibleVPs ?? []).map((vp: { productId: string }) => vp.productId))
      )

      if (eligibleProductIds.length === 0) {
        return NextResponse.json(
          { success: true, data: { items: [], total: 0, page, pageSize } },
          { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
        )
      }

      // Intersect with existing filtered IDs if present
      if (filteredProductIds !== null) {
        const sameDaySet = new Set(eligibleProductIds)
        filteredProductIds = filteredProductIds.filter((id) => sameDaySet.has(id))
      } else {
        filteredProductIds = eligibleProductIds
      }
    }

    // If filtered product IDs is an empty array, return empty result
    if (filteredProductIds !== null && filteredProductIds.length === 0) {
      return NextResponse.json(
        { success: true, data: { items: [], total: 0, page, pageSize } },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        }
      )
    }

    // Build the main product query
    const selectFields = '*, categories(id, name, slug), product_variations(*)'

    let query = supabase
      .from('products')
      .select(selectFields)
      .eq('isActive', true)

    let countQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('isActive', true)

    // Apply category filter
    if (categoryIds && categoryIds.length > 0) {
      query = query.in('categoryId', categoryIds)
      countQuery = countQuery.in('categoryId', categoryIds)
    }

    // Apply product ID filter (city/vendor)
    if (filteredProductIds !== null) {
      query = query.in('id', filteredProductIds)
      countQuery = countQuery.in('id', filteredProductIds)
    }

    // Apply price range
    if (minPrice !== undefined) {
      query = query.gte('basePrice', minPrice)
      countQuery = countQuery.gte('basePrice', minPrice)
    }
    if (maxPrice !== undefined) {
      query = query.lte('basePrice', maxPrice)
      countQuery = countQuery.lte('basePrice', maxPrice)
    }

    // Apply veg filter
    if (isVeg !== undefined) {
      query = query.eq('isVeg', isVeg)
      countQuery = countQuery.eq('isVeg', isVeg)
    }

    // Apply occasion filter (array contains)
    if (occasion) {
      query = query.contains('occasion', [occasion])
      countQuery = countQuery.contains('occasion', [occasion])
    }

    // Apply search filter
    if (search) {
      const searchFilter = `name.ilike.%${search}%,description.ilike.%${search}%`
      query = query.or(searchFilter)
      countQuery = countQuery.or(searchFilter)
    }

    // Apply sorting
    let sortColumn = 'createdAt'
    let ascending = false
    switch (sortBy) {
      case 'price_asc':
        sortColumn = 'basePrice'
        ascending = true
        break
      case 'price_desc':
        sortColumn = 'basePrice'
        ascending = false
        break
      case 'rating':
        sortColumn = 'avgRating'
        ascending = false
        break
      case 'newest':
      default:
        sortColumn = 'createdAt'
        ascending = false
        break
    }

    query = query.order(sortColumn, { ascending })

    // Apply pagination
    const skip = (page - 1) * pageSize
    query = query.range(skip, skip + pageSize - 1)

    const [{ data: items, error: itemsError }, { count: total, error: countError }] = await Promise.all([
      query,
      countQuery,
    ])

    if (itemsError) {
      console.error('Products query error:', itemsError)
      throw itemsError
    }
    if (countError) {
      console.error('Products count error:', countError)
      throw countError
    }

    // If filtering by vendor, include that vendor's specific pricing
    let finalItems = items || []
    if (vendorId && finalItems.length > 0) {
      const productIdsForVendor = finalItems.map((p: { id: string }) => p.id)
      const { data: vendorProducts } = await supabase
        .from('vendor_products')
        .select('productId, sellingPrice, costPrice')
        .eq('vendorId', vendorId)
        .eq('isAvailable', true)
        .in('productId', productIdsForVendor)

      const vpMap = new Map(
        (vendorProducts || []).map((vp: { productId: string; sellingPrice: number; costPrice: number }) => [vp.productId, vp])
      )

      finalItems = finalItems.map((p: { id: string }) => ({
        ...p,
        vendorProducts: vpMap.has(p.id) ? [vpMap.get(p.id)] : [],
      }))
    }

    return NextResponse.json(
      { success: true, data: { items: finalItems, total: total || 0, page, pageSize } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
