"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Pencil,
  Store,
  Truck,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"
import type { Order, OrderStatus, ApiResponse } from "@/types"

// ==================== Constants ====================

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

// ==================== Types ====================

interface PaymentMethodOption {
  id: string
  name: string
  slug: string
  description: string | null
}

// ==================== Helpers ====================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ==================== Skeleton ====================

function OrderDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <Card className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </Card>
    </div>
  )
}

// ==================== Main Page ====================

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [vendors, setVendors] = useState<{ id: string; businessName: string; status: string; city: { name: string } }[]>([])
  const [assigningVendor, setAssigningVendor] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState("")

  // Record Payment state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [transactionRef, setTransactionRef] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
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
  }, [orderId])

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vendors")
      const json = await res.json()
      if (json.success) {
        setVendors(json.data.filter((v: { status: string }) => v.status === "APPROVED"))
      }
    } catch {
      // Ignore
    }
  }, [])

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payment-methods")
      const json = await res.json()
      if (json.success) {
        setPaymentMethods(json.data.filter((m: { isActive: boolean }) => m.isActive))
      }
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    fetchOrder()
    fetchVendors()
    fetchPaymentMethods()
  }, [fetchOrder, fetchVendors, fetchPaymentMethods])

  const handleAssignVendor = async () => {
    if (!selectedVendorId) return
    setAssigningVendor(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: selectedVendorId }),
      })
      const json = await res.json()
      if (json.success) {
        setSelectedVendorId("")
        fetchOrder()
      } else {
        setActionError(json.error || "Failed to assign vendor")
      }
    } catch {
      setActionError("Network error. Please try again.")
    } finally {
      setAssigningVendor(false)
    }
  }

  const handleCancelOrder = async () => {
    setCancelling(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          note: "Cancelled by admin",
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCancelDialogOpen(false)
        fetchOrder()
      } else {
        setActionError(json.error || "Failed to cancel order")
      }
    } catch {
      setActionError("Network error. Please try again.")
    } finally {
      setCancelling(false)
    }
  }

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        fetchOrder()
      } else {
        setActionError(json.error || "Failed to update status")
      }
    } catch {
      setActionError("Network error. Please try again.")
    }
  }

  const openPaymentDialog = () => {
    if (order) {
      setPaymentAmount(String(order.total))
      setSelectedPaymentMethod("")
      setTransactionRef("")
      setPaymentNotes("")
      setPaymentError(null)
    }
    setPaymentDialogOpen(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedPaymentMethod) {
      setPaymentError("Please select a payment method")
      return
    }
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Please enter a valid amount")
      return
    }

    setRecordingPayment(true)
    setPaymentError(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId: selectedPaymentMethod,
          amount,
          transactionRef: transactionRef || undefined,
          notes: paymentNotes || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setPaymentDialogOpen(false)
        fetchOrder()
      } else {
        setPaymentError(json.error || "Failed to record payment")
      }
    } catch {
      setPaymentError("Network error. Please try again.")
    } finally {
      setRecordingPayment(false)
    }
  }

  if (loading) {
    return <OrderDetailSkeleton />
  }

  if (error || !order) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-destructive mb-4">{error || "Order not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
      </div>
    )
  }

  const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED"
  const isDelivered = order.status === "DELIVERED"
  const currentStepIndex = STATUS_ORDER[order.status] ?? -1
  const statusBadge = STATUS_BADGE[order.status] || STATUS_BADGE.PENDING
  const canRecordPayment = order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED"

  // Determine next status for quick advance button
  const nextStatusMap: Record<string, OrderStatus> = {
    PENDING: "CONFIRMED",
    CONFIRMED: "PREPARING",
    PREPARING: "OUT_FOR_DELIVERY",
    OUT_FOR_DELIVERY: "DELIVERED",
  }
  const nextStatus = nextStatusMap[order.status] || null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back link */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      {/* ==================== HEADER SECTION ==================== */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        {/* Left: Order number + status badge */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              {order.orderNumber}
            </h1>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex flex-wrap gap-2 md:shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="justify-center"
            disabled={isCancelled || isDelivered}
            onClick={() => router.push(`/admin/orders/${orderId}/edit`)}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit Order
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="justify-center"
            disabled={isCancelled || isDelivered}
            onClick={() => setCancelDialogOpen(true)}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Cancel Order
          </Button>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Quick status advance */}
      {nextStatus && !isCancelled && (
        <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Advance Order Status</p>
            <p className="text-xs text-muted-foreground">
              Move to next step: {STATUS_BADGE[nextStatus]?.label}
            </p>
          </div>
          <Button
            size="sm"
            className="btn-gradient"
            onClick={() => handleUpdateStatus(nextStatus)}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Mark as {STATUS_BADGE[nextStatus]?.label}
          </Button>
        </Card>
      )}

      {/* Order meta info */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        <span>Placed: {formatDateTime(order.createdAt)}</span>
        {order.paymentStatus && (
          <span>
            Payment:{" "}
            <Badge
              variant={order.paymentStatus === "PAID" ? "success" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {order.paymentStatus}
            </Badge>
          </span>
        )}
        {order.paymentMethod && <span>Method: {order.paymentMethod}</span>}
      </div>

      {/* ==================== RECORD PAYMENT ==================== */}
      {canRecordPayment && (
        <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-amber-200 bg-amber-50">
          <div>
            <p className="text-sm font-medium text-amber-800">Payment {order.paymentStatus === "FAILED" ? "Failed" : "Pending"}</p>
            <p className="text-xs text-amber-600">
              Record a manual payment for this order ({formatPrice(order.total)})
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={openPaymentDialog}
          >
            <CreditCard className="mr-1.5 h-4 w-4" />
            Record Payment
          </Button>
        </Card>
      )}

      {/* ==================== STATUS TIMELINE ==================== */}
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

      {/* ==================== ORDER ITEMS ==================== */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Items</h2>
        <div className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between gap-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{item.name}</span>
                {item.variationLabel && (
                  <span className="text-muted-foreground"> ({item.variationLabel})</span>
                )}
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

      {/* ==================== BUSINESS INFO (Admin Only) ==================== */}
      {(order.vendorId || order.businessModel) && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Business Details</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Business Model</span>
              <span>{order.businessModel === "MODEL_A" ? "Model A" : "Model B"}</span>
            </div>
            {order.couponCode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coupon</span>
                <span className="font-mono text-xs">{order.couponCode}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ==================== VENDOR ASSIGNMENT ==================== */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Store className="h-4 w-4" />
          Vendor Assignment
        </h2>
        {order.vendorId ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Assigned to vendor ID: <span className="font-mono text-xs">{order.vendorId}</span>
            </p>
            {!isCancelled && !isDelivered && (
              <div className="flex items-center gap-2 pt-1">
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                  <SelectTrigger className="h-8 w-[220px] text-sm">
                    <SelectValue placeholder="Reassign vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.businessName} ({v.city.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAssignVendor}
                  disabled={!selectedVendorId || assigningVendor}
                >
                  {assigningVendor ? "Assigning..." : "Reassign"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-amber-600">No vendor assigned to this order</p>
            <div className="flex items-center gap-2">
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger className="h-8 w-[220px] text-sm">
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.businessName} ({v.city.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAssignVendor}
                disabled={!selectedVendorId || assigningVendor}
              >
                {assigningVendor ? "Assigning..." : "Assign Vendor"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ==================== DELIVERY DETAILS ==================== */}
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
                {order.address.phone && (
                  <p className="text-muted-foreground">Phone: {order.address.phone}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ==================== GIFT MESSAGE ==================== */}
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

      {/* ==================== SPECIAL INSTRUCTIONS ==================== */}
      {order.specialInstructions && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-1">Special Instructions</h2>
          <p className="text-sm text-muted-foreground">{order.specialInstructions}</p>
        </Card>
      )}

      {/* ==================== STATUS HISTORY ==================== */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Status History</h2>
          <div className="space-y-2">
            {order.statusHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={STATUS_BADGE[entry.status]?.variant || "secondary"}
                    className="text-[10px]"
                  >
                    {STATUS_BADGE[entry.status]?.label || entry.status}
                  </Badge>
                  {entry.note && (
                    <span className="text-muted-foreground">{entry.note}</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==================== CANCEL ORDER DIALOG ==================== */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order {order.orderNumber}?
              {order.paymentStatus === "PAID" && " The payment will be marked for refund."}
              {" "}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <p className="text-sm text-destructive">{actionError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== RECORD PAYMENT DIALOG ==================== */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Manually record a payment for order {order.orderNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select payment method..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-ref">Transaction Reference (optional)</Label>
              <Input
                id="transaction-ref"
                placeholder="e.g. UPI ref number, cheque number"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (optional)</Label>
              <Input
                id="payment-notes"
                placeholder="e.g. Paid via Google Pay"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
            {paymentError && (
              <p className="text-sm text-destructive">{paymentError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={recordingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={recordingPayment || !selectedPaymentMethod}
            >
              {recordingPayment ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Mark as Paid"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
