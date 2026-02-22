"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, MapPin, CheckCircle2, Clock, Bell, Loader2, Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { POPULAR_CITIES } from "@/lib/cities-data"
import type { CitySelection } from "@/components/providers/city-provider"

interface AreaResult {
  id: string
  name: string
  pincode: string | null
  cityId: string | null
  cityName: string | null
  citySlug: string | null
  state: string | null
  lat: number | null
  lng: number | null
  isActive: boolean
  isComingSoon: boolean
  source: 'db' | 'google'
}

interface CityResult {
  cityId: string | null
  cityName: string | null
  citySlug: string | null
  state: string | null
  lat: number | null
  lng: number | null
  isActive: boolean
  isComingSoon: boolean
  source: 'db' | 'google'
}

interface SearchResults {
  areas: AreaResult[]
  cities: CityResult[]
}

// Serviceability status per result
type ServiceabilityStatus = 'loading' | 'available' | 'coming_soon' | 'unavailable' | null

interface CitySearchProps {
  onSelect: (selection: CitySelection) => void
  placeholder?: string
  autoFocus?: boolean
}

export function CitySearch({
  onSelect,
  placeholder = "Enter city, area or pincode",
  autoFocus = false,
}: CitySearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>({ areas: [], cities: [] })
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotify, setShowNotify] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState("")
  const [notifyCity, setNotifyCity] = useState("")
  const [notifySending, setNotifySending] = useState(false)
  const [notifySent, setNotifySent] = useState(false)
  // Serviceability badge cache: keyed by "pincode" or "lat,lng"
  const [serviceability, setServiceability] = useState<Record<string, ServiceabilityStatus>>({})
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasResults = results.areas.length > 0 || results.cities.length > 0

  /** Check serviceability for a result (silently in background) */
  const checkServiceability = useCallback(async (key: string, pincode: string | null, lat: number | null, lng: number | null) => {
    // Already checked or loading
    setServiceability(prev => {
      if (prev[key]) return prev
      return { ...prev, [key]: 'loading' }
    })

    try {
      const body: Record<string, unknown> = {}
      if (pincode) {
        body.pincode = pincode
      } else if (lat != null && lng != null) {
        body.lat = lat
        body.lng = lng
      } else {
        setServiceability(prev => ({ ...prev, [key]: null }))
        return
      }

      const res = await fetch('/api/serviceability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success && json.data) {
        const d = json.data
        if (d.comingSoon) {
          setServiceability(prev => ({ ...prev, [key]: 'coming_soon' }))
        } else if (d.isServiceable && d.vendorCount > 0) {
          setServiceability(prev => ({ ...prev, [key]: 'available' }))
        } else {
          setServiceability(prev => ({ ...prev, [key]: 'unavailable' }))
        }
      } else {
        setServiceability(prev => ({ ...prev, [key]: 'unavailable' }))
      }
    } catch {
      setServiceability(prev => ({ ...prev, [key]: null }))
    }
  }, [])

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults({ areas: [], cities: [] })
      setShowDropdown(false)
      return
    }

    // Skip API for 1-3 character partial pincodes (digits only)
    const isPartialPincode = /^\d{1,3}$/.test(searchQuery)
    if (isPartialPincode) {
      setResults({ areas: [], cities: [] })
      setShowDropdown(false)
      return
    }

    // Check if query matches a popular city name — use static data first
    const isDigits = /^\d+$/.test(searchQuery)
    if (!isDigits) {
      const localMatch = POPULAR_CITIES.filter(c =>
        c.cityName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (localMatch.length > 0) {
        setResults({
          areas: [],
          cities: localMatch.map(c => ({
            cityId: c.cityId,
            cityName: c.cityName,
            citySlug: c.citySlug,
            state: "",
            lat: null,
            lng: null,
            isActive: c.isActive,
            isComingSoon: c.isComingSoon,
            source: 'db' as const,
          })),
        })
        setShowDropdown(true)
        setShowNotify(false)
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/location/search?q=${encodeURIComponent(searchQuery)}`)
      const json = await res.json()
      if (json.success && json.data) {
        const data = json.data as SearchResults
        setResults(data)
        setShowDropdown(true)
        const empty = data.areas.length === 0 && data.cities.length === 0
        setShowNotify(empty)
        if (empty) {
          setNotifyCity(searchQuery)
        }
      }
    } catch {
      setResults({ areas: [], cities: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  // Trigger serviceability checks when results change
  useEffect(() => {
    for (const area of results.areas) {
      const key = area.pincode || (area.lat && area.lng ? `${area.lat},${area.lng}` : null)
      if (key && !serviceability[key]) {
        checkServiceability(key, area.pincode, area.lat, area.lng)
      }
    }
    for (const city of results.cities) {
      if (city.citySlug && city.lat && city.lng) {
        const key = `city-${city.citySlug}`
        if (!serviceability[key]) {
          // For cities, use lat/lng for serviceability if no pincode
          checkServiceability(key, null, city.lat, city.lng)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchResults(query)
      }, 300)
    } else {
      setResults({ areas: [], cities: [] })
      setShowDropdown(false)
      setShowNotify(false)
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchResults])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelectArea(area: AreaResult) {
    if (!area.cityId || !area.cityName || !area.citySlug) {
      // Google Places result without city mapping — store with lat/lng
      onSelect({
        cityId: area.cityId || '',
        cityName: area.cityName || area.name,
        citySlug: area.citySlug || area.name.toLowerCase().replace(/\s+/g, '-'),
        pincode: area.pincode || undefined,
        areaName: area.name,
        lat: area.lat || undefined,
        lng: area.lng || undefined,
        source: area.source,
      })
    } else {
      onSelect({
        cityId: area.cityId,
        cityName: area.cityName,
        citySlug: area.citySlug,
        pincode: area.pincode || undefined,
        areaName: area.name,
        lat: area.lat || undefined,
        lng: area.lng || undefined,
        source: area.source,
      })
    }
    setQuery("")
    setShowDropdown(false)
    setResults({ areas: [], cities: [] })
  }

  function handleSelectCity(city: CityResult) {
    onSelect({
      cityId: city.cityId || '',
      cityName: city.cityName || '',
      citySlug: city.citySlug || '',
      lat: city.lat || undefined,
      lng: city.lng || undefined,
      source: city.source,
    })
    setQuery("")
    setShowDropdown(false)
    setResults({ areas: [], cities: [] })
  }

  function getAreaBadgeKey(area: AreaResult): string {
    return area.pincode || (area.lat && area.lng ? `${area.lat},${area.lng}` : '')
  }

  function getCityBadgeKey(city: CityResult): string {
    return city.citySlug ? `city-${city.citySlug}` : ''
  }

  async function handleNotify() {
    if (!notifyEmail) return
    setNotifySending(true)
    try {
      await fetch("/api/city/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: notifyEmail, cityName: notifyCity }),
      })
      setNotifySent(true)
    } catch {
      // silently fail
    } finally {
      setNotifySending(false)
    }
  }

  function renderBadge(status: ServiceabilityStatus, isComingSoon: boolean, isActive: boolean) {
    // Priority: serviceability API result > static flags
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

    if (status === 'coming_soon' || isComingSoon) {
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

    if (isActive) {
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
          onChange={(e) => setQuery(e.target.value)}
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

      {/* Results Dropdown */}
      {showDropdown && (
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
              {/* Areas Section */}
              {results.areas.length > 0 && (
                <>
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Areas
                  </p>
                  {results.areas.map((area, idx) => {
                    const badgeKey = getAreaBadgeKey(area)
                    const status = badgeKey ? serviceability[badgeKey] || null : null
                    return (
                      <button
                        key={`area-${area.id}-${idx}`}
                        onClick={() => {
                          if (area.isComingSoon && status !== 'available') {
                            setNotifyCity(area.cityName || area.name)
                            setShowNotify(true)
                          } else {
                            handleSelectArea(area)
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 transition-colors"
                      >
                        <MapPin className={`h-5 w-5 shrink-0 ${
                          status === 'available' ? 'text-[#E91E63]' :
                          area.isComingSoon ? 'text-gray-400' :
                          area.source === 'google' ? 'text-blue-500' :
                          'text-[#E91E63]'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {area.pincode ? `${area.pincode} — ${area.name}` : area.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {area.cityName}{area.state ? `, ${area.state}` : ''}
                            {area.source === 'google' && (
                              <span className="ml-1 text-blue-400">via Google</span>
                            )}
                          </p>
                        </div>
                        {renderBadge(status, area.isComingSoon, area.isActive)}
                      </button>
                    )
                  })}
                </>
              )}

              {/* Cities Section */}
              {results.cities.length > 0 && (
                <>
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Cities
                  </p>
                  {results.cities.map((city, idx) => {
                    const badgeKey = getCityBadgeKey(city)
                    const status = badgeKey ? serviceability[badgeKey] || null : null
                    return (
                      <button
                        key={`city-${city.cityId}-${idx}`}
                        onClick={() => {
                          if (city.isComingSoon && status !== 'available') {
                            setNotifyCity(city.cityName || '')
                            setShowNotify(true)
                          } else {
                            handleSelectCity(city)
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 transition-colors"
                      >
                        <MapPin className={`h-5 w-5 shrink-0 ${
                          status === 'available' ? 'text-[#E91E63]' :
                          city.isComingSoon ? 'text-gray-400' :
                          city.source === 'google' ? 'text-blue-500' :
                          'text-[#E91E63]'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {city.cityName}
                          </p>
                          {city.state && (
                            <p className="text-xs text-gray-500">
                              {city.state}
                              {city.source === 'google' && (
                                <span className="ml-1 text-blue-400">via Google</span>
                              )}
                            </p>
                          )}
                        </div>
                        {renderBadge(status, city.isComingSoon, city.isActive)}
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}

          {/* No results / Notify form */}
          {!loading && showNotify && (
            <div className="p-4">
              {notifySent ? (
                <div className="text-center py-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">We&apos;ll notify you!</p>
                  <p className="text-xs text-gray-500 mt-1">
                    When we start delivering to {notifyCity}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      We don&apos;t deliver to <strong>{notifyCity}</strong> yet
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
                        "Notify Me"
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
