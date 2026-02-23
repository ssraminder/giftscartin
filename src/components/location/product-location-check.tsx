'use client'

import { useState, useCallback } from 'react'
import { MapPin, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import { useCity } from '@/hooks/use-city'
import { LocationSearchInput } from './location-search'
import type { LocationResult } from '@/types'

interface ProductLocationCheckProps {
  productId: string
  onServiceabilityChange?: (result: {
    isServiceable: boolean
    comingSoon: boolean
    vendorCount: number
    message: string
  }) => void
}

type Status =
  | { type: 'checking'; message: string }
  | { type: 'success'; message: string }
  | { type: 'coming_soon'; message: string }
  | { type: 'unavailable'; message: string }
  | null

/**
 * Product page location block — "Gift Receiver's Location" with serviceability check.
 * All results are DB-only (areas + cities), no Google Places resolve needed.
 */
export function ProductLocationCheck({ productId, onServiceabilityChange }: ProductLocationCheckProps) {
  const { isSelected, cityName, areaName, pincode: cityPincode, setCity, setArea } = useCity()
  const [status, setStatus] = useState<Status>(null)

  const defaultValue = cityPincode
    ? (areaName ? `${areaName}, ${cityName} \u2014 ${cityPincode}` : cityPincode)
    : ''

  async function checkServiceability(pincode: string) {
    try {
      const body: Record<string, unknown> = { pincode, productId }

      const res = await fetch('/api/serviceability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      const d = json.success ? json.data : null

      if (d?.comingSoon) {
        setStatus({ type: 'coming_soon', message: "We're coming to your area soon!" })
        onServiceabilityChange?.({ isServiceable: false, comingSoon: true, vendorCount: 0, message: "We're coming to your area soon!" })
      } else if (d?.isServiceable && d.vendorCount > 0) {
        const msg = `Delivery available \u2014 ${d.vendorCount} vendor${d.vendorCount !== 1 ? 's' : ''}`
        setStatus({ type: 'success', message: msg })
        onServiceabilityChange?.({ isServiceable: true, comingSoon: false, vendorCount: d.vendorCount, message: msg })
      } else {
        setStatus({ type: 'unavailable', message: "We don't deliver here yet." })
        onServiceabilityChange?.({ isServiceable: false, comingSoon: false, vendorCount: 0, message: "We don't deliver here yet." })
      }
    } catch {
      setStatus({ type: 'unavailable', message: 'Failed to check delivery availability.' })
    }
  }

  const handleSelect = useCallback(async (result: LocationResult) => {
    setStatus({ type: 'checking', message: 'Checking delivery...' })

    // Update city context
    if (result.cityId) {
      if (!isSelected) {
        setCity({
          cityId: result.cityId,
          cityName: result.cityName || '',
          citySlug: result.citySlug || (result.cityName || '').toLowerCase().replace(/\s+/g, '-'),
          pincode: result.pincode || undefined,
          areaName: result.areaName || undefined,
          lat: result.lat || undefined,
          lng: result.lng || undefined,
          source: result.type,
        })
      } else if (result.pincode) {
        setArea({
          name: result.areaName || '',
          pincode: result.pincode,
          isServiceable: false,
        })
      }
    }

    // Check serviceability if we have a pincode
    if (result.pincode) {
      await checkServiceability(result.pincode)
      return
    }

    // City-level result without pincode — just confirm
    if (result.type === 'city') {
      setStatus({ type: 'success', message: `Delivering to ${result.cityName}` })
      onServiceabilityChange?.({ isServiceable: true, comingSoon: false, vendorCount: 0, message: `Delivering to ${result.cityName}` })
    }
  }, [isSelected, setCity, setArea, productId, onServiceabilityChange]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mb-4">
      <div className="rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-4">
        <p className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#E91E63]" />
          Gift Receiver&apos;s Location
        </p>
        {!isSelected && (
          <p className="text-xs text-gray-500 mb-2">
            Enter receiver&apos;s location to check delivery availability
          </p>
        )}
        <LocationSearchInput
          onSelect={handleSelect}
          defaultValue={defaultValue}
          placeholder="Enter receiver's area, city, or pincode"
        />

        {status && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : status.type === 'coming_soon'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : status.type === 'checking'
                    ? 'bg-gray-50 text-gray-600 border border-gray-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {status.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {status.type === 'coming_soon' && <Clock className="h-4 w-4 shrink-0" />}
            {status.type === 'checking' && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            {status.type === 'unavailable' && <XCircle className="h-4 w-4 shrink-0" />}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
