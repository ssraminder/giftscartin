"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  variationLabel: string | null
  product: { id: string; name: string; images: string[] }
}

interface VendorOrder {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  subtotal: number
  deliveryCharge: number
  deliveryDate: string
  deliverySlot: string
  createdAt: string
  giftMessage: string | null
  specialInstructions: string | null
  items: OrderItem[]
  address: {
    name: string
    phone: string
    address: string
    city: string
    pincode: string
  }
  user: { name: string | null; phone: string }
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

const statusFilters = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
]

function VendorOrdersContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || ""

  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const pageSize = 10

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/vendor/orders?${params}`)
      const json = await res.json()
      if (json.success) {
        setOrders(json.data.items)
        setTotal(json.data.total)
      } else {
        setError(json.error || "Failed to load orders")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">
            Manage your incoming and past orders
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setStatusFilter(filter.value)
              setPage(1)
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-20 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <ShoppingBag className="h-10 w-10 text-slate-300" />
            <p className="text-slate-500">
              {statusFilter
                ? `No ${statusFilter.toLowerCase().replace(/_/g, " ")} orders`
                : "No orders yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/vendor/orders/${order.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Order header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[order.status] || "bg-slate-100"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                        {order.paymentStatus === "PAID" && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            PAID
                          </Badge>
                        )}
                      </div>

                      {/* Items */}
                      <p className="mt-1 text-sm text-slate-600">
                        {order.items.map((i) =>
                          `${i.name}${i.variationLabel ? ` (${i.variationLabel})` : ""} x${i.quantity}`
                        ).join(", ")}
                      </p>

                      {/* Delivery info */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.deliveryDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {order.deliverySlot}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.address.city} - {order.address.pincode}
                        </span>
                      </div>

                      {/* Customer */}
                      <p className="mt-1 text-xs text-slate-400">
                        Customer: {order.user.name || order.user.phone}
                      </p>
                    </div>

                    {/* Right side - total */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-slate-900">
                        {formatPrice(order.total)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border p-2 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border p-2 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VendorOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
            <p className="text-sm text-slate-500">Loading orders...</p>
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-20 animate-pulse rounded bg-slate-100" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      }
    >
      <VendorOrdersContent />
    </Suspense>
  )
}
