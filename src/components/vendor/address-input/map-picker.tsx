'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { reverseGeocode } from '@/lib/nominatim'
import type { VendorAddressResult } from './types'

// Leaflet must be dynamically imported -- no SSR
const MapComponent = dynamic(() => import('./leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 bg-gray-100 rounded-lg flex items-center
      justify-center border border-gray-200">
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  )
})

interface Props {
  onSelect: (result: VendorAddressResult) => void
  onBack: () => void
  initialLat?: number
  initialLng?: number
}

export function MapPicker({ onSelect, onBack, initialLat = 30.7333, initialLng = 76.7794 }: Props) {
  const [lat, setLat] = useState(initialLat)
  const [lng, setLng] = useState(initialLng)
  const [resolvedAddress, setResolvedAddress] = useState<VendorAddressResult | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  // Resolve address when pin moves
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsResolving(true)
      const result = await reverseGeocode(lat, lng)
      if (result) {
        setResolvedAddress({
          address: result.address,
          details: '',
          lat,
          lng,
          pincode: result.pincode,
          city: result.city,
          state: result.state,
          source: 'map',
        })
      }
      setIsResolving(false)
    }, 600) // debounce

    return () => clearTimeout(timer)
  }, [lat, lng])

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500
          hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to address search
      </button>

      <p className="text-sm text-gray-500">
        Drag the pin to your exact shop location
      </p>

      <MapComponent
        lat={lat}
        lng={lng}
        onMove={(newLat, newLng) => {
          setLat(newLat)
          setLng(newLng)
        }}
      />

      {/* Resolved address preview */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 min-h-[64px]">
        {isResolving ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Finding address...
          </div>
        ) : resolvedAddress ? (
          <div className="space-y-1">
            <p className="text-sm text-gray-700 line-clamp-2">
              {resolvedAddress.address}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {resolvedAddress.pincode && (
                <span className="text-xs bg-pink-100 text-pink-700
                  px-2 py-0.5 rounded-full font-medium">
                  {resolvedAddress.pincode}
                </span>
              )}
              {resolvedAddress.city && (
                <span className="text-xs text-gray-500">
                  {resolvedAddress.city}, {resolvedAddress.state}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Move the map to detect your address
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={!resolvedAddress || isResolving}
        onClick={() => resolvedAddress && onSelect(resolvedAddress)}
        className="w-full py-3 bg-pink-600 text-white rounded-lg text-sm
          font-medium hover:bg-pink-700 disabled:opacity-50
          disabled:cursor-not-allowed transition-colors"
      >
        Confirm this location
      </button>
    </div>
  )
}
