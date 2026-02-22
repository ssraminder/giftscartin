'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { parseGoogleAddressComponents, reverseGeocode } from '@/lib/nominatim'
import type { VendorAddressResult } from './types'

interface Props {
  onSelect: (result: VendorAddressResult) => void
  onSwitchToMap: () => void
}

export function GooglePlacesSearch({ onSelect, onSwitchToMap }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [googleAvailable, setGoogleAvailable] = useState(false)

  useEffect(() => {
    // Check if Google Places is loaded
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      setGoogleAvailable(true)
      initAutocomplete()
    } else {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          setGoogleAvailable(true)
          initAutocomplete()
          clearInterval(checkInterval)
        }
      }, 500)
      // After 5 seconds, give up -- user can use map
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
      }, 5000)
      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function initAutocomplete() {
    if (!inputRef.current || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'IN' },
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'address_components', 'geometry', 'name'],
    })

    autocomplete.addListener('place_changed', async () => {
      const place = autocomplete.getPlace()
      if (!place.geometry?.location) return

      setIsLoading(true)

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      let pincode = ''
      let city = ''
      let state = ''

      if (place.address_components) {
        const parsed = parseGoogleAddressComponents(place.address_components)
        pincode = parsed.pincode
        city = parsed.city
        state = parsed.state
      }

      // If Google didn't give us a pincode, use Nominatim
      if (!pincode) {
        const nominatim = await reverseGeocode(lat, lng)
        if (nominatim) {
          pincode = nominatim.pincode
          if (!city) city = nominatim.city
          if (!state) state = nominatim.state
        }
      }

      setIsLoading(false)

      onSelect({
        address: place.formatted_address || place.name || '',
        details: '',
        lat,
        lng,
        pincode,
        city,
        state,
        source: 'google',
      })
    })

    autocompleteRef.current = autocomplete
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            googleAvailable
              ? 'Search your shop name or address...'
              : 'Type your shop address...'
          }
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
            text-sm focus:outline-none focus:border-pink-500
            focus:ring-1 focus:ring-pink-500 transition-colors
            placeholder:text-gray-400"
        />
      </div>

      <button
        type="button"
        onClick={onSwitchToMap}
        className="flex items-center gap-1.5 text-sm text-pink-600
          hover:text-pink-700 transition-colors group"
      >
        <MapPin className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
        Can&apos;t find your address? Place pin on map
      </button>
    </div>
  )
}
