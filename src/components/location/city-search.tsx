"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, MapPin, CheckCircle2, Clock, Bell, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { CitySelection } from "@/components/providers/city-provider"

interface CityMatch {
  cityId: string
  cityName: string
  citySlug: string
  state: string
  pincode?: string
  areaName?: string | null
  isActive: boolean
  isComingSoon: boolean
}

interface CitySearchProps {
  onSelect: (selection: CitySelection) => void
  placeholder?: string
  autoFocus?: boolean
}

export function CitySearch({
  onSelect,
  placeholder = "Search city or enter pincode...",
  autoFocus = false,
}: CitySearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CityMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotify, setShowNotify] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState("")
  const [notifyCity, setNotifyCity] = useState("")
  const [notifySending, setNotifySending] = useState(false)
  const [notifySent, setNotifySent] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/city/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setResults(json.data)
        setShowDropdown(true)
        setShowNotify(json.data.length === 0)
        if (json.data.length === 0) {
          setNotifyCity(searchQuery)
        }
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchResults(query)
      }, 300)
    } else {
      setResults([])
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

  function handleSelect(match: CityMatch) {
    onSelect({
      cityId: match.cityId,
      cityName: match.cityName,
      citySlug: match.citySlug,
      pincode: match.pincode,
      areaName: match.areaName ?? undefined,
    })
    setQuery("")
    setShowDropdown(false)
    setResults([])
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
            if (results.length > 0 || showNotify) setShowDropdown(true)
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
          {loading && results.length === 0 && (
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

          {!loading && results.length > 0 && (
            <div className="py-1">
              {results.map((match, idx) => (
                <button
                  key={`${match.cityId}-${match.pincode || idx}`}
                  onClick={() => {
                    if (match.isComingSoon) {
                      setNotifyCity(match.cityName)
                      setShowNotify(true)
                    } else {
                      handleSelect(match)
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 transition-colors"
                >
                  <MapPin className={`h-5 w-5 shrink-0 ${match.isComingSoon ? 'text-gray-400' : 'text-[#E91E63]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {match.pincode
                        ? `${match.pincode} — ${match.areaName || match.cityName}`
                        : match.cityName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {match.pincode ? `${match.cityName}, ${match.state}` : match.state}
                    </p>
                  </div>
                  {match.isComingSoon ? (
                    <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      Coming soon
                    </span>
                  ) : match.isActive ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      We deliver here
                    </span>
                  ) : null}
                </button>
              ))}
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
                      className="h-9 text-sm"
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
