'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useCity } from '@/hooks/use-city'

// -- Slot cutoff type for fast calendar ----------------------------------------

interface SlotCutoff {
  slotId:      string
  name:        string
  slug:        string
  startTime:   string   // "09:00"
  endTime:     string
  cutoffHours: number
  baseCharge:  number
}

function computeAvailableDates(
  slots: SlotCutoff[],
  daysAhead = 30
): Set<string> {
  const available = new Set<string>()
  const now = new Date()

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date()
    date.setDate(now.getDate() + i)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    const availableSlots = slots.filter((slot) => {
      if (i === 0) {
        // Same day: check cutoff hasn't passed
        const [slotHour] = slot.startTime.split(':').map(Number)
        const cutoffHour = slotHour - slot.cutoffHours
        return now.getHours() < cutoffHour
      }
      return true
    })

    if (availableSlots.length > 0) {
      available.add(dateStr)
    }
  }

  return available
}

// -- Types -------------------------------------------------------------------

export interface DeliveryWindow {
  label: string
  startHour: number
  endHour: number
  isFull: boolean
  isAvailable: boolean
}

export interface SlotOption {
  id: string
  name: string
  slug: string
  startTime: string
  endTime: string
  isAvailable: boolean
  isFull: boolean
  price: number
  priceLabel: string
  reason?: string
  windows?: DeliveryWindow[]
  // Surcharge breakdown fields (from serviceability API)
  baseCharge?: number
  vendorAreaSurcharge?: number
  platformSurcharges?: { total: number; breakdown: { name: string; amount: number }[] }
  totalSurcharge?: number
  totalCharge?: number
}

/** Per-slot charge info returned by the serviceability API's enrichSlotsWithSurcharges */
export interface SlotChargeInfo {
  baseCharge: number
  vendorAreaSurcharge: number
  platformSurcharges: { total: number; breakdown: { name: string; amount: number }[] }
  totalSurcharge: number
  totalCharge: number
}

export interface DeliverySelection {
  date: Date
  slotId: string
  slotName: string
  slotSlug: string
  window?: string
  price: number
}

export interface DatePickerProps {
  productId: string
  cityId: string
  onDateSelect: (date: Date) => void
  initialDate?: Date
}

export interface SurchargeInfo {
  surchargeActive: boolean
  surchargeAmount: number
  surchargeAppliesTo: string
  surchargeName: string
}

export interface AvailabilityResponse {
  slots: SlotOption[]
  fullyBlocked: boolean
  reason?: string
  surcharge?: SurchargeInfo
  date: string
}

// Keep old props interface for backward compatibility with imports
export interface DeliverySlotPickerProps {
  productId: string
  cityId: string
  onSelect: (selection: DeliverySelection) => void
  initialSelection?: DeliverySelection
}

// -- Helpers -----------------------------------------------------------------

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

// -- Surcharge Breakdown Display Components ----------------------------------

/** Tooltip showing full charge breakdown on hover */
export function SurchargeBreakdownTooltip({
  chargeInfo,
  children,
}: {
  chargeInfo: SlotChargeInfo
  children: React.ReactNode
}) {
  const { baseCharge, vendorAreaSurcharge, platformSurcharges, totalCharge } = chargeInfo

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Delivery</span>
            <span className="font-medium">{baseCharge === 0 ? 'Free' : `₹${baseCharge}`}</span>
          </div>
          {platformSurcharges.breakdown.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-500">{item.name}</span>
              <span className="font-medium">₹{item.amount}</span>
            </div>
          ))}
          {vendorAreaSurcharge > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Area charge</span>
              <span className="font-medium">₹{vendorAreaSurcharge}</span>
            </div>
          )}
          <div className="border-t pt-1.5 flex justify-between text-xs font-semibold">
            <span>Total</span>
            <span>₹{totalCharge}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Displays slot price with surcharge breakdown.
 *
 * Display rules:
 * - totalSurcharge = 0 → existing behaviour ("Free" or "₹{baseCharge}")
 * - totalSurcharge > 0 && baseCharge = 0 → "₹{totalSurcharge} festival charge" (amber)
 * - totalSurcharge > 0 && baseCharge > 0 → "₹{totalCharge}" main + breakdown subtitle
 *
 * Wraps content in a SurchargeBreakdownTooltip when surcharges exist.
 */
