"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface UrgencyCountdownProps {
  cutoffHour?: number
}

function getISTNow(): Date {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcMs + 5.5 * 3600000)
}

type UrgencyState =
  | { phase: "plenty"; hours: number; minutes: number }
  | { phase: "urgent"; minutes: number; seconds: number }
  | { phase: "past" }

function calculateUrgency(cutoffHour: number): UrgencyState {
  const ist = getISTNow()
  const currentHour = ist.getHours()
  const currentMinute = ist.getMinutes()
  const currentSecond = ist.getSeconds()

  const totalSecondsLeft =
    (cutoffHour * 3600) - (currentHour * 3600 + currentMinute * 60 + currentSecond)

  if (totalSecondsLeft <= 0) {
    return { phase: "past" }
  }

  const totalMinutesLeft = Math.floor(totalSecondsLeft / 60)
  const hoursLeft = Math.floor(totalMinutesLeft / 60)

  if (hoursLeft >= 4) {
    return {
      phase: "plenty",
      hours: hoursLeft,
      minutes: totalMinutesLeft % 60,
    }
  }

  return {
    phase: "urgent",
    minutes: totalMinutesLeft,
    seconds: totalSecondsLeft % 60,
  }
}

export function UrgencyCountdown({ cutoffHour = 16 }: UrgencyCountdownProps) {
  const [state, setState] = useState<UrgencyState | null>(null)

  useEffect(() => {
    setState(calculateUrgency(cutoffHour))
    const interval = setInterval(() => {
      setState(calculateUrgency(cutoffHour))
    }, 1000)
    return () => clearInterval(interval)
  }, [cutoffHour])

  if (!state) return null

  if (state.phase === "plenty") {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0" />
        <span>Order within {state.hours}h {state.minutes}m for Same Day Delivery</span>
      </div>
    )
  }

  if (state.phase === "urgent") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0 animate-pulse" />
        <span>Hurry! Only {state.minutes}m {state.seconds}s left for Today&apos;s Delivery</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 flex items-center gap-2">
      <Clock className="h-4 w-4 shrink-0" />
      <span>Order now for Tomorrow or Midnight Delivery</span>
    </div>
  )
}
