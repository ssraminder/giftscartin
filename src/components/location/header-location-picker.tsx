'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCity } from '@/hooks/use-city'
import { LocationSearchInput } from './location-search'
import type { LocationResult } from '@/types'

/**
 * Compact location picker for the header — dropdown with search.
 */
export function HeaderLocationPicker() {
  const { cityName, areaName, isSelected, setCity, clearCity } = useCity()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback(async (result: LocationResult) => {
    if (result.type === 'area' || result.type === 'city') {
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
      setOpen(false)
      return
    }

    // Google Place — resolve
    if (result.type === 'google_place' && result.placeId) {
      try {
        const res = await fetch(`/api/location/resolve-place?placeId=${encodeURIComponent(result.placeId)}`)
        const json = await res.json()
        if (json.success && json.data) {
          const { lat, lng, pincode, city } = json.data
          setCity({
            cityId: '',
            cityName: city || result.areaName || '',
            citySlug: (city || result.areaName || '').toLowerCase().replace(/\s+/g, '-'),
            pincode: pincode || undefined,
            areaName: result.areaName || undefined,
            lat: lat || undefined,
            lng: lng || undefined,
            source: 'google_place',
          })
          setOpen(false)
          return
        }
      } catch {
        // fall through
      }
      setCity({
        cityId: '',
        cityName: result.areaName || result.label,
        citySlug: (result.areaName || result.label).toLowerCase().replace(/\s+/g, '-'),
        source: 'google_place',
      })
      setOpen(false)
    }
  }, [setCity])

  const displayText = isSelected
    ? (areaName || cityName || 'Location set')
    : null

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm hover:text-[#E91E63] transition-colors"
      >
        <span className="text-base leading-none">{'\u{1F1EE}\u{1F1F3}'}</span>
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-gray-400 leading-none">Where to deliver?</span>
          {displayText ? (
            <span className="text-xs font-semibold text-gray-800 max-w-[140px] truncate leading-tight">
              {displayText}
            </span>
          ) : (
            <span className="text-xs font-semibold text-red-500 leading-tight">
              Location missing
            </span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
      </button>

      {/* Desktop dropdown */}
      {open && (
        <div className="hidden sm:block absolute left-0 top-full mt-2 w-96 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">
              {isSelected ? `Delivering to ${cityName || 'your area'}` : 'Where should we deliver?'}
            </p>
            {isSelected && (
              <button onClick={() => clearCity()} className="text-xs text-pink-600 hover:underline">
                Change
              </button>
            )}
          </div>
          <LocationSearchInput
            onSelect={handleSelect}
            autoFocus
            compact
          />
        </div>
      )}

      {/* Mobile dropdown (full-width below header) */}
      {open && (
        <div className="sm:hidden fixed inset-x-0 top-[56px] bg-white border-b border-gray-200 shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">
              {isSelected ? `Delivering to ${cityName || 'your area'}` : 'Where should we deliver?'}
            </p>
            {isSelected && (
              <button onClick={() => clearCity()} className="text-xs text-pink-600 hover:underline">
                Change
              </button>
            )}
          </div>
          <LocationSearchInput
            onSelect={handleSelect}
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
