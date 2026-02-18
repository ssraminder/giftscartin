"use client"

import { useEffect, useState, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"

export interface OrderNotification {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
}

/**
 * Subscribes to real-time order updates for a given vendor.
 * Uses Supabase Realtime to listen for INSERT and UPDATE on the orders table
 * filtered by vendorId.
 */
export function useOrderNotifications(vendorId: string | null) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([])
  const [connected, setConnected] = useState(false)

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setNotifications([])
  }, [])

  useEffect(() => {
    if (!vendorId) return

    const supabase = getSupabase()

    const channel = supabase
      .channel(`vendor-orders-${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `vendorId=eq.${vendorId}`,
        },
        (payload) => {
          const order = payload.new as Record<string, unknown>
          setNotifications((prev) => [
            {
              id: order.id as string,
              orderNumber: order.orderNumber as string,
              status: order.status as string,
              total: Number(order.total),
              createdAt: order.createdAt as string,
            },
            ...prev,
          ])
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `vendorId=eq.${vendorId}`,
        },
        (payload) => {
          const order = payload.new as Record<string, unknown>
          const oldOrder = payload.old as Record<string, unknown>

          // Only notify on status changes
          if (order.status !== oldOrder.status) {
            setNotifications((prev) => [
              {
                id: `${order.id}-${Date.now()}`,
                orderNumber: order.orderNumber as string,
                status: order.status as string,
                total: Number(order.total),
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ])
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [vendorId])

  return { notifications, connected, dismiss, dismissAll }
}
