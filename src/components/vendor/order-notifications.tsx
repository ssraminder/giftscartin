"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, X, Wifi, WifiOff } from "lucide-react"
import { useOrderNotifications } from "@/hooks/use-order-notifications"
import { formatPrice } from "@/lib/utils"

interface OrderNotificationsProps {
  vendorId: string | null
}

export default function OrderNotifications({ vendorId }: OrderNotificationsProps) {
  const { notifications, connected, dismiss, dismissAll } = useOrderNotifications(vendorId)
  const [showPanel, setShowPanel] = useState(false)

  // Play sound on new notification
  useEffect(() => {
    if (notifications.length > 0 && typeof window !== "undefined") {
      // Use Web Audio API for a simple notification beep
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.frequency.value = 800
        oscillator.type = "sine"
        gainNode.gain.value = 0.1
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.15)
      } catch {
        // Audio not available
      }
    }
  }, [notifications.length])

  if (!vendorId) return null

  return (
    <div className="relative">
      {/* Bell icon with badge */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative rounded-md p-2 text-teal-100 hover:bg-teal-700 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {/* Connection indicator */}
      <div className="absolute -bottom-1 right-0">
        {connected ? (
          <Wifi className="h-2.5 w-2.5 text-green-400" />
        ) : (
          <WifiOff className="h-2.5 w-2.5 text-red-400" />
        )}
      </div>

      {/* Notification panel */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Notifications
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 border-b px-4 py-3 last:border-0 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/vendor/orders/${n.id.split("-")[0]}${n.id.includes("-") ? "" : ""}`}
                        onClick={() => setShowPanel(false)}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        {n.status === "PENDING"
                          ? "New Order!"
                          : `Order ${n.status.replace(/_/g, " ").toLowerCase()}`}
                      </Link>
                      <p className="text-xs text-slate-600">
                        {n.orderNumber} - {formatPrice(n.total)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(n.createdAt).toLocaleTimeString("en-IN")}
                      </p>
                    </div>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
