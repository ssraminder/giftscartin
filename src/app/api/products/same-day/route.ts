import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  city: z.string().min(1, 'City slug is required'),
  category: z.string().optional(),
})

// Helper: get current IST time
function getISTNow() {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const istMs = utcMs + 5.5 * 3600000
  return new Date(istMs)
}

// Helper: parse "HH:MM" to total minutes from midnight
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

// GET — Return same-day eligible products with vendor availability check
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { city: citySlug, category } = parsed.data
    const ist = getISTNow()
    const currentMinutes = ist.getHours() * 60 + ist.getMinutes()
    const dayOfWeek = ist.getDay() // 0=Sunday

    // Find the city
    const cityRecord = await prisma.city.findUnique({
      where: { slug: citySlug },
      select: { id: true, name: true },
    })

    if (!cityRecord) {
      return NextResponse.json(
        { success: false, error: 'City not found' },
        { status: 404 }
      )
    }

    // Build product filter
    const productWhere: Record<string, unknown> = {
      isSameDayEligible: true,
      isActive: true,
    }
    if (category) {
      productWhere.category = { slug: category }
    }

    // Get all same-day eligible products that have vendors in this city
    const products = await prisma.product.findMany({
      where: {
        ...productWhere,
        vendorProducts: {
          some: {
            isAvailable: true,
            vendor: {
              cityId: cityRecord.id,
              status: 'APPROVED',
            },
          },
        },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        vendorProducts: {
          where: {
            isAvailable: true,
            vendor: {
              cityId: cityRecord.id,
              status: 'APPROVED',
            },
          },
          include: {
            vendor: {
              include: {
                workingHours: {
                  where: { dayOfWeek },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Filter: only keep products where at least one vendor can still fulfill today
    const sameDayProducts = []
    let earliestCutoffMinutes = Infinity

    for (const product of products) {
      let canFulfillToday = false
      let productEarliestCutoff = Infinity

      for (const vp of product.vendorProducts) {
        const todayHours = vp.vendor.workingHours[0]
        if (!todayHours || todayHours.isClosed) continue

        const closeMinutes = parseTimeToMinutes(todayHours.closeTime)
        const latestOrderMinutes = closeMinutes - vp.preparationTime

        if (currentMinutes < latestOrderMinutes) {
          canFulfillToday = true
          if (latestOrderMinutes < productEarliestCutoff) {
            productEarliestCutoff = latestOrderMinutes
          }
        }
      }

      if (canFulfillToday) {
        if (productEarliestCutoff < earliestCutoffMinutes) {
          earliestCutoffMinutes = productEarliestCutoff
        }

        sameDayProducts.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          basePrice: Number(product.basePrice),
          images: product.images,
          avgRating: Number(product.avgRating),
          totalReviews: product.totalReviews,
          weight: product.weight,
          tags: product.tags,
          isSameDayEligible: product.isSameDayEligible,
          category: product.category,
          cutoffMinutes: productEarliestCutoff,
        })
      }
    }

    // Calculate the overall cutoff time string
    let cutoffTimeStr: string | null = null
    if (earliestCutoffMinutes < Infinity) {
      const cutoffHours = Math.floor(earliestCutoffMinutes / 60)
      const cutoffMins = earliestCutoffMinutes % 60
      const ampm = cutoffHours >= 12 ? 'PM' : 'AM'
      const displayHour = cutoffHours > 12 ? cutoffHours - 12 : cutoffHours === 0 ? 12 : cutoffHours
      cutoffTimeStr = `${displayHour}:${String(cutoffMins).padStart(2, '0')} ${ampm}`
    }

    const sameDayClosed = sameDayProducts.length === 0 && products.length > 0

    return NextResponse.json({
      success: true,
      data: {
        products: sameDayProducts,
        cutoffTime: cutoffTimeStr,
        sameDayClosed,
        city: cityRecord.name,
      },
    })
  } catch (error) {
    console.error('GET /api/products/same-day error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch same-day products' },
      { status: 500 }
    )
  }
}