export function SlotPriceDisplay({
  chargeInfo,
  freeDeliveryThresholdMet = false,
}: {
  chargeInfo: SlotChargeInfo
  freeDeliveryThresholdMet?: boolean
}) {
  const { baseCharge, totalSurcharge } = chargeInfo

  // Effective base: 0 if free delivery threshold is met
  const effectiveBase = freeDeliveryThresholdMet ? 0 : baseCharge
  const effectiveTotal = effectiveBase + totalSurcharge

  // No surcharge → simple display
  if (totalSurcharge === 0) {
    if (effectiveBase === 0) {
      return <span className="text-green-600 font-semibold text-sm">Free</span>
    }
    return <span className="text-gray-900 font-semibold text-sm">₹{effectiveBase}</span>
  }

  // Surcharge exists → wrap in tooltip
  const tooltipInfo: SlotChargeInfo = {
    ...chargeInfo,
    baseCharge: effectiveBase,
    totalCharge: effectiveTotal,
  }

  // Surcharge > 0, base = 0 (free delivery threshold met)
  if (effectiveBase === 0) {
    return (
      <SurchargeBreakdownTooltip chargeInfo={tooltipInfo}>
        <span className="inline-flex items-center gap-1 cursor-help">
          <span className="text-amber-600 font-semibold text-sm">₹{totalSurcharge}</span>
          <span className="text-amber-500 text-xs">festival charge</span>
          <Info className="h-3 w-3 text-amber-400" />
        </span>
      </SurchargeBreakdownTooltip>
    )
  }

  // Surcharge > 0, base > 0
  return (
    <SurchargeBreakdownTooltip chargeInfo={tooltipInfo}>
      <span className="inline-flex flex-col items-end cursor-help">
        <span className="inline-flex items-center gap-1">
          <span className="text-gray-900 font-semibold text-sm">₹{effectiveTotal}</span>
          <Info className="h-3 w-3 text-gray-400" />
        </span>
        <span className="text-[11px] text-gray-400 leading-tight">
          ₹{effectiveBase} delivery + ₹{totalSurcharge} surcharge
        </span>
      </span>
    </SurchargeBreakdownTooltip>
  )
}

// -- Calendar Component (exported for reuse in checkout) ---------------------

