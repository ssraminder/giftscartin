"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  ShoppingBag,
  RefreshCw,
  ChevronRight,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"
import type { Order, ApiResponse, PaginatedData } from "@/types"

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "accent" | "success" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "accent" },
  PREPARING: { label: "Preparing", variant: "accent" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", variant: "default" },
  DELIVERED: { label: "Delivered", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "outline" },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function OrderListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?admin=true")
      const json: ApiResponse<PaginatedData<Order> | Order[]> = await res.json()
      if (json.success && json.data) {
        const items = Array.isArray(json.data) ? json.data : json.data.items
        setOrders(items)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">Manage all customer orders</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Order list */}
      {loading ? (
        <OrderListSkeleton />
      ) : orders.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-1">No orders yet</h2>
          <p className="text-sm text-slate-500">Orders will appear here once customers place them.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const badge = STATUS_BADGE[order.status] || STATUS_BADGE.PENDING
            return (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <Card className="p-3 sm:p-4 transition-shadow hover:shadow-md cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {order.orderNumber}
                        </span>
                        <Badge variant={badge.variant} className="text-[10px]">
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                        <span>{formatDate(order.createdAt)}</span>
                        <span>{formatPrice(order.total)}</span>
                        {order.deliverySlot && <span>{order.deliverySlot}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
