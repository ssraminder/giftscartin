'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { parseGoogleAddressComponents, reverseGeocode } from '@/lib/nominatim'
import type { VendorAddressResult } from './types'

interface Props {
  onSelect: (result: VendorAddressResult) => void
  onSwitchToMap: () => void
}

export function GooglePlacesSearch({ onSelect, onSwitchToMap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<HTMLElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 10

    const tryInit = () => {
      attempts++
      // Check for the NEW Places API (PlaceAutocompleteElement)
      if (
        typeof window !== 'undefined' &&
        window.google?.maps?.places?.PlaceAutocompleteElement
      ) {
        initElement()
        return
      }
      if (attempts < maxAttempts) {
        setTimeout(tryInit, 500)
      }
      // If Google never loads, map picker is the fallback
    }

    const container = containerRef.current

    tryInit()

    return () => {
      // Cleanup: remove the element if component unmounts
      if (elementRef.current && container) {
        try {
          container.removeChild(elementRef.current)
        } catch {
          // Element may already be removed
        }
        elementRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function initElement() {
    if (!containerRef.current || elementRef.current) return

    // Create PlaceAutocompleteElement (new Places API web component)
    const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
      componentRestrictions: { country: 'IN' },
      types: ['establishment', 'geocode'],
    })

    // Style the web component to match site design
    placeAutocomplete.style.width = '100%'
    placeAutocomplete.setAttribute('placeholder', 'Search your shop name or address...')

    // Listen for place selection
    placeAutocomplete.addEventListener(
      'gmp-placeselect',
      async (event: Event) => {
        const placeSelectEvent = event as CustomEvent
        const place = placeSelectEvent.detail?.place as google.maps.places.Place

        if (!place) return

        setIsLoading(true)
        setError(null)

        try {
          // Fetch full details
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

          // Fallback to Nominatim if Google didn't return pincode
          if (!pincode && lat && lng) {
            const nominatim = await reverseGeocode(lat, lng)
            if (nominatim) {
              pincode = nominatim.pincode
              if (!city) city = nominatim.city
              if (!state) state = nominatim.state
            }
          }

          onSelect({
            address: place.formattedAddress || place.displayName || '',
            details: '',
            lat,
            lng,
            pincode,
            city,
            state,
            source: 'google',
          })
        } catch (err) {
          console.error('Place fetch error:', err)
          setError('Could not fetch address details. Please try the map picker.')
        } finally {
          setIsLoading(false)
        }
      }
    )

    containerRef.current.appendChild(placeAutocomplete)
    elementRef.current = placeAutocomplete
  }

  return (
    <div className="space-y-3">
      {/* Container for PlaceAutocompleteElement web component */}
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full [&>*]:w-full [&>*]:border [&>*]:border-gray-300
            [&>*]:rounded-lg [&>*]:text-sm [&>*]:px-3 [&>*]:py-3
            [&>*:focus]:border-pink-500 [&>*:focus]:ring-1
            [&>*:focus]:ring-pink-500 [&>*]:outline-none"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Map fallback link */}
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
