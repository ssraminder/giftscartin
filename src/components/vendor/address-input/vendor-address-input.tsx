'use client'

import { useState } from 'react'
import { GooglePlacesSearch } from './google-places-search'
import { MapPicker } from './map-picker'
import { AddressConfirmation } from './address-confirmation'
import type { VendorAddressResult, AddressMode } from './types'

interface Props {
  value?: VendorAddressResult | null
  onChange: (value: VendorAddressResult | null) => void
  label?: string
  required?: boolean
  error?: string
}

export function VendorAddressInput({
  value,
  onChange,
  label = 'Shop Address',
  required = false,
  error,
}: Props) {
  const [mode, setMode] = useState<AddressMode>(
    value ? 'confirmed' : 'search'
  )

  const handleSelect = (result: VendorAddressResult) => {
    onChange(result)
    setMode('confirmed')
  }

  const handleDetailsChange = (details: string) => {
    if (value) {
      onChange({ ...value, details })
    }
  }

  const handleReset = () => {
    onChange(null)
    setMode('search')
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {/* Content by mode */}
      {mode === 'search' && (
        <GooglePlacesSearch
          onSelect={handleSelect}
          onSwitchToMap={() => setMode('map')}
        />
      )}

      {mode === 'map' && (
        <MapPicker
          onSelect={handleSelect}
          onBack={() => setMode('search')}
          initialLat={30.7333}
          initialLng={76.7794}
        />
      )}

      {mode === 'confirmed' && value && (
        <AddressConfirmation
          result={value}
          onDetailsChange={handleDetailsChange}
          onReset={handleReset}
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

// Re-export types for convenience
export type { VendorAddressResult } from './types'
