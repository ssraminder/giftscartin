"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Clock,
  MapPin,
  CalendarOff,
  TrendingUp,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────

interface SlotCityConfig {
  cityId: string
  city: { name: string }
  isAvailable: boolean
  chargeOverride: number | null
}

interface DeliverySlot {
  id: string
  name: string
  slug: string
  startTime: string
  endTime: string
  baseCharge: number
  isActive: boolean
  cityConfigs: SlotCityConfig[]
}

interface CitySlotConfig {
  slotId: string
  slot: {
    id: string
    name: string
    slug: string
    baseCharge: number
    startTime: string
    endTime: string
  }
  isAvailable: boolean
  chargeOverride: number | null
}

interface CityConfig {
  id: string
  name: string
  slug: string
  baseDeliveryCharge: number
  freeDeliveryAbove: number
  deliveryConfig: CitySlotConfig[]
}

interface Holiday {
  id: string
  date: string
  cityId: string | null
  city: { name: string } | null
  reason: string
  mode: string
  slotOverrides: { blockedSlots?: string[] } | null
}

interface Surcharge {
  id: string
  name: string
  startDate: string
  endDate: string
  amount: number
  appliesTo: string
  isActive: boolean
}

type Tab = "slots" | "city-config" | "holidays" | "surcharges"

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function isUpcoming(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) >= today
}

function isPast(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) < today
}

function appliesToLabel(val: string) {
  switch (val) {
    case "flowers":
      return "Flower Orders"
    case "cakes":
      return "Cake Orders"
    default:
      return "All Orders"
  }
}

// ─── Main Page Component ─────────────────────────────────────

export default function AdminDeliveryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("slots")

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "slots", label: "Slots", icon: Clock },
    { key: "city-config", label: "City Config", icon: MapPin },
    { key: "holidays", label: "Holidays", icon: CalendarOff },
    { key: "surcharges", label: "Surcharges", icon: TrendingUp },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Delivery Management</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[#E91E63] text-[#E91E63]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "slots" && <SlotsTab />}
      {activeTab === "city-config" && <CityConfigTab />}
      {activeTab === "holidays" && <HolidaysTab />}
      {activeTab === "surcharges" && <SurchargesTab />}
    </div>
  )
}

// ─── TAB 1: Slots ────────────────────────────────────────────

