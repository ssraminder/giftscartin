"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Package, ChevronRight, ShoppingBag } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"
import type { Order, OrderItem, ApiResponse, PaginatedData } from "@/types"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "accent" | "success" }> = {
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

function OrderCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </Card>
  )
}

export default function OrdersPage() {
  const { data: session, status: authStatus } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authStatus === "loading") return
    if (!session) {
      setLoading(false)
      return
    }

    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders")
        const json: ApiResponse<PaginatedData<Order>> = await res.json()
        if (json.success && json.data) {
          setOrders(json.data.items)
        } else {
          setError(json.error || "Failed to load orders")
        }
      } catch {
        setError("Something went wrong. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [session, authStatus])

  if (authStatus === "loading" || loading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-bold mb-4">My Orders</h1>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Sign in to view orders</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Log in to see your order history and track deliveries.
        </p>
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">No orders yet</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Start shopping and your orders will appear here!
        </p>
        <Button asChild>
          <Link href="/">Start Shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold mb-4">My Orders</h1>

      <div className="space-y-3">
        {orders.map((order) => {
          const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
          const itemsSummary = order.items
            ? order.items.map((item: OrderItem) => `${item.name} x${item.quantity}`).join(", ")
            : ""

          return (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{order.orderNumber}</span>
                      <Badge variant={statusConfig.variant} className="text-[10px]">
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {itemsSummary && (
                      <p className="text-sm text-muted-foreground truncate mb-1">
                        {itemsSummary}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(order.createdAt)}</span>
                      <span className="font-medium text-foreground">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
