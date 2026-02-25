'use client'

import { useState, useEffect } from 'react'
import { Search, CheckSquare, Square, Loader2, Check, X } from 'lucide-react'

// ==================== Types ====================

interface ServiceArea {
  id: string
  name: string
  pincode: string
  cityName: string
  isActive: boolean
}

interface VendorPincode {
  pincode: string
  deliveryCharge: number
  pendingCharge: number | null
}

// ==================== By Area (Checkmarks + Surcharges) ====================

interface AreaProps {
  vendorId: string
  cityId: string
  currentPincodes: string[]
  currentCharges?: VendorPincode[]
  onSave: (pincodes: string[]) => void
}

export function VendorCoverageByArea({ vendorId, cityId, currentPincodes, currentCharges, onSave }: AreaProps) {
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(currentPincodes))
  const [charges, setCharges] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [loadingAreas, setLoadingAreas] = useState(true)

  // Initialize charges from currentCharges
  useEffect(() => {
    if (currentCharges) {
      const chargeMap: Record<string, number> = {}
      for (const pc of currentCharges) {
        chargeMap[pc.pincode] = pc.deliveryCharge
      }
      setCharges(chargeMap)
    }
  }, [currentCharges])

  useEffect(() => {
    if (!cityId) return
    setLoadingAreas(true)
    fetch(`/api/admin/areas?city=${cityId}&status=active&pageSize=200`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setAreas(d.data.areas)
      })
      .catch(() => {})
      .finally(() => setLoadingAreas(false))
  }, [cityId])

  useEffect(() => {
    setSelected(new Set(currentPincodes))
  }, [currentPincodes])

  const filtered = areas.filter(a =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.pincode.includes(search)
  )

  // Group by pincode
  const grouped = filtered.reduce<Record<string, ServiceArea[]>>((acc, area) => {
    if (!acc[area.pincode]) acc[area.pincode] = []
    acc[area.pincode].push(area)
    return acc
  }, {})

  const togglePincode = (pincode: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(pincode)) {
        next.delete(pincode)
      } else {
        next.add(pincode)
      }
      return next
    })
  }

  const updateCharge = (pincode: string, value: string) => {
    const num = parseFloat(value)
    setCharges(prev => ({
      ...prev,
      [pincode]: isNaN(num) ? 0 : num,
    }))
  }

  const handleSave = async () => {
    if (!vendorId) return
    setIsSaving(true)
    try {
      const pincodeCharges = Array.from(selected).map(pincode => ({
        pincode,
        deliveryCharge: charges[pincode] || 0,
      }))
      await fetch(`/api/admin/vendors/${vendorId}/coverage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'pincode',
          pincodeCharges,
        }),
      })
      onSave(Array.from(selected))
    } catch {
      // error handled silently
    } finally {
      setIsSaving(false)
    }
  }

  const allPincodes = new Set(areas.map(a => a.pincode))

  // Pending charges from vendor
  const pendingCharges = (currentCharges || []).filter(pc => pc.pendingCharge !== null)

  const handleApproveAll = async () => {
    if (!vendorId || pendingCharges.length === 0) return
    try {
      await fetch(`/api/admin/vendors/${vendorId}/coverage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      // Reload page to see updated charges
      window.location.reload()
    } catch {
      // silently fail
    }
  }

  const handleRejectAll = async () => {
    if (!vendorId || pendingCharges.length === 0) return
    try {
      await fetch(`/api/admin/vendors/${vendorId}/coverage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      window.location.reload()
    } catch {
      // silently fail
    }
  }

  if (loadingAreas) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!cityId) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-700">Select a city first to configure area coverage.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pending charge requests */}
      {pendingCharges.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <p className="text-sm font-medium text-amber-800">
            {pendingCharges.length} pending surcharge request{pendingCharges.length !== 1 ? 's' : ''} from vendor
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingCharges.map(pc => (
              <span key={pc.pincode} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                {pc.pincode}: ₹{pc.deliveryCharge} → ₹{pc.pendingCharge}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApproveAll}
              className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors"
            >
              <Check className="h-3 w-3" /> Approve All
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
            >
              <X className="h-3 w-3" /> Reject All
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search area or pincode..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-pink-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setSelected(new Set(areas.map(a => a.pincode)))}
          className="text-xs text-pink-600 hover:text-pink-700 font-medium whitespace-nowrap"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
        >
          Clear
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {selected.size} of {allPincodes.size} pincodes selected
      </p>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {Object.entries(grouped).length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No service areas found for this city
          </p>
        ) : (
          Object.entries(grouped).map(([pincode, areaList]) => (
            <div
              key={pincode}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <button
                type="button"
                onClick={() => togglePincode(pincode)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                {selected.has(pincode) ? (
                  <CheckSquare className="h-4 w-4 text-pink-600 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-gray-300 shrink-0" />
                )}
                <span className="text-sm font-mono text-gray-500 w-16">{pincode}</span>
                <span className="text-sm text-gray-700 flex-1">
                  {areaList.map(a => a.name).join(', ')}
                </span>
              </button>
              {selected.has(pincode) && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-gray-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={charges[pincode] || 0}
                    onChange={e => updateCharge(pincode, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="w-16 px-1.5 py-1 text-xs border border-gray-200 rounded text-right focus:outline-none focus:border-pink-500"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !vendorId}
        className="w-full py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 transition-colors"
      >
        {isSaving ? 'Saving...' : 'Save Coverage'}
      </button>
    </div>
  )
}

// ==================== By Radius ====================

interface RadiusProps {
  vendorId: string
  vendorLat?: number | null
  vendorLng?: number | null
  currentRadius: number
  onSave: (km: number) => void
}

export function VendorCoverageByRadius({
  vendorId,
  vendorLat,
  vendorLng,
  currentRadius,
  onSave,
}: RadiusProps) {
  const [radius, setRadius] = useState(currentRadius || 8)
  const [preview, setPreview] = useState<{ count: number; pincodes: string[] } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const hasLocation = vendorLat && vendorLng && !(vendorLat === 0 && vendorLng === 0)

  const fetchPreview = async (km: number) => {
    if (!hasLocation || !vendorId) return
    try {
      const res = await fetch(
        `/api/admin/vendors/${vendorId}/coverage/preview?radius=${km}&lat=${vendorLat}&lng=${vendorLng}`
      )
      const data = await res.json()
      if (data.success) setPreview(data.data)
    } catch {
      // silently fail
    }
  }

  const handleSave = async () => {
    if (!hasLocation || !vendorId) return
    setIsSaving(true)
    try {
      await fetch(`/api/admin/vendors/${vendorId}/coverage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'radius',
          radiusKm: radius,
          lat: vendorLat,
          lng: vendorLng,
        }),
      })
      onSave(radius)
    } catch {
      // silently fail
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {!hasLocation && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            Set shop location first before using radius coverage.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Delivery radius: {radius} km
        </label>
        <input
          type="range"
          min={1}
          max={30}
          step={0.5}
          value={radius}
          onChange={e => setRadius(parseFloat(e.target.value))}
          onMouseUp={() => fetchPreview(radius)}
          onTouchEnd={() => fetchPreview(radius)}
          className="w-full accent-pink-600"
          disabled={!hasLocation}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>1 km</span>
          <span>30 km</span>
        </div>
      </div>

      {preview && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            Covers <strong>{preview.count} areas</strong> across{' '}
            <strong>{preview.pincodes.length} pincodes</strong>
          </p>
          <p className="text-xs text-green-600 mt-1">
            {preview.pincodes.join(', ')}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !hasLocation || !vendorId}
        className="w-full py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 transition-colors"
      >
        {isSaving ? 'Saving...' : 'Save Coverage'}
      </button>
    </div>
  )
}
