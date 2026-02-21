'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCity } from '@/hooks/use-city'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Clock, Zap, Sun, Moon } from 'lucide-react'

interface Slot {
  id:               string
  name:             string
  slug:             string
  slotGroup:        string
  timeWindow:       string
  charge:           number
  baseCharge:       number
  surcharge:        number
  isHolidayPriced:  boolean
  isAvailable:      boolean
  unavailableReason: 'preparation_time' | 'cutoff_passed' | null
}

interface SlotsApiResponse {
  slots:                 Slot[]
  effectiveLeadTimeHours: number
  leadTimeNote:          string | null
  earliestDate:          string
  isFullyBlocked:        boolean
  holidayReason:         string | null
  totalSurcharge:        number
  surchargeNames:        string[]
  holidayMode:           string | null
}

export interface DeliverySlotPickerProps {
  productIds?:   string[]
  selectedDate:  string        // YYYY-MM-DD
  selectedSlot:  string | null // slot id
  onDateChange:  (date: string) => void
  onSlotChange:  (slotId: string, slotName: string, charge: number) => void
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  'standard':     <Sun  className="h-4 w-4" />,
  'fixed':        <Clock className="h-4 w-4" />,
  'midnight':     <Moon className="h-4 w-4" />,
  'early-morning':<Sun  className="h-4 w-4 text-orange-400" />,
  'express':      <Zap  className="h-4 w-4" />,
}

function getNext14Days() {
  const today = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    return {
      date:     dateStr,
      dayLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      numLabel: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    }
  })
}

export function DeliverySlotPicker({
  productIds = [],
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
}: DeliverySlotPickerProps) {
  const { citySlug } = useCity()
  const [data, setData]       = useState<SlotsApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const productIdsKey = productIds.join(',')

  const fetchSlots = useCallback(async (date: string) => {
    if (!citySlug) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        citySlug,
        date,
        ...(productIds.length > 0 && { productIds: productIds.join(',') }),
      })
      const res  = await fetch(`/api/delivery/slots?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setData(json.data)

      // Auto-advance date if earliest delivery is later
      if (json.data.earliestDate > date) {
        onDateChange(json.data.earliestDate)
        return
      }

      // If currently selected slot is no longer available, auto-select first available
      const available = (json.data.slots as Slot[]).filter(s => s.isAvailable)
      if (selectedSlot && !available.find(s => s.id === selectedSlot)) {
        if (available.length > 0) onSlotChange(available[0].id, available[0].name, available[0].charge)
      }
    } catch {
      setError('Could not load delivery slots. Please try again.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySlug, productIdsKey])

  useEffect(() => { fetchSlots(selectedDate) }, [selectedDate, citySlug, fetchSlots])

  const days = getNext14Days()
  const earliestDate = data?.earliestDate ?? selectedDate

  // Group fixed slots together for display
  const standardSlots = data?.slots.filter(s => s.slotGroup === 'standard') ?? []
  const fixedSlots    = data?.slots.filter(s => s.slotGroup === 'fixed') ?? []
  const otherSlots    = data?.slots.filter(s => !['standard','fixed'].includes(s.slotGroup)) ?? []

  const SlotButton = ({ slot }: { slot: Slot }) => {
    const isSelected = slot.id === selectedSlot
    return (
      <button
        onClick={() => slot.isAvailable && onSlotChange(slot.id, slot.name, slot.charge)}
        disabled={!slot.isAvailable}
        className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all
          ${isSelected
            ? 'border-pink-500 bg-pink-50'
            : slot.isAvailable
            ? 'border-gray-200 bg-white hover:border-pink-300'
            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
          }`}
      >
        <div className="flex items-center gap-2">
          <span className={isSelected ? 'text-pink-600' : 'text-gray-400'}>
            {GROUP_ICONS[slot.slotGroup] ?? <Clock className="h-4 w-4" />}
          </span>
          <div>
            <p className={`text-sm font-medium ${isSelected ? 'text-pink-700' : 'text-gray-800'}`}>
              {slot.name}
            </p>
            <p className="text-xs text-gray-500">{slot.timeWindow}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {slot.charge === 0 ? (
            <span className="text-sm font-medium text-green-600">Free</span>
          ) : (
            <div>
              <span className="text-sm font-medium text-gray-700">+₹{slot.charge}</span>
              {slot.isHolidayPriced && (
                <p className="text-xs text-amber-600">Special price</p>
              )}
              {slot.surcharge > 0 && !slot.isHolidayPriced && (
                <p className="text-xs text-gray-400">incl. ₹{slot.surcharge} surcharge</p>
              )}
            </div>
          )}
          {!slot.isAvailable && slot.unavailableReason === 'preparation_time' && (
            <p className="text-xs text-amber-600 mt-0.5">Prep time</p>
          )}
          {!slot.isAvailable && slot.unavailableReason === 'cutoff_passed' && (
            <p className="text-xs text-red-500 mt-0.5">Closed</p>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-4">

      {/* Lead Time Banner */}
      {data?.leadTimeNote && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{data.leadTimeNote}</span>
        </div>
      )}

      {/* Surcharge Banner */}
      {data && data.totalSurcharge > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50 p-3 text-sm text-pink-800">
          <span>🎉</span>
          <span>
            <strong>{data.surchargeNames.join(', ')}</strong> — ₹{data.totalSurcharge} added to applicable slots
          </span>
        </div>
      )}

      {/* Holiday / Restricted Banner */}
      {data?.holidayReason && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{data.holidayReason}</span>
        </div>
      )}

      {/* Full Block */}
      {data?.isFullyBlocked && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          No delivery available on this date. Please select another date.
        </div>
      )}

      {/* Date Selector */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Select Delivery Date</p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {days.map(day => {
            const isBefore   = day.date < earliestDate
            const isSelected = day.date === selectedDate
            return (
              <button
                key={day.date}
                onClick={() => !isBefore && onDateChange(day.date)}
                disabled={isBefore}
                className={`flex min-w-[58px] flex-col items-center rounded-lg border-2 px-2 py-2 text-center transition-all
                  ${isSelected
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : isBefore
                    ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-pink-300'
                  }`}
              >
                <span className="text-xs font-medium">{day.dayLabel}</span>
                <span className="text-sm font-bold">{day.numLabel.split(' ')[0]}</span>
                <span className="text-xs text-gray-400">{day.numLabel.split(' ')[1]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Slot Selector */}
      {!data?.isFullyBlocked && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Select Delivery Time</p>

          {loading && (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && data && (
            <div className="space-y-3">

              {/* Standard slot */}
              {standardSlots.map(slot => <SlotButton key={slot.id} slot={slot} />)}

              {/* Fixed time windows — grouped with header */}
              {fixedSlots.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Fixed Time Delivery
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {fixedSlots.map(slot => <SlotButton key={slot.id} slot={slot} />)}
                  </div>
                </div>
              )}

              {/* Midnight, Early Morning, Express */}
              {otherSlots.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Special Delivery
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {otherSlots.map(slot => <SlotButton key={slot.id} slot={slot} />)}
                  </div>
                </div>
              )}

              {data.slots.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">
                  No delivery slots available for this date. Please choose another date.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
