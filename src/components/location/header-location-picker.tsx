'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, MapPin, Loader2 } from 'lucide-react'
import { useCity } from '@/hooks/use-city'

interface CityOption {
  id: string
  name: string
  slug: string
  state: string
}

type PincodeStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'serviceable'; cityName: string; areaName: string }
  | { type: 'coming_soon'; areaName: string }
  | { type: 'not_serviceable' }
  | { type: 'error'; message: string }

export function HeaderLocationPicker() {
  const { cityName, pincode: ctxPincode, isSelected, setCity } = useCity()
  const [open, setOpen] = useState(false)
  const [cities, setCities] = useState<CityOption[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [pincodeInput, setPincodeInput] = useState('')
  const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>({ type: 'idle' })
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch cities when dropdown opens
  useEffect(() => {
    if (!open || cities.length > 0) return
    setLoadingCities(true)
    fetch('/api/cities')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.cities) {
          setCities(json.data.cities)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCities(false))
  }, [open, cities.length])

  const handleCitySelect = useCallback(
    (city: CityOption) => {
      setCity({
        cityId: city.id,
        cityName: city.name,
        citySlug: city.slug,
      })
      setOpen(false)
      setPincodeInput('')
      setPincodeStatus({ type: 'idle' })
    },
    [setCity]
  )

  const handlePincodeCheck = useCallback(async () => {
    if (!/^\d{6}$/.test(pincodeInput)) return
    setPincodeStatus({ type: 'checking' })
    try {
      const res = await fetch('/api/serviceability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: pincodeInput }),
      })
      const json = await res.json()
      const d = json.success ? json.data : null

      if (d?.comingSoon) {
        setPincodeStatus({ type: 'coming_soon', areaName: d.areaName || '' })
      } else if (d?.isServiceable && d.vendorCount > 0) {
        const cName = d.city?.name || d.cityName || ''
        const aName = d.areaName || ''
        setPincodeStatus({ type: 'serviceable', cityName: cName, areaName: aName })
        setCity({
          cityId: d.city?.id || '',
          cityName: cName,
          citySlug: d.city?.slug || cName.toLowerCase().replace(/\s+/g, '-'),
          pincode: pincodeInput,
          areaName: aName || undefined,
        })
        setOpen(false)
      } else {
        setPincodeStatus({ type: 'not_serviceable' })
      }
    } catch {
      setPincodeStatus({ type: 'error', message: 'Failed to check' })
    }
  }, [pincodeInput, setCity])

  const displayText = isSelected
    ? `${cityName || 'City'}${ctxPincode ? ` - ${ctxPincode}` : ''}`
    : null

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm hover:text-[#E91E63] transition-colors"
      >
        <MapPin className="h-4 w-4 text-[#E91E63]" />
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-gray-400 leading-none">Deliver to</span>
          {displayText ? (
            <span className="text-xs font-semibold text-gray-800 max-w-[160px] truncate leading-tight">
              {displayText}
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#E91E63] leading-tight">
              Select City
            </span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Select your city</p>

          {/* City list */}
          {loadingCities ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isSelected && cityName === city.name
                      ? 'bg-[#E91E63] text-white border-[#E91E63]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#E91E63] hover:text-[#E91E63]'
                  }`}
                >
                  {city.name}
                </button>
              ))}
              {cities.length === 0 && !loadingCities && (
                <p className="text-xs text-gray-500">No cities available</p>
              )}
            </div>
          )}

          {/* Pincode input */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-2">Or check by pincode</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit pincode"
                value={pincodeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setPincodeInput(val)
                  if (pincodeStatus.type !== 'idle') setPincodeStatus({ type: 'idle' })
                }}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#E91E63]"
              />
              <button
                onClick={handlePincodeCheck}
                disabled={pincodeInput.length !== 6 || pincodeStatus.type === 'checking'}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#E91E63] text-white disabled:opacity-50 hover:bg-[#C2185B] transition-colors"
              >
                {pincodeStatus.type === 'checking' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Check'
                )}
              </button>
            </div>

            {/* Pincode status messages */}
            {pincodeStatus.type === 'coming_soon' && (
              <p className="mt-2 text-xs text-blue-600 font-medium">
                {pincodeStatus.areaName ? `We're coming to ${pincodeStatus.areaName} soon!` : "We're coming to your area soon!"}
              </p>
            )}
            {pincodeStatus.type === 'not_serviceable' && (
              <p className="mt-2 text-xs text-red-600 font-medium">
                Not serviceable yet
              </p>
            )}
            {pincodeStatus.type === 'error' && (
              <p className="mt-2 text-xs text-red-600 font-medium">
                {pincodeStatus.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
