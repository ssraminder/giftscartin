"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  IndianRupee,
  TrendingUp,
  Percent,
  Wallet,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface EarningsData {
  period: string
  commissionRate: number
  totalRevenue: number
  totalCommission: number
  netEarnings: number
  orderCount: number
  pendingPayout: number
  lifetimeRevenue: number
  lifetimeNet: number
  orders: {
    orderId: string
    orderNumber: string
    orderTotal: number
    commission: number
    netEarning: number
    date: string
  }[]
  payouts: {
    id: string
    amount: number
    period: string
    orderCount: number
    deductions: number
    tdsAmount: number
    netAmount: number
    status: string
    transactionRef: string | null
    paidAt: string | null
    createdAt: string
  }[]
}

const periodLabels: Record<string, string> = {
  week: "This Week",
  month: "This Month",
  all: "All Time",
}

const payoutStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
}

export default function VendorEarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState("month")

  const fetchEarnings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vendor/earnings?period=${period}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.error || "Failed to load earnings")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [period])

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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
          <button onClick={fetchEarnings} className="mt-3 text-sm font-medium text-red-700 underline">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
          <p className="text-sm text-slate-500">
            Track your revenue, commissions, and payouts
          </p>
        </div>
        <button
          onClick={fetchEarnings}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {["week", "month", "all"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Revenue
            </CardTitle>
            <div className="rounded-lg bg-teal-50 p-2">
              <IndianRupee className="h-4 w-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(data.totalRevenue)}
            </div>
            <p className="text-xs text-slate-500">
              {data.orderCount} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Commission
            </CardTitle>
            <div className="rounded-lg bg-amber-50 p-2">
              <Percent className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(data.totalCommission)}
            </div>
            <p className="text-xs text-slate-500">
              {data.commissionRate}% rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Net Earnings
            </CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {formatPrice(data.netEarnings)}
            </div>
            <p className="text-xs text-slate-500">After commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pending Payout
            </CardTitle>
            <div className="rounded-lg bg-purple-50 p-2">
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {formatPrice(data.pendingPayout)}
            </div>
            <p className="text-xs text-slate-500">To be settled</p>
          </CardContent>
        </Card>
      </div>

      {/* Lifetime stats */}
      <Card>
        <CardContent className="flex flex-wrap gap-6 p-6">
          <div>
            <p className="text-sm text-slate-500">Lifetime Revenue</p>
            <p className="text-lg font-bold text-slate-900">
              {formatPrice(data.lifetimeRevenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Lifetime Net</p>
            <p className="text-lg font-bold text-emerald-700">
              {formatPrice(data.lifetimeNet)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order earnings table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Order Breakdown ({periodLabels[period]})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No delivered orders in this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Commission</th>
                    <th className="pb-2 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o.orderId} className="border-b last:border-0">
                      <td className="py-2 font-medium text-slate-900">
                        {o.orderNumber}
                      </td>
                      <td className="py-2 text-slate-600">
                        {new Date(o.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2 text-right text-slate-900">
                        {formatPrice(o.orderTotal)}
                      </td>
                      <td className="py-2 text-right text-amber-700">
                        -{formatPrice(o.commission)}
                      </td>
                      <td className="py-2 text-right font-medium text-emerald-700">
                        {formatPrice(o.netEarning)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payouts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {data.payouts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No payouts yet
            </p>
          ) : (
            <div className="space-y-3">
              {data.payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {payout.period}
                    </p>
                    <p className="text-xs text-slate-500">
                      {payout.orderCount} orders
                      {payout.transactionRef && ` | Ref: ${payout.transactionRef}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(payout.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatPrice(payout.netAmount)}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        payoutStatusColors[payout.status] || "bg-slate-100"
                      }`}
                    >
                      {payout.status}
                    </span>
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
