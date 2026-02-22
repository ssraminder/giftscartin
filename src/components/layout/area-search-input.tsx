'use client'

import { useEffect, useRef, useState } from 'react'

export interface AreaResult {
  description: string      // "Sector 22, Chandigarh, Chandigarh, India"
  displayName: string      // "Sector 22, Chandigarh"
  pincode: string | null   // "160022" — extracted from geocoding
  placeId: string
}

interface AreaSearchInputProps {
  cityName: string         // e.g. "Chandigarh" — used to bias results
  onAreaSelect: (area: AreaResult) => void
  placeholder?: string
  defaultValue?: string
}

// Fallback: reverse geocode lat/lng to get pincode
async function reverseGeocodeForPincode(lat: number, lng: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status !== 'OK' || !results?.length) {
          resolve(null)
          return
        }
        for (const result of results) {
          const postalCode = result.address_components.find(c => c.types.includes('postal_code'))
          if (postalCode) {
            resolve(postalCode.long_name)
            return
          }
        }
        resolve(null)
      })
    } catch {
      resolve(null)
    }
  })
}

export function AreaSearchInput({
  onAreaSelect,
  placeholder = 'Search area, locality or pincode',
}: AreaSearchInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const placeElementRef = useRef<HTMLElement | null>(null)
  const initAttempted = useRef(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (initAttempted.current) return

    const init = () => {
      if (!window.google?.maps?.places?.PlaceAutocompleteElement) return
      if (!containerRef.current) return
      if (placeElementRef.current) return // already initialized

      initAttempted.current = true

      try {
        const element = new window.google.maps.places.PlaceAutocompleteElement({
          componentRestrictions: { country: 'IN' },
          types: ['geocode', 'establishment'],
        })

        containerRef.current.appendChild(element)
        placeElementRef.current = element

        // Set placeholder on the inner input once it renders
        const setPlaceholder = () => {
          const input = element.querySelector?.('input') ?? containerRef.current?.querySelector('input')
          if (input) {
            input.setAttribute('placeholder', placeholder)
          }
        }
        setPlaceholder()
        // Retry in case shadow DOM renders asynchronously
        setTimeout(setPlaceholder, 100)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        element.addEventListener('gmp-placeselect', async (event: any) => {
          const place = event.place

          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'addressComponents', 'location']
          })

          const pincode = place.addressComponents?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => c.types.includes('postal_code')
          )?.longText ?? null

          let finalPincode = pincode
          if (!finalPincode && place.location) {
            finalPincode = await reverseGeocodeForPincode(
              place.location.lat(),
              place.location.lng()
            )
          }

          const displayName = place.displayName ??
            place.formattedAddress?.split(',').slice(0, 2).join(',').trim() ?? ''

          onAreaSelect({
            description: place.formattedAddress ?? '',
            displayName,
            pincode: finalPincode,
            placeId: place.id ?? '',
          })
        })
      } catch (err) {
        console.error('PlaceAutocompleteElement init failed:', err)
        setError(true)
      }
    }

    if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      init()
    } else {
      const interval = setInterval(() => {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) {
          clearInterval(interval)
          init()
        }
      }, 200)
      const timeout = setTimeout(() => {
        clearInterval(interval)
        if (!initAttempted.current) {
          initAttempted.current = true
          setError(true)
        }
      }, 5000)
      return () => { clearInterval(interval); clearTimeout(timeout) }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full border border-gray-300 rounded-lg px-3 py-3 flex items-center gap-2 cursor-text hover:border-gray-400 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 transition-colors [&_input]:border-none [&_input]:outline-none [&_input]:w-full [&_input]:bg-transparent [&_input]:text-sm [&_input]:text-gray-900 [&_input]:placeholder-gray-400"
      />
      {error && (
        <input
          type="text"
          placeholder="Enter 6-digit pincode"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 mt-1"
          maxLength={6}
          inputMode="numeric"
          pattern="[0-9]*"
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '')
            if (val !== e.target.value) {
              e.target.value = val
            }
            if (val.length === 6) {
              onAreaSelect({
                description: val,
                displayName: val,
                pincode: val,
                placeId: '',
              })
            }
          }}
        />
      )}
    </div>
  )
}
