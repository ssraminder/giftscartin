"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Plus,
  Search,
  X,
} from "lucide-react"

interface AvailableArea {
  id: string
  name: string
  pincode: string
  cityName: string
}

interface CoverageArea {
  id: string
  serviceAreaId: string
  name: string
  pincode: string
  cityName: string
  deliverySurcharge: number
  status: "PENDING" | "ACTIVE" | "REJECTED"
  isActive: boolean
  requestedAt: string
  activatedAt: string | null
  activatedBy: string | null
  rejectionReason: string | null
}

export default function AdminVendorCoveragePage() {
  const params = useParams()
  const vendorId = params.id as string

  const [vendorName, setVendorName] = useState("")
  const [areas, setAreas] = useState<CoverageArea[]>([])
  const [availableAreas, setAvailableAreas] = useState<AvailableArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [success, setSuccess] = useState<string | null>(null)

  // Add Areas panel state
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addSearch, setAddSearch] = useState("")
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set())
  const [addSurcharge, setAddSurcharge] = useState("0")
  const [addLoading, setAddLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/coverage?include=available`)
      const json = await res.json()
      if (json.success) {
        setVendorName(json.data.vendor.businessName)
        setAreas(json.data.areas)
        if (json.data.availableAreas) {
          setAvailableAreas(json.data.availableAreas)
        }
      } else {
        setError(json.error || "Failed to load coverage")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [vendorId])

  const stats = useMemo(() => {
    let active = 0
    let pending = 0
    let rejected = 0
    for (const a of areas) {
      if (a.status === "ACTIVE") active++
      else if (a.status === "PENDING") pending++
      else if (a.status === "REJECTED") rejected++
    }
    return { active, pending, rejected, total: areas.length }
  }, [areas])

  const handleAction = async (
    vsaId: string,
    action: "activate" | "reject" | "deactivate" | "reconsider",
    reason?: string
  ) => {
    setActionLoading(vsaId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/coverage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorServiceAreaId: vsaId,
          action,
          rejectionReason: reason,
        }),
      })
      const json = await res.json()
      if (json.success) {
        // Update the area in place
        setAreas((prev) =>
          prev.map((a) => (a.id === vsaId ? { ...a, ...json.data } : a))
        )
        setRejectingId(null)
        setRejectReason("")
        setSuccess(`Area ${action}d successfully`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(json.error || `Failed to ${action}`)
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkActivate = async () => {
    if (
      !confirm(
        `Activate ${stats.pending} pending area${stats.pending !== 1 ? "s" : ""} for ${vendorName}?`
      )
    )
      return

    setBulkLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/vendors/${vendorId}/coverage/bulk-activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      )
      const json = await res.json()
      if (json.success) {
        setSuccess(`Activated ${json.data.activated} areas`)
        setTimeout(() => setSuccess(null), 3000)
        // Refetch to get updated data
        fetchData()
      } else {
        setError(json.error || "Failed to bulk-activate")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setBulkLoading(false)
    }
  }

  // Areas not yet assigned to vendor (for the Add panel)
  const assignedAreaIds = useMemo(
    () => new Set(areas.map((a) => a.serviceAreaId)),
    [areas]
  )

  const unassignedAreas = useMemo(() => {
    const list = availableAreas.filter((a) => !assignedAreaIds.has(a.id))
    if (!addSearch.trim()) return list
    const q = addSearch.toLowerCase()
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.pincode.includes(q) ||
        a.cityName.toLowerCase().includes(q)
    )
  }, [availableAreas, assignedAreaIds, addSearch])

  const toggleSelectToAdd = (id: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddAreas = async () => {
    if (selectedToAdd.size === 0) return
    setAddLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/coverage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceAreaIds: Array.from(selectedToAdd),
          deliverySurcharge: parseFloat(addSurcharge) || 0,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess(`Added ${json.data.added} area${json.data.added !== 1 ? "s" : ""} as active`)
        setTimeout(() => setSuccess(null), 3000)
        setSelectedToAdd(new Set())
        setShowAddPanel(false)
        setAddSearch("")
        fetchData()
      } else {
        setError(json.error || "Failed to add areas")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setAddLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-100" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/admin/vendors/${vendorId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Vendor
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Service Area Coverage
            </h1>
            <p className="text-sm text-slate-500">{vendorName}</p>
          </div>
          <button
            onClick={fetchData}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Active
          </div>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {stats.active}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-1.5 text-sm text-amber-600">
            <Clock className="h-4 w-4" />
            Pending
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-1.5 text-sm text-red-600">
            <XCircle className="h-4 w-4" />
            Rejected
          </div>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {stats.rejected}
          </p>
        </div>
      </div>

      {/* Bulk activate */}
      {stats.pending > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            {stats.pending} area{stats.pending !== 1 ? "s" : ""} pending
            review
          </p>
          <button
            onClick={handleBulkActivate}
            disabled={bulkLoading}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {bulkLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {bulkLoading ? "Activating..." : "Activate All Pending"}
          </button>
        </div>
      )}

      {/* Add Areas panel */}
      {!showAddPanel ? (
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-[#E91E63] hover:text-[#E91E63] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Service Areas
        </button>
      ) : (
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Add Service Areas (auto-active)
            </h3>
            <button
              onClick={() => {
                setShowAddPanel(false)
                setSelectedToAdd(new Set())
                setAddSearch("")
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Search by name or pincode..."
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:border-[#E91E63] focus:outline-none focus:ring-1 focus:ring-[#E91E63]"
            />
          </div>

          {/* Surcharge */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Default surcharge:</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                value={addSurcharge}
                onChange={(e) => setAddSurcharge(e.target.value)}
                className="w-20 rounded border px-2 py-1 text-sm text-right focus:border-[#E91E63] focus:outline-none"
              />
            </div>
          </div>

          {/* Area list */}
          <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
            {unassignedAreas.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                {addSearch
                  ? "No matching unassigned areas"
                  : "All available areas are already assigned"}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between px-2 pb-1 border-b">
                  <button
                    onClick={() => {
                      if (selectedToAdd.size === unassignedAreas.length) {
                        setSelectedToAdd(new Set())
                      } else {
                        setSelectedToAdd(new Set(unassignedAreas.map((a) => a.id)))
                      }
                    }}
                    className="text-xs text-[#E91E63] hover:underline"
                  >
                    {selectedToAdd.size === unassignedAreas.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                  <span className="text-xs text-slate-400">
                    {selectedToAdd.size} selected
                  </span>
                </div>
                {unassignedAreas.map((area) => (
                  <label
                    key={area.id}
                    className="flex items-center gap-3 rounded px-2 py-1.5 cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedToAdd.has(area.id)}
                      onChange={() => toggleSelectToAdd(area.id)}
                      className="h-4 w-4 rounded border-slate-300 text-[#E91E63] focus:ring-[#E91E63]"
                    />
                    <span className="flex-1 text-sm text-slate-700">
                      {area.name}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {area.pincode}
                    </span>
                  </label>
                ))}
              </>
            )}
          </div>

          {/* Add button */}
          <div className="flex justify-end">
            <button
              onClick={handleAddAreas}
              disabled={addLoading || selectedToAdd.size === 0}
              className="flex items-center gap-2 rounded-lg bg-[#E91E63] px-4 py-2 text-sm font-medium text-white hover:bg-[#C2185B] disabled:opacity-50"
            >
              {addLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {addLoading
                ? "Adding..."
                : `Add ${selectedToAdd.size} Area${selectedToAdd.size !== 1 ? "s" : ""} as Active`}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">
                  Area Name
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Pincode
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">City</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">
                  Surcharge
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Requested
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {areas.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    No service areas configured for this vendor.
                  </td>
                </tr>
              )}
              {areas.map((area) => (
                <tr key={area.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {area.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {area.pincode}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{area.cityName}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {area.deliverySurcharge > 0
                      ? `₹${area.deliverySurcharge}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {area.status === "ACTIVE" && (
                      <Badge className="bg-green-100 text-green-700">
                        Active
                      </Badge>
                    )}
                    {area.status === "PENDING" && (
                      <Badge className="bg-amber-100 text-amber-700">
                        Pending
                      </Badge>
                    )}
                    {area.status === "REJECTED" && (
                      <Badge className="bg-red-100 text-red-700">
                        Rejected
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {area.requestedAt
                      ? new Date(area.requestedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {area.status === "PENDING" && (
                        <>
                          <button
                            onClick={() =>
                              handleAction(area.id, "activate")
                            }
                            disabled={actionLoading === area.id}
                            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === area.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Activate"
                            )}
                          </button>
                          {rejectingId === area.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) =>
                                  setRejectReason(e.target.value)
                                }
                                placeholder="Reason..."
                                className="w-32 rounded border px-2 py-1 text-xs focus:border-red-500 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  handleAction(
                                    area.id,
                                    "reject",
                                    rejectReason
                                  )
                                }
                                disabled={actionLoading === area.id}
                                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null)
                                  setRejectReason("")
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRejectingId(area.id)}
                              className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                            >
                              Reject
                            </button>
                          )}
                        </>
                      )}
                      {area.status === "ACTIVE" && (
                        <button
                          onClick={() =>
                            handleAction(area.id, "deactivate")
                          }
                          disabled={actionLoading === area.id}
                          className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-300 disabled:opacity-50"
                        >
                          {actionLoading === area.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Deactivate"
                          )}
                        </button>
                      )}
                      {area.status === "REJECTED" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600">
                            {area.rejectionReason || "No reason"}
                          </span>
                          <button
                            onClick={() =>
                              handleAction(area.id, "reconsider")
                            }
                            disabled={actionLoading === area.id}
                            className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-300 disabled:opacity-50"
                          >
                            Reconsider
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
