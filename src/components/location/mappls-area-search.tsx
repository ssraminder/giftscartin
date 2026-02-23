'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, MapPin, Search, X } from 'lucide-react'

export interface MapplsResult {
  placeId: string
  name: string
  address: string
  type: string
  pincode?: string
  lat?: number
  lng?: number
}

interface MapplsAreaSearchProps {
  placeholder?: string
  onSelect: (result: MapplsResult) => void
  cityBias?: { lat: number; lng: number }
  className?: string
  disabled?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  CITY: 'bg-blue-100 text-blue-700',
  LOCALITY: 'bg-green-100 text-green-700',
  POI: 'bg-amber-100 text-amber-700',
  SUBLOCALITY: 'bg-purple-100 text-purple-700',
  VILLAGE: 'bg-orange-100 text-orange-700',
  STATE: 'bg-red-100 text-red-700',
  PINCODE: 'bg-gray-100 text-gray-700',
}

export function MapplsAreaSearch({
  placeholder = 'Search area, locality or pincode',
  onSelect,
  cityBias,
  className,
  disabled = false,
}: MapplsAreaSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MapplsResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchResults = useCallback(
    async (searchQuery: string) => {
      // Cancel any in-flight request
      if (abortRef.current) {
        abortRef.current.abort()
      }

      if (searchQuery.trim().length < 3) {
        setResults([])
        setIsOpen(false)
        setIsLoading(false)
        return
      }

      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      setHasError(false)

      try {
        const params = new URLSearchParams({ q: searchQuery.trim() })
        if (cityBias) {
          params.set('lat', String(cityBias.lat))
          params.set('lng', String(cityBias.lng))
        }

        const res = await fetch(`/api/mappls/search?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const json = await res.json()

        if (!json.success) {
          throw new Error(json.error || 'Search failed')
        }

        setResults(json.data.results ?? [])
        setIsOpen(true)
        setActiveIndex(-1)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return // request was cancelled, don't update state
        }
        console.error('[MapplsAreaSearch] fetch error:', err)
        setHasError(true)
        setResults([])
        setIsOpen(true)
      } finally {
        setIsLoading(false)
      }
    },
    [cityBias]
  )

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 3) {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      fetchResults(query)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, fetchResults])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(result: MapplsResult) {
    setQuery(result.name)
    setIsOpen(false)
    setResults([])
    onSelect(result)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setHasError(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
          )}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="mappls-results-listbox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `mappls-result-${activeIndex}` : undefined}
        />
        {/* Right side: spinner or clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : query.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          id="mappls-results-listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg max-h-64 overflow-y-auto"
          role="listbox"
        >
          {hasError ? (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              Search unavailable
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              No results found
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.placeId}-${index}`}
                id={`mappls-result-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  'w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer',
                  index === activeIndex
                    ? 'bg-accent/10'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {result.name}
                    </span>
                    {result.type && (
                      <span
                        className={cn(
                          'shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                          TYPE_COLORS[result.type] ?? 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {result.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {result.address}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
