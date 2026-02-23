import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const citySlug = request.nextUrl.searchParams.get('citySlug')
    const supabase = getSupabaseAdmin()

    // If citySlug is provided, find product IDs available in that city
    let productIdsInCity: string[] | null = null
    if (citySlug) {
      const { data: cityData } = await supabase
        .from('cities')
        .select('id')
        .eq('slug', citySlug)
        .single()

      if (cityData) {
        const { data: vendors } = await supabase
          .from('vendors')
          .select('id')
          .eq('cityId', cityData.id)
          .eq('status', 'APPROVED')

        const vIds = (vendors || []).map((v: { id: string }) => v.id)

        if (vIds.length > 0) {
          const { data: vps } = await supabase
            .from('vendor_products')
            .select('productId')
            .in('vendorId', vIds)
            .eq('isAvailable', true)

          productIdsInCity = Array.from(new Set((vps || []).map((vp: { productId: string }) => vp.productId)))
        } else {
          productIdsInCity = []
        }
      } else {
        productIdsInCity = []
      }
    }

    // Fetch parent categories with children
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*, children:categories!parentId(id, name, slug, image, sortOrder, isActive)')
      .eq('isActive', true)
      .is('parentId', null)
      .order('sortOrder', { ascending: true })

    if (error) {
      console.error('Categories query error:', error)
      throw error
    }

    // Filter children to active only and sort
    const processedCategories = (categories || []).map((cat: Record<string, unknown>) => {
      const children = ((cat.children as Array<{ isActive: boolean; sortOrder: number }>) || [])
        .filter((c: { isActive: boolean }) => c.isActive)
        .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)

      return {
        ...cat,
        children,
      }
    })

    // For each category, count products (potentially filtered by city)
    const categoryProductCounts = await Promise.all(
      processedCategories.map(async (cat: Record<string, unknown>) => {
        const catId = cat.id as string
        let countQuery = supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('isActive', true)
          .eq('categoryId', catId)

        if (productIdsInCity !== null) {
          if (productIdsInCity.length === 0) {
            return { categoryId: catId, count: 0 }
          }
          countQuery = countQuery.in('id', productIdsInCity)
        }

        const { count } = await countQuery
        return { categoryId: catId, count: count || 0 }
      })
    )

    const countMap = new Map(
      categoryProductCounts.map((c) => [c.categoryId, c.count])
    )

    // Map to include productCount
    let data = processedCategories.map((cat: Record<string, unknown>) => ({
      ...cat,
      productCount: countMap.get(cat.id as string) || 0,
    }))

    // If citySlug is set, filter out categories with 0 products in that city
    if (citySlug) {
      data = data.filter((cat: { productCount: number }) => cat.productCount > 0)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
