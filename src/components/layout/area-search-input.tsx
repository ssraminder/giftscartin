'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'

export interface AreaResult {
  description: string      // "Sector 22, Chandigarh, Chandigarh, India"
  displayName: string      // "Sector 22, Chandigarh"
  pincode: string | null   // "160022" — extracted from geocoding
  placeId: string
}

// Instance type returned by new google.maps.places.Autocomplete()
interface AutocompleteInstance {
  getPlace: () => {
    place_id?: string
    formatted_address?: string
    name?: string
    address_components?: Array<{
      long_name: string
      short_name: string
      types: string[]
    }>
    geometry?: {
      location: {
        lat: () => number
        lng: () => number
      }
    }
  }
  addListener: (event: string, handler: () => void) => void
  setBounds: (bounds: object) => void
}

interface AreaSearchInputProps {
  cityName: string         // e.g. "Chandigarh" — used to bias results
  onAreaSelect: (area: AreaResult) => void
  placeholder?: string
  defaultValue?: string
}

// Extract pincode from Google address_components array
function extractPincode(components: Array<{ long_name: string; short_name: string; types: string[] }>): string | null {
  const postalCode = components.find(c => c.types.includes('postal_code'))
  return postalCode?.long_name ?? null
}

// Fallback: reverse geocode lat/lng to get pincode
async function reverseGeocodeForPincode(lat: number, lng: number): Promise<string | null> {
  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        resolve(null)
        return
      }
      for (const result of results) {
        const pincode = extractPincode(result.address_components)
        if (pincode) {
          resolve(pincode)
          return
        }
      }
      resolve(null)
    })
  })
}

export function AreaSearchInput({
  cityName,
  onAreaSelect,
  placeholder = "Enter area, street or landmark",
  defaultValue = ""
}: AreaSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<AutocompleteInstance | null>(null)
  const [inputValue, setInputValue] = useState(defaultValue)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlaceChanged = useCallback(async () => {
    if (!autocompleteRef.current) return

    const place = autocompleteRef.current.getPlace()
    if (!place.geometry) return

    setIsLoading(true)
    setError(null)

    try {
      // Extract pincode from address_components
      let finalPincode = extractPincode(place.address_components ?? [])

      // If pincode not in address components, reverse geocode using coordinates
      if (!finalPincode && place.geometry?.location) {
        finalPincode = await reverseGeocodeForPincode(
          place.geometry.location.lat(),
          place.geometry.location.lng()
        )
      }

      // Build display name — use place name or first part of formatted address
      const displayName = place.name && place.name !== place.formatted_address
        ? `${place.name}, ${cityName}`
        : (place.formatted_address ?? '').split(',').slice(0, 2).join(',').trim()

      setInputValue(displayName)

      onAreaSelect({
        description: place.formatted_address ?? '',
        displayName,
        pincode: finalPincode,
        placeId: place.place_id ?? '',
      })
    } catch {
      setError('Could not get location details. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [cityName, onAreaSelect])

  useEffect(() => {
    // Wait for Google Maps to load
    const initAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) return
      if (autocompleteRef.current) return // already initialized

      const ac = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: 'IN' },
          types: ['geocode', 'establishment'],
          fields: ['place_id', 'formatted_address', 'address_components', 'name', 'geometry'],
        }
      )

      ac.addListener('place_changed', handlePlaceChanged)
      autocompleteRef.current = ac
    }

    // Google Maps may already be loaded or may load later
    if (window.google?.maps?.places) {
      initAutocomplete()
    } else {
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(interval)
          initAutocomplete()
        }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [handlePlaceChanged])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 animate-spin" />
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
