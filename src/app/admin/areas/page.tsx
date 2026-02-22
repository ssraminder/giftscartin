'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MapPin,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

// ==================== Types ====================

interface ServiceArea {
  id: string
  name: string
  pincode: string
  cityId: string
  cityName: string
  state: string
  lat: number
  lng: number
  isActive: boolean
  createdAt: string
}

interface Stats {
  totalAreas: number
  activeAreas: number
  inactiveAreas: number
  cityCount: number
}

interface CityOption {
  id: string
  name: string
}

// ==================== Component ====================

export default function AdminAreasPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-slate-400">Loading...</div>}>
      <AdminAreasContent />
    </Suspense>
  )
}

function AdminAreasContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || 'all'

  // Data
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [cities, setCities] = useState<CityOption[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [cityFilter, setCityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Add form
  const [showAddForm, setShowAddForm] = useState(false)
  const [lookupPincode, setLookupPincode] = useState('')
  const [lookupResult, setLookupResult] = useState<{
    areaName: string
    cityName: string
    state: string
    lat: number
    lng: number
    cityId: string | null
  } | null>(null)
  const [addName, setAddName] = useState('')
  const [addCityId, setAddCityId] = useState('')

  // UI state
  const [loading, setLoading] = useState(true)
  const [looking, setLooking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Fetch cities list
  useEffect(() => {
    fetch('/api/admin/vendors?pageSize=0')
      .then(r => r.json())
      .then(d => {
        // Try to get cities from the response; fallback to fetching separately
        if (d.data?.cities) setCities(d.data.cities)
      })
      .catch(() => {})

    // Also try dedicated cities API
    fetch('/api/admin/areas?pageSize=1')
      .then(r => r.json())
      .then(d => {
        if (d.data?.stats) setStats(d.data.stats)
      })
      .catch(() => {})

    // Fetch cities for dropdown
    fetch('/api/categories')
      .then(() => {})
      .catch(() => {})
  }, [])

  // Fetch areas
  const fetchAreas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (cityFilter) params.set('city', cityFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('page', page.toString())
      params.set('pageSize', '50')

      const res = await fetch(`/api/admin/areas?${params}`)
      const json = await res.json()
      if (json.success) {
        setAreas(json.data.areas)
        setTotal(json.data.total)
        if (json.data.stats) setStats(json.data.stats)
      }
    } catch {
      showToast('error', 'Failed to fetch areas')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, cityFilter, searchQuery, page])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  // Fetch cities for dropdown
  useEffect(() => {
    fetch('/api/admin/vendors')
      .then(r => r.json())
      .then(d => {
        if (d.data?.cities) setCities(d.data.cities)
      })
      .catch(() => {})
  }, [])

  // Pincode lookup
  const handleLookup = async () => {
    if (!/^\d{6}$/.test(lookupPincode)) {
      showToast('error', 'Enter a valid 6-digit pincode')
      return
    }
    setLooking(true)
    setLookupResult(null)
    try {
      const res = await fetch(`/api/location/pincode?pincode=${lookupPincode}`)
      const json = await res.json()
      if (json.success && json.data.found) {
        setLookupResult({
          areaName: json.data.areaName || `Area ${lookupPincode}`,
          cityName: json.data.cityName || '',
          state: json.data.state || '',
          lat: json.data.lat || 0,
          lng: json.data.lng || 0,
          cityId: json.data.cityId,
        })
        setAddName(json.data.areaName || `Area ${lookupPincode}`)
        if (json.data.cityId) setAddCityId(json.data.cityId)
      } else {
        showToast('error', 'Pincode not found anywhere')
      }
    } catch {
      showToast('error', 'Lookup failed')
    } finally {
      setLooking(false)
    }
  }

  // Add new area
  const handleAddArea = async () => {
    if (!addName.trim() || !addCityId) {
      showToast('error', 'Name and city are required')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          pincode: lookupPincode,
          cityId: addCityId,
          lat: lookupResult?.lat,
          lng: lookupResult?.lng,
          isActive: true,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showToast('success', 'Area added successfully')
        setShowAddForm(false)
        setLookupPincode('')
        setLookupResult(null)
        setAddName('')
        setAddCityId('')
        fetchAreas()
      } else {
        showToast('error', json.error || 'Failed to add area')
      }
    } catch {
      showToast('error', 'Failed to add area')
    } finally {
      setAdding(false)
    }
  }

  // Toggle area active status
  const toggleArea = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/areas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const json = await res.json()
      if (json.success) {
        setAreas(prev => prev.map(a => a.id === id ? { ...a, isActive } : a))
        showToast('success', isActive ? 'Area activated' : 'Area deactivated')
      }
    } catch {
      showToast('error', 'Failed to update area')
    }
  }

  // Delete area
  const deleteArea = async (id: string) => {
    if (!confirm('Delete this area? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/admin/areas/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setAreas(prev => prev.filter(a => a.id !== id))
        showToast('success', 'Area deleted')
      } else {
        showToast('error', json.error || 'Failed to delete')
      }
    } catch {
      showToast('error', 'Failed to delete area')
    }
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Serviceable Areas</h1>
          <p className="text-sm text-slate-500">Manage delivery areas by city and pincode</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAreas()}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
          >
            <Plus className="h-4 w-4" />
            Add Area
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total areas', value: stats.totalAreas, color: 'text-slate-700' },
            { label: 'Active', value: stats.activeAreas, color: 'text-green-700' },
            { label: 'Pending review', value: stats.inactiveAreas, color: 'text-amber-700' },
            { label: 'Cities', value: stats.cityCount, color: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border bg-white px-4 py-3">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Add New Area</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Pincode</label>
              <div className="flex gap-2">
                <input
                  value={lookupPincode}
                  onChange={e => setLookupPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="160001"
                  maxLength={6}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-base font-mono focus:border-pink-500 focus:outline-none"
                />
                <button
                  onClick={handleLookup}
                  disabled={looking || lookupPincode.length !== 6}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Lookup
                </button>
              </div>
            </div>

            {lookupResult && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Area Name</label>
                  <input
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">City</label>
                  <select
                    value={addCityId}
                    onChange={e => setAddCityId(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base focus:border-pink-500 focus:outline-none"
                  >
                    <option value="">Select city</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-slate-500">
                  {lookupResult.state} · {lookupResult.lat.toFixed(4)}, {lookupResult.lng.toFixed(4)}
                </div>
                <button
                  onClick={handleAddArea}
                  disabled={adding}
                  className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
                >
                  {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save as Active
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'inactive', label: 'Pending Review' },
            { value: 'active', label: 'Active' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1) }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* City filter */}
        <select
          value={cityFilter}
          onChange={e => { setCityFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
        >
          <option value="">All cities</option>
          {cities.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            placeholder="Search area name or pincode..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-base focus:border-pink-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Areas table */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Area Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Pincode</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">City</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">State</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : areas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  No areas found
                </td>
              </tr>
            ) : (
              areas.map(area => (
                <tr
                  key={area.id}
                  className={!area.isActive ? 'bg-amber-50/50' : ''}
                >
                  <td className="px-4 py-3 font-medium text-slate-700">{area.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{area.pincode}</td>
                  <td className="px-4 py-3 text-slate-600">{area.cityName}</td>
                  <td className="px-4 py-3 text-slate-500">{area.state}</td>
                  <td className="px-4 py-3">
                    {area.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {area.isActive ? (
                        <button
                          onClick={() => toggleArea(area.id, false)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Deactivate"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleArea(area.id, true)}
                          className="rounded-md p-1.5 text-green-500 hover:bg-green-50 hover:text-green-700"
                          title="Activate"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteArea(area.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
