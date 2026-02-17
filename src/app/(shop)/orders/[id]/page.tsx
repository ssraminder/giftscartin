"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  PartyPopper,
  Truck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"
import type { Order, OrderStatus, ApiResponse } from "@/types"

const ORDER_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: "PENDING", label: "Order Placed", icon: Clock },
  { status: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { status: "PREPARING", label: "Preparing", icon: Package },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: Truck },
  { status: "DELIVERED", label: "Delivered", icon: CheckCircle2 },
]

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
}

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

function OrderDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-48" />
      <Card className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </Card>
      <Card className="p-4 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-32" />
      </Card>
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const isNewOrder = searchParams.get("new") === "true"
  const orderId = params.id as string
  const { data: session, status: authStatus } = useSession()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authStatus === "loading") return
    if (!session) {
      setLoading(false)
      return
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        const json: ApiResponse<Order> = await res.json()
        if (json.success && json.data) {
          setOrder(json.data)
        } else {
          setError(json.error || "Order not found")
        }
      } catch {
        setError("Something went wrong. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [session, authStatus, orderId])

  if (authStatus === "loading" || loading) {
    return <OrderDetailSkeleton />
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Sign in to view order</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Log in to see your order details.
        </p>
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-destructive mb-4">{error || "Order not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/orders">Back to Orders</Link>
        </Button>
      </div>
    )
  }

  const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED"
  const currentStepIndex = STATUS_ORDER[order.status] ?? -1
  const statusBadge = STATUS_BADGE[order.status] || STATUS_BADGE.PENDING

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
      {/* Back link */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        My Orders
      </Link>

      {/* New order success banner */}
      {isNewOrder && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <PartyPopper className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">
                Your order has been placed! Order #{order.orderNumber}
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                We&apos;ll send you updates as your order progresses.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Order header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-4">Order Status</h2>
          <div className="space-y-0">
            {ORDER_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex
              const isCurrent = index === currentStepIndex
              const isLast = index === ORDER_STEPS.length - 1
              const Icon = step.icon

              return (
                <div key={step.status} className="flex gap-3">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <Icon className="h-3.5 w-3.5" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-6 ${
                          isCompleted && index < currentStepIndex
                            ? "bg-primary/30"
                            : "bg-muted"
                        }`}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pt-1">
                    <p
                      className={`text-sm ${
                        isCurrent
                          ? "font-semibold text-foreground"
                          : isCompleted
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Cancelled notice */}
      {isCancelled && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            This order has been {order.status === "CANCELLED" ? "cancelled" : "refunded"}.
          </p>
        </Card>
      )}

      {/* Order items */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Items</h2>
        <div className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between gap-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground"> x{item.quantity}</span>
              </div>
              <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <Separator className="my-3" />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.deliveryCharge > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>{formatPrice(order.deliveryCharge)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          {order.surcharge > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surcharge</span>
              <span>{formatPrice(order.surcharge)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </Card>

      {/* Delivery details */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Delivery Details</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{formatDate(order.deliveryDate)}</p>
              <p className="text-muted-foreground">{order.deliverySlot}</p>
            </div>
          </div>

          {order.address && (
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{order.address.name}</p>
                <p className="text-muted-foreground">
                  {order.address.address}
                  {order.address.landmark && `, ${order.address.landmark}`}
                </p>
                <p className="text-muted-foreground">
                  {order.address.city}, {order.address.state} - {order.address.pincode}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Gift message */}
      {order.giftMessage && (
        <Card className="p-4">
          <div className="flex gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold mb-1">Gift Message</h2>
              <p className="text-sm text-muted-foreground">{order.giftMessage}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Contact support */}
      <div className="pt-2">
        <Button variant="outline" className="w-full" asChild>
          <Link href="mailto:support@giftscart.in">Contact Support</Link>
        </Button>
      </div>
    </div>
  )
}
