"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag,
  IndianRupee,
  Star,
  Package,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface DashboardData {
  todayOrders: number
  pendingOrders: number
  weekEarnings: number
  monthEarnings: number
  totalDelivered: number
  activeProducts: number
  rating: number
  status: string
  isOnline: boolean
  recentOrders: {
    id: string
    orderNumber: string
    status: string
    total: number
    deliveryDate: string
    deliverySlot: string
    createdAt: string
    items: { name: string; quantity: number }[]
  }[]
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

export default function VendorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/vendor/dashboard")
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.error || "Failed to load dashboard")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="mt-3 text-sm font-medium text-red-700 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!data) return null

  const metrics = [
    {
      title: "Today's Orders",
      value: data.todayOrders.toString(),
      icon: ShoppingBag,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/vendor/orders",
    },
    {
      title: "Pending Orders",
      value: data.pendingOrders.toString(),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/vendor/orders?status=PENDING",
    },
    {
      title: "This Week's Earnings",
      value: formatPrice(data.weekEarnings),
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/vendor/earnings",
    },
    {
      title: "Rating",
      value: Number(data.rating) > 0 ? Number(data.rating).toFixed(1) : "New",
      icon: Star,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome to your vendor dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {data.isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-slate-400" />
            )}
            <span className={`text-sm font-medium ${data.isOnline ? "text-green-600" : "text-slate-400"}`}>
              {data.isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <Badge
            className={
              data.status === "APPROVED"
                ? "bg-green-100 text-green-800"
                : data.status === "PENDING"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
            }
          >
            {data.status}
          </Badge>
          <button
            onClick={fetchDashboard}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const content = (
            <Card key={metric.title} className={metric.href ? "cursor-pointer hover:shadow-md transition-shadow" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {metric.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${metric.bg}`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          )
          return metric.href ? (
            <Link key={metric.title} href={metric.href}>{content}</Link>
          ) : (
            <div key={metric.title}>{content}</div>
          )
        })}
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-teal-50 p-3">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Month&apos;s Earnings</p>
              <p className="text-xl font-bold text-slate-900">
                {formatPrice(data.monthEarnings)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-emerald-50 p-3">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Delivered</p>
              <p className="text-xl font-bold text-slate-900">
                {data.totalDelivered}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-50 p-3">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Products</p>
              <p className="text-xl font-bold text-slate-900">
                {data.activeProducts}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <Link
            href="/vendor/orders"
            className="text-sm font-medium text-teal-600 hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No orders yet. Once you start receiving orders, they will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/vendor/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColors[order.status] || "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold text-slate-900">
                      {formatPrice(order.total)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
