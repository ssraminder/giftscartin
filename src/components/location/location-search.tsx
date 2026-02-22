'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  Bell,
  Loader2,
  Truck,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
}

type ServiceabilityStatus =
  | 'loading'
  | 'available'
  | 'coming_soon'
  | 'unavailable'
  | null

interface ServiceabilityData {
  status: ServiceabilityStatus
  vendorCount?: number
  nearestCity?: string
}

export function LocationSearch({
  onSelect,
  productId,
  defaultValue = '',
  autoFocus = false,
  placeholder = 'Enter city, area or pincode',
}: LocationSearchProps) {
  const [query, setQuery] = useState(defaultValue)
  const { results, loading } = useLocationSearch(query)
  const [showDropdown, setShowDropdown] = useState(false)
  const [serviceability, setServiceability] = useState<
    Record<string, ServiceabilityData>
  >({})
  const [showNotify, setShowNotify] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyCity, setNotifyCity] = useState('')
  const [notifySending, setNotifySending] = useState(false)
  const [notifySent, setNotifySent] = useState(false)
  // Inline status bar after selection
  const [selectionStatus, setSelectionStatus] = useState<{
    type: 'success' | 'coming_soon' | 'unavailable' | 'checking'
    message: string
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectTimerRef = useRef<NodeJS.Timeout | null>(null)

  const hasResults = results.length > 0

  // Group results
  const areaResults = results.filter((r) => r.type === 'area')
  const cityResults = results.filter((r) => r.type === 'city')
  const googleResults = results.filter((r) => r.type === 'google_place')

  // Check serviceability for a result
  const checkServiceability = useCallback(
    async (
      key: string,
      pincode: string | null,
      lat: number | null,
      lng: number | null
    ) => {
      setServiceability((prev) => {
        if (prev[key]?.status && prev[key].status !== 'loading') return prev
        return { ...prev, [key]: { status: 'loading' } }
      })

      try {
        const body: Record<string, unknown> = {}
        if (pincode) {
          body.pincode = pincode
        } else if (lat != null && lng != null) {
          body.lat = lat
          body.lng = lng
        } else {
          setServiceability((prev) => ({
            ...prev,
            [key]: { status: null },
          }))
          return
        }
        if (productId) body.productId = productId

        const res = await fetch('/api/serviceability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()

        if (json.success && json.data) {
          const d = json.data
          if (d.comingSoon) {
            setServiceability((prev) => ({
              ...prev,
              [key]: { status: 'coming_soon', vendorCount: 0 },
            }))
          } else if (d.isServiceable && d.vendorCount > 0) {
            setServiceability((prev) => ({
              ...prev,
              [key]: { status: 'available', vendorCount: d.vendorCount },
            }))
          } else {
            setServiceability((prev) => ({
              ...prev,
              [key]: {
                status: 'unavailable',
                nearestCity: d.city?.name || undefined,
              },
            }))
          }
        } else {
          setServiceability((prev) => ({
            ...prev,
            [key]: { status: 'unavailable' },
          }))
        }
      } catch {
        setServiceability((prev) => ({
          ...prev,
          [key]: { status: null },
        }))
      }
    },
    [productId]
  )

  // Trigger serviceability checks for results in background
  useEffect(() => {
    for (const r of results) {
      const key = getResultKey(r)
      if (key && !serviceability[key]?.status) {
        if (r.type === 'area' || r.pincode) {
          checkServiceability(key, r.pincode, r.lat, r.lng)
        } else if (r.type === 'city' && r.lat && r.lng) {
          checkServiceability(key, null, r.lat, r.lng)
        }
        // google_place results don't get pre-checked (no coords yet)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

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

        // Now check serviceability with the resolved coordinates
        const svcBody: Record<string, unknown> = {}
        if (pincode) {
          svcBody.pincode = pincode
        } else if (lat && lng) {
          svcBody.lat = lat
          svcBody.lng = lng
        }
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

  async function handleSelectResult(result: LocationResult) {
    setShowDropdown(false)
    setQuery(result.label)

    if (result.type === 'google_place') {
      // Resolve the place first
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
        setSelectionStatus({
          type: 'success',
          message: `Delivery available \u2014 ${resolved.vendorCount} vendor${(resolved.vendorCount || 0) !== 1 ? 's' : ''}`,
        })
        selectTimerRef.current = setTimeout(() => {
          onSelect(resolved)
          setSelectionStatus(null)
        }, 1500)
      } else if (resolved.comingSoon) {
        setSelectionStatus({
          type: 'coming_soon',
          message: "We're coming to your area soon",
        })
        selectTimerRef.current = setTimeout(() => {
          onSelect(resolved)
          setSelectionStatus(null)
        }, 1500)
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
      // Check serviceability
      setSelectionStatus({ type: 'checking', message: 'Checking delivery...' })

      const key = getResultKey(result)
      const cached = key ? serviceability[key] : null

      if (cached?.status === 'available') {
        setSelectionStatus({
          type: 'success',
          message: `Delivery available \u2014 ${cached.vendorCount || 0} vendor${(cached.vendorCount || 0) !== 1 ? 's' : ''}`,
        })
        selectTimerRef.current = setTimeout(() => {
          onSelect({
            type: result.type,
            cityId: result.cityId,
            cityName: result.cityName,
            citySlug: result.citySlug,
            pincode: result.pincode,
            areaName: result.areaName,
            lat: result.lat,
            lng: result.lng,
            placeId: null,
            vendorCount: cached.vendorCount,
            isServiceable: true,
          })
          setSelectionStatus(null)
        }, 1500)
        return
      }

      if (cached?.status === 'coming_soon') {
        setSelectionStatus({
          type: 'coming_soon',
          message: "We're coming to your area soon",
        })
        selectTimerRef.current = setTimeout(() => {
          onSelect({
            type: result.type,
            cityId: result.cityId,
            cityName: result.cityName,
            citySlug: result.citySlug,
            pincode: result.pincode,
            areaName: result.areaName,
            lat: result.lat,
            lng: result.lng,
            placeId: null,
            comingSoon: true,
          })
          setSelectionStatus(null)
        }, 1500)
        return
      }

      if (cached?.status === 'unavailable') {
        setSelectionStatus({
          type: 'unavailable',
          message: cached.nearestCity
            ? `We don't deliver here yet. Nearest city: ${cached.nearestCity}`
            : "We don't deliver here yet.",
        })
        return
      }

      // Not cached yet: run the check
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

        if (d?.comingSoon) {
          setSelectionStatus({
            type: 'coming_soon',
            message: "We're coming to your area soon",
          })
          selectTimerRef.current = setTimeout(() => {
            onSelect({
              type: result.type,
              cityId: result.cityId,
              cityName: result.cityName,
              citySlug: result.citySlug,
              pincode: result.pincode,
              areaName: result.areaName,
              lat: result.lat,
              lng: result.lng,
              placeId: null,
              comingSoon: true,
            })
            setSelectionStatus(null)
          }, 1500)
        } else if (d?.isServiceable && d.vendorCount > 0) {
          setSelectionStatus({
            type: 'success',
            message: `Delivery available \u2014 ${d.vendorCount} vendor${d.vendorCount !== 1 ? 's' : ''}`,
          })
          selectTimerRef.current = setTimeout(() => {
            onSelect({
              type: result.type,
              cityId: result.cityId || d.city?.id || null,
              cityName: result.cityName || d.city?.name || null,
              citySlug: result.citySlug || d.city?.slug || null,
              pincode: result.pincode,
              areaName: result.areaName,
              lat: result.lat,
              lng: result.lng,
              placeId: null,
              vendorCount: d.vendorCount,
              isServiceable: true,
            })
            setSelectionStatus(null)
          }, 1500)
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

    // type === 'city' — just set city context, no serviceability check
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

  function renderBadge(result: LocationResult) {
    const key = getResultKey(result)
    const data = key ? serviceability[key] : null
    const status = data?.status

    if (result.type === 'google_place') {
      return (
        <span className="flex items-center gap-1 text-xs text-blue-500 shrink-0">
          <AlertTriangle className="h-3 w-3" />
          Google
        </span>
      )
    }

    if (status === 'loading') {
      return (
        <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <Loader2 className="h-3 w-3 animate-spin" />
        </span>
      )
    }

    if (status === 'available') {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 shrink-0">
          <Truck className="h-3.5 w-3.5" />
          Delivery available
        </span>
      )
    }

    if (status === 'coming_soon' || result.isComingSoon) {
      return (
        <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <Clock className="h-3.5 w-3.5" />
          Coming soon
        </span>
      )
    }

    if (status === 'unavailable') {
      return (
        <span className="flex items-center gap-1 text-xs text-orange-500 shrink-0">
          <Clock className="h-3.5 w-3.5" />
          Expanding soon
        </span>
      )
    }

    if (result.isActive) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" />
          We deliver here
        </span>
      )
    }

    return null
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          className="pl-10 h-11 rounded-xl border-2 border-pink-200 bg-white focus:border-pink-400 placeholder:text-gray-400"
          autoFocus={autoFocus}
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Inline status after selection */}
      {selectionStatus && (
        <div
          className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
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
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && hasResults && (
            <div className="py-1">
              {/* Areas */}
              {areaResults.length > 0 && (
                <>
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Areas
                  </p>
                  {areaResults.map((result, idx) => (
                    <button
                      key={`area-${idx}-${result.pincode || result.label}`}
                      onClick={() => handleSelectResult(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 transition-colors"
                    >
                      <MapPin className="h-5 w-5 shrink-0 text-[#E91E63]" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {result.label}
                        </p>
                      </div>
                      {renderBadge(result)}
                    </button>
                  ))}
                </>
              )}

              {/* Cities */}
              {cityResults.length > 0 && (
                <>
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Cities
                  </p>
                  {cityResults.map((result, idx) => (
                    <button
                      key={`city-${idx}-${result.cityId || result.label}`}
                      onClick={() => handleSelectResult(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 transition-colors"
                    >
                      <MapPin className="h-5 w-5 shrink-0 text-[#E91E63]" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {result.label}
                        </p>
                      </div>
                      {renderBadge(result)}
                    </button>
                  ))}
                </>
              )}

              {/* Google Places */}
              {googleResults.length > 0 && (
                <>
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Other locations
                  </p>
                  {googleResults.map((result, idx) => (
                    <button
                      key={`google-${idx}-${result.placeId || result.label}`}
                      onClick={() => handleSelectResult(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 transition-colors"
                    >
                      <MapPin className="h-5 w-5 shrink-0 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {result.label}
                        </p>
                      </div>
                      {renderBadge(result)}
                    </button>
                  ))}
                </>
              )}
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

function getResultKey(result: LocationResult): string | null {
  if (result.pincode) return result.pincode
  if (result.lat && result.lng) return `${result.lat},${result.lng}`
  if (result.citySlug) return `city-${result.citySlug}`
  return null
}
