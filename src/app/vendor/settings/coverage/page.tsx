"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  AlertCircle,
  RefreshCw,
  Save,
  Loader2,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react"

interface AvailableArea {
  id: string
  name: string
  pincode: string
  cityName: string
}

interface VendorArea {
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
  rejectionReason: string | null
}

export default function VendorCoveragePage() {
  const [available, setAvailable] = useState<AvailableArea[]>([])
  const [vendorAreas, setVendorAreas] = useState<VendorArea[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Track selections: serviceAreaId -> { selected, surcharge }
  const [selections, setSelections] = useState<
    Record<string, { selected: boolean; surcharge: string }>
  >({})

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [availRes, coverageRes] = await Promise.all([
        fetch("/api/vendor/coverage/available"),
        fetch("/api/vendor/coverage"),
      ])
      const availJson = await availRes.json()
      const coverageJson = await coverageRes.json()

      if (!availJson.success) {
        setError(availJson.error || "Failed to load available areas")
        return
      }
      if (!coverageJson.success) {
        setError(coverageJson.error || "Failed to load coverage")
        return
      }

      const avail: AvailableArea[] = availJson.data
      const coverage: VendorArea[] = coverageJson.data

      setAvailable(avail)
      setVendorAreas(coverage)

      // Build selection state from current coverage
      const sel: Record<string, { selected: boolean; surcharge: string }> = {}
      for (const area of coverage) {
        sel[area.serviceAreaId] = {
          selected: true,
          surcharge: area.deliverySurcharge.toString(),
        }
      }
      setSelections(sel)
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Build a map of vendorArea by serviceAreaId for quick lookup
  const vendorAreaMap = useMemo(() => {
    const m = new Map<string, VendorArea>()
    for (const va of vendorAreas) {
      m.set(va.serviceAreaId, va)
    }
    return m
  }, [vendorAreas])

  // Group available areas by city
  const groupedAreas = useMemo(() => {
    const groups: Record<string, AvailableArea[]> = {}
    for (const area of available) {
      const city = area.cityName || "Other"
      if (!groups[city]) groups[city] = []
      groups[city].push(area)
    }
    return groups
  }, [available])

  // Stats
  const stats = useMemo(() => {
    let active = 0
    let pending = 0
    let rejected = 0
    for (const va of vendorAreas) {
      if (va.status === "ACTIVE") active++
      else if (va.status === "PENDING") pending++
      else if (va.status === "REJECTED") rejected++
    }
    return { active, pending, rejected }
  }, [vendorAreas])

  const toggleArea = (areaId: string) => {
    const va = vendorAreaMap.get(areaId)
    // Can't uncheck active areas
    if (va?.status === "ACTIVE") return

    setSelections((prev) => {
      const current = prev[areaId]
      if (current?.selected) {
        const updated = { ...prev }
        delete updated[areaId]
        return updated
      }
      return {
        ...prev,
        [areaId]: { selected: true, surcharge: "0" },
      }
    })
  }

  const updateSurcharge = (areaId: string, value: string) => {
    setSelections((prev) => ({
      ...prev,
      [areaId]: { ...prev[areaId], selected: true, surcharge: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const selectionsArray = Object.entries(selections)
        .filter(([, v]) => v.selected)
        .map(([serviceAreaId, v]) => ({
          serviceAreaId,
          deliverySurcharge: parseFloat(v.surcharge) || 0,
        }))

      const res = await fetch("/api/vendor/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: selectionsArray }),
      })
      const json = await res.json()

      if (json.success) {
        setVendorAreas(json.data)
        setSuccess(
          "Coverage saved! Newly added areas are pending admin review."
        )
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(json.error || "Failed to save")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  if (error && !available.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Delivery Coverage</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="mt-3 text-sm font-medium text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Delivery Coverage
          </h1>
          <p className="text-sm text-slate-500">
            Select the areas you can deliver to. New areas require admin
            approval.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Active
          </div>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {stats.active}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4 text-amber-600" />
            Pending Review
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <XCircle className="h-4 w-4 text-red-600" />
            Rejected
          </div>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {stats.rejected}
          </p>
        </div>
      </div>

      {/* Main content — two columns on large screens */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Available Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Available Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            {Object.entries(groupedAreas).map(([cityName, areas]) => (
              <div key={cityName}>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  {cityName}
                </h3>
                <div className="space-y-1">
                  {areas.map((area) => {
                    const va = vendorAreaMap.get(area.id)
                    const isSelected = !!selections[area.id]?.selected
                    const isActive = va?.status === "ACTIVE"
                    const isRejected = va?.status === "REJECTED"

                    return (
                      <div
                        key={area.id}
                        className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                          isActive
                            ? "border-green-200 bg-green-50"
                            : isSelected
                              ? "border-teal-200 bg-teal-50"
                              : isRejected
                                ? "border-red-100 bg-red-50/50"
                                : "hover:bg-slate-50"
                        }`}
                      >
                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                          {isActive ? (
                            <Lock className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleArea(area.id)}
                              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {area.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {area.pincode}
                            </p>
                          </div>
                        </label>

                        {/* Status badge */}
                        {va?.status === "ACTIVE" && (
                          <Badge className="bg-green-100 text-green-700 text-xs shrink-0">
                            Active
                          </Badge>
                        )}
                        {va?.status === "PENDING" && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs shrink-0">
                            Pending
                          </Badge>
                        )}
                        {va?.status === "REJECTED" && (
                          <span className="shrink-0" title={va.rejectionReason || "Rejected"}>
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              Rejected
                            </Badge>
                          </span>
                        )}

                        {/* Surcharge input */}
                        {isSelected && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-slate-400">+₹</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={selections[area.id]?.surcharge || "0"}
                              onChange={(e) =>
                                updateSurcharge(area.id, e.target.value)
                              }
                              disabled={isActive}
                              className="w-16 rounded border px-2 py-1 text-xs text-right focus:border-teal-500 focus:outline-none disabled:bg-slate-100"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {available.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No service areas available for your city yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Your Coverage summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            <p className="text-sm text-slate-500">
              {stats.active} active, {stats.pending} pending review,{" "}
              {stats.rejected} rejected
            </p>

            {vendorAreas.length === 0 &&
              Object.keys(selections).length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  Select areas from the left panel to start building your
                  coverage.
                </p>
              )}

            {/* Active areas */}
            {vendorAreas.filter((va) => va.status === "ACTIVE").length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-green-700">
                  Active Areas
                </h3>
                <div className="space-y-1">
                  {vendorAreas
                    .filter((va) => va.status === "ACTIVE")
                    .map((va) => (
                      <div
                        key={va.id}
                        className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-2.5 text-sm"
                      >
                        <div>
                          <span className="font-medium text-slate-800">
                            {va.name}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            {va.pincode}
                          </span>
                        </div>
                        {va.deliverySurcharge > 0 && (
                          <span className="text-xs text-slate-600">
                            +₹{va.deliverySurcharge}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Pending areas */}
            {vendorAreas.filter((va) => va.status === "PENDING").length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-amber-700">
                  Pending Review
                </h3>
                <div className="space-y-1">
                  {vendorAreas
                    .filter((va) => va.status === "PENDING")
                    .map((va) => (
                      <div
                        key={va.id}
                        className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm"
                      >
                        <div>
                          <span className="font-medium text-slate-800">
                            {va.name}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            {va.pincode}
                          </span>
                        </div>
                        {va.deliverySurcharge > 0 && (
                          <span className="text-xs text-slate-600">
                            +₹{va.deliverySurcharge}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Rejected areas */}
            {vendorAreas.filter((va) => va.status === "REJECTED").length >
              0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-red-700">
                  Rejected
                </h3>
                <div className="space-y-1">
                  {vendorAreas
                    .filter((va) => va.status === "REJECTED")
                    .map((va) => (
                      <div
                        key={va.id}
                        className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-800">
                              {va.name}
                            </span>
                            <span className="ml-2 text-xs text-slate-500">
                              {va.pincode}
                            </span>
                          </div>
                        </div>
                        {va.rejectionReason && (
                          <p className="mt-1 text-xs text-red-600">
                            Reason: {va.rejectionReason}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Coverage"}
        </button>
      </div>
    </div>
  )
}
