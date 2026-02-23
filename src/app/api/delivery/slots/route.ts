import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nowIST, toISTDateString, parseLocalDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

// Fixed slot 2-hour windows (platform-defined)
const FIXED_WINDOWS = [
  { label: '9:00 AM \u2013 11:00 AM', start: '09:00', end: '11:00', startHour: 9, endHour: 11 },
  { label: '11:00 AM \u2013 1:00 PM', start: '11:00', end: '13:00', startHour: 11, endHour: 13 },
  { label: '1:00 PM \u2013 3:00 PM', start: '13:00', end: '15:00', startHour: 13, endHour: 15 },
  { label: '3:00 PM \u2013 5:00 PM', start: '15:00', end: '17:00', startHour: 15, endHour: 17 },
  { label: '5:00 PM \u2013 7:00 PM', start: '17:00', end: '19:00', startHour: 17, endHour: 19 },
  { label: '7:00 PM \u2013 9:00 PM', start: '19:00', end: '21:00', startHour: 19, endHour: 21 },
]

interface SlotOverride {
  slug: string
  blocked: boolean
  priceOverride: number | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get('cityId')
  const dateStr = searchParams.get('date') // YYYY-MM-DD

  if (!cityId || !dateStr) {
    return NextResponse.json(
      { success: false, error: 'cityId and date are required' },
      { status: 400 }
    )
  }

