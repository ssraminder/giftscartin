import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get('cityId')
  const categorySlug = searchParams.get('categorySlug')

  if (!cityId) {
    return NextResponse.json(
      { success: false, error: 'cityId is required' },
      { status: 400 }
    )
  }

  try {
    const supabase = getSupabaseAdmin()

    // Current IST time
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const currentHourIST = nowIST.getUTCHours()
    const currentMinuteIST = nowIST.getUTCMinutes()
    const currentMinutesIST = currentHourIST * 60 + currentMinuteIST
    const todayDayOfWeek = nowIST.getUTCDay()
    const todayDate = new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate())

    // Check for full-day delivery holiday today
    const { data: holidays } = await supabase
      .from('delivery_holidays')
      .select('*')
      .eq('date', todayDate.toISOString())
      .eq('mode', 'FULL_BLOCK')
      .or(`cityId.eq.${cityId},cityId.is.null`)

    // City-specific holiday takes priority
    const fullBlock = (holidays || []).find((h: Record<string, unknown>) => h.cityId === cityId) ||
                      (holidays || []).find((h: Record<string, unknown>) => !h.cityId)

    if (fullBlock) {
      return NextResponse.json({
        success: true,
        data: {
          products: [],
          generatedAt: nowIST.toISOString(),
        },
      })
    }

    // Find vendor_products that are same-day eligible in this city
    const { data: vendorProducts } = await supabase
      .from('vendor_products')
      .select('*, products(*, categories(id, name, slug)), vendors(*, vendor_working_hours(*))')
      .eq('isSameDayEligible', true)
      .eq('isAvailable', true)

    // Filter by vendor city, status, and product active status
    const filteredVPs = (vendorProducts || []).filter((vp: Record<string, unknown>) => {
      const vendor = vp.vendors as Record<string, unknown> | null
      const product = vp.products as Record<string, unknown> | null
      if (!vendor || !product) return false
      if (vendor.cityId !== cityId) return false
      if (vendor.status !== 'APPROVED') return false
      if (!product.isActive) return false
      if (categorySlug) {
        const cat = product.categories as Record<string, unknown> | null
        if (cat?.slug !== categorySlug) return false
      }
      return true
    })

    // Group by product
    const productMap = new Map<string, {
      product: Record<string, unknown>
      vendorProducts: Array<{
        preparationTime: number
        vendor: Record<string, unknown>
      }>
    }>()

    for (const vp of filteredVPs) {
      const product = vp.products as Record<string, unknown>
      const vendor = vp.vendors as Record<string, unknown>
      const productId = product.id as string

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product,
          vendorProducts: [],
        })
      }

      productMap.get(productId)!.vendorProducts.push({
        preparationTime: vp.preparationTime as number,
        vendor: {
          ...vendor,
          workingHours: (vendor.vendor_working_hours as Record<string, unknown>[]) || [],
        },
      })
    }

    // Filter products with at least one qualifying vendor
    const qualifyingProducts: Array<{
      id: string
      name: string
      slug: string
      basePrice: number
      images: string[]
      avgRating: number
      totalReviews: number
      weight: string | null
      tags: string[]
      category: { id: string; name: string; slug: string } | null
      cutoffTime: string
    }> = []

    for (const [, entry] of Array.from(productMap)) {
      const { product, vendorProducts: vps } = entry
      let latestCutoff = 0 // in minutes from midnight

      for (const vp of vps) {
        const wh = (vp.vendor.workingHours as Record<string, unknown>[])
          .find((w: Record<string, unknown>) => w.dayOfWeek === todayDayOfWeek)

        if (!wh || (wh as Record<string, unknown>).isClosed) continue

        const [closeH, closeM] = ((wh as Record<string, unknown>).closeTime as string).split(':').map(Number)
        const closeMinutes = closeH * 60 + closeM
        const prepMinutes = vp.preparationTime

        // currentTimeIST + preparationTime < vendorCloseTime
        if ((currentMinutesIST + prepMinutes) < closeMinutes) {
          const vendorCutoff = closeMinutes - prepMinutes
          if (vendorCutoff > latestCutoff) {
            latestCutoff = vendorCutoff
          }
        }
      }

      if (latestCutoff > 0) {
        // Format cutoff time
        const cutoffHour = Math.floor(latestCutoff / 60)
        const cutoffMin = latestCutoff % 60
        const period = cutoffHour >= 12 ? 'PM' : 'AM'
        const displayHour = cutoffHour > 12 ? cutoffHour - 12 : cutoffHour === 0 ? 12 : cutoffHour
        const cutoffTime = cutoffMin > 0
          ? `${displayHour}:${cutoffMin.toString().padStart(2, '0')} ${period}`
          : `${displayHour} ${period}`

        qualifyingProducts.push({
          id: product.id as string,
          name: product.name as string,
          slug: product.slug as string,
          basePrice: Number(product.basePrice),
          images: product.images as string[],
          avgRating: Number(product.avgRating),
          totalReviews: product.totalReviews as number,
          weight: product.weight as string | null,
          tags: product.tags as string[],
          category: product.categories as { id: string; name: string; slug: string } | null,
          cutoffTime,
        })
      }
    }

    // Sort by cutoff time ascending (most urgent first)
    qualifyingProducts.sort((a, b) => {
      const parseTime = (t: string) => {
        const match = t.match(/^(\d+):?(\d*)?\s*(AM|PM)$/)
        if (!match) return 0
        let h = parseInt(match[1])
        const m = match[2] ? parseInt(match[2]) : 0
        if (match[3] === 'PM' && h !== 12) h += 12
        if (match[3] === 'AM' && h === 12) h = 0
        return h * 60 + m
      }
      return parseTime(a.cutoffTime) - parseTime(b.cutoffTime)
    })

    return NextResponse.json({
      success: true,
      data: {
        products: qualifyingProducts,
        generatedAt: nowIST.toISOString(),
      },
    })
  } catch (error) {
    console.error('[products/same-day]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch same-day products' },
      { status: 500 }
    )
  }
}
