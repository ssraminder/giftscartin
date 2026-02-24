import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
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
    const supabase = getSupabaseAdmin()

    // Compute date range up front
    const today = getTodayIST()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + days)

    // Q1: Vendors that carry this product in the city
    const { data: vendorProductsFull } = await supabase
      .from('vendor_products')
      .select('vendors(cityId, status, vacationEnd, vendor_working_hours(dayOfWeek, isClosed))')
      .eq('productId', productId)
      .eq('isAvailable', true)

    // Filter: vendor must be in cityId, approved, and not on vacation
    const qualifiedVPs = (vendorProductsFull || []).filter((vp: Record<string, unknown>) => {
      const vendor = vp.vendors as Record<string, unknown> | null
      if (!vendor) return false
      if (vendor.cityId !== cityId) return false
      if (vendor.status !== 'APPROVED') return false
      if (vendor.vacationEnd && new Date(vendor.vacationEnd as string) >= new Date()) return false
      return true
    })

    if (qualifiedVPs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { availableDates: [] },
      })
    }

    // Q2 + Q3: City slot configs and delivery holidays -- independent, run in parallel
    const [cityConfigsResult, holidaysResult] = await Promise.all([
      supabase
        .from('city_delivery_configs')
        .select('delivery_slots(slug)')
        .eq('cityId', cityId)
        .eq('isAvailable', true),
      supabase
        .from('delivery_holidays')
        .select('date, mode, cityId')
        .gte('date', today.toISOString())
        .lte('date', endDate.toISOString())
        .or(`cityId.eq.${cityId},cityId.is.null`),
    ])

    const cityConfigs = cityConfigsResult.data || []
    const holidays = holidaysResult.data || []

    if (cityConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { availableDates: [] },
      })
    }

    // Build a map of date -> holiday (city-specific takes priority)
    const holidayMap = new Map<string, { mode: string; cityId: string | null }>()
    for (const h of holidays) {
      const dateKey = new Date(h.date).toISOString().split('T')[0]
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
        const hasStandard = cityConfigs.some((c: Record<string, unknown>) => {
          const slot = c.delivery_slots as Record<string, unknown> | null
          return slot?.slug === 'standard'
        })
        if (!hasStandard) continue
      }

      // Check vendor working hours for this day of week
      const dayOfWeek = date.getDay() // 0=Sunday
      const anyVendorOpen = qualifiedVPs.some((vp: Record<string, unknown>) => {
        const vendor = vp.vendors as Record<string, unknown>
        const workingHours = (vendor.vendor_working_hours as Record<string, unknown>[]) || []
        if (workingHours.length === 0) return true // No schedule configured = open
        const hours = workingHours.find((wh: Record<string, unknown>) => wh.dayOfWeek === dayOfWeek)
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
