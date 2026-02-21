'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

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
}

export interface DeliverySelection {
  date: Date
  slotId: string
  slotName: string
  slotSlug: string
  window?: string
  price: number
}

export interface DeliverySlotPickerProps {
  productId: string
  cityId: string
  onSelect: (selection: DeliverySelection) => void
  initialSelection?: DeliverySelection
}

interface SurchargeInfo {
  surchargeActive: boolean
  surchargeAmount: number
  surchargeAppliesTo: string
  surchargeName: string
}

interface AvailabilityResponse {
  slots: SlotOption[]
  fullyBlocked: boolean
  reason?: string
  surcharge?: SurchargeInfo
  date: string
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

function formatDateLabel(date: Date): string {
  const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const today = new Date(todayIST.getFullYear(), todayIST.getMonth(), todayIST.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (dateOnly.getTime() === today.getTime()) return 'Today'
  if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// -- Calendar Component ------------------------------------------------------

function CalendarSection({
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
  const todayDate = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate())
  const todayStr = toDateString(todayDate)

  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(todayDate.getDate() + 1)
  const tomorrowStr = toDateString(tomorrowDate)

  const canGoPrev = !(year === todayDate.getFullYear() && month === todayDate.getMonth())
  const maxMonth = new Date(todayDate)
  maxMonth.setMonth(maxMonth.getMonth() + 2)
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
          const isAvailable = availableDates.has(dateStr)
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

// -- Slot Card Component -----------------------------------------------------

function SlotCard({
  slot,
  isSelected,
  selectedWindow,
  onSelect,
  onWindowSelect,
}: {
  slot: SlotOption
  isSelected: boolean
  selectedWindow: string | null
  onSelect: () => void
  onWindowSelect: (windowLabel: string) => void
}) {
  const disabled = !slot.isAvailable || slot.isFull

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-pink-500 bg-pink-50'
          : disabled
            ? 'border-gray-100 bg-gray-50 opacity-60'
            : 'border-gray-200 bg-white hover:border-pink-300'
      }`}
    >
      <button
        onClick={() => !disabled && onSelect()}
        disabled={disabled}
        className={`flex w-full items-center justify-between p-3.5 text-left ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Radio indicator */}
          <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 ${
            isSelected ? 'border-pink-600' : 'border-gray-300'
          }`}>
            {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-pink-600" />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${isSelected ? 'text-pink-700' : 'text-gray-800'}`}>
              {slot.name}
            </p>
            <p className="text-xs text-gray-500">
              {slot.windows ? 'Choose your 2-hour window' : `${slot.startTime} \u2013 ${slot.endTime}`}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          {slot.isFull ? (
            <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
              FULL
            </span>
          ) : (
            <span className={`text-sm font-semibold ${isSelected ? 'text-pink-600' : 'text-gray-700'}`}>
              {slot.priceLabel}
            </span>
          )}
        </div>
      </button>

      {/* Fixed slot windows (only shown when selected) */}
      {isSelected && slot.windows && slot.windows.length > 0 && (
        <div className="border-t border-pink-200 px-3.5 py-2.5 space-y-1.5">
          {slot.windows.map((w) => {
            const wDisabled = !w.isAvailable || w.isFull
            const wSelected = selectedWindow === w.label
            return (
              <button
                key={w.label}
                onClick={() => !wDisabled && onWindowSelect(w.label)}
                disabled={wDisabled}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-all ${
                  wSelected
                    ? 'bg-pink-100 text-pink-700 font-medium'
                    : wDisabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-pink-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    wSelected ? 'border-pink-600' : 'border-gray-300'
                  }`}>
                    {wSelected && <div className="h-2 w-2 rounded-full bg-pink-600" />}
                  </div>
                  <span>{w.label}</span>
                </div>
                {w.isFull && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                    FULL
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Unavailable reason tooltip */}
      {!slot.isAvailable && !slot.isFull && slot.reason && (
        <p className="px-3.5 pb-2 text-xs text-gray-400">{slot.reason}</p>
      )}
    </div>
  )
}

// -- Slot Section Component --------------------------------------------------

function SlotSection({
  slots,
  fullyBlocked,
  blockReason,
  surcharge,
  loadingSlots,
  selectedSlotId,
  selectedWindow,
  onSlotSelect,
  onWindowSelect,
}: {
  slots: SlotOption[]
  fullyBlocked: boolean
  blockReason?: string
  surcharge?: SurchargeInfo
  loadingSlots: boolean
  selectedSlotId: string | null
  selectedWindow: string | null
  onSlotSelect: (slotId: string) => void
  onWindowSelect: (windowLabel: string) => void
}) {
  if (loadingSlots) {
    return (
      <div className="space-y-2.5 mt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    )
  }

  if (fullyBlocked) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
        Delivery not available on this date.{blockReason ? ` ${blockReason}.` : ''} Please select another date.
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Surcharge banner */}
      {surcharge?.surchargeActive && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span>&#x1F389;</span>
          <span>
            {surcharge.surchargeName}: &#x20B9;{surcharge.surchargeAmount} surcharge applies to {surcharge.surchargeAppliesTo} on this date
          </span>
        </div>
      )}

      {/* Slot cards */}
      {slots.length > 0 ? (
        <div className="space-y-2">
          {slots.map(slot => (
            <SlotCard
              key={slot.id}
              slot={slot}
              isSelected={selectedSlotId === slot.id}
              selectedWindow={selectedSlotId === slot.id ? selectedWindow : null}
              onSelect={() => onSlotSelect(slot.id)}
              onWindowSelect={onWindowSelect}
            />
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-gray-500">
          No delivery slots available for this date. Please choose another date.
        </p>
      )}
    </div>
  )
}

// -- Main Picker Content Component -------------------------------------------

function PickerContent({
  selectedDate,
  selectedMonth,
  selectedSlotId,
  selectedWindow,
  availableDates,
  slots,
  fullyBlocked,
  blockReason,
  surcharge,
  loadingDates,
  loadingSlots,
  onDateSelect,
  onMonthChange,
  onSlotSelect,
  onWindowSelect,
}: {
  selectedDate: Date | null
  selectedMonth: Date
  selectedSlotId: string | null
  selectedWindow: string | null
  availableDates: Set<string>
  slots: SlotOption[]
  fullyBlocked: boolean
  blockReason?: string
  surcharge?: SurchargeInfo
  loadingDates: boolean
  loadingSlots: boolean
  onDateSelect: (date: Date) => void
  onMonthChange: (date: Date) => void
  onSlotSelect: (slotId: string) => void
  onWindowSelect: (windowLabel: string) => void
}) {
  return (
    <div className="space-y-4">
      <CalendarSection
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        availableDates={availableDates}
        loadingDates={loadingDates}
        onDateSelect={onDateSelect}
        onMonthChange={onMonthChange}
      />

      {selectedDate && (
        <SlotSection
          slots={slots}
          fullyBlocked={fullyBlocked}
          blockReason={blockReason}
          surcharge={surcharge}
          loadingSlots={loadingSlots}
          selectedSlotId={selectedSlotId}
          selectedWindow={selectedWindow}
          onSlotSelect={onSlotSelect}
          onWindowSelect={onWindowSelect}
        />
      )}
    </div>
  )
}

// -- Main Component ----------------------------------------------------------

export function DeliverySlotPicker({
  productId,
  cityId,
  onSelect,
  initialSelection,
}: DeliverySlotPickerProps) {
  const isMobile = useIsMobile()

  // State
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialSelection?.date ?? null)
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    return initialSelection?.date
      ? new Date(initialSelection.date.getFullYear(), initialSelection.date.getMonth(), 1)
      : new Date(nowIST.getFullYear(), nowIST.getMonth(), 1)
  })
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(initialSelection?.slotId ?? null)
  const [selectedWindow, setSelectedWindow] = useState<string | null>(initialSelection?.window ?? null)
  const [availableDatesSet, setAvailableDatesSet] = useState<Set<string>>(new Set())
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [fullyBlocked, setFullyBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState<string | undefined>()
  const [surcharge, setSurcharge] = useState<SurchargeInfo | undefined>()
  const [loadingDates, setLoadingDates] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available dates on mount
  const fetchAvailableDates = useCallback(async () => {
    if (!productId || !cityId) return
    setLoadingDates(true)
    setError(null)
    try {
      const params = new URLSearchParams({ productId, cityId, months: '2' })
      const res = await fetch(`/api/delivery/available-dates?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setAvailableDatesSet(new Set(json.data.availableDates as string[]))
    } catch {
      setError('Unable to load delivery options. Please try again.')
    } finally {
      setLoadingDates(false)
    }
  }, [productId, cityId])

  useEffect(() => { fetchAvailableDates() }, [fetchAvailableDates])

  // Fetch slots when date is selected
  const fetchSlots = useCallback(async (date: Date) => {
    if (!productId || !cityId) return
    setLoadingSlots(true)
    try {
      const dateStr = toDateString(date)
      const params = new URLSearchParams({ productId, cityId, date: dateStr })
      const res = await fetch(`/api/delivery/availability?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const data: AvailabilityResponse = json.data
      setSlots(data.slots)
      setFullyBlocked(data.fullyBlocked)
      setBlockReason(data.reason)
      setSurcharge(data.surcharge)

      // Clear slot selection if previously selected slot is no longer available
      if (selectedSlotId) {
        const stillAvailable = data.slots.find(s => s.id === selectedSlotId && s.isAvailable)
        if (!stillAvailable) {
          setSelectedSlotId(null)
          setSelectedWindow(null)
        }
      }
    } catch {
      setSlots([])
      setError('Unable to load delivery options. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, cityId])

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate)
    }
  }, [selectedDate, fetchSlots])

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedSlotId(null)
    setSelectedWindow(null)
  }, [])

  // Handle slot selection
  const handleSlotSelect = useCallback((slotId: string) => {
    setSelectedSlotId(slotId)
    setSelectedWindow(null)

    // For non-fixed slots, fire onSelect immediately
    const slot = slots.find(s => s.id === slotId)
    if (slot && (!slot.windows || slot.windows.length === 0) && selectedDate) {
      onSelect({
        date: selectedDate,
        slotId: slot.id,
        slotName: slot.name,
        slotSlug: slot.slug,
        price: slot.price,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, selectedDate, onSelect])

  // Handle window selection (fixed slot)
  const handleWindowSelect = useCallback((windowLabel: string) => {
    setSelectedWindow(windowLabel)

    if (selectedDate && selectedSlotId) {
      const slot = slots.find(s => s.id === selectedSlotId)
      if (slot) {
        onSelect({
          date: selectedDate,
          slotId: slot.id,
          slotName: slot.name,
          slotSlug: slot.slug,
          window: windowLabel,
          price: slot.price,
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedSlotId, slots, onSelect])

  // Selection summary for trigger button
  const selectionSummary = useMemo(() => {
    if (!selectedDate || !selectedSlotId) return null
    const slot = slots.find(s => s.id === selectedSlotId)
    if (!slot) return null
    const dateLabel = formatDateLabel(selectedDate)
    const windowLabel = selectedWindow ? ` (${selectedWindow})` : ''
    return `${dateLabel} \u2022 ${slot.name}${windowLabel}`
  }, [selectedDate, selectedSlotId, selectedWindow, slots])

  // Check if selection is complete
  const isComplete = useMemo(() => {
    if (!selectedDate || !selectedSlotId) return false
    const slot = slots.find(s => s.id === selectedSlotId)
    if (!slot) return false
    // Fixed slot requires window selection
    if (slot.windows && slot.windows.length > 0 && !selectedWindow) return false
    return true
  }, [selectedDate, selectedSlotId, selectedWindow, slots])

  const pickerContent = (
    <PickerContent
      selectedDate={selectedDate}
      selectedMonth={selectedMonth}
      selectedSlotId={selectedSlotId}
      selectedWindow={selectedWindow}
      availableDates={availableDatesSet}
      slots={slots}
      fullyBlocked={fullyBlocked}
      blockReason={blockReason}
      surcharge={surcharge}
      loadingDates={loadingDates}
      loadingSlots={loadingSlots}
      onDateSelect={handleDateSelect}
      onMonthChange={setSelectedMonth}
      onSlotSelect={handleSlotSelect}
      onWindowSelect={handleWindowSelect}
    />
  )

  if (error && !loadingDates) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
        {error}
        <button
          onClick={fetchAvailableDates}
          className="ml-2 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // MOBILE: Sheet (bottom drawer)
  if (isMobile) {
    return (
      <div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                selectionSummary
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 bg-white hover:border-pink-300'
              }`}
            >
              <Calendar className={`h-5 w-5 shrink-0 ${selectionSummary ? 'text-pink-600' : 'text-gray-400'}`} />
              <span className={`text-sm ${selectionSummary ? 'text-pink-700 font-medium' : 'text-gray-500'}`}>
                {selectionSummary || 'Select Delivery Date & Time'}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-0">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-left">Select Delivery</SheetTitle>
            </SheetHeader>

            <div className="pb-24">
              {pickerContent}
            </div>

            <SheetFooter className="fixed bottom-0 left-0 right-0 border-t bg-white p-4">
              <Button
                onClick={() => setSheetOpen(false)}
                disabled={!isComplete}
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

  // DESKTOP: Inline
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {pickerContent}
    </div>
  )
}
