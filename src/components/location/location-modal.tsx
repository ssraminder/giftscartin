'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, X, Loader2, ArrowRight } from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import { POPULAR_CITIES } from '@/lib/cities-data'

type PincodeStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'serviceable'; cityName: string; areaName: string }
  | { type: 'coming_soon'; areaName: string }
  | { type: 'not_serviceable' }
  | { type: 'error'; message: string }

export function LocationModal() {
  const [visible, setVisible] = useState(false)
  const [pincodeInput, setPincodeInput] = useState('')
  const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>({ type: 'idle' })

  const cityId = useLocation((s) => s.cityId)
  const locationSkipped = useLocation((s) => s.locationSkipped)
  const setCity = useLocation((s) => s.setCity)
  const setSkipped = useLocation((s) => s.setSkipped)

  // Show modal after 800ms delay on first visit
  useEffect(() => {
    // Don't show if city already selected or user skipped
    if (cityId || locationSkipped) return

    const timer = setTimeout(() => {
      setVisible(true)
    }, 800)

    return () => clearTimeout(timer)
  }, [cityId, locationSkipped])

  const handleClose = useCallback(() => {
    setSkipped()
    setVisible(false)
  }, [setSkipped])

  const handleCitySelect = useCallback(
    (city: { cityId: string; cityName: string; citySlug: string }) => {
      setCity({
        cityId: city.cityId,
        cityName: city.cityName,
        citySlug: city.citySlug,
      })
      setVisible(false)
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
        const area = d.areaName || ''
        setPincodeStatus({ type: 'coming_soon', areaName: area })
        // Set city without pincode for coming-soon areas
        if (d.cityId || d.city?.id) {
          setCity({
            cityId: d.cityId || d.city?.id || '',
            cityName: d.cityName || d.city?.name || '',
            citySlug: d.city?.slug || '',
          })
        }
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
        setVisible(false)
      } else {
        setPincodeStatus({ type: 'not_serviceable' })
      }
    } catch {
      setPincodeStatus({ type: 'error', message: 'Failed to check. Please try again.' })
    }
  }, [pincodeInput, setCity])

  if (!visible) return null

  // Filter to active non-coming-soon cities for chips
  const activeCities = POPULAR_CITIES.filter((c) => c.isActive && !c.isComingSoon)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-[61] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Pink gradient top section */}
          <div className="relative bg-gradient-to-br from-[#E91E63] to-[#AD1457] px-6 py-8 text-center">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-3">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              Where should we deliver?
            </h2>
            <p className="text-sm text-white/80">
              Select your city or check pincode for delivery availability
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {/* City chips */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Select your city
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {activeCities.map((city) => (
                <button
                  key={city.cityId}
                  onClick={() =>
                    handleCitySelect({
                      cityId: city.cityId,
                      cityName: city.cityName,
                      citySlug: city.citySlug,
                    })
                  }
                  className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#E91E63] hover:text-[#E91E63] hover:bg-[#FFF0F5] transition-colors"
                >
                  {city.cityName}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or enter pincode</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Pincode input */}
            <div className="flex gap-2 mb-2">
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
                className="flex-1 px-4 py-2.5 text-base border border-gray-200 rounded-lg focus:outline-none focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63]/20"
              />
              <button
                onClick={handlePincodeCheck}
                disabled={pincodeInput.length !== 6 || pincodeStatus.type === 'checking'}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#E91E63] text-white disabled:opacity-50 hover:bg-[#C2185B] transition-colors"
              >
                {pincodeStatus.type === 'checking' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Check'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              We deliver fresh cakes, flowers & gifts across select cities
            </p>

            {/* Pincode status messages */}
            {pincodeStatus.type === 'serviceable' && (
              <div className="rounded-lg border border-[#A5D6A7] bg-[#E8F5E9] px-3 py-2.5 text-sm text-[#2E7D32] font-medium">
                Delivery available in {pincodeStatus.areaName || pincodeStatus.cityName}!
              </div>
            )}
            {pincodeStatus.type === 'coming_soon' && (
              <div className="rounded-lg border border-[#90CAF9] bg-[#E3F2FD] px-3 py-2.5 text-sm text-[#1565C0] font-medium">
                {pincodeStatus.areaName
                  ? `We're coming to ${pincodeStatus.areaName} soon!`
                  : "We're coming to your area soon!"}
              </div>
            )}
            {pincodeStatus.type === 'not_serviceable' && (
              <div className="rounded-lg border border-[#EF9A9A] bg-[#FFEBEE] px-3 py-2.5 text-sm text-[#C62828] font-medium">
                We don&apos;t deliver here yet. Try a nearby pincode.
              </div>
            )}
            {pincodeStatus.type === 'error' && (
              <div className="rounded-lg border border-[#EF9A9A] bg-[#FFEBEE] px-3 py-2.5 text-sm text-[#C62828] font-medium">
                {pincodeStatus.message}
              </div>
            )}
          </div>

          {/* Skip footer */}
          <div className="px-6 pb-5">
            <button
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
            >
              Skip for now
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
