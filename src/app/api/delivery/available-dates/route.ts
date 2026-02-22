import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTodayIST } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const cityId = searchParams.get('cityId')
  const days = parseInt(searchParams.get('days') || '15', 10)

  if (!productId || !cityId) {
    return NextResponse.json(
      { success: false, error: 'productId and cityId are required' },
      { status: 400 }
    )
  }

  try {
    // Compute date range up front (pure JS, needed by Q3)
    const today = getTodayIST()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + days)

    // Q1: Vendors that carry this product in the city.
    //     select instead of include → Prisma fetches only the columns we read.
    const vendorProducts = await prisma.vendorProduct.findMany({
      where: {
        productId,
        isAvailable: true,
        vendor: {
          cityId,
          status: 'APPROVED',
          OR: [
            { vacationEnd: null },
            { vacationEnd: { lt: new Date() } },
          ],
        },
      },
      select: {
        vendor: {
          select: {
            workingHours: {
              select: {
                dayOfWeek: true,
                isClosed: true,
              },
            },
          },
        },
      },
    })

    if (vendorProducts.length === 0) {
      return NextResponse.json({
        success: true,
        data: { availableDates: [] },
      })
    }

    // Q2 + Q3: City slot configs and delivery holidays — independent, run in parallel.
    const [cityConfigs, holidays] = await Promise.all([
      prisma.cityDeliveryConfig.findMany({
        where: { cityId, isAvailable: true },
        select: {
          slot: {
            select: { slotGroup: true },
          },
        },
      }),
      prisma.deliveryHoliday.findMany({
        where: {
          date: { gte: today, lte: endDate },
          OR: [{ cityId }, { cityId: null }],
        },
        select: {
          date: true,
          mode: true,
          cityId: true,
        },
      }),
    ])

    if (cityConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { availableDates: [] },
      })
    }

    // Build a map of date -> holiday (city-specific takes priority)
    const holidayMap = new Map<string, { mode: string; cityId: string | null }>()
    for (const h of holidays) {
      const dateKey = h.date.toISOString().split('T')[0]
      const existing = holidayMap.get(dateKey)
      if (!existing || (h.cityId && !existing.cityId)) {
        holidayMap.set(dateKey, { mode: h.mode as string, cityId: h.cityId })
      }
    }

    // For each date in the range, check availability
    const availableDates: string[] = []

    for (let i = 0; i <= days; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`

      // Check holiday: full day block
      const holiday = holidayMap.get(dateStr)
      if (holiday?.mode === 'FULL_BLOCK') {
        continue
      }

      // STANDARD_ONLY: only if city has standard slots
      if (holiday?.mode === 'STANDARD_ONLY') {
        const hasStandard = cityConfigs.some(c => c.slot.slotGroup === 'standard')
        if (!hasStandard) continue
      }

      // Check vendor working hours for this day of week.
      // If vendor has no working hours records, assume they're open.
      const dayOfWeek = date.getDay() // 0=Sunday
      const anyVendorOpen = vendorProducts.some(vp => {
        if (vp.vendor.workingHours.length === 0) return true // No schedule configured = open
        const hours = vp.vendor.workingHours.find(wh => wh.dayOfWeek === dayOfWeek)
        return hours && !hours.isClosed
      })

      if (!anyVendorOpen) {
        continue
      }

      availableDates.push(dateStr)
    }

    const response = NextResponse.json({
      success: true,
      data: { availableDates },
    })
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return response
  } catch (error) {
    console.error('[delivery/available-dates]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available dates' },
      { status: 500 }
    )
  }
}
