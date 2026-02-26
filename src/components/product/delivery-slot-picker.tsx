"use client"

import { useState } from "react"
import { Package, Clock, Moon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { SlotGroup, FixedSlotGroup, MidnightSlotGroup } from "@/types"

interface SlotGroups {
  standard: SlotGroup | null
  fixed: FixedSlotGroup | null
  midnight: MidnightSlotGroup | null
}

export interface DeliverySlotSelection {
  slotGroup: string
  slotSlug: string
  slotName: string
  deliveryCharge: number
}

interface DeliverySlotPickerProps {
  productId: string
  slotGroups: SlotGroups
  selectedDate: string
  onSelectionChange: (selection: DeliverySlotSelection | null) => void
}

export function DeliverySlotPicker({
  slotGroups,
  selectedDate,
  onSelectionChange,
}: DeliverySlotPickerProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [selectedFixedSlot, setSelectedFixedSlot] = useState<string | null>(null)
  const [expandFixed, setExpandFixed] = useState(false)

  if (!selectedDate) return null

  const { standard, fixed, midnight } = slotGroups

  const handleStandardClick = () => {
    if (!standard?.available) return
    setSelectedGroup("standard")
    setSelectedFixedSlot(null)
    setExpandFixed(false)
    onSelectionChange({
      slotGroup: "standard",
      slotSlug: "standard",
      slotName: "Standard Delivery",
      deliveryCharge: standard.totalCharge,
    })
  }

  const handleFixedClick = () => {
    if (!fixed?.available) return
    if (selectedGroup === "fixed" && expandFixed) return
    setSelectedGroup("fixed")
    setExpandFixed(true)
    setSelectedFixedSlot(null)
    onSelectionChange(null)
  }

  const handleFixedSlotSelect = (slot: { slug: string; name: string; totalCharge: number }) => {
    setSelectedFixedSlot(slot.slug)
    onSelectionChange({
      slotGroup: "fixed",
      slotSlug: slot.slug,
      slotName: slot.name,
      deliveryCharge: slot.totalCharge,
    })
  }

  const handleMidnightClick = () => {
    if (!midnight?.available) return
    setSelectedGroup("midnight")
    setSelectedFixedSlot(null)
    setExpandFixed(false)
    onSelectionChange({
      slotGroup: "midnight",
      slotSlug: "midnight",
      slotName: "Midnight Delivery",
      deliveryCharge: midnight.totalCharge,
    })
  }

  function formatCharge(charge: number) {
    if (charge === 0) return <span className="text-green-600 font-medium">FREE</span>
    return <span className="text-gray-600 font-medium">+₹{charge}</span>
  }

  return (
    <div className="space-y-3">
      {/* Standard Delivery */}
      {standard?.available && (
        <div
          onClick={handleStandardClick}
          className={cn(
            "border rounded-xl p-4 cursor-pointer transition-all",
            selectedGroup === "standard"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Standard Delivery</span>
            </div>
            {formatCharge(standard.totalCharge)}
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-7">
            Delivered anytime, 9 AM – 9 PM
          </p>
        </div>
      )}

      {/* Fixed Time Slot */}
      {fixed?.available && fixed.slots && fixed.slots.length > 0 && (
        <div
          onClick={handleFixedClick}
          className={cn(
            "border rounded-xl p-4 cursor-pointer transition-all",
            selectedGroup === "fixed"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Specific Time Slot</span>
            </div>
            {formatCharge(fixed.totalCharge)}
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-7">
            Choose your 2-hour delivery window
          </p>

          {/* Expanded time chips */}
          {expandFixed && selectedGroup === "fixed" && (
            <div className="flex flex-wrap gap-2 mt-3 ml-7">
              {fixed.slots.map((slot) => (
                <button
                  key={slot.slug}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFixedSlotSelect(slot)
                  }}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg border transition-all",
                    selectedFixedSlot === slot.slug
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                  )}
                >
                  {slot.startTime}–{slot.endTime}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Midnight Delivery */}
      {midnight?.available && (
        <div
          onClick={handleMidnightClick}
          className={cn(
            "border rounded-xl p-4 cursor-pointer transition-all",
            selectedGroup === "midnight"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Midnight Delivery</span>
            </div>
            {formatCharge(midnight.totalCharge)}
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-7">
            11 PM – 12 AM
            {midnight.cutoffTime && (
              <> · Order before {midnight.cutoffTime} today</>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// ==================== Exported helpers for checkout page ====================

/** Convert a Date to "YYYY-MM-DD" string */
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Format a Date for display: "Wed, 26 Feb" */
export function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
}

// ==================== CalendarSection (used by checkout) ====================

interface CalendarSectionProps {
  selectedDate: Date | null
  selectedMonth: Date
  availableDates: Set<string>
  loadingDates: boolean
  onDateSelect: (date: Date) => void
  onMonthChange: (month: Date) => void
}

export function CalendarSection({
  selectedDate,
  selectedMonth,
  availableDates,
  loadingDates,
  onDateSelect,
  onMonthChange,
}: CalendarSectionProps) {
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handlePrev = () => {
    onMonthChange(new Date(year, month - 1, 1))
  }

  const handleNext = () => {
    onMonthChange(new Date(year, month + 1, 1))
  }

  if (loadingDates) {
    return (
      <div className="space-y-3 p-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium">
          {new Date(year, month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </span>
        <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={i} />
          const ymd = toDateString(day)
          const isPast = day < today
          const isAvailable = availableDates.size === 0 || availableDates.has(ymd)
          const disabled = isPast || !isAvailable
          const isSelected = selectedDate ? toDateString(selectedDate) === ymd : false
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onDateSelect(day)}
              className={cn(
                "h-9 w-9 mx-auto rounded-full text-sm flex items-center justify-center transition-all",
                disabled && "text-gray-300 cursor-not-allowed",
                !disabled && !isSelected && "hover:bg-gray-100 cursor-pointer",
                isSelected && "bg-green-600 text-white"
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
