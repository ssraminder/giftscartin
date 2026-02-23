// Location search component — simplified Google-first search
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  Bell,
  Loader2,
  XCircle,
  Navigation,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLocationSearch } from '@/hooks/use-location-search'
import type { LocationResult } from '@/hooks/use-location-search'

export interface ResolvedLocation {
  type: 'area' | 'city' | 'google_place'
  cityId: string | null
  cityName: string | null
  citySlug: string | null
  pincode: string | null
  areaName: string | null
  lat: number | null
  lng: number | null
  placeId: string | null
  vendorCount?: number
  isServiceable?: boolean
  comingSoon?: boolean
}

interface LocationSearchProps {
  onSelect: (location: ResolvedLocation) => void
  productId?: string
  defaultValue?: string
  autoFocus?: boolean
  placeholder?: string
  /** Compact mode for header dropdown */
  compact?: boolean
}

type SelectionStatus =
  | { type: 'checking'; message: string }
  | { type: 'success'; message: string }
  | { type: 'coming_soon'; message: string }
  | { type: 'unavailable'; message: string }
  | null

export function LocationSearch({
  onSelect,
  productId,
  defaultValue = '',
  autoFocus = false,
  placeholder = 'Enter receiver\u2019s pincode, location, area',
  compact = false,
}: LocationSearchProps) {
  const [query, setQuery] = useState(defaultValue)
  const { results, loading } = useLocationSearch(query)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotify, setShowNotify] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyCity, setNotifyCity] = useState('')
  const [notifySending, setNotifySending] = useState(false)
  const [notifySent, setNotifySent] = useState(false)
  const [selectionStatus, setSelectionStatus] = useState<SelectionStatus>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectTimerRef = useRef<NodeJS.Timeout | null>(null)

  const hasResults = results.length > 0

  // Show/hide dropdown based on results
  useEffect(() => {
    if (hasResults) {
      setShowDropdown(true)
      setShowNotify(false)
    } else if (query.length >= 2 && !loading && !hasResults) {
      setShowDropdown(true)
      setShowNotify(true)
      setNotifyCity(query)
    }
  }, [results, hasResults, query, loading])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current)
    }
  }, [])

  async function resolveGooglePlace(
    result: LocationResult
  ): Promise<ResolvedLocation | null> {
    if (!result.placeId) return null

    try {
      const res = await fetch(
        `/api/location/resolve-place?placeId=${encodeURIComponent(result.placeId)}`
      )
      const json = await res.json()

      if (json.success && json.data) {
        const { lat, lng, pincode, city, formattedAddress } = json.data

        const svcBody: Record<string, unknown> = {}
        if (pincode) svcBody.pincode = pincode
        else if (lat && lng) { svcBody.lat = lat; svcBody.lng = lng }
        if (productId) svcBody.productId = productId

        const svcRes = await fetch('/api/serviceability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(svcBody),
        })
        const svcJson = await svcRes.json()
        const svcData = svcJson.success ? svcJson.data : null

        return {
          type: 'google_place',
          cityId: svcData?.city?.id || null,
          cityName: svcData?.city?.name || city || null,
          citySlug: svcData?.city?.slug || null,
          pincode: pincode || null,
          areaName: result.areaName || formattedAddress || null,
          lat,
          lng,
          placeId: result.placeId,
          vendorCount: svcData?.vendorCount || 0,
          isServiceable: svcData?.isServiceable || false,
          comingSoon: svcData?.comingSoon || false,
        }
      }
    } catch {
      // Failed to resolve
    }
    return null
  }

  const finishSelection = useCallback(
    (resolved: ResolvedLocation, statusType: 'success' | 'coming_soon') => {
      const message =
        statusType === 'success'
          ? `Delivery available${resolved.vendorCount ? ` \u2014 ${resolved.vendorCount} vendor${resolved.vendorCount !== 1 ? 's' : ''}` : ''}`
          : "We're coming to your area soon"

      setSelectionStatus({ type: statusType, message })
      selectTimerRef.current = setTimeout(() => {
        onSelect(resolved)
        setSelectionStatus(null)
      }, 1200)
    },
    [onSelect]
  )

  async function handleSelectResult(result: LocationResult) {
    setShowDropdown(false)
    setQuery(result.label)

    if (result.type === 'google_place') {
      setSelectionStatus({ type: 'checking', message: 'Checking coverage...' })
      const resolved = await resolveGooglePlace(result)

      if (!resolved) {
        setSelectionStatus({
          type: 'unavailable',
          message: "We don't deliver here yet.",
        })
        return
      }

      if (resolved.isServiceable && (resolved.vendorCount || 0) > 0) {
        finishSelection(resolved, 'success')
      } else if (resolved.comingSoon) {
        finishSelection(resolved, 'coming_soon')
      } else {
        setSelectionStatus({
          type: 'unavailable',
          message: resolved.cityName
            ? `We don't deliver here yet. Nearest city: ${resolved.cityName}`
            : "We don't deliver here yet.",
        })
      }
      return
    }

    if (result.type === 'area' || result.pincode) {
      setSelectionStatus({ type: 'checking', message: 'Checking delivery...' })

      try {
        const body: Record<string, unknown> = {}
        if (result.pincode) body.pincode = result.pincode
        else if (result.lat && result.lng) {
          body.lat = result.lat
          body.lng = result.lng
        }
        if (productId) body.productId = productId

        const res = await fetch('/api/serviceability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        const d = json.success ? json.data : null

        const resolved: ResolvedLocation = {
          type: result.type,
          cityId: result.cityId || d?.city?.id || null,
          cityName: result.cityName || d?.city?.name || null,
          citySlug: result.citySlug || d?.city?.slug || null,
          pincode: result.pincode,
          areaName: result.areaName,
          lat: result.lat,
          lng: result.lng,
          placeId: null,
          vendorCount: d?.vendorCount || 0,
          isServiceable: d?.isServiceable || false,
          comingSoon: d?.comingSoon || false,
        }

        if (d?.comingSoon) {
          finishSelection(resolved, 'coming_soon')
        } else if (d?.isServiceable && d.vendorCount > 0) {
          finishSelection(resolved, 'success')
        } else {
          setSelectionStatus({
            type: 'unavailable',
            message: d?.city?.name
              ? `We don't deliver here yet. Nearest city: ${d.city.name}`
              : "We don't deliver here yet.",
          })
        }
      } catch {
        setSelectionStatus({
          type: 'unavailable',
          message: 'Failed to check delivery availability.',
        })
      }
      return
    }

    // type === 'city' — just set city context
    onSelect({
      type: 'city',
      cityId: result.cityId,
      cityName: result.cityName,
      citySlug: result.citySlug,
      pincode: null,
      areaName: null,
      lat: result.lat,
      lng: result.lng,
      placeId: null,
    })
    setSelectionStatus(null)
  }

  async function handleNotify() {
    if (!notifyEmail) return
    setNotifySending(true)
    try {
      await fetch('/api/city/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail, cityName: notifyCity }),
      })
      setNotifySent(true)
    } catch {
      // silently fail
    } finally {
      setNotifySending(false)
    }
  }

  const inputHeight = compact ? 'h-9' : 'h-11'

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectionStatus(null)
            if (selectTimerRef.current) {
              clearTimeout(selectTimerRef.current)
              selectTimerRef.current = null
            }
          }}
          onFocus={() => {
            if (hasResults || showNotify) setShowDropdown(true)
          }}
          className={`pl-10 ${inputHeight} rounded-xl border border-gray-200 bg-white focus:border-pink-400 placeholder:text-gray-400 text-sm`}
          autoFocus={autoFocus}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Inline status after selection */}
      {selectionStatus && (
        <div
          className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            selectionStatus.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : selectionStatus.type === 'coming_soon'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : selectionStatus.type === 'checking'
                  ? 'bg-gray-50 text-gray-600 border border-gray-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {selectionStatus.type === 'success' && (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          {selectionStatus.type === 'coming_soon' && (
            <Clock className="h-4 w-4 shrink-0" />
          )}
          {selectionStatus.type === 'checking' && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          )}
          {selectionStatus.type === 'unavailable' && (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{selectionStatus.message}</span>
        </div>
      )}

      {/* Results Dropdown */}
      {showDropdown && !selectionStatus && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading && !hasResults && (
            <div className="p-4 flex items-center gap-3 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching locations...
            </div>
          )}

          {!loading && hasResults && (
            <div className="py-1">
              {results.map((result, idx) => (
                <button
                  key={`${result.type}-${idx}-${result.placeId || result.pincode || result.label}`}
                  onClick={() => handleSelectResult(result)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {result.type === 'google_place' ? (
                    <Navigation className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                  ) : (
                    <MapPin className="h-4 w-4 shrink-0 text-[#E91E63] mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 leading-snug">
                      {result.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results / Notify form */}
          {!loading && showNotify && !hasResults && (
            <div className="p-4">
              {notifySent ? (
                <div className="text-center py-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">
                    We&apos;ll notify you!
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    When we start delivering to {notifyCity}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      We don&apos;t deliver to{' '}
                      <strong>{notifyCity}</strong> yet
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Your email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      onClick={handleNotify}
                      disabled={!notifyEmail || notifySending}
                      className="bg-[#E91E63] hover:bg-[#D81B60] text-white shrink-0"
                    >
                      {notifySending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Notify Me'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
