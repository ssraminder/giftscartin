"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Store, MapPin, Star } from "lucide-react"

interface Vendor {
  id: string
  businessName: string
  ownerName: string
  phone: string
  email: string | null
  status: string
  rating: number
  totalOrders: number
  isOnline: boolean
  city: { name: string }
  categories: string[]
  commissionRate: number
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vendors")
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setVendors(json.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchVendors()
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700"
      case "PENDING":
        return "bg-amber-100 text-amber-700"
      case "SUSPENDED":
        return "bg-red-100 text-red-700"
      case "TERMINATED":
        return "bg-slate-100 text-slate-700"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500">
            Manage vendor accounts and approvals
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-500">
              No vendors found
            </p>
            <p className="text-sm text-slate-400">
              Vendors will appear here once they register
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {vendor.businessName}
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      {vendor.ownerName} &middot; {vendor.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {vendor.isOnline && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        Online
                      </Badge>
                    )}
                    <Badge className={statusColor(vendor.status)}>
                      {vendor.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {vendor.city.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    {Number(vendor.rating).toFixed(1)}
                  </span>
                  <span>{vendor.totalOrders} orders</span>
                  <span>{vendor.commissionRate}% commission</span>
                  {vendor.categories.length > 0 && (
                    <span>
                      {vendor.categories.join(", ")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
