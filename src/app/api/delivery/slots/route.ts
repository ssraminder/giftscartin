import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Shape of one slot override in delivery_holidays.slotOverrides JSONB
interface SlotOverride {
  slug: string
  blocked: boolean
  priceOverride: number | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const citySlug   = searchParams.get('citySlug')
  const dateStr    = searchParams.get('date')       // YYYY-MM-DD
  const productIds = searchParams.get('productIds') // comma-separated, optional

  if (!citySlug || !dateStr) {
    return NextResponse.json(
      { success: false, error: 'citySlug and date are required' },
      { status: 400 }
    )
  }

  try {
    const now  = new Date()
    const isToday = new Date(dateStr).toDateString() === now.toDateString()

    // 1. Get city
    const city = await prisma.city.findUnique({
      where: { slug: citySlug, isActive: true },
    })
    if (!city) {
      return NextResponse.json({ success: false, error: 'City not found' }, { status: 404 })
    }

    // 2. Check holiday for this date (city-specific takes priority over global)
    const deliveryDate = new Date(dateStr)
    const holidays = await prisma.deliveryHoliday.findMany({
      where: {
        date: deliveryDate,
        OR: [{ cityId: city.id }, { cityId: null }],
      },
      orderBy: { cityId: 'desc' }, // city-specific (non-null) first
    })
    // Use first matching holiday (city-specific wins over global)
    const holiday = holidays[0] ?? null

    // FULL_BLOCK — return immediately, no slots
    if (holiday?.mode === 'FULL_BLOCK') {
      return NextResponse.json({
        success: true,
        data: {
          slots: [],
          effectiveLeadTimeHours: 0,
          leadTimeNote: null,
          earliestDate: dateStr,
          isFullyBlocked: true,
          holidayReason: holiday.customerMessage ?? holiday.reason,
          totalSurcharge: 0,
          surchargeNames: [],
        },
      })
    }

    // 3. Get city-enabled slots
    const cityConfigs = await prisma.cityDeliveryConfig.findMany({
      where: {
        cityId: city.id,
        isAvailable: true,
        // STANDARD_ONLY mode: only return the 'standard' slot group
        ...(holiday?.mode === 'STANDARD_ONLY'
          ? { slot: { is: { slotGroup: 'standard' } } }
          : {}),
      },
      include: { slot: true },
    })

    // 4. Build holiday override map (slug → {blocked, priceOverride})
    const holidayOverrides = new Map<string, SlotOverride>()
    if (holiday?.mode === 'CUSTOM' && holiday.slotOverrides) {
      const overrides = holiday.slotOverrides as unknown as SlotOverride[]
      for (const o of overrides) {
        holidayOverrides.set(o.slug, o)
      }
    }

    // 5. Get active surcharges for this date
    const surcharges = await prisma.deliverySurcharge.findMany({
      where: {
        isActive: true,
        startDate: { lte: deliveryDate },
        endDate:   { gte: deliveryDate },
      },
    })
    const totalSurcharge = surcharges.reduce((sum, s) => sum + Number(s.amount), 0)

    // 6. Calculate effective lead time from cart products
    let effectiveLeadTimeHours = 2
    let leadTimeNote: string | null = null
    if (productIds) {
      const ids = productIds.split(',').filter(Boolean)
      if (ids.length > 0) {
        const products = await prisma.product.findMany({
          where: { id: { in: ids } },
          select: { minLeadTimeHours: true, leadTimeNote: true },
        })
        for (const p of products) {
          if (p.minLeadTimeHours > effectiveLeadTimeHours) {
            effectiveLeadTimeHours = p.minLeadTimeHours
            leadTimeNote = p.leadTimeNote ?? null
          }
        }
      }
    }

    // 7. Earliest deliverable datetime
    const earliestDelivery = new Date(now.getTime() + effectiveLeadTimeHours * 60 * 60 * 1000)
    const requestedDayEnd  = new Date(dateStr + 'T23:59:59')

    if (earliestDelivery > requestedDayEnd) {
      return NextResponse.json({
        success: true,
        data: {
          slots: [],
          effectiveLeadTimeHours,
          leadTimeNote,
          earliestDate: earliestDelivery.toISOString().split('T')[0],
          isFullyBlocked: false,
          holidayReason: null,
          totalSurcharge,
          surchargeNames: surcharges.map(s => s.name),
        },
      })
    }

    // 8. Evaluate each slot
    const slots = cityConfigs.map(config => {
      const slot = config.slot
      const holidayOverride = holidayOverrides.get(slot.slug)

      // Holiday CUSTOM: slot explicitly blocked
      if (holidayOverride?.blocked) {
        return null
      }

      // Base charge: holiday price override > city override > slot base charge
      let charge: number
      let surchargeApplied = 0
      if (holidayOverride?.priceOverride != null) {
        // Holiday price is final — surcharges do NOT stack
        charge = holidayOverride.priceOverride
      } else {
        charge = Number(config.chargeOverride ?? slot.baseCharge)
        surchargeApplied = totalSurcharge
      }
      const totalCharge = charge + surchargeApplied

      // Parse slot start/end
      const [startH, startM] = slot.startTime.split(':').map(Number)
      const [endH,   endM]   = slot.endTime.split(':').map(Number)
      const slotStart = new Date(dateStr); slotStart.setHours(startH, startM, 0, 0)
      const slotEnd   = new Date(dateStr); slotEnd.setHours(endH, endM, 59, 999)

      // Lead time check: earliest delivery must land before slot closes
      const leadTimeSatisfied = earliestDelivery <= slotEnd

      // Cutoff check
      let cutoffSatisfied = true
      if (isToday || slot.slotGroup === 'early-morning') {
        if (slot.cutoffTime) {
          const [cutH, cutM] = slot.cutoffTime.split(':').map(Number)
          const cutoffDate = new Date(dateStr)
          if (slot.slotGroup === 'early-morning') {
            // Cutoff is 6pm the PREVIOUS day
            cutoffDate.setDate(cutoffDate.getDate() - 1)
          }
          cutoffDate.setHours(cutH, cutM, 0, 0)
          cutoffSatisfied = now <= cutoffDate
        } else if (slot.cutoffHours > 0) {
          const cutoff = new Date(slotStart.getTime() - slot.cutoffHours * 60 * 60 * 1000)
          cutoffSatisfied = now <= cutoff
        }
      }

      const isAvailable = leadTimeSatisfied && cutoffSatisfied

      return {
        id:   slot.id,
        name: slot.name,
        slug: slot.slug,
        slotGroup:  slot.slotGroup,
        timeWindow: `${slot.startTime} – ${slot.endTime}`,
        charge:     totalCharge,
        baseCharge: charge,
        surcharge:  surchargeApplied,
        isHolidayPriced: holidayOverride?.priceOverride != null,
        isAvailable,
        unavailableReason: !leadTimeSatisfied
          ? 'preparation_time'
          : !cutoffSatisfied
          ? 'cutoff_passed'
          : null,
      }
    }).filter(Boolean)

    // 9. Sort: standard → fixed windows (by time) → midnight → early-morning → express
    const groupOrder = ['standard', 'fixed', 'midnight', 'early-morning', 'express']
    slots.sort((a, b) => {
      const groupDiff = groupOrder.indexOf(a!.slotGroup) - groupOrder.indexOf(b!.slotGroup)
      if (groupDiff !== 0) return groupDiff
      return a!.timeWindow.localeCompare(b!.timeWindow)
    })

    return NextResponse.json({
      success: true,
      data: {
        slots,
        effectiveLeadTimeHours,
        leadTimeNote,
        earliestDate: earliestDelivery.toISOString().split('T')[0],
        isFullyBlocked: false,
        holidayReason: holiday?.customerMessage ?? null,
        totalSurcharge,
        surchargeNames: surcharges.map(s => s.name),
        holidayMode: holiday?.mode ?? null,
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
