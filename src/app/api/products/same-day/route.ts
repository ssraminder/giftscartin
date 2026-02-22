import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    // Current IST time
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const currentHourIST = nowIST.getUTCHours()
    const currentMinuteIST = nowIST.getUTCMinutes()
    const currentMinutesIST = currentHourIST * 60 + currentMinuteIST
    const todayDayOfWeek = nowIST.getUTCDay()
    const todayDate = new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate())

    // Check for full-day delivery holiday today
    const holidays = await prisma.deliveryHoliday.findMany({
      where: {
        date: todayDate,
        OR: [{ cityId }, { cityId: null }],
        mode: 'FULL_BLOCK',
      },
    })
    // City-specific holiday takes priority
    const fullBlock = holidays.find(h => h.cityId === cityId) || holidays.find(h => !h.cityId)

    if (fullBlock) {
      return NextResponse.json({
        success: true,
        data: {
          products: [],
          generatedAt: nowIST.toISOString(),
        },
      })
    }

    // Find products where at least one vendor_product has isSameDayEligible = true
    const whereClause: Record<string, unknown> = {
      isActive: true,
      vendorProducts: {
        some: {
          isSameDayEligible: true,
          isAvailable: true,
          vendor: {
            cityId,
            status: 'APPROVED',
          },
        },
      },
    }

    if (categorySlug) {
      whereClause.category = { slug: categorySlug }
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        vendorProducts: {
          where: {
            isSameDayEligible: true,
            isAvailable: true,
            vendor: {
              cityId,
              status: 'APPROVED',
            },
          },
          include: {
            vendor: {
              include: {
                workingHours: {
                  where: { dayOfWeek: todayDayOfWeek },
                },
              },
            },
          },
        },
      },
    })

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

    for (const product of products) {
      let latestCutoff = 0 // in minutes from midnight

      for (const vp of product.vendorProducts) {
        const vendor = vp.vendor
        const wh = vendor.workingHours[0]

        if (!wh || wh.isClosed) continue

        const [closeH, closeM] = wh.closeTime.split(':').map(Number)
        const closeMinutes = closeH * 60 + closeM
        const prepMinutes = vp.preparationTime

        // currentTimeIST + preparationTime < vendorCloseTime
        if ((currentMinutesIST + prepMinutes) < closeMinutes) {
          // This vendor can still accept orders
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
          id: product.id,
          name: product.name,
          slug: product.slug,
          basePrice: Number(product.basePrice),
          images: product.images,
          avgRating: Number(product.avgRating),
          totalReviews: product.totalReviews,
          weight: product.weight,
          tags: product.tags,
          category: product.category,
          cutoffTime,
        })
      }
    }

    // Sort by cutoff time ascending (most urgent first)
    qualifyingProducts.sort((a, b) => {
      // Parse cutoff times back to minutes for sorting
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
