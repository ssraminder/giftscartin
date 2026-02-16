"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Clock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeliverySlot {
  slug: string
  name: string
  startTime: string
  endTime: string
  charge: number
  available: boolean
}

interface DeliverySlotPickerProps {
  selectedDate: string | null
  selectedSlot: string | null
  onDateChange: (date: string) => void
  onSlotChange: (slug: string) => void
}

const SLOTS: DeliverySlot[] = [
  { slug: "standard", name: "Standard", startTime: "9:00 AM", endTime: "9:00 PM", charge: 0, available: true },
  { slug: "fixed-slot", name: "Fixed Slot", startTime: "2-hour", endTime: "window", charge: 50, available: true },
  { slug: "midnight", name: "Midnight", startTime: "11:00 PM", endTime: "11:59 PM", charge: 199, available: true },
  { slug: "early-morning", name: "Early Morning", startTime: "6:00 AM", endTime: "8:00 AM", charge: 149, available: true },
  { slug: "express", name: "Express", startTime: "Within", endTime: "2-3 hrs", charge: 249, available: true },
]

function generateDates(count: number): { date: string; label: string; day: string; month: string; isToday: boolean }[] {
  const dates = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push({
      date: d.toISOString().split("T")[0],
      label: d.getDate().toString(),
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      isToday: i === 0,
    })
  }
  return dates
}

export function DeliverySlotPicker({
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
}: DeliverySlotPickerProps) {
  const dates = useMemo(() => generateDates(30), [])
  const [weekOffset, setWeekOffset] = useState(0)

  const visibleDates = dates.slice(weekOffset * 7, weekOffset * 7 + 7)
  const maxWeeks = Math.ceil(dates.length / 7) - 1

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Select Delivery Date</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-1 gap-1 overflow-hidden">
            {visibleDates.map((d) => (
              <button
                key={d.date}
                onClick={() => onDateChange(d.date)}
                className={cn(
                  "flex flex-1 flex-col items-center rounded-lg border px-1 py-2 text-center transition-colors min-w-0",
                  d.date === selectedDate
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-[10px] uppercase text-muted-foreground">
                  {d.isToday ? "Today" : d.day}
                </span>
                <span className="text-sm font-semibold">{d.label}</span>
                <span className="text-[10px] text-muted-foreground">{d.month}</span>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={weekOffset >= maxWeeks}
            onClick={() => setWeekOffset((w) => Math.min(maxWeeks, w + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Slot picker */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Select Delivery Slot</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SLOTS.map((slot) => (
            <button
              key={slot.slug}
              onClick={() => slot.available && onSlotChange(slot.slug)}
              disabled={!slot.available}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                slot.slug === selectedSlot
                  ? "border-primary bg-primary/10"
                  : slot.available
                    ? "border-border hover:border-primary/50"
                    : "border-border opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                {slot.slug === "express" ? (
                  <Zap className="h-4 w-4 text-accent" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{slot.name}</p>
                <p className="text-xs text-muted-foreground">
                  {slot.startTime} – {slot.endTime}
                </p>
              </div>
              <span className={cn(
                "text-xs font-semibold shrink-0",
                slot.charge === 0 ? "text-green-600" : "text-foreground"
              )}>
                {slot.charge === 0 ? "FREE" : formatPrice(slot.charge)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