  try {
    const ist = nowIST()
    const currentHourIST = ist.getUTCHours()
    const todayIST = toISTDateString(new Date())
    const isToday = dateStr === todayIST
    const deliveryDate = parseLocalDate(dateStr)

    // Optional: compute max preparation time from cart product IDs
    const productIdsParam = searchParams.get('productIds')
    let maxPreparationTime = 120 // default 120 minutes
    if (productIdsParam) {
      const productIds = productIdsParam.split(',').filter(Boolean)
      if (productIds.length > 0) {
        const vendorProducts = await prisma.vendorProduct.findMany({
          where: { productId: { in: productIds }, isAvailable: true },
          select: { preparationTime: true },
        })
        if (vendorProducts.length > 0) {
          maxPreparationTime = Math.max(
            ...vendorProducts.map(vp => vp.preparationTime)
          )
        }
      }
    }

    // 1. Get city
    const city = await prisma.city.findUnique({
      where: { id: cityId, isActive: true },
    })
    if (!city) {
      return NextResponse.json({ success: false, error: 'City not found' }, { status: 404 })
    }

    // 2. Check holidays
    const holidays = await prisma.deliveryHoliday.findMany({
      where: {
        date: deliveryDate,
        OR: [{ cityId: city.id }, { cityId: null }],
      },
      orderBy: { cityId: 'desc' },
    })
    const holiday = holidays[0] ?? null

    if (holiday?.mode === 'FULL_BLOCK') {
      return NextResponse.json({
        success: true,
        data: {
          standard: { available: false, charge: 0 },
          fixedWindows: [],
          earlyMorning: { available: false, charge: 0, cutoffPassed: true },
          express: { available: false, charge: 0 },
          midnight: { available: false, charge: 0, cutoffPassed: true },
          surcharge: null,
          fullyBlocked: true,
          holidayReason: holiday.customerMessage ?? holiday.reason,
        },
      })
    }

    // 3. Get active surcharges for this date
    const surcharges = await prisma.deliverySurcharge.findMany({
      where: {
        isActive: true,
        startDate: { lte: deliveryDate },
        endDate: { gte: deliveryDate },
      },
    })
    const surchargeData = surcharges.length > 0
      ? {
          name: surcharges.map(s => s.name).join(', '),
          amount: surcharges.reduce((sum, s) => sum + Number(s.amount), 0),
        }
      : null

    // 4. Get city-enabled slots
    const cityConfigs = await prisma.cityDeliveryConfig.findMany({
      where: {
        cityId: city.id,
        isAvailable: true,
        ...(holiday?.mode === 'STANDARD_ONLY'
          ? { slot: { is: { slotGroup: 'standard' } } }
          : {}),
      },
      include: { slot: true },
    })

    // Build holiday override map
    const holidayOverrides = new Map<string, SlotOverride>()
    if (holiday?.mode === 'CUSTOM' && holiday.slotOverrides) {
      const overrides = holiday.slotOverrides as unknown as SlotOverride[]
      for (const o of overrides) {
        holidayOverrides.set(o.slug, o)
      }
    }

    // Helper to get charge for a slot config
    const getSlotCharge = (config: typeof cityConfigs[number]): number => {
      const override = holidayOverrides.get(config.slot.slug)
      if (override?.priceOverride != null) return override.priceOverride
      return Number(config.chargeOverride ?? config.slot.baseCharge)
    }

    // Helper to check if slot is blocked by holiday
    const isHolidayBlocked = (slug: string): boolean => {
      return holidayOverrides.get(slug)?.blocked === true
    }

    // --- Build response sections ---

    // Standard slot
    const standardConfig = cityConfigs.find(c => c.slot.slotGroup === 'standard' && c.slot.isActive)
    let standardResult: { available: boolean; charge: number }
    if (!standardConfig || isHolidayBlocked(standardConfig.slot.slug)) {
      standardResult = { available: false, charge: 0 }
    } else {
      const charge = getSlotCharge(standardConfig)
      standardResult = { available: true, charge }
    }

    // Fixed time windows
    const fixedConfig = cityConfigs.find(c => c.slot.slotGroup === 'fixed' && c.slot.isActive)
    let fixedWindows: { label: string; start: string; end: string; charge: number; available: boolean }[] = []
    if (fixedConfig && !isHolidayBlocked(fixedConfig.slot.slug)) {
      const baseCharge = getSlotCharge(fixedConfig)
      fixedWindows = FIXED_WINDOWS.map(fw => {
        let available = true
        // For today, hide windows where current IST time >= window start
        if (isToday && currentHourIST >= fw.startHour) {
          available = false
        }
        // Per-window pricing: later windows cost more
        let windowCharge = baseCharge
        if (fw.startHour >= 19) {
          windowCharge = Math.max(baseCharge, 100)
        } else if (fw.startHour >= 15) {
          windowCharge = Math.max(baseCharge, 75)
        } else {
          windowCharge = Math.max(baseCharge, 50)
        }

        return {
          label: fw.label,
          start: fw.start,
          end: fw.end,
          charge: windowCharge,
          available,
        }
      }).filter(w => w.available) // Only return available windows
    }

    // Early Morning slot
    const earlyConfig = cityConfigs.find(c => c.slot.slotGroup === 'early-morning' && c.slot.isActive)
    let earlyMorningResult: { available: boolean; charge: number; cutoffPassed: boolean }
    if (!earlyConfig || isHolidayBlocked(earlyConfig.slot.slug)) {
      earlyMorningResult = { available: false, charge: 149, cutoffPassed: true }
    } else {
      const charge = getSlotCharge(earlyConfig) || 149
      // Cutoff: previous day 6 PM — for today's delivery, always passed
      // For future dates, cutoff is 6 PM the day before
      let cutoffPassed = false
      if (isToday) {
        cutoffPassed = true // Can never order early morning for same day
      } else {
        // Check if it's the day before delivery and past 6 PM
        const yesterday = new Date(deliveryDate)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
        if (todayIST === yesterdayStr && currentHourIST >= 18) {
          cutoffPassed = true
        }
      }
      earlyMorningResult = { available: !cutoffPassed, charge, cutoffPassed }
    }

    // Express slot
    const expressConfig = cityConfigs.find(c => c.slot.slotGroup === 'express' && c.slot.isActive)
    let expressResult: { available: boolean; charge: number }
    if (!expressConfig || isHolidayBlocked(expressConfig.slot.slug)) {
      expressResult = { available: false, charge: 249 }
    } else {
      const charge = getSlotCharge(expressConfig) || 249
      expressResult = { available: true, charge }
    }

    // Midnight slot
    const midnightConfig = cityConfigs.find(c => c.slot.slotGroup === 'midnight' && c.slot.isActive)
    let midnightResult: { available: boolean; charge: number; cutoffPassed: boolean }
    if (!midnightConfig || isHolidayBlocked(midnightConfig.slot.slug)) {
      midnightResult = { available: false, charge: 199, cutoffPassed: true }
    } else {
      const charge = getSlotCharge(midnightConfig) || 199
      // Cutoff: 6 PM same day
      let cutoffPassed = false
      if (isToday && currentHourIST >= 18) {
        cutoffPassed = true
      }
      midnightResult = { available: !cutoffPassed, charge, cutoffPassed }
    }

    return NextResponse.json({
      success: true,
      data: {
        standard: standardResult,
        fixedWindows,
        earlyMorning: earlyMorningResult,
        express: expressResult,
        midnight: midnightResult,
        surcharge: surchargeData,
        fullyBlocked: false,
        holidayReason: null,
        maxPreparationTime,
      },
    })
  } catch (error) {
    console.error('[delivery/slots]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch delivery slots' },
      { status: 500 }
    )
  }
}
