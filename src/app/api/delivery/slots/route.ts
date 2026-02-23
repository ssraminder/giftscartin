import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
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
    const supabase = getSupabaseAdmin()
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
        const { data: vendorProducts } = await supabase
          .from('vendor_products')
          .select('preparationTime')
          .in('productId', productIds)
          .eq('isAvailable', true)

        if (vendorProducts && vendorProducts.length > 0) {
          maxPreparationTime = Math.max(
            ...vendorProducts.map((vp: { preparationTime: number }) => vp.preparationTime)
          )
        }
      }
    }

    // 1. Get city
    const { data: city } = await supabase
      .from('cities')
      .select('*')
      .eq('id', cityId)
      .eq('isActive', true)
      .single()

    if (!city) {
      return NextResponse.json({ success: false, error: 'City not found' }, { status: 404 })
    }

    // 2. Check holidays
    const { data: holidays } = await supabase
      .from('delivery_holidays')
      .select('*')
      .eq('date', deliveryDate.toISOString())
      .or(`cityId.eq.${city.id},cityId.is.null`)
      .order('cityId', { ascending: false })

    const holiday = (holidays && holidays.length > 0) ? holidays[0] : null

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
    const { data: surcharges } = await supabase
      .from('delivery_surcharges')
      .select('*')
      .eq('isActive', true)
      .lte('startDate', deliveryDate.toISOString())
      .gte('endDate', deliveryDate.toISOString())

    const surchargeData = (surcharges && surcharges.length > 0)
      ? {
          name: surcharges.map((s: Record<string, unknown>) => s.name).join(', '),
          amount: surcharges.reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.amount), 0),
        }
      : null

    // 4. Get city-enabled slots with their delivery_slots
    const cityConfigsQuery = supabase
      .from('city_delivery_configs')
      .select('*, delivery_slots(*)')
      .eq('cityId', city.id)
      .eq('isAvailable', true)

    // For STANDARD_ONLY holiday mode, we filter after fetching
    const { data: allCityConfigs } = await cityConfigsQuery

    const cityConfigs = (allCityConfigs || []).filter((c: Record<string, unknown>) => {
      const slot = c.delivery_slots as Record<string, unknown>
      if (holiday?.mode === 'STANDARD_ONLY') {
        return slot?.slotGroup === 'standard'
      }
      return true
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
    const getSlotCharge = (config: Record<string, unknown>): number => {
      const slot = config.delivery_slots as Record<string, unknown>
      const override = holidayOverrides.get(slot.slug as string)
      if (override?.priceOverride != null) return override.priceOverride
      return Number(config.chargeOverride ?? slot.baseCharge)
    }

    // Helper to check if slot is blocked by holiday
    const isHolidayBlocked = (slug: string): boolean => {
      return holidayOverrides.get(slug)?.blocked === true
    }

    // --- Build response sections ---

    // Standard slot
    const standardConfig = cityConfigs.find((c: Record<string, unknown>) => {
      const slot = c.delivery_slots as Record<string, unknown>
      return slot?.slotGroup === 'standard' && slot?.isActive
    })
    let standardResult: { available: boolean; charge: number }
    if (!standardConfig || isHolidayBlocked((standardConfig.delivery_slots as Record<string, unknown>).slug as string)) {
      standardResult = { available: false, charge: 0 }
    } else {
      const charge = getSlotCharge(standardConfig)
      standardResult = { available: true, charge }
    }

    // Fixed time windows
    const fixedConfig = cityConfigs.find((c: Record<string, unknown>) => {
      const slot = c.delivery_slots as Record<string, unknown>
      return slot?.slotGroup === 'fixed' && slot?.isActive
    })
    let fixedWindows: { label: string; start: string; end: string; charge: number; available: boolean }[] = []
    if (fixedConfig && !isHolidayBlocked((fixedConfig.delivery_slots as Record<string, unknown>).slug as string)) {
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
    const earlyConfig = cityConfigs.find((c: Record<string, unknown>) => {
      const slot = c.delivery_slots as Record<string, unknown>
      return slot?.slotGroup === 'early-morning' && slot?.isActive
    })
    let earlyMorningResult: { available: boolean; charge: number; cutoffPassed: boolean }
    if (!earlyConfig || isHolidayBlocked((earlyConfig.delivery_slots as Record<string, unknown>).slug as string)) {
      earlyMorningResult = { available: false, charge: 149, cutoffPassed: true }
    } else {
      const charge = getSlotCharge(earlyConfig) || 149
      let cutoffPassed = false
      if (isToday) {
        cutoffPassed = true // Can never order early morning for same day
      } else {
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
    const expressConfig = cityConfigs.find((c: Record<string, unknown>) => {
      const slot = c.delivery_slots as Record<string, unknown>
      return slot?.slotGroup === 'express' && slot?.isActive
    })
    let expressResult: { available: boolean; charge: number }
    if (!expressConfig || isHolidayBlocked((expressConfig.delivery_slots as Record<string, unknown>).slug as string)) {
      expressResult = { available: false, charge: 249 }
    } else {
      const charge = getSlotCharge(expressConfig) || 249
      expressResult = { available: true, charge }
    }

    // Midnight slot
    const midnightConfig = cityConfigs.find((c: Record<string, unknown>) => {
      const slot = c.delivery_slots as Record<string, unknown>
      return slot?.slotGroup === 'midnight' && slot?.isActive
    })
    let midnightResult: { available: boolean; charge: number; cutoffPassed: boolean }
    if (!midnightConfig || isHolidayBlocked((midnightConfig.delivery_slots as Record<string, unknown>).slug as string)) {
      midnightResult = { available: false, charge: 199, cutoffPassed: true }
    } else {
      const charge = getSlotCharge(midnightConfig) || 199
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