function SlotsTab() {
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null)

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/delivery/slots")
      const data = await res.json()
      if (data.success) setSlots(data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const toggleActive = async (slot: DeliverySlot) => {
    await fetch(`/api/admin/delivery/slots/${slot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !slot.isActive }),
    })
    fetchSlots()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          These are platform-wide slot definitions. Use the <strong>City Config</strong> tab to
          enable or disable slots per city.
        </p>
      </div>

      {/* Slots table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Time Window</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Base Price</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Active</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td className="px-4 py-3 font-medium">{slot.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {slot.startTime} &ndash; {slot.endTime}
                </td>
                <td className="px-4 py-3">
                  {Number(slot.baseCharge) === 0 ? (
                    <span className="text-green-600 font-medium">Free</span>
                  ) : (
                    <span>&#8377;{Number(slot.baseCharge)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(slot)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      slot.isActive ? "bg-pink-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        slot.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setEditingSlot(slot)}
                    className="text-pink-500 hover:text-pink-600 p-1"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit slot modal */}
      {editingSlot && (
        <EditSlotModal
          slot={editingSlot}
          onClose={() => setEditingSlot(null)}
          onSaved={() => {
            setEditingSlot(null)
            fetchSlots()
          }}
        />
      )}
    </>
  )
}

function EditSlotModal({
  slot,
  onClose,
  onSaved,
}: {
  slot: DeliverySlot
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: slot.name,
    startTime: slot.startTime,
    endTime: slot.endTime,
    baseCharge: String(Number(slot.baseCharge)),
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/delivery/slots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          startTime: form.startTime,
          endTime: form.endTime,
          baseCharge: Number(form.baseCharge),
        }),
      })
      const data = await res.json()
      if (data.success) onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Slot</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Time</label>
              <input
                className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                placeholder="e.g. 9:00 AM"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Time</label>
              <input
                className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                placeholder="e.g. 9:00 PM"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Base Charge &#8377;</label>
            <input
              type="number"
              min="0"
              className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={form.baseCharge}
              onChange={(e) => setForm({ ...form, baseCharge: e.target.value })}
              placeholder="0 = free"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2: City Config ──────────────────────────────────────

function CityConfigTab() {
  const [cities, setCities] = useState<CityConfig[]>([])
  const [allSlots, setAllSlots] = useState<DeliverySlot[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [citiesRes, slotsRes] = await Promise.all([
        fetch("/api/admin/delivery/city-config"),
        fetch("/api/admin/delivery/slots"),
      ])
      const citiesData = await citiesRes.json()
      const slotsData = await slotsRes.json()
      if (citiesData.success) setCities(citiesData.data)
      if (slotsData.success) setAllSlots(slotsData.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {cities.map((city) => (
        <CityConfigCard
          key={city.id}
          city={city}
          allSlots={allSlots.filter((s) => s.isActive)}
          onSaved={fetchData}
        />
      ))}
    </div>
  )
}

function CityConfigCard({
  city,
  allSlots,
  onSaved,
}: {
  city: CityConfig
  allSlots: DeliverySlot[]
  onSaved: () => void
}) {
  const [baseCharge, setBaseCharge] = useState(String(Number(city.baseDeliveryCharge)))
  const [freeAbove, setFreeAbove] = useState(String(Number(city.freeDeliveryAbove)))
  const [slotConfigs, setSlotConfigs] = useState<
    Record<string, { isAvailable: boolean; chargeOverride: string }>
  >(() => {
    const map: Record<string, { isAvailable: boolean; chargeOverride: string }> = {}
    for (const s of allSlots) {
      const existing = city.deliveryConfig.find((dc) => dc.slotId === s.id)
      map[s.id] = {
        isAvailable: existing ? existing.isAvailable : false,
        chargeOverride: existing?.chargeOverride != null ? String(Number(existing.chargeOverride)) : "",
      }
    }
    return map
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")

  const handleSave = async () => {
    setSaving(true)
    try {
      const slots = Object.entries(slotConfigs).map(([slotId, cfg]) => ({
        slotId,
        isAvailable: cfg.isAvailable,
        chargeOverride: cfg.chargeOverride !== "" ? Number(cfg.chargeOverride) : null,
      }))

      const res = await fetch(`/api/admin/delivery/city-config/${city.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseDeliveryCharge: Number(baseCharge),
          freeDeliveryAbove: Number(freeAbove),
          slots,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setToast("City config saved")
        setTimeout(() => setToast(""), 2000)
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  const updateSlot = (slotId: string, field: string, value: unknown) => {
    setSlotConfigs((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], [field]: value },
    }))
  }

  const isStandardSlot = (slot: DeliverySlot) =>
    slot.slug === "standard" || slot.slug === "standard-delivery"

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* City header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-bold mb-3">{city.name}</h3>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Base Delivery Charge &#8377;</label>
            <input
              type="number"
              min="0"
              className="w-32 mt-1 block px-3 py-1.5 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={baseCharge}
              onChange={(e) => setBaseCharge(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Free Delivery Above &#8377;</label>
            <input
              type="number"
              min="0"
              className="w-32 mt-1 block px-3 py-1.5 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={freeAbove}
              onChange={(e) => setFreeAbove(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Standard slot is free above the threshold. All other slots always charge.
        </p>
      </div>

      {/* Slot configuration table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Slot</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Enabled</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Price Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allSlots.map((slot) => {
              const cfg = slotConfigs[slot.id]
              if (!cfg) return null
              const std = isStandardSlot(slot)
              return (
                <tr key={slot.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{slot.name}</div>
                    <div className="text-xs text-gray-400">
                      {slot.startTime} &ndash; {slot.endTime}
                    </div>
                    {std ? (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Free above &#8377;{freeAbove} threshold
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Always charges regardless of order value
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateSlot(slot.id, "isAvailable", !cfg.isAvailable)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        cfg.isAvailable ? "bg-pink-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          cfg.isAvailable ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      className="w-36 px-3 py-1.5 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      value={cfg.chargeOverride}
                      onChange={(e) => updateSlot(slot.id, "chargeOverride", e.target.value)}
                      placeholder={`Use slot default: ₹${Number(slot.baseCharge)}`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Save button + toast */}
      <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
        {toast && (
          <span className="text-sm text-green-600 font-medium">{toast}</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  )
}

// ─── TAB 3: Holidays ─────────────────────────────────────────

function HolidaysTab() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [allSlots, setAllSlots] = useState<DeliverySlot[]>([])
  const [allCities, setAllCities] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [holRes, slotsRes, citiesRes] = await Promise.all([
        fetch("/api/admin/delivery/holidays"),
        fetch("/api/admin/delivery/slots"),
        fetch("/api/admin/delivery/city-config"),
      ])
      const holData = await holRes.json()
      const slotsData = await slotsRes.json()
      const citiesData = await citiesRes.json()
      if (holData.success) setHolidays(holData.data)
      if (slotsData.success) setAllSlots(slotsData.data.filter((s: DeliverySlot) => s.isActive))
      if (citiesData.success)
        setAllCities(citiesData.data.map((c: CityConfig) => ({ id: c.id, name: c.name })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/delivery/holidays/${id}`, { method: "DELETE" })
    setConfirmDelete(null)
    fetchData()
  }

  const upcoming = holidays.filter((h) => isUpcoming(h.date))
  const past = holidays.filter((h) => isPast(h.date))

  const getBlockedSlotNames = (holiday: Holiday) => {
    if (holiday.mode === "FULL_BLOCK" || !holiday.slotOverrides) return "Full Day"
    const ids = (holiday.slotOverrides as { blockedSlots?: string[] }).blockedSlots || []
    if (ids.length === 0) return "Full Day"
    return ids
      .map((id) => allSlots.find((s) => s.id === id)?.name || id)
      .join(", ")
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const HolidayTable = ({ items }: { items: Holiday[] }) => (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Blocked Slots</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No holidays found
              </td>
            </tr>
          ) : (
            items.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{formatDate(h.date)}</td>
                <td className="px-4 py-3">{h.city?.name || "All Cities"}</td>
                <td className="px-4 py-3">{getBlockedSlotNames(h)}</td>
                <td className="px-4 py-3 text-gray-600">{h.reason}</td>
                <td className="px-4 py-3">
                  {confirmDelete === h.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(h.id)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      {/* Header + add button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-700">Upcoming Holidays</h2>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600"
        >
          <Plus className="h-4 w-4" />
          Add Holiday
        </button>
      </div>

      <HolidayTable items={upcoming} />

      {/* Past holidays */}
      {past.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showPast ? "Hide" : "Show"} past holidays ({past.length})
          </button>
          {showPast && <HolidayTable items={past} />}
        </div>
      )}

      {/* Add Holiday Drawer */}
      {drawerOpen && (
        <AddHolidayDrawer
          cities={allCities}
          slots={allSlots}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => {
            setDrawerOpen(false)
            fetchData()
          }}
        />
      )}
    </>
  )
}

function AddHolidayDrawer({
  cities,
  slots,
  onClose,
  onSaved,
}: {
  cities: { id: string; name: string }[]
  slots: DeliverySlot[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    date: "",
    cityId: "",
    reason: "",
    blockedSlots: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  const toggleSlot = (id: string) => {
    setForm((prev) => ({
      ...prev,
      blockedSlots: prev.blockedSlots.includes(id)
        ? prev.blockedSlots.filter((s) => s !== id)
        : [...prev.blockedSlots, id],
    }))
  }

  const handleSave = async () => {
    if (!form.date || !form.reason.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/delivery/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          cityId: form.cityId || null,
          blockedSlots: form.blockedSlots,
          reason: form.reason,
        }),
      })
      const data = await res.json()
      if (data.success) onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold">Add Delivery Holiday</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">City</label>
            <select
              className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
              value={form.cityId}
              onChange={(e) => setForm({ ...form, cityId: e.target.value })}
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Blocked Slots</label>
            <p className="text-xs text-gray-400 mb-2">
              Leave all unchecked to block the entire day
            </p>
            <div className="space-y-2">
              {slots.map((slot) => (
                <label key={slot.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.blockedSlots.includes(slot.id)}
                    onChange={() => toggleSlot(slot.id)}
                    className="h-4 w-4 accent-pink-500"
                  />
                  <span className="text-sm">
                    {slot.name}{" "}
                    <span className="text-gray-400">
                      ({slot.startTime} &ndash; {slot.endTime})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Reason</label>
            <input
              className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Republic Day"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.date || !form.reason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── TAB 4: Surcharges ───────────────────────────────────────

function SurchargesTab() {
  const [surcharges, setSurcharges] = useState<Surcharge[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingSurcharge, setEditingSurcharge] = useState<Surcharge | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchSurcharges = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/delivery/surcharges")
      const data = await res.json()
      if (data.success) setSurcharges(data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSurcharges()
  }, [fetchSurcharges])

  const toggleActive = async (surcharge: Surcharge) => {
    await fetch(`/api/admin/delivery/surcharges/${surcharge.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !surcharge.isActive }),
    })
    fetchSurcharges()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/delivery/surcharges/${id}`, { method: "DELETE" })
    setConfirmDelete(null)
    fetchSurcharges()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getSurchargeRowStyle = (s: Surcharge) => {
    const start = new Date(s.startDate)
    const end = new Date(s.endDate)
    if (s.isActive && start <= today && end >= today) return "border-l-4 border-l-green-500"
    if (end < today) return "opacity-50"
    return ""
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Header + add button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-700">Delivery Surcharges</h2>
        <button
          onClick={() => {
            setEditingSurcharge(null)
            setDrawerOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600"
        >
          <Plus className="h-4 w-4" />
          Add Surcharge
        </button>
      </div>

      {/* Surcharges table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date Range</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Applies To</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Active</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {surcharges.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No surcharges defined
                </td>
              </tr>
            ) : (
              surcharges.map((s) => (
                <tr key={s.id} className={getSurchargeRowStyle(s)}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDateShort(s.startDate)} &ndash; {formatDateShort(s.endDate)}
                  </td>
                  <td className="px-4 py-3">&#8377;{Number(s.amount)}</td>
                  <td className="px-4 py-3">{appliesToLabel(s.appliesTo)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        s.isActive ? "bg-pink-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          s.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingSurcharge(s)
                          setDrawerOpen(true)
                        }}
                        className="text-pink-500 hover:text-pink-600 p-1"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {confirmDelete === s.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(s.id)}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Surcharge Drawer */}
      {drawerOpen && (
        <SurchargeDrawer
          surcharge={editingSurcharge}
          onClose={() => {
            setDrawerOpen(false)
            setEditingSurcharge(null)
          }}
          onSaved={() => {
            setDrawerOpen(false)
            setEditingSurcharge(null)
            fetchSurcharges()
          }}
        />
      )}
    </>
  )
}

function SurchargeDrawer({
  surcharge,
  onClose,
  onSaved,
}: {
  surcharge: Surcharge | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!surcharge
  const [form, setForm] = useState({
    name: surcharge?.name || "",
    startDate: surcharge?.startDate ? surcharge.startDate.split("T")[0] : "",
    endDate: surcharge?.endDate ? surcharge.endDate.split("T")[0] : "",
    amount: surcharge ? String(Number(surcharge.amount)) : "",
    appliesTo: surcharge?.appliesTo || "all",
    isActive: surcharge?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim() || !form.startDate || !form.endDate || !form.amount) return
    setSaving(true)
    try {
      const url = isEdit
        ? `/api/admin/delivery/surcharges/${surcharge!.id}`
        : "/api/admin/delivery/surcharges"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
          amount: Number(form.amount),
          appliesTo: form.appliesTo,
          isActive: form.isActive,
        }),
      })
      const data = await res.json()
      if (data.success) onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold">
            {isEdit ? "Edit Surcharge" : "Add Surcharge"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Valentine's Week"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Amount &#8377;</label>
            <input
              type="number"
              min="0"
              className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Applies To</label>
            <div className="mt-2 space-y-2">
              {[
                { value: "all", label: "All Orders" },
                { value: "flowers", label: "Flower Orders Only" },
                { value: "cakes", label: "Cake Orders Only" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="appliesTo"
                    value={opt.value}
                    checked={form.appliesTo === opt.value}
                    onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
                    className="h-4 w-4 accent-pink-500"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-700">Is Active</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.isActive ? "bg-pink-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.startDate || !form.endDate || !form.amount}
            className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  )
}
