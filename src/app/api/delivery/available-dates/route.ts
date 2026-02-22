import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const cityId = searchParams.get('cityId')
  const months = parseInt(searchParams.get('months') || '2', 10)

  if (!productId || !cityId) {
    return NextResponse.json(
      { success: false, error: 'productId and cityId are required' },
      { status: 400 }
    )
  }

  try {
    // 1. Get approved vendors in this city that have this product
    const vendorProducts = await prisma.vendorProduct.findMany({
      where: {
        productId,
        isAvailable: true,
        vendor: {
          cityId,
          status: 'APPROVED',
        },
      },
      include: {
        vendor: {
          include: {
            workingHours: true,
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

    // 2. Get city delivery configs (which slots are enabled)
    const cityConfigs = await prisma.cityDeliveryConfig.findMany({
      where: { cityId, isAvailable: true },
      include: { slot: true },
    })

    if (cityConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { availableDates: [] },
      })
    }

    // 3. Get delivery holidays for the date range
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const today = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate())
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + months * 30)

    const holidays = await prisma.deliveryHoliday.findMany({
      where: {
        date: { gte: today, lte: endDate },
        OR: [{ cityId }, { cityId: null }],
      },
    })

    // Build a map of date -> holiday (city-specific takes priority)
    const holidayMap = new Map<string, { mode: string; cityId: string | null }>()
    for (const h of holidays) {
      const dateKey = h.date.toISOString().split('T')[0]
      const existing = holidayMap.get(dateKey)
      // City-specific takes priority over global
      if (!existing || (h.cityId && !existing.cityId)) {
        holidayMap.set(dateKey, { mode: h.mode as string, cityId: h.cityId })
      }
    }

    // 4. For each date, check availability
    const availableDates: string[] = []
    const totalDays = months * 30

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      // Check holiday: full day block
      const holiday = holidayMap.get(dateStr)
      if (holiday?.mode === 'FULL_BLOCK') {
        continue
      }

      // Check if any slot is enabled for this city (already checked above, but filter for STANDARD_ONLY)
      if (holiday?.mode === 'STANDARD_ONLY') {
        const hasStandard = cityConfigs.some(c => c.slot.slotGroup === 'standard')
        if (!hasStandard) continue
      }

      // Check vendor working hours for this day of week
      const dayOfWeek = date.getDay() // 0=Sunday
      const anyVendorOpen = vendorProducts.some(vp => {
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
