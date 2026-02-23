'use client'

import { useState, useCallback } from 'react'
import { Gift, X } from 'lucide-react'
import { useCity } from '@/hooks/use-city'
import { LocationSearchInput } from './location-search'
import type { LocationResult } from '@/types'

interface CityModalProps {
  onClose?: () => void
}

/**
 * City selection modal — dismissible bottom sheet.
 * All results are DB-only (areas + cities).
 */
export function CityModal({ onClose }: CityModalProps) {
  const { setCity } = useCity()
  const [animateIn, setAnimateIn] = useState(true)

  function dismiss() {
    setAnimateIn(false)
    setTimeout(() => onClose?.(), 150)
  }

  const handleSelect = useCallback((result: LocationResult) => {
    setAnimateIn(false)
    setTimeout(() => {
      setCity({
        cityId: result.cityId || '',
        cityName: result.cityName || '',
        citySlug: result.citySlug || (result.cityName || '').toLowerCase().replace(/\s+/g, '-'),
        pincode: result.pincode || undefined,
        areaName: result.areaName || undefined,
        lat: result.lat || undefined,
        lng: result.lng || undefined,
        source: result.type,
      })
      onClose?.()
    }, 150)
  }, [setCity, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      <div
        className={`relative w-full sm:max-w-md mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl transition-all duration-300 ${
          animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>

        <div className="px-6 pt-8 pb-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E91E63] to-[#9C27B0]">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-[#E91E63]">Gifts</span>
                <span className="text-2xl font-bold text-[#1A1A2E]">Cart</span>
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Where should we deliver?
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter receiver&apos;s area, city, or pincode
          </p>
        </div>

        <div className="px-6 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-lg">{'\u{1F1EE}\u{1F1F3}'}</span>
            <span className="text-sm font-medium text-gray-700">India</span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <LocationSearchInput
            onSelect={handleSelect}
            autoFocus
            placeholder="Search area, city, or pincode"
          />
        </div>

        <div className="h-safe-area-inset-bottom sm:hidden" />
      </div>
    </div>
  )
}
