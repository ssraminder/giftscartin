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
import {
  RefreshCw,
  Store,
  MapPin,
  Star,
  CheckCircle,
  XCircle,
  Ban,
  Percent,
} from "lucide-react"

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
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editCommission, setEditCommission] = useState<{
    id: string
    rate: number
  } | null>(null)

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

  const updateVendor = async (
    vendorId: string,
    data: Record<string, unknown>
  ) => {
    setActionLoading(vendorId)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        setVendors((prev) =>
          prev.map((v) => (v.id === vendorId ? { ...v, ...json.data } : v))
        )
      } else {
        alert(json.error || "Failed to update vendor")
      }
    } catch {
      alert("Failed to connect to server")
    } finally {
      setActionLoading(null)
    }
  }

  const handleStatusChange = async (vendorId: string, status: string) => {
    const confirmMsg: Record<string, string> = {
      APPROVED: "Approve this vendor? They will be able to receive orders.",
      SUSPENDED:
        "Suspend this vendor? They will not be able to receive new orders.",
      TERMINATED:
        "Terminate this vendor? This action is permanent and removes them from the platform.",
    }

    if (confirmMsg[status] && !window.confirm(confirmMsg[status])) return
    await updateVendor(vendorId, { status })
  }

  const handleCommissionSave = async (vendorId: string) => {
    if (!editCommission) return
    await updateVendor(vendorId, { commissionRate: editCommission.rate })
    setEditCommission(null)
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
            Manage vendor accounts, approvals, and commissions
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

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-100 text-emerald-700">
          {vendors.filter((v) => v.status === "APPROVED").length} Approved
        </Badge>
        <Badge className="bg-amber-100 text-amber-700">
          {vendors.filter((v) => v.status === "PENDING").length} Pending
        </Badge>
        <Badge className="bg-red-100 text-red-700">
          {vendors.filter((v) => v.status === "SUSPENDED").length} Suspended
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-slate-100"
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
            <Card
              key={vendor.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {vendor.businessName}
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      {vendor.ownerName} &middot; {vendor.phone}
                      {vendor.email && ` &middot; ${vendor.email}`}
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
                <div className="space-y-3">
                  {/* Info row */}
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
                    {vendor.categories.length > 0 && (
                      <span>{vendor.categories.join(", ")}</span>
                    )}
                  </div>

                  {/* Commission display/edit */}
                  <div className="flex items-center gap-2">
                    <Percent className="h-3.5 w-3.5 text-slate-400" />
                    {editCommission?.id === vendor.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editCommission.rate}
                          onChange={(e) =>
                            setEditCommission({
                              ...editCommission,
                              rate: Number(e.target.value),
                            })
                          }
                          min={0}
                          max={100}
                          step={0.5}
                          className="w-20 rounded border px-2 py-1 text-sm"
                        />
                        <span className="text-sm text-slate-500">%</span>
                        <button
                          onClick={() => handleCommissionSave(vendor.id)}
                          disabled={actionLoading === vendor.id}
                          className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditCommission(null)}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setEditCommission({
                            id: vendor.id,
                            rate: vendor.commissionRate,
                          })
                        }
                        className="text-sm text-slate-600 hover:underline"
                      >
                        {vendor.commissionRate}% commission
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {vendor.status === "PENDING" && (
                      <button
                        onClick={() =>
                          handleStatusChange(vendor.id, "APPROVED")
                        }
                        disabled={actionLoading === vendor.id}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </button>
                    )}

                    {vendor.status === "PENDING" && (
                      <button
                        onClick={() =>
                          handleStatusChange(vendor.id, "TERMINATED")
                        }
                        disabled={actionLoading === vendor.id}
                        className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    )}

                    {vendor.status === "APPROVED" && (
                      <button
                        onClick={() =>
                          handleStatusChange(vendor.id, "SUSPENDED")
                        }
                        disabled={actionLoading === vendor.id}
                        className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Suspend
                      </button>
                    )}

                    {vendor.status === "SUSPENDED" && (
                      <>
                        <button
                          onClick={() =>
                            handleStatusChange(vendor.id, "APPROVED")
                          }
                          disabled={actionLoading === vendor.id}
                          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Reactivate
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(vendor.id, "TERMINATED")
                          }
                          disabled={actionLoading === vendor.id}
                          className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Terminate
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
