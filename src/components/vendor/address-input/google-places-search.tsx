'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, MapPin, Loader2, X } from 'lucide-react'
import { parseGoogleAddressComponents, reverseGeocode } from '@/lib/nominatim'
import type { VendorAddressResult } from './types'

type Suggestion = google.maps.places.AutocompleteSuggestion

interface Props {
  onSelect: (result: VendorAddressResult) => void
  onSwitchToMap: () => void
}

export function GooglePlacesSearch({ onSelect, onSwitchToMap }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check Google availability
  useEffect(() => {
    let attempts = 0
    const check = () => {
      attempts++
      if (window.google?.maps?.places?.AutocompleteSuggestion) {
        setGoogleAvailable(true)
        return
      }
      if (attempts < 10) setTimeout(check, 500)
    }
    check()
  }, [])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3 || !googleAvailable) {
      setSuggestions([])
      return
    }

    setIsFetching(true)
    try {
      const { suggestions: results } =
        await google.maps.places.AutocompleteSuggestion
          .fetchAutocompleteSuggestions({
            input: query,
            includedRegionCodes: ['IN'],
          })
      setSuggestions(results || [])
      setShowDropdown(true)
    } catch (err) {
      console.error('Autocomplete error:', err)
      setSuggestions([])
    } finally {
      setIsFetching(false)
    }
  }, [googleAvailable])

  const handleInputChange = (value: string) => {
    setInputValue(value)

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    // Debounce: only fire after 450ms of no typing
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 450)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSuggestionSelect = async (suggestion: Suggestion) => {
    const prediction = suggestion.placePrediction
    if (!prediction) return

    setInputValue(prediction.text.text)
    setShowDropdown(false)
    setSuggestions([])
    setIsLoading(true)

    try {
      // Fetch full place details
      const place = new google.maps.places.Place({ id: prediction.placeId })
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'addressComponents', 'location'],
      })

      const lat = place.location?.lat() ?? 0
      const lng = place.location?.lng() ?? 0

      let pincode = ''
      let city = ''
      let state = ''

      if (place.addressComponents) {
        const parsed = parseGoogleAddressComponents(
          place.addressComponents as unknown as google.maps.GeocoderAddressComponent[]
        )
        pincode = parsed.pincode
        city = parsed.city
        state = parsed.state
      }

      // Fallback to Nominatim if no pincode from Google
      if (!pincode && lat && lng) {
        const nominatim = await reverseGeocode(lat, lng)
        if (nominatim) {
          pincode = nominatim.pincode
          if (!city) city = nominatim.city
          if (!state) state = nominatim.state
        }
      }

      onSelect({
        address: place.formattedAddress || place.displayName || prediction.text.text,
        details: '',
        lat,
        lng,
        pincode,
        city,
        state,
        source: 'google',
      })
    } catch (err) {
      console.error('Place details error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center
          pointer-events-none z-10">
          {isLoading || isFetching ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={
            googleAvailable
              ? 'Search your shop name or address...'
              : 'Loading search...'
          }
          disabled={!googleAvailable}
          className="w-full pl-10 pr-8 py-3 border border-gray-300
            rounded-lg text-sm focus:outline-none focus:border-pink-500
            focus:ring-1 focus:ring-pink-500 transition-colors
            placeholder:text-gray-400 disabled:bg-gray-50
            disabled:text-gray-400"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('')
              setSuggestions([])
              setShowDropdown(false)
            }}
            className="absolute inset-y-0 right-2.5 flex items-center
              text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Suggestions dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white
            border border-gray-200 rounded-lg shadow-lg z-50
            max-h-64 overflow-y-auto">
            {suggestions.map((suggestion) => {
              const prediction = suggestion.placePrediction
              if (!prediction) return null
              return (
                <button
                  key={prediction.placeId}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50
                    transition-colors border-b border-gray-100 last:border-0
                    flex items-start gap-3"
                >
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {prediction.mainText?.text || prediction.text.text}
                    </p>
                    {prediction.secondaryText && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {prediction.secondaryText.text}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Map fallback link */}
      <button
        type="button"
        onClick={onSwitchToMap}
        className="flex items-center gap-1.5 text-sm text-pink-600
          hover:text-pink-700 transition-colors group"
      >
        <MapPin className="h-3.5 w-3.5 group-hover:scale-110
          transition-transform" />
        Can&apos;t find your address? Place pin on map
      </button>
    </div>
  )
}
