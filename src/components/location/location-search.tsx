'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useLocationSearch } from '@/hooks/use-location-search'
import type { LocationResult } from '@/types'

interface LocationSearchInputProps {
  onSelect: (result: LocationResult) => void
  defaultValue?: string
  autoFocus?: boolean
  placeholder?: string
  compact?: boolean
}

/**
 * Pure search input with dropdown — DB-only results (areas + cities).
 * Each consumer (modal, header, product page) handles selection logic itself.
 */
export function LocationSearchInput({
  onSelect,
  defaultValue = '',
  autoFocus = false,
  placeholder = 'Search area, city, or pincode',
  compact = false,
}: LocationSearchInputProps) {
  const [query, setQuery] = useState(defaultValue)
  const { results, loading } = useLocationSearch(query)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasResults = results.length > 0

  useEffect(() => {
    if (hasResults && query.length >= 2) {
      setShowDropdown(true)
    } else if (query.length < 2) {
      setShowDropdown(false)
    }
  }, [hasResults, query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback(
    (result: LocationResult) => {
      setQuery(result.areaName || result.cityName || result.label)
      setShowDropdown(false)
      onSelect(result)
    },
    [onSelect]
  )

  const inputHeight = compact ? 'h-9 text-sm' : 'h-11 text-sm'

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (hasResults) setShowDropdown(true) }}
          className={`pl-10 ${inputHeight} rounded-xl border border-gray-200 bg-white focus:border-pink-400 placeholder:text-gray-400`}
          autoFocus={autoFocus}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-72 overflow-y-auto">
          {loading && !hasResults && (
            <div className="p-4 flex items-center gap-3 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {!loading && !hasResults && query.length >= 2 && (
            <div className="p-4 text-sm text-gray-500 text-center">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {hasResults && (
            <div className="py-1">
              {results.map((result, idx) => (
                <button
                  key={`${result.type}-${idx}-${result.pincode || result.label}`}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-[#E91E63] mt-0.5" />
                  <span className="text-sm text-gray-900 leading-snug">
                    {result.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Re-export for backwards compat
export { LocationSearchInput as LocationSearch }
