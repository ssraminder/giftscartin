import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const istNow = nowIST()
    const currentHourIST = istNow.getHours()
    const currentMinuteIST = istNow.getMinutes()
    const todayIST = toISTDateString(new Date())
    const isToday = dateStr === todayIST
    const deliveryDate = parseLocalDate(dateStr)
    const dayOfWeek = deliveryDate.getDay()

    // 1. Get city delivery configs (which slots are enabled)
    const cityConfigs = await prisma.cityDeliveryConfig.findMany({
      where: { cityId, isAvailable: true },
      include: { slot: true },
    })

    // 2. Get delivery holidays for this date
    const holidays = await prisma.deliveryHoliday.findMany({
      where: {
        date: deliveryDate,
        OR: [{ cityId }, { cityId: null }],
      },
      orderBy: { cityId: 'desc' }, // city-specific first
    })
    const holiday = holidays[0] ?? null

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
    const surcharges = await prisma.deliverySurcharge.findMany({
      where: {
        isActive: true,
        startDate: { lte: deliveryDate },
        endDate: { gte: deliveryDate },
      },
    })

    const surchargeInfo = surcharges.length > 0
      ? {
          surchargeActive: true,
          surchargeAmount: surcharges.reduce((sum, s) => sum + Number(s.amount), 0),
          surchargeAppliesTo: surcharges.map(s => s.appliesTo).join(', '),
          surchargeName: surcharges.map(s => s.name).join(', '),
        }
      : undefined

    // 4. Get vendors in cityId with this product
    //    Don't require isOnline (that's for real-time order acceptance, not slot visibility).
    //    Instead filter out vendors currently on vacation.
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
      include: {
        vendor: {
          include: {
            workingHours: true,
            slots: true,
            capacity: {
              where: { date: deliveryDate },
            },
          },
        },
      },
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
    const filteredConfigs = holiday?.mode === 'STANDARD_ONLY'
      ? cityConfigs.filter(c => c.slot.slotGroup === 'standard')
      : cityConfigs

    const slots = filteredConfigs.map(config => {
      const slot = config.slot
      if (!slot.isActive) return null

      // Holiday CUSTOM: slot explicitly blocked
      const holidayOverride = holidayOverrides.get(slot.slug)
      if (holidayOverride?.blocked) return null

      // Check if at least one vendor supports this slot and is open today.
      // If vendor has no VendorSlot records at all, treat all slots as enabled
      // (vendor hasn't customized slot preferences — default is all enabled).
      const qualifyingVendors = vendorProducts.filter(vp => {
        const vendor = vp.vendor
        // Check vendor slot: if vendor has slot records, the specific slot must be enabled.
        // If vendor has NO slot records at all, assume all slots enabled.
        if (vendor.slots.length > 0) {
          const vendorSlot = vendor.slots.find(vs => vs.slotId === slot.id)
          if (vendorSlot && !vendorSlot.isEnabled) return false
          // If vendor has some slot records but not this one, treat as enabled (not explicitly disabled)
        }
        // Vendor is open on this day
        const wh = vendor.workingHours.find(w => w.dayOfWeek === dayOfWeek)
        // If no working hours defined, assume vendor is open (hasn't configured schedule)
        if (wh && wh.isClosed) return false
        return true
      })

      // Check capacity — no capacity record means default capacity (not full)
      let isFull = false
      if (qualifyingVendors.length > 0) {
        const allFull = qualifyingVendors.every(vp => {
          const cap = vp.vendor.capacity.find(c => c.slotId === slot.id)
          if (!cap) return false // No capacity record = default available (not full)
          const maxOrders = cap.maxOrders ?? 10
          return cap.bookedOrders >= maxOrders
        })
        if (allFull) isFull = true
      }

      // Same-day checks
      let isAvailable = qualifyingVendors.length > 0
      let reason: string | undefined

      if (isToday && isAvailable) {
        // Check if currentTimeIST + preparationTime < vendorCloseTime
        const anyVendorCanDeliver = qualifyingVendors.some(vp => {
          const wh = vp.vendor.workingHours.find(w => w.dayOfWeek === dayOfWeek)
          if (!wh) return false
          const [closeH, closeM] = wh.closeTime.split(':').map(Number)
          const closeMinutes = closeH * 60 + closeM
          const currentMinutes = currentHourIST * 60 + currentMinuteIST
          const prepMinutes = vp.preparationTime // in minutes
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
      } else if (slot.slotGroup === 'fixed') {
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

      if (slot.slotGroup === 'fixed') {
        windows = FIXED_WINDOWS.map(fw => {
          // Filter windows within vendor working hours
          const anyVendorCovers = qualifyingVendors.some(vp => {
            const wh = vp.vendor.workingHours.find(w => w.dayOfWeek === dayOfWeek)
            if (!wh) return false
            const [openH] = wh.openTime.split(':').map(Number)
            const [closeH] = wh.closeTime.split(':').map(Number)
            return fw.startHour >= openH && fw.endHour <= closeH
          })

          if (!anyVendorCovers) {
            return null
          }

          // For today: only show windows where current IST time < window start
          let windowAvailable = true
          if (isToday && currentHourIST >= fw.startHour) {
            windowAvailable = false
          }

          // Check capacity per window — no record = default available
          let windowFull = false
          if (qualifyingVendors.length > 0) {
            const allFullForWindow = qualifyingVendors.every(vp => {
              const cap = vp.vendor.capacity.find(c => c.slotId === slot.id)
              if (!cap) return false // No capacity record = available
              const maxOrders = cap.maxOrders ?? 10
              return cap.bookedOrders >= maxOrders
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
    }).filter((s): s is NonNullable<typeof s> => s !== null)

    // Sort: standard first, then other groups
    const groupOrder = ['standard', 'fixed', 'midnight', 'early-morning', 'express']
    slots.sort((a, b) => {
      const aIdx = groupOrder.indexOf(
        filteredConfigs.find(c => c.slot.id === a.id)?.slot.slotGroup ?? ''
      )
      const bIdx = groupOrder.indexOf(
        filteredConfigs.find(c => c.slot.id === b.id)?.slot.slotGroup ?? ''
      )
      return aIdx - bIdx
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
