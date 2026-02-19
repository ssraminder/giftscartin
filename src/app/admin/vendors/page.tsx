"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Store,
  MapPin,
  CheckCircle,
  XCircle,
  Ban,
  Plus,
  Pencil,
  Search,
  Wifi,
  WifiOff,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Package,
} from "lucide-react"

interface VendorCity {
  id: string
  name: string
  slug: string
}

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
  city: VendorCity
  categories: string[]
  commissionRate: number
  createdAt: string
  _count: { orders: number; products: number }
}

interface City {
  id: string
  name: string
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Filter state
  const [statusFilter, setStatusFilter] = useState("")
  const [cityFilter, setCityFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (cityFilter) params.set("cityId", cityFilter)
      if (searchQuery) params.set("search", searchQuery)
      params.set("page", page.toString())
      params.set("pageSize", pageSize.toString())

      const res = await fetch(`/api/admin/vendors?${params}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setVendors(json.data.items)
          setTotal(json.data.total)
        }
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, cityFilter, searchQuery, page])

  const fetchCities = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cities")
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setCities(json.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
        }
      }
    } catch {
      // Cities are just for filtering, non-critical
    }
  }, [])

  useEffect(() => {
    fetchCities()
  }, [fetchCities])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPage(1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const quickUpdate = async (vendorId: string, data: Record<string, unknown>) => {
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
        showToast("success", "Vendor updated successfully")
      } else {
        showToast("error", json.error || "Failed to update vendor")
      }
    } catch {
      showToast("error", "Failed to connect to server")
    } finally {
      setActionLoading(null)
    }
  }

  const handleStatusChange = async (vendorId: string, status: string) => {
    const confirmMsg: Record<string, string> = {
      APPROVED: "Approve this vendor? They will be able to receive orders.",
      SUSPENDED: "Suspend this vendor? They will not be able to receive new orders.",
      TERMINATED: "Terminate this vendor? This action is permanent.",
    }
    if (confirmMsg[status] && !window.confirm(confirmMsg[status])) return
    await quickUpdate(vendorId, { status })
  }

  const handleOnlineToggle = async (vendorId: string, isOnline: boolean) => {
    await quickUpdate(vendorId, { isOnline: !isOnline })
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-emerald-100 text-emerald-700"
      case "PENDING": return "bg-amber-100 text-amber-700"
      case "SUSPENDED": return "bg-orange-100 text-orange-700"
      case "TERMINATED": return "bg-red-100 text-red-700"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500">
            Manage vendor accounts, approvals, and commissions
          </p>
        </div>
        <Link href="/admin/vendors/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="TERMINATED">Terminated</option>
        </select>

        <select
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1) }}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <Input
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search vendors..."
            className="w-48"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => { setStatusFilter(""); setCityFilter(""); setSearchInput(""); setSearchQuery(""); setPage(1) }}
          className="text-slate-500"
        >
          Clear
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{total} total</Badge>
      </div>

      {/* Vendor list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-500">No vendors found</p>
            <p className="text-sm text-slate-400">
              {searchQuery || statusFilter || cityFilter
                ? "Try adjusting your filters"
                : "Add your first vendor to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Table view */}
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="hidden px-4 py-3 md:table-cell">City</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Orders</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Products</th>
                  <th className="hidden px-4 py-3 md:table-cell">Commission</th>
                  <th className="px-4 py-3">Online</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{vendor.businessName}</p>
                        <p className="text-xs text-slate-500 md:hidden">{vendor.city.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-slate-700">{vendor.ownerName}</p>
                        <p className="text-xs text-slate-400">{vendor.phone}</p>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="h-3.5 w-3.5" />
                        {vendor.city.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusColor(vendor.status)}>{vendor.status}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="flex items-center gap-1 text-slate-600">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {vendor._count.orders}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Package className="h-3.5 w-3.5" />
                        {vendor._count.products}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-slate-600">{vendor.commissionRate}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleOnlineToggle(vendor.id, vendor.isOnline)}
                        disabled={actionLoading === vendor.id || vendor.status !== "APPROVED"}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          vendor.isOnline
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={vendor.status !== "APPROVED" ? "Vendor must be approved to toggle online status" : undefined}
                      >
                        {vendor.isOnline ? (
                          <><Wifi className="h-3 w-3" /> Online</>
                        ) : (
                          <><WifiOff className="h-3 w-3" /> Offline</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/vendors/${vendor.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>

                        {vendor.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleStatusChange(vendor.id, "APPROVED")}
                            disabled={actionLoading === vendor.id}
                            title="Approve"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {vendor.status === "APPROVED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => handleStatusChange(vendor.id, "SUSPENDED")}
                            disabled={actionLoading === vendor.id}
                            title="Suspend"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {vendor.status === "SUSPENDED" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleStatusChange(vendor.id, "APPROVED")}
                              disabled={actionLoading === vendor.id}
                              title="Reactivate"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleStatusChange(vendor.id, "TERMINATED")}
                              disabled={actionLoading === vendor.id}
                              title="Terminate"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