export function CalendarSection({
  selectedDate,
  selectedMonth,
  availableDates,
  loadingDates,
  onDateSelect,
  onMonthChange,
}: {
  selectedDate: Date | null
  selectedMonth: Date
  availableDates: Set<string>
  loadingDates: boolean
  onDateSelect: (date: Date) => void
  onMonthChange: (date: Date) => void
}) {
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const todayDate = new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate())
  const todayStr = toDateString(todayDate)

  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(todayDate.getDate() + 1)
  const tomorrowStr = toDateString(tomorrowDate)

  const canGoPrev = !(year === todayDate.getFullYear() && month === todayDate.getMonth())
  const maxMonth = new Date(todayDate)
  maxMonth.setMonth(maxMonth.getMonth() + 1)
  const canGoNext = year < maxMonth.getFullYear() || (year === maxMonth.getFullYear() && month < maxMonth.getMonth())

  const monthLabel = new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const handlePrev = () => {
    if (!canGoPrev) return
    const prev = new Date(year, month - 1, 1)
    onMonthChange(prev)
  }

  const handleNext = () => {
    if (!canGoNext) return
    const next = new Date(year, month + 1, 1)
    onMonthChange(next)
  }

  if (loadingDates) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 mx-auto" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-lg mx-auto" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty padding cells */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const cellDate = new Date(year, month, dayNum)
          const dateStr = toDateString(cellDate)
          const isPast = dateStr < todayStr
          // While loading, treat all future dates as available
          const isAvailable = loadingDates || availableDates.size === 0 || availableDates.has(dateStr)
          const isSelected = selectedDate ? toDateString(selectedDate) === dateStr : false
          const isToday = dateStr === todayStr
          const isTomorrow = dateStr === tomorrowStr

          const canClick = !isPast && isAvailable

          return (
            <button
              key={dayNum}
              onClick={() => canClick && onDateSelect(cellDate)}
              disabled={!canClick}
              className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-sm transition-all
                ${isSelected
                  ? 'bg-pink-600 text-white font-semibold'
                  : canClick
                    ? 'text-gray-800 hover:bg-pink-50 font-medium'
                    : 'text-gray-300 cursor-not-allowed'
                }
              `}
              title={!canClick && !isPast ? 'Not available' : undefined}
            >
              <span className="leading-tight">{dayNum}</span>
              {isToday && (
                <span className={`text-[9px] leading-none ${isSelected ? 'text-pink-100' : 'text-pink-500'}`}>
                  Today
                </span>
              )}
              {isTomorrow && (
                <span className={`text-[9px] leading-none ${isSelected ? 'text-pink-100' : 'text-pink-500'}`}>
                  Tmrw
                </span>
              )}
              {!isPast && !isAvailable && (
                <span className="absolute top-0.5 right-0.5 text-[8px] text-gray-300">&times;</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// -- Date-Only Picker for Product Page ----------------------------------------

export function DeliveryDatePicker(props: DatePickerProps) {
  const { cityId, onDateSelect, initialDate } = props
  const isMobile = useIsMobile()

  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate ?? null)
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    return initialDate
      ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
      : new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1)
  })
  const [availableDatesSet, setAvailableDatesSet] = useState<Set<string>>(new Set())
  const [loadingDates, setLoadingDates] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Fetch city slot cutoffs (fast endpoint) and compute available dates client-side
  const { cityId: contextCityId } = useCity()
  const effectiveCityId = cityId || contextCityId

  useEffect(() => {
    if (!calendarOpen) return
    if (!effectiveCityId) return
    // Skip if we already have dates loaded
    if (availableDatesSet.size > 0) return

    setLoadingDates(true)
    const controller = new AbortController()

    fetch(`/api/delivery/city-slots?cityId=${effectiveCityId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.slots) {
          const dates = computeAvailableDates(data.data.slots as SlotCutoff[])
          setAvailableDatesSet(dates)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setAvailableDatesSet(new Set())
      })
      .finally(() => setLoadingDates(false))

    return () => controller.abort()
  }, [calendarOpen, effectiveCityId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    onDateSelect(date)
    setCalendarOpen(false)
  }, [onDateSelect])

  const dateLabel = useMemo(() => {
    if (!selectedDate) return null
    return formatDateDisplay(selectedDate)
  }, [selectedDate])

  const calendarContent = (
    <CalendarSection
      selectedDate={selectedDate}
      selectedMonth={selectedMonth}
      availableDates={availableDatesSet}
      loadingDates={loadingDates}
      onDateSelect={handleDateSelect}
      onMonthChange={setSelectedMonth}
    />
  )

  // MOBILE: Sheet (bottom drawer)
  if (isMobile) {
    return (
      <div>
        <button
          onClick={() => setCalendarOpen(true)}
          className={`w-full flex items-center justify-between border-2 rounded-lg px-4 py-3 text-left transition-colors ${
            selectedDate
              ? 'border-pink-500 bg-pink-50'
              : 'border-gray-200 hover:border-pink-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className={`h-5 w-5 ${selectedDate ? 'text-pink-600' : 'text-pink-500'}`} />
            <span className={selectedDate ? "text-gray-900 font-medium" : "text-gray-400"}>
              {dateLabel || "Select Delivery Date"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
          <SheetContent side="bottom" className="h-[70vh] overflow-y-auto rounded-t-2xl px-4 pb-0">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-left">Select Delivery Date</SheetTitle>
            </SheetHeader>
            <div className="pb-24">
              {calendarContent}
            </div>
            <SheetFooter className="fixed bottom-0 left-0 right-0 border-t bg-white p-4">
              <Button
                onClick={() => setCalendarOpen(false)}
                disabled={!selectedDate}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                Confirm
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // DESKTOP: Button + dropdown panel
  return (
    <div className="relative">
      <button
        onClick={() => setCalendarOpen(!calendarOpen)}
        className={`w-full flex items-center justify-between border-2 rounded-lg px-4 py-3 text-left transition-colors ${
          selectedDate
            ? 'border-pink-500 bg-pink-50'
            : 'border-gray-200 hover:border-pink-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar className={`h-5 w-5 ${selectedDate ? 'text-pink-600' : 'text-pink-500'}`} />
          <span className={selectedDate ? "text-gray-900 font-medium" : "text-gray-400"}>
            {dateLabel || "Select Delivery Date"}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${calendarOpen ? 'rotate-180' : ''}`} />
      </button>

      {calendarOpen && (
        <div className="absolute z-20 top-full mt-2 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-lg p-4">
          {calendarContent}
        </div>
      )}
    </div>
  )
}

// -- Legacy DeliverySlotPicker (kept for backward compatibility) ---------------
// This was the old combined date+slot picker. Now just wraps DeliveryDatePicker.
// Checkout page has its own slot picker built inline.

export function DeliverySlotPicker({
  productId,
  cityId,
  onSelect,
  initialSelection,
}: DeliverySlotPickerProps) {
  return (
    <DeliveryDatePicker
      productId={productId}
      cityId={cityId}
      onDateSelect={(date) => {
        // Fire a partial selection with just date — no slot info
        onSelect({
          date,
          slotId: '',
          slotName: '',
          slotSlug: '',
          price: 0,
        })
      }}
      initialDate={initialSelection?.date}
    />
  )
}
