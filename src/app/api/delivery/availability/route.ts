import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { nowIST, toISTDateString, parseLocalDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

// Fixed slot 2-hour windows (platform-defined)
const FIXED_WINDOWS = [
  { label: '9AM\u201311AM', startHour: 9, endHour: 11 },
  { label: '11AM\u20131PM', startHour: 11, endHour: 13 },
  { label: '1PM\u20133PM', startHour: 13, endHour: 15 },
  { label: '3PM\u20135PM', startHour: 15, endHour: 17 },
  { label: '5PM\u20137PM', startHour: 17, endHour: 19 },
  { label: '7PM\u20139PM', startHour: 19, endHour: 21 },
]

interface SlotOverride {
  slug: string
  blocked: boolean
  priceOverride: number | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const cityId = searchParams.get('cityId')
  const dateStr = searchParams.get('date') // YYYY-MM-DD

  if (!productId || !cityId || !dateStr) {
    return NextResponse.json(
      { success: false, error: 'productId, cityId, and date are required' },
      { status: 400 }
    )
  }

  try {
    const supabase = getSupabaseAdmin()
    const istNow = nowIST()
    const currentHourIST = istNow.getUTCHours()
    const currentMinuteIST = istNow.getUTCMinutes()
    const todayIST = toISTDateString(new Date())
    const isToday = dateStr === todayIST
    const deliveryDate = parseLocalDate(dateStr)
    const dayOfWeek = deliveryDate.getDay()

    // 1. Get city delivery configs (which slots are enabled)
    const { data: cityConfigs } = await supabase
      .from('city_delivery_configs')
      .select('*, delivery_slots(*)')
      .eq('cityId', cityId)
      .eq('isAvailable', true)

    // 2. Get delivery holidays for this date
    const { data: holidays } = await supabase
      .from('delivery_holidays')
      .select('*')
      .eq('date', deliveryDate.toISOString())
      .or(`cityId.eq.${cityId},cityId.is.null`)
      .order('cityId', { ascending: false }) // city-specific first

    const holiday = (holidays && holidays.length > 0) ? holidays[0] : null

    // FULL_BLOCK
    if (holiday?.mode === 'FULL_BLOCK') {
      return NextResponse.json({
        success: true,
        data: {
          slots: [],
          fullyBlocked: true,
          reason: holiday.customerMessage ?? holiday.reason,
          date: dateStr,
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

    const surchargeInfo = (surcharges && surcharges.length > 0)
      ? {
          surchargeActive: true,
          surchargeAmount: surcharges.reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.amount), 0),
          surchargeAppliesTo: surcharges.map((s: Record<string, unknown>) => s.appliesTo).join(', '),
          surchargeName: surcharges.map((s: Record<string, unknown>) => s.name).join(', '),
        }
      : undefined

    // 4. Get vendors in cityId with this product
    //    Fetch vendor_products with vendor details, working hours, slots, and capacity
    const { data: vendorProducts } = await supabase
      .from('vendor_products')
      .select('*, vendors(*, vendor_working_hours(*), vendor_slots(*), vendor_capacity(*))')
      .eq('productId', productId)
      .eq('isAvailable', true)

    // Filter vendor products: vendor must be in the city, approved, and not on vacation
    const filteredVendorProducts = (vendorProducts || []).filter((vp: Record<string, unknown>) => {
      const vendor = vp.vendors as Record<string, unknown>
      if (!vendor) return false
      if (vendor.cityId !== cityId) return false
      if (vendor.status !== 'APPROVED') return false
      // Not on vacation
      if (vendor.vacationEnd && new Date(vendor.vacationEnd as string) >= new Date()) return false
      return true
    }).map((vp: Record<string, unknown>) => {
      const vendor = vp.vendors as Record<string, unknown>
      // Filter capacity for this delivery date
      const allCapacity = (vendor.vendor_capacity as Record<string, unknown>[]) || []
      const dateCapacity = allCapacity.filter((c: Record<string, unknown>) => {
        const capDate = new Date(c.date as string).toISOString().split('T')[0]
        return capDate === dateStr
      })
      return {
        ...vp,
        preparationTime: vp.preparationTime as number,
        vendor: {
          ...vendor,
          workingHours: (vendor.vendor_working_hours as Record<string, unknown>[]) || [],
          slots: (vendor.vendor_slots as Record<string, unknown>[]) || [],
          capacity: dateCapacity,
        },
      }
    })

    // Build holiday override map
    const holidayOverrides = new Map<string, SlotOverride>()
    if (holiday?.mode === 'CUSTOM' && holiday.slotOverrides) {
      const overrides = holiday.slotOverrides as unknown as SlotOverride[]
      for (const o of overrides) {
        holidayOverrides.set(o.slug, o)
      }
    }

    // 5. Build slots
    const configsList = (cityConfigs || [])
    const filteredConfigs = holiday?.mode === 'STANDARD_ONLY'
      ? configsList.filter((c: Record<string, unknown>) => (c.delivery_slots as Record<string, unknown>)?.slug === 'standard')
      : configsList

    const slots = filteredConfigs.map((config: Record<string, unknown>) => {
      const slot = config.delivery_slots as Record<string, unknown>
      if (!slot?.isActive) return null

      // Holiday CUSTOM: slot explicitly blocked
      const holidayOverride = holidayOverrides.get(slot.slug as string)
      if (holidayOverride?.blocked) return null

      // Check if at least one vendor supports this slot and is open today.
      const qualifyingVendors = filteredVendorProducts.filter((vp) => {
        const vendor = vp.vendor
        // Check vendor slot
        if (vendor.slots.length > 0) {
          const vendorSlot = vendor.slots.find((vs: Record<string, unknown>) => vs.slotId === slot.id)
          if (vendorSlot && !(vendorSlot as Record<string, unknown>).isEnabled) return false
        }
        // Vendor is open on this day
        const wh = vendor.workingHours.find((w: Record<string, unknown>) => w.dayOfWeek === dayOfWeek)
        if (wh && (wh as Record<string, unknown>).isClosed) return false
        return true
      })

      // Check capacity
      let isFull = false
      if (qualifyingVendors.length > 0) {
        const allFull = qualifyingVendors.every((vp) => {
          const cap = vp.vendor.capacity.find((c: Record<string, unknown>) => c.slotId === slot.id)
          if (!cap) return false
          const maxOrders = (cap as Record<string, unknown>).maxOrders ?? 10
          return ((cap as Record<string, unknown>).bookedOrders as number) >= (maxOrders as number)
        })
        if (allFull) isFull = true
      }

      // Same-day checks
      let isAvailable = qualifyingVendors.length > 0
      let reason: string | undefined

      if (isToday && isAvailable) {
        const anyVendorCanDeliver = qualifyingVendors.some((vp) => {
          const wh = vp.vendor.workingHours.find((w: Record<string, unknown>) => w.dayOfWeek === dayOfWeek)
          if (!wh) return false
          const whObj = wh as Record<string, unknown>
          const [closeH, closeM] = (whObj.closeTime as string).split(':').map(Number)
          const closeMinutes = closeH * 60 + closeM
          const currentMinutes = currentHourIST * 60 + currentMinuteIST
          const prepMinutes = vp.preparationTime
          return (currentMinutes + prepMinutes) < closeMinutes
        })

        if (!anyVendorCanDeliver) {
          isAvailable = false
          reason = 'Preparation time exceeds vendor closing time'
        }
      }

      if (!isAvailable && !reason) {
        reason = 'No vendors available for this slot'
      }

      // Calculate price
      let price: number
      if (holidayOverride?.priceOverride != null) {
        price = holidayOverride.priceOverride
      } else {
        price = Number(config.chargeOverride ?? slot.baseCharge)
        if (surchargeInfo) {
          price += surchargeInfo.surchargeAmount
        }
      }

      // Price label
      let priceLabel: string
      if (price === 0) {
        priceLabel = 'Free'
      } else if (slot.slug === 'fixed-slot') {
        priceLabel = `From \u20B9${price}`
      } else {
        priceLabel = `\u20B9${price}`
      }

      // For fixed slot, generate 2-hour windows
      let windows: {
        label: string
        startHour: number
        endHour: number
        isFull: boolean
        isAvailable: boolean
      }[] | undefined

      if (slot.slug === 'fixed-slot') {
        windows = FIXED_WINDOWS.map(fw => {
          const anyVendorCovers = qualifyingVendors.some((vp) => {
            const wh = vp.vendor.workingHours.find((w: Record<string, unknown>) => w.dayOfWeek === dayOfWeek)
            if (!wh) return false
            const whObj = wh as Record<string, unknown>
            const [openH] = (whObj.openTime as string).split(':').map(Number)
            const [closeH] = (whObj.closeTime as string).split(':').map(Number)
            return fw.startHour >= openH && fw.endHour <= closeH
          })

          if (!anyVendorCovers) {
            return null
          }

          let windowAvailable = true
          if (isToday && currentHourIST >= fw.startHour) {
            windowAvailable = false
          }

          let windowFull = false
          if (qualifyingVendors.length > 0) {
            const allFullForWindow = qualifyingVendors.every((vp) => {
              const cap = vp.vendor.capacity.find((c: Record<string, unknown>) => c.slotId === slot.id)
              if (!cap) return false
              const maxOrders = (cap as Record<string, unknown>).maxOrders ?? 10
              return ((cap as Record<string, unknown>).bookedOrders as number) >= (maxOrders as number)
            })
            if (allFullForWindow) windowFull = true
          }

          return {
            label: fw.label,
            startHour: fw.startHour,
            endHour: fw.endHour,
            isFull: windowFull,
            isAvailable: windowAvailable && !windowFull,
          }
        }).filter((w): w is NonNullable<typeof w> => w !== null)
      }

      return {
        id: slot.id,
        name: slot.name,
        slug: slot.slug,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: isFull ? false : isAvailable,
        isFull,
        price,
        priceLabel,
        reason: isFull ? 'All slots are fully booked' : (!isAvailable ? reason : undefined),
        windows,
      }
    }).filter((s: unknown): s is NonNullable<typeof s> => s !== null)

    // Sort: standard first, then other groups (by slug)
    const slugOrder = ['standard', 'fixed-slot', 'midnight', 'early-morning', 'express']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slots.sort((a: any, b: any) => {
      const aIdx = slugOrder.indexOf(a.slug as string ?? '')
      const bIdx = slugOrder.indexOf(b.slug as string ?? '')
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    })

    return NextResponse.json({
      success: true,
      data: {
        slots,
        fullyBlocked: false,
        surcharge: surchargeInfo,
        date: dateStr,
      },
    })
  } catch (error) {
    console.error('[delivery/availability]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch delivery availability' },
      { status: 500 }
    )
  }
}
