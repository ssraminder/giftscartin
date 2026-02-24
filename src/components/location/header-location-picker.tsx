'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, MapPin, Loader2, Check } from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import { POPULAR_CITIES } from '@/lib/cities-data'

type PincodeStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'serviceable'; cityName: string; areaName: string }
  | { type: 'coming_soon'; areaName: string }
  | { type: 'not_serviceable' }
  | { type: 'error'; message: string }

export function HeaderLocationPicker() {
  const cityId = useLocation((s) => s.cityId)
  const cityName = useLocation((s) => s.cityName)
  const pincode = useLocation((s) => s.pincode)
  const areaName = useLocation((s) => s.areaName)
  const setCity = useLocation((s) => s.setCity)

  const [open, setOpen] = useState(false)
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

  const handleCitySelect = useCallback(
    (city: { cityId: string; cityName: string; citySlug: string }) => {
      setCity({
        cityId: city.cityId,
        cityName: city.cityName,
        citySlug: city.citySlug,
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

  const isSelected = !!cityId
  const hasPincode = !!pincode

  // Active non-coming-soon cities for chips
  const activeCities = POPULAR_CITIES.filter((c) => c.isActive && !c.isComingSoon)

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-sm transition-colors rounded-lg px-2 py-1.5 ${
          hasPincode
            ? 'border border-[#FFD6E4] bg-[#FFF0F5] hover:bg-[#FFE0EE]'
            : 'hover:text-[#E91E63]'
        }`}
      >
        <MapPin className="h-4 w-4 text-[#E91E63] shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-400 leading-none">
            {isSelected ? 'Delivering to' : 'Deliver to'}
          </span>
          {isSelected ? (
            <span className="text-sm font-semibold text-gray-800 max-w-[180px] truncate leading-tight">
              {hasPincode && areaName
                ? `${areaName} \u00b7 ${pincode}`
                : cityName || 'City'}
            </span>
          ) : (
            <span className="text-sm font-semibold text-[#E91E63] leading-tight">
              Select Location
            </span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
      </button>

      {/* Compact dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
            Change Location
          </p>

          {/* City chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {activeCities.map((city) => {
              const isActive = cityId === city.cityId
              return (
                <button
                  key={city.cityId}
                  onClick={() => handleCitySelect(city)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? 'bg-[#E91E63] text-white border-[#E91E63]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#E91E63] hover:text-[#E91E63]'
                  }`}
                >
                  {city.cityName}
                  {isActive && <Check className="h-3 w-3" />}
                </button>
              )
            })}
          </div>

          {/* Pincode section */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">or pincode</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pincodeInput.length === 6) handlePincodeCheck()
                }}
                className="flex-1 px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:border-[#E91E63]"
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

            {/* Status messages */}
            {pincodeStatus.type === 'coming_soon' && (
              <p className="mt-2 text-xs text-[#1565C0] font-medium bg-[#E3F2FD] rounded-lg px-2.5 py-1.5 border border-[#90CAF9]">
                {pincodeStatus.areaName
                  ? `We're coming to ${pincodeStatus.areaName} soon!`
                  : "We're coming to your area soon!"}
              </p>
            )}
            {pincodeStatus.type === 'not_serviceable' && (
              <p className="mt-2 text-xs text-[#C62828] font-medium bg-[#FFEBEE] rounded-lg px-2.5 py-1.5 border border-[#EF9A9A]">
                Not serviceable yet. Try a nearby pincode.
              </p>
            )}
            {pincodeStatus.type === 'error' && (
              <p className="mt-2 text-xs text-[#C62828] font-medium bg-[#FFEBEE] rounded-lg px-2.5 py-1.5 border border-[#EF9A9A]">
                {pincodeStatus.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
