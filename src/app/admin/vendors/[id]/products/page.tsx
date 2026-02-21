"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  Search,
  Trash2,
  Package,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Check,
  Minus,
  ArrowRight,
  ArrowLeft,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────

interface WorkingHour {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

interface VendorInfo {
  id: string
  businessName: string
  status: string
  city: { name: string; slug: string }
}

interface VendorProductItem {
  id: string
  costPrice: number
  sellingPrice: number | null
  preparationTime: number
  dailyLimit: number | null
  isAvailable: boolean
  product: {
    id: string
    name: string
    slug: string
    basePrice: number
    isSameDayEligible: boolean
    category: { name: string; slug: string }
  }
}

interface AvailableProduct {
  id: string
  name: string
  basePrice: number
  isSameDayEligible: boolean
  category: { id: string; name: string; slug: string }
}

interface BulkItem {
  product: AvailableProduct
  costPrice: number
  preparationTime: number
  dailyLimit: string // empty string = unlimited
}

// ── Helpers ────────────────────────────────────────────────────────────

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${m.toString().padStart(2, "0")}${ampm}`
}

function formatWorkingHoursSummary(hours: WorkingHour[]): string {
  if (!hours.length) return "No working hours set"

  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  const groups: { days: number[]; label: string }[] = []

  for (const wh of sorted) {
    const label = wh.isClosed ? "Closed" : `${formatTime12(wh.openTime)}–${formatTime12(wh.closeTime)}`
    const last = groups[groups.length - 1]
    if (last && last.label === label && last.days[last.days.length - 1] === wh.dayOfWeek - 1) {
      last.days.push(wh.dayOfWeek)
    } else {
      groups.push({ days: [wh.dayOfWeek], label })
    }
  }

  return groups
    .map((g) => {
      const dayStr =
        g.days.length === 1
          ? DAY_SHORT[g.days[0]]
          : `${DAY_SHORT[g.days[0]]}–${DAY_SHORT[g.days[g.days.length - 1]]}`
      return `${dayStr} ${g.label}`
    })
    .join(" \u2022 ")
}

function getTodayWorkingInfo(hours: WorkingHour[]): { isClosed: boolean; closeTime?: string; cutoffTime?: string } {
  const today = new Date().getDay()
  const wh = hours.find((h) => h.dayOfWeek === today)
  if (!wh || wh.isClosed) return { isClosed: true }

  const [closeH, closeM] = wh.closeTime.split(":").map(Number)
  const totalMins = closeH * 60 + closeM
  const cutoffMins = totalMins - 240
  const cutH = Math.floor(cutoffMins / 60)
  const cutM = cutoffMins % 60

  return {
    isClosed: false,
    closeTime: formatTime12(wh.closeTime),
    cutoffTime: cutoffMins > 0
      ? formatTime12(`${cutH.toString().padStart(2, "0")}:${cutM.toString().padStart(2, "0")}`)
      : undefined,
  }
}

const statusColor = (s: string) => {
  switch (s) {
    case "APPROVED": return "bg-emerald-100 text-emerald-700"
    case "PENDING": return "bg-amber-100 text-amber-700"
    case "SUSPENDED": return "bg-orange-100 text-orange-700"
    case "TERMINATED": return "bg-red-100 text-red-700"
    default: return "bg-slate-100 text-slate-700"
  }
}

// ── Inline editable cell ───────────────────────────────────────────────

function InlineEditCell({
  value,
  suffix,
  placeholder,
  isNullable,
  onSave,
}: {
  value: number | null
  suffix?: string
  placeholder?: string
  isNullable?: boolean
  onSave: (val: number | null) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setDraft(value != null ? String(value) : "")
    setEditing(true)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const save = async () => {
    setSaving(true)
    try {
      const num = draft.trim() === "" ? null : Number(draft)
      if (num !== null && isNaN(num)) {
        setEditing(false)
        return
      }
      if (!isNullable && num === null) {
        setEditing(false)
        return
      }
      await onSave(num)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") setEditing(false)
          }}
          className="h-8 w-24 text-sm"
          placeholder={placeholder}
          disabled={saving}
        />
        {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="rounded px-2 py-1 text-left text-sm hover:bg-slate-100 transition-colors"
    >
      {value != null ? (
        <>
          {suffix === "₹" && "₹"}
          {value}
          {suffix && suffix !== "₹" && ` ${suffix}`}
        </>
      ) : (
        <span className="text-slate-400">{placeholder || "—"}</span>
      )}
    </button>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function VendorProductsPage() {
  const params = useParams()
  const vendorId = params.id as string

  // Core data
  const [vendor, setVendor] = useState<VendorInfo | null>(null)
  const [vendorProducts, setVendorProducts] = useState<VendorProductItem[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [loading, setLoading] = useState(true)

  // Available products (for assign tab)
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([])
  const [availableLoading, setAvailableLoading] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<"assigned" | "assign">("assigned")

  // Search
  const [assignedSearch, setAssignedSearch] = useState("")
  const [availableSearch, setAvailableSearch] = useState("")

  // Assign flow
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [assignStep, setAssignStep] = useState<"select" | "review">("select")
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState("All")

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Confirm dialog
  const [confirmRemove, setConfirmRemove] = useState<VendorProductItem | null>(null)

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Fetch assigned products ──────────────────────────────────────

  const fetchAssigned = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/products`)
      const json = await res.json()
      if (json.success) {
        setVendor(json.data.vendor)
        setVendorProducts(json.data.vendorProducts)
        setWorkingHours(json.data.workingHours)
      }
    } catch {
      showToast("error", "Failed to load vendor products")
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    fetchAssigned()
  }, [fetchAssigned])

  // ── Fetch available products ─────────────────────────────────────

  const fetchAvailable = useCallback(async () => {
    setAvailableLoading(true)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/products/available`)
      const json = await res.json()
      if (json.success) {
        setAvailableProducts(json.data.items)
      }
    } catch {
      showToast("error", "Failed to load available products")
    } finally {
      setAvailableLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    if (activeTab === "assign") {
      fetchAvailable()
    }
  }, [activeTab, fetchAvailable])

  // ── Inline edit handler ──────────────────────────────────────────

  const patchVendorProduct = async (vpId: string, field: string, value: number | null | boolean) => {
    try {
      const res = await fetch(`/api/admin/vendor-products/${vpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      const json = await res.json()
      if (json.success) {
        setVendorProducts((prev) =>
          prev.map((vp) => (vp.id === vpId ? { ...vp, [field]: value } : vp))
        )
        showToast("success", "Updated successfully")
      } else {
        showToast("error", json.error || "Update failed")
      }
    } catch {
      showToast("error", "Failed to save")
    }
  }

  // ── Remove handler ───────────────────────────────────────────────

  const removeVendorProduct = async (vp: VendorProductItem) => {
    try {
      const res = await fetch(`/api/admin/vendor-products/${vp.id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setVendorProducts((prev) => prev.filter((p) => p.id !== vp.id))
        showToast("success", `Removed ${vp.product.name}`)
      } else {
        showToast("error", json.error || "Failed to remove")
      }
    } catch {
      showToast("error", "Failed to remove")
    } finally {
      setConfirmRemove(null)
    }
  }

  // ── Selection helpers ────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredAvailable = availableProducts.filter((p) => {
    const matchesCategory = categoryFilter === "All" || p.category.name === categoryFilter
    const matchesSearch = !availableSearch || p.name.toLowerCase().includes(availableSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const selectAllInCategory = (checked: boolean) => {
    const ids = filteredAvailable.map((p) => p.id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        ids.forEach((id) => next.add(id))
      } else {
        ids.forEach((id) => next.delete(id))
      }
      return next
    })
  }

  const allInCategorySelected = filteredAvailable.length > 0 && filteredAvailable.every((p) => selectedIds.has(p.id))

  // ── Move to review step ──────────────────────────────────────────

  const goToReview = () => {
    const selected = availableProducts.filter((p) => selectedIds.has(p.id))
    setBulkItems(
      selected.map((p) => ({
        product: p,
        costPrice: Math.round(p.basePrice * 0.68),
        preparationTime: 240,
        dailyLimit: "",
      }))
    )
    setAssignStep("review")
  }

  // ── Submit bulk assign ───────────────────────────────────────────

  const submitBulkAssign = async () => {
    setSubmitting(true)
    try {
      const items = bulkItems.map((bi) => ({
        productId: bi.product.id,
        costPrice: bi.costPrice,
        preparationTime: bi.preparationTime,
        dailyLimit: bi.dailyLimit ? Number(bi.dailyLimit) : null,
      }))

      const res = await fetch(`/api/admin/vendors/${vendorId}/products/bulk-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const json = await res.json()
      if (json.success) {
        showToast("success", `Successfully assigned ${json.data.assigned} products to ${vendor?.businessName}`)
        setSelectedIds(new Set())
        setAssignStep("select")
        setActiveTab("assigned")
        fetchAssigned()
      } else {
        showToast("error", json.error || "Failed to assign")
      }
    } catch {
      showToast("error", "Failed to assign products")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Category tabs for available products ─────────────────────────

  const categories = ["All", ...Array.from(new Set(availableProducts.map((p) => p.category.name)))]

  // ── Filtered assigned products ───────────────────────────────────

  const filteredAssigned = vendorProducts.filter(
    (vp) =>
      !assignedSearch ||
      vp.product.name.toLowerCase().includes(assignedSearch.toLowerCase()) ||
      vp.product.category.name.toLowerCase().includes(assignedSearch.toLowerCase())
  )

  // ── Compute today's working info ─────────────────────────────────

  const todayInfo = getTodayWorkingInfo(workingHours)

  // ── Loading state ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Vendors
        </Link>
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-500">Vendor not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
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

      {/* Confirm remove dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Remove Product</h3>
            <p className="mt-2 text-sm text-slate-600">
              Remove <strong>{confirmRemove.product.name}</strong> from{" "}
              <strong>{vendor.businessName}</strong>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmRemove(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => removeVendorProduct(confirmRemove)}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <Link
          href={`/admin/vendors/${vendorId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          {vendor.businessName}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Vendor Products</h1>
      </div>

      {/* Vendor info bar */}
      <div className="rounded-lg bg-slate-50 border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-900">{vendor.businessName}</span>
          <Badge variant="outline" className="border-slate-300">
            {vendor.city.name}
          </Badge>
          <Badge className={statusColor(vendor.status)}>{vendor.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {formatWorkingHoursSummary(workingHours)}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          <button
            type="button"
            onClick={() => { setActiveTab("assigned"); setAssignStep("select") }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "assigned"
                ? "border-[#E91E63] text-[#E91E63]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Assigned Products ({vendorProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("assign")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "assign"
                ? "border-[#E91E63] text-[#E91E63]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Assign New Products
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: Assigned Products
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "assigned" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={assignedSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignedSearch(e.target.value)}
              placeholder="Search assigned products..."
              className="pl-9"
            />
          </div>

          {filteredAssigned.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-white py-12">
              <Package className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">No products assigned yet.</p>
              <p className="mt-1 text-sm text-slate-400">
                Use the &quot;Assign New Products&quot; tab to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Product</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Platform Price</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Cost Price</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Margin %</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Prep Time</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Daily Limit</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Same Day</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Available</th>
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAssigned.map((vp) => {
                    const margin = ((vp.product.basePrice - vp.costPrice) / vp.product.basePrice * 100)
                    return (
                      <tr key={vp.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <div>
                            <p className="font-medium text-slate-900 line-clamp-1">{vp.product.name}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {vp.product.category.name}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                          {formatPrice(vp.product.basePrice)}
                        </td>
                        <td className="px-3 py-3">
                          <InlineEditCell
                            value={vp.costPrice}
                            suffix="₹"
                            onSave={async (val) => {
                              if (val !== null) await patchVendorProduct(vp.id, "costPrice", val)
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-sm font-medium ${
                              margin >= 28 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <InlineEditCell
                            value={vp.preparationTime}
                            suffix="mins"
                            onSave={async (val) => {
                              if (val !== null) await patchVendorProduct(vp.id, "preparationTime", val)
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <InlineEditCell
                            value={vp.dailyLimit}
                            placeholder="Unlimited"
                            isNullable
                            onSave={async (val) => {
                              await patchVendorProduct(vp.id, "dailyLimit", val)
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          {vp.product.isSameDayEligible ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Minus className="h-4 w-4 text-slate-300" />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={vp.isAvailable}
                            onClick={() => patchVendorProduct(vp.id, "isAvailable", !vp.isAvailable)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                              vp.isAvailable ? "bg-[#E91E63]" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                                vp.isAvailable ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setConfirmRemove(vp)}
                            className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: Assign New Products
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "assign" && (
        <div className="space-y-4">
          {/* Context bar */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {todayInfo.isClosed ? (
              <span>Vendor is closed today</span>
            ) : (
              <span>
                Vendor closes at {todayInfo.closeTime} today
                {todayInfo.cutoffTime && (
                  <> &bull; 4hr prep = same-day cutoff {todayInfo.cutoffTime}</>
                )}
              </span>
            )}
          </div>

          {/* ── Step 1: Select ────────────────────────────────────── */}
          {assignStep === "select" && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={availableSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvailableSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9"
                />
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      categoryFilter === cat
                        ? "bg-[#E91E63] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Select all checkbox */}
              {filteredAvailable.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={allInCategorySelected}
                    onChange={(e) => selectAllInCategory(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#E91E63] focus:ring-[#E91E63]"
                  />
                  Select all in {categoryFilter === "All" ? "view" : categoryFilter} ({filteredAvailable.length})
                </label>
              )}

              {/* Products list */}
              {availableLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border bg-white py-12">
                  <Package className="mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-lg font-medium text-slate-500">No products available to assign</p>
                  <p className="mt-1 text-sm text-slate-400">All products are already assigned to this vendor.</p>
                </div>
              ) : (
                <div className="rounded-lg border bg-white divide-y">
                  {filteredAvailable.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#E91E63] focus:ring-[#E91E63]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{p.name}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {p.category.name}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700 shrink-0 whitespace-nowrap">
                        {formatPrice(p.basePrice)}
                      </span>
                      {p.isSameDayEligible && (
                        <Badge className="bg-pink-100 text-pink-700 text-xs shrink-0">Same Day</Badge>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Sticky bottom bar */}
              <div className="sticky bottom-0 -mx-6 border-t bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${selectedIds.size > 0 ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                    {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""} selected
                  </span>
                  <Button
                    onClick={goToReview}
                    disabled={selectedIds.size === 0}
                    className="gap-2 bg-[#E91E63] hover:bg-[#C2185B] text-white"
                  >
                    Next: Set Pricing
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Review & Set Pricing ─────────────────────── */}
          {assignStep === "review" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setAssignStep("select")}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to selection
              </button>

              <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium text-slate-600">Product</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600">Customer Pays</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600">Cost Price ₹</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600">Margin %</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600">Prep Time (mins)</th>
                      <th className="px-3 py-3 text-left font-medium text-slate-600">Daily Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bulkItems.map((bi, idx) => {
                      const margin = ((bi.product.basePrice - bi.costPrice) / bi.product.basePrice * 100)
                      const maxRecommended = Math.round(bi.product.basePrice * 0.72)
                      const exceedsMax = bi.costPrice > maxRecommended

                      return (
                        <tr key={bi.product.id}>
                          <td className="px-3 py-3">
                            <div>
                              <p className="font-medium text-slate-900">{bi.product.name}</p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {bi.product.category.name}
                              </Badge>
                            </div>
                            {exceedsMax && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                Cost exceeds recommended max of {formatPrice(maxRecommended)}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                            {formatPrice(bi.product.basePrice)}
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              value={bi.costPrice}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const val = Number(e.target.value)
                                setBulkItems((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, costPrice: val } : item))
                                )
                              }}
                              className="h-8 w-24 text-sm"
                              min={0}
                              required
                            />
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`text-sm font-medium ${
                                margin >= 28 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div>
                              <Input
                                type="number"
                                value={bi.preparationTime}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const val = Number(e.target.value)
                                  setBulkItems((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, preparationTime: val } : item))
                                  )
                                }}
                                className="h-8 w-24 text-sm"
                                min={0}
                              />
                              <p className="mt-1 text-xs text-slate-400">Recommended: 240 min (4 hrs)</p>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              value={bi.dailyLimit}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setBulkItems((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, dailyLimit: e.target.value } : item))
                                )
                              }}
                              className="h-8 w-24 text-sm"
                              placeholder="Unlimited"
                              min={1}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 -mx-6 border-t bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setAssignStep("select")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={submitBulkAssign}
                    disabled={submitting}
                    className="gap-2 bg-[#E91E63] hover:bg-[#C2185B] text-white"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Assign {bulkItems.length} Product{bulkItems.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
