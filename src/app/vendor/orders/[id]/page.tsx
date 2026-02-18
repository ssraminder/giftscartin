"use client"

import { useCallback, useEffect, useState, use } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChefHat,
  Truck,
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  MessageSquare,
  FileText,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface OrderDetail {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string | null
  total: number
  subtotal: number
  deliveryCharge: number
  discount: number
  surcharge: number
  deliveryDate: string
  deliverySlot: string
  giftMessage: string | null
  specialInstructions: string | null
  createdAt: string
  items: {
    id: string
    name: string
    quantity: number
    price: number
    variationLabel: string | null
    addons: { name: string; price: number }[] | null
    product: { id: string; name: string; slug: string; images: string[] }
  }[]
  address: {
    name: string
    phone: string
    address: string
    landmark: string | null
    city: string
    state: string
    pincode: string
  }
  user: {
    name: string | null
    phone: string
    email: string | null
  }
  statusHistory: {
    id: string
    status: string
    note: string | null
    createdAt: string
  }[]
  payment: { status: string; method: string | null } | null
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-slate-100 text-slate-800",
}

const statusSteps = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
]

interface ActionButton {
  label: string
  action: string
  icon: React.ElementType
  color: string
  confirm?: string
}

function getAvailableActions(status: string): ActionButton[] {
  switch (status) {
    case "PENDING":
      return [
        {
          label: "Accept Order",
          action: "accept",
          icon: CheckCircle,
          color: "bg-green-600 hover:bg-green-700 text-white",
        },
        {
          label: "Reject Order",
          action: "reject",
          icon: XCircle,
          color: "bg-red-600 hover:bg-red-700 text-white",
          confirm: "Are you sure you want to reject this order?",
        },
      ]
    case "CONFIRMED":
      return [
        {
          label: "Start Preparing",
          action: "preparing",
          icon: ChefHat,
          color: "bg-purple-600 hover:bg-purple-700 text-white",
        },
        {
          label: "Reject Order",
          action: "reject",
          icon: XCircle,
          color: "bg-red-600 hover:bg-red-700 text-white",
          confirm: "Are you sure you want to reject this order? It has already been confirmed.",
        },
      ]
    case "PREPARING":
      return [
        {
          label: "Out for Delivery",
          action: "out_for_delivery",
          icon: Truck,
          color: "bg-indigo-600 hover:bg-indigo-700 text-white",
        },
      ]
    case "OUT_FOR_DELIVERY":
      return [
        {
          label: "Mark Delivered",
          action: "delivered",
          icon: Package,
          color: "bg-green-600 hover:bg-green-700 text-white",
        },
      ]
    default:
      return []
  }
}

export default function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState("")

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vendor/orders/${id}`)
      const json = await res.json()
      if (json.success) {
        setOrder(json.data)
      } else {
        setError(json.error || "Failed to load order")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const handleAction = async (action: string, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return

    setActionLoading(action)
    try {
      const res = await fetch(`/api/vendor/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: actionNote || undefined }),
      })
      const json = await res.json()
      if (json.success) {
        setActionNote("")
        await fetchOrder()
      } else {
        alert(json.error || "Action failed")
      }
    } catch {
      alert("Failed to connect to server")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        <Card>
          <CardContent className="p-6">
            <div className="h-48 animate-pulse rounded bg-slate-100" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/vendor/orders" className="flex items-center gap-1 text-sm text-teal-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error || "Order not found"}</p>
          </div>
        </div>
      </div>
    )
  }

  const actions = getAvailableActions(order.status)
  const currentStepIndex = statusSteps.indexOf(order.status)

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div>
        <Link href="/vendor/orders" className="flex items-center gap-1 text-sm text-teal-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-slate-500">
              Placed {new Date(order.createdAt).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusColors[order.status] || "bg-slate-100"
              }`}
            >
              {order.status.replace(/_/g, " ")}
            </span>
            {order.paymentStatus === "PAID" ? (
              <Badge className="bg-green-100 text-green-800">PAID</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800">
                {order.paymentStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Status progress bar */}
      {order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        index <= currentStepIndex
                          ? "bg-teal-600 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {index < currentStepIndex ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="mt-1 text-[10px] text-slate-500 text-center hidden sm:block">
                      {step.replace(/_/g, " ")}
                    </span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 flex-1 ${
                        index < currentStepIndex ? "bg-teal-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <textarea
                placeholder="Add a note (optional)..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full rounded-md border p-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <button
                    key={action.action}
                    onClick={() => handleAction(action.action, action.confirm)}
                    disabled={actionLoading !== null}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${action.color}`}
                  >
                    <action.icon className="h-4 w-4" />
                    {actionLoading === action.action ? "Processing..." : action.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.variationLabel && (
                      <p className="text-xs text-slate-500">
                        Variant: {item.variationLabel}
                      </p>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Add-ons: {item.addons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    <p className="text-sm text-slate-500">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </p>
                </div>
              ))}

              {/* Price breakdown */}
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.deliveryCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery</span>
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
                  <div className="flex justify-between text-slate-600">
                    <span>Surcharge</span>
                    <span>{formatPrice(order.surcharge)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery & Customer info */}
        <div className="space-y-6">
          {/* Delivery details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">
                  {new Date(order.deliveryDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">{order.deliverySlot}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                <div className="text-slate-600">
                  <p className="font-medium">{order.address.name}</p>
                  <p>{order.address.address}</p>
                  {order.address.landmark && <p>{order.address.landmark}</p>}
                  <p>
                    {order.address.city}, {order.address.pincode}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">{order.address.phone}</span>
              </div>
            </CardContent>
          </Card>

          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">
                  {order.user.name || "No name"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">{order.user.phone}</span>
              </div>
            </CardContent>
          </Card>

          {/* Gift message / special instructions */}
          {(order.giftMessage || order.specialInstructions) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.giftMessage && (
                  <div className="flex items-start gap-2 text-sm">
                    <MessageSquare className="mt-0.5 h-4 w-4 text-pink-400" />
                    <div>
                      <p className="font-medium text-slate-700">Gift Message</p>
                      <p className="text-slate-600">{order.giftMessage}</p>
                    </div>
                  </div>
                )}
                {order.specialInstructions && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="mt-0.5 h-4 w-4 text-amber-400" />
                    <div>
                      <p className="font-medium text-slate-700">
                        Special Instructions
                      </p>
                      <p className="text-slate-600">
                        {order.specialInstructions}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status History</CardTitle>
        </CardHeader>
        <CardContent>
          {order.statusHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No status history</p>
          ) : (
            <div className="space-y-3">
              {order.statusHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 border-l-2 border-slate-200 pl-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColors[entry.status] || "bg-slate-100"
                        }`}
                      >
                        {entry.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(entry.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="mt-0.5 text-sm text-slate-600">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
