"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  AlertCircle,
  Package,
  Zap,
  ArrowRight,
  ArrowLeft,
  Clock,
  X,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface WorkingHour {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

interface VendorProductItem {
  id: string
  vendorId: string
  productId: string
  costPrice: number
  sellingPrice: number | null
  isAvailable: boolean
  preparationTime: number
  dailyLimit: number | null
  product: {
    id: string
    name: string
    slug: string
    basePrice: number
    images: string[]
    isActive: boolean
    isSameDayEligible: boolean
    category: { id: string; name: string }
  }
}

interface AvailableProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  images: string[]
  isSameDayEligible: boolean
  category: { id: string; name: string }
}

interface CategoryOption {
  id: string
  name: string
  parentId: string | null
}

// Bulk assign item type
interface BulkItem {
  productId: string
  name: string
  basePrice: number
  costPrice: number
  preparationTime: number
  dailyLimit: number | null
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayH}:${String(m).padStart(2, "0")} ${ampm}`
}

function getWorkingHoursSummary(hours: WorkingHour[]): string {
  if (hours.length === 0) return "No working hours set"
  const open = hours.filter((h) => !h.isClosed)
  if (open.length === 0) return "Closed every day"
  const first = open[0]
  const allSame = open.every(
    (h) => h.openTime === first.openTime && h.closeTime === first.closeTime
  )
  const closed = hours.filter((h) => h.isClosed)
  const closedDays = closed.map((h) => DAY_NAMES[h.dayOfWeek].substring(0, 3)).join(", ")
  if (allSame) {
    return `${formatTime12(first.openTime)}-${formatTime12(first.closeTime)}${closedDays ? `, ${closedDays} closed` : ""}`
  }
  return `${open.length} days open${closedDays ? `, ${closedDays} closed` : ""}`
}

export default function VendorProductsPage() {
  const params = useParams()
  const vendorId = params.id as string

  const [tab, setTab] = useState<"assigned" | "assign">("assigned")
  const [vendorName, setVendorName] = useState("")
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Assigned tab
  const [assignedProducts, setAssignedProducts] = useState<VendorProductItem[]>([])

  // Edit drawer
  const [editItem, setEditItem] = useState<VendorProductItem | null>(null)
  const [editCost, setEditCost] = useState("")
  const [editPrepTime, setEditPrepTime] = useState("")
  const [editDailyLimit, setEditDailyLimit] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Assign tab
  const [assignStep, setAssignStep] = useState<1 | 2>(1)
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [assignSearch, setAssignSearch] = useState("")
  const [debouncedAssignSearch, setDebouncedAssignSearch] = useState("")
  const [assignCategory, setAssignCategory] = useState("")
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [availLoading, setAvailLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Confirm delete
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Debounce assign search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAssignSearch(assignSearch), 300)
    return () => clearTimeout(timer)
  }, [assignSearch])

  // Load assigned products
  const fetchAssigned = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/products`)
      const json = await res.json()
      if (json.success) {
        setAssignedProducts(json.data.items)
        setVendorName(json.data.vendor.businessName)
        setWorkingHours(json.data.vendor.workingHours)
      } else {
        setError(json.error || "Failed to load")
      }
    } catch {
      setError("Failed to connect")
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    fetchAssigned()
  }, [fetchAssigned])

  // Load categories
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/categories")
        const json = await res.json()
        if (json.success) setCategories(json.data ?? [])
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  // Load available products
  const fetchAvailable = useCallback(async () => {
    setAvailLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedAssignSearch) params.set("search", debouncedAssignSearch)
      if (assignCategory) params.set("category", assignCategory)
      const res = await fetch(`/api/admin/vendors/${vendorId}/products/available?${params}`)
      const json = await res.json()
      if (json.success) setAvailableProducts(json.data)
    } catch {
      // ignore
    } finally {
      setAvailLoading(false)
    }
  }, [vendorId, debouncedAssignSearch, assignCategory])

  useEffect(() => {
    if (tab === "assign" && assignStep === 1) {
      fetchAvailable()
    }
  }, [tab, assignStep, fetchAvailable])

  // Toggle availability
  const toggleAvailability = async (vp: VendorProductItem) => {
    try {
      const res = await fetch(`/api/admin/vendor-products/${vp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !vp.isAvailable }),
      })
      const json = await res.json()
      if (json.success) {
        setAssignedProducts((prev) =>
          prev.map((p) => (p.id === vp.id ? { ...p, isAvailable: !vp.isAvailable } : p))
        )
      }
    } catch {
      showToast("error", "Failed to update")
    }
  }

  // Save edit
  const saveEdit = async () => {
    if (!editItem) return
    setEditSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (editCost) body.costPrice = Number(editCost)
      if (editPrepTime) body.preparationTime = Number(editPrepTime)
      body.dailyLimit = editDailyLimit ? Number(editDailyLimit) : null
      const res = await fetch(`/api/admin/vendor-products/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setAssignedProducts((prev) =>
          prev.map((p) =>
            p.id === editItem.id
              ? {
                  ...p,
                  costPrice: json.data.costPrice,
                  preparationTime: json.data.preparationTime,
                  dailyLimit: json.data.dailyLimit,
                }
              : p
          )
        )
        setEditItem(null)
        showToast("success", "Product updated")
      } else {
        showToast("error", json.error || "Failed to update")
      }
    } catch {
      showToast("error", "Failed to update")
    } finally {
      setEditSaving(false)
    }
  }

  // Delete vendor product
  const handleDelete = async (vpId: string) => {
    try {
      const res = await fetch(`/api/admin/vendor-products/${vpId}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setAssignedProducts((prev) => prev.filter((p) => p.id !== vpId))
        showToast("success", "Product removed from vendor")
      } else {
        showToast("error", json.error || "Failed to remove")
      }
    } catch {
      showToast("error", "Failed to remove")
    } finally {
      setDeleteConfirm(null)
    }
  }

  // Open edit drawer
  const openEdit = (vp: VendorProductItem) => {
    setEditItem(vp)
    setEditCost(String(vp.costPrice))
    setEditPrepTime(String(vp.preparationTime))
    setEditDailyLimit(vp.dailyLimit ? String(vp.dailyLimit) : "")
  }

  // Toggle product selection for bulk assign
  const toggleProductSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select all in category
  const selectAllInCategory = () => {
    const filtered = assignCategory
      ? availableProducts.filter((p) => p.category.id === assignCategory)
      : availableProducts
    const newSet = new Set(selectedIds)
    filtered.forEach((p) => newSet.add(p.id))
    setSelectedIds(newSet)
  }

  // Move to step 2
  const goToStep2 = () => {
    const items: BulkItem[] = []
    for (const p of availableProducts) {
      if (selectedIds.has(p.id)) {
        items.push({
          productId: p.id,
          name: p.name,
          basePrice: p.basePrice,
          costPrice: Math.round(p.basePrice * 0.68),
          preparationTime: 240,
          dailyLimit: null,
        })
      }
    }
    setBulkItems(items)
    setAssignStep(2)
  }

  // Update bulk item field
  const updateBulkItem = (productId: string, field: string, value: string) => {
    setBulkItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        if (field === "costPrice") return { ...item, costPrice: Number(value) || 0 }
        if (field === "preparationTime") return { ...item, preparationTime: Number(value) || 0 }
        if (field === "dailyLimit") return { ...item, dailyLimit: value ? Number(value) : null }
        return item
      })
    )
  }

  // Submit bulk assign
  const submitBulkAssign = async () => {
    setAssigning(true)
    try {
      const body = {
        products: bulkItems.map((item) => ({
          productId: item.productId,
          costPrice: item.costPrice,
          preparationTime: item.preparationTime,
          dailyLimit: item.dailyLimit,
        })),
      }
      const res = await fetch(`/api/admin/vendors/${vendorId}/products/bulk-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        showToast("success", `${json.data.assigned} products assigned`)
        setSelectedIds(new Set())
        setBulkItems([])
        setAssignStep(1)
        setTab("assigned")
        fetchAssigned()
      } else {
        showToast("error", json.error || "Failed to assign")
      }
    } catch {
      showToast("error", "Failed to assign products")
    } finally {
      setAssigning(false)
    }
  }

  // Calculate margin
  const calcMargin = (basePrice: number, costPrice: number) => {
    if (basePrice <= 0) return 0
    return ((basePrice - costPrice) / basePrice) * 100
  }

  // Check same-day availability for a vendor product
  const isSameDayAvailable = (vp: VendorProductItem): boolean => {
    if (!vp.product.isSameDayEligible) return false
    const now = new Date()
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
    const istMs = utcMs + 5.5 * 3600000
    const ist = new Date(istMs)
    const currentMinutes = ist.getHours() * 60 + ist.getMinutes()
    const dayOfWeek = ist.getDay()
    const todayHours = workingHours.find((h) => h.dayOfWeek === dayOfWeek)
    if (!todayHours || todayHours.isClosed) return false
    const [ch, cm] = todayHours.closeTime.split(":").map(Number)
    const closeMinutes = ch * 60 + (cm || 0)
    return currentMinutes < closeMinutes - vp.preparationTime
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/admin/vendors" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-4 w-4" />
          Back to Vendors
        </Link>
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          toast.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <Link href={`/admin/vendors/${vendorId}`} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-4 w-4" />
          Back to {vendorName}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{vendorName} — Products</h1>
        <p className="text-sm text-slate-500">{getWorkingHoursSummary(workingHours)}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => { setTab("assigned"); setAssignStep(1) }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "assigned" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Assigned Products ({assignedProducts.length})
        </button>
        <button
          onClick={() => setTab("assign")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "assign" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Assign Products
        </button>
      </div>

      {/* Tab 1: Assigned Products */}
      {tab === "assigned" && (
        <>
          {assignedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border">
              <Package className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">No products assigned</p>
              <p className="text-sm text-slate-400 mb-4">Assign products from the catalog</p>
              <Button onClick={() => setTab("assign")}>Assign Products</Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Product</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Category</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Selling ₹</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Cost ₹</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Margin%</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Prep</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Limit</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Same Day</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Available</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignedProducts.map((vp) => {
                    const margin = calcMargin(vp.product.basePrice, vp.costPrice)
                    const sameDayOk = isSameDayAvailable(vp)
                    return (
                      <tr key={vp.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-900 line-clamp-1">{vp.product.name}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{vp.product.category.name}</td>
                        <td className="px-3 py-3 font-medium">{formatPrice(vp.product.basePrice)}</td>
                        <td className="px-3 py-3">{formatPrice(vp.costPrice)}</td>
                        <td className="px-3 py-3">
                          <span className={margin < 28 ? "text-red-600 font-medium" : "text-green-600"}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {vp.preparationTime}m
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{vp.dailyLimit ?? "–"}</td>
                        <td className="px-3 py-3">
                          {vp.product.isSameDayEligible ? (
                            sameDayOk ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                <Zap className="h-3 w-3 mr-0.5" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400">Cutoff passed</Badge>
                            )
                          ) : (
                            <span className="text-slate-400">–</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => toggleAvailability(vp)}
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                              vp.isAvailable
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            {vp.isAvailable ? "On" : "Off"}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEdit(vp)}
                              className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(vp.id)}
                              className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Assign Products */}
      {tab === "assign" && assignStep === 1 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={assignSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignSearch(e.target.value)}
                placeholder="Search unassigned products..."
                className="pl-9"
              />
            </div>
            <select
              value={assignCategory}
              onChange={(e) => setAssignCategory(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              <option value="">All Categories</option>
              {categories
                .filter((c) => !c.parentId)
                .map((parent) => {
                  const children = categories.filter((c) => c.parentId === parent.id)
                  return [
                    <option key={parent.id} value={parent.id}>{parent.name}</option>,
                    ...children.map((child) => (
                      <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                    )),
                  ]
                })}
            </select>
            <Button variant="outline" size="sm" onClick={selectAllInCategory}>
              Select All{assignCategory ? " in Category" : ""}
            </Button>
          </div>

          {availLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500">All products have been assigned to this vendor</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {availableProducts.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedIds.has(p.id) ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleProductSelect(p.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm line-clamp-1">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category.name}</p>
                  </div>
                  <div className="text-sm font-medium text-slate-900">{formatPrice(p.basePrice)}</div>
                  {p.isSameDayEligible && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                      <Zap className="h-3 w-3 mr-0.5" /> Same Day
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="sticky bottom-4 flex items-center justify-between rounded-lg border bg-white p-4 shadow-lg">
              <span className="text-sm font-medium text-slate-700">{selectedIds.size} products selected</span>
              <Button onClick={goToStep2} className="gap-2">
                Next: Set Pricing <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Assign Step 2: Review & Set Prices */}
      {tab === "assign" && assignStep === 2 && (
        <div className="space-y-4">
          {/* Working hours context */}
          {workingHours.length > 0 && (
            <div className="rounded-lg border bg-blue-50 p-3 text-sm text-blue-800">
              <strong>Vendor hours:</strong> {getWorkingHoursSummary(workingHours)}
              {" — "}4hr prep = orders must be placed 4hrs before close for same-day
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-slate-600">Product</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-600">Selling ₹</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-600">Cost ₹</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-600">Margin%</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-600">Prep (min)</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-600">Daily Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bulkItems.map((item) => {
                  const margin = calcMargin(item.basePrice, item.costPrice)
                  return (
                    <tr key={item.productId}>
                      <td className="px-3 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-3 py-3">{formatPrice(item.basePrice)}</td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          value={item.costPrice}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBulkItem(item.productId, "costPrice", e.target.value)}
                          className="w-24 h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className={margin < 28 ? "text-red-600 font-medium" : "text-green-600"}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div>
                          <Input
                            type="number"
                            value={item.preparationTime}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBulkItem(item.productId, "preparationTime", e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                          <p className="text-xs text-slate-400 mt-0.5">Recommended: 240 min (4 hrs)</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          value={item.dailyLimit ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBulkItem(item.productId, "dailyLimit", e.target.value)}
                          placeholder="–"
                          className="w-20 h-8 text-sm"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Info text */}
          <p className="text-xs text-slate-500">
            Recommended max vendor cost: 72% of selling price. Margin below 28% shown in red.
          </p>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setAssignStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={submitBulkAssign} disabled={assigning} className="gap-2">
              {assigning ? "Assigning..." : `Assign ${bulkItems.length} Products`}
            </Button>
          </div>
        </div>
      )}

      {/* Edit drawer overlay */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditItem(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit: {editItem.product.name}</h2>
              <button onClick={() => setEditItem(null)} className="rounded p-1.5 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price (₹)</label>
                <Input
                  type="number"
                  value={editCost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCost(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Recommended max: {formatPrice(editItem.product.basePrice * 0.72)}
                </p>
                {Number(editCost) > editItem.product.basePrice * 0.72 && (
                  <p className="text-xs text-red-600 mt-1">
                    Margin: {calcMargin(editItem.product.basePrice, Number(editCost)).toFixed(1)}% (below 28%)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preparation Time (minutes)</label>
                <Input
                  type="number"
                  value={editPrepTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPrepTime(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Recommended: 240 min (4 hrs)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Daily Limit</label>
                <Input
                  type="number"
                  value={editDailyLimit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDailyLimit(e.target.value)}
                  placeholder="No limit"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditItem(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={editSaving} className="flex-1">
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Remove Product?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will remove the product assignment from this vendor. The master product will not be affected.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Remove</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
