'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MapPin, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import { useCity } from '@/hooks/use-city'

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
  | { type: 'checking' }
  | { type: 'success'; message: string; areaName: string }
  | { type: 'coming_soon'; areaName: string }
  | { type: 'unavailable' }
  | null

export function ProductLocationCheck({ productId, onServiceabilityChange }: ProductLocationCheckProps) {
  const { pincode: contextPincode, areaName: contextAreaName, setCity, setArea } = useCity()
  const [pincode, setPincode] = useState(contextPincode ?? '')
  const [status, setStatus] = useState<Status>(null)
  const lastCheckedPincode = useRef<string | null>(null)

  // Auto-fill pincode from city context and trigger serviceability check
  useEffect(() => {
    if (contextPincode && /^\d{6}$/.test(contextPincode)) {
      setPincode(contextPincode)
      // Avoid re-checking if we already checked this pincode
      if (lastCheckedPincode.current !== contextPincode) {
        lastCheckedPincode.current = contextPincode
        triggerCheck(contextPincode)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextPincode, productId])

  // Extracted check logic so it can be called from useEffect and button click
  const triggerCheck = useCallback(async (pincodeToCheck: string) => {
    if (!/^\d{6}$/.test(pincodeToCheck)) return
    setStatus({ type: 'checking' })

    try {
      const res = await fetch('/api/serviceability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: pincodeToCheck, productId }),
      })
      const json = await res.json()
      const d = json.success ? json.data : null

      if (d?.comingSoon) {
        const area = d.areaName || ''
        setStatus({ type: 'coming_soon', areaName: area })
        onServiceabilityChange?.({
          isServiceable: false,
          comingSoon: true,
          vendorCount: 0,
          message: area ? `We're coming to ${area} soon!` : "We're coming to your area soon!",
        })
      } else if (d?.isServiceable && d.vendorCount > 0) {
        const area = d.areaName || contextAreaName || ''
        const msg = area
          ? `Delivery available in ${area}`
          : 'Delivery available'
        setStatus({ type: 'success', message: msg, areaName: area })

        // Update city context with full result
        const cName = d.city?.name || d.cityName || ''
        const cSlug = d.city?.slug || cName.toLowerCase().replace(/\s+/g, '-')
        const cId = d.city?.id || ''

        if (cId) {
          setCity({
            cityId: cId,
            cityName: cName,
            citySlug: cSlug,
            pincode: pincodeToCheck,
            areaName: area || undefined,
          })
        }

        setArea({ name: area, pincode: pincodeToCheck, isServiceable: true })

        onServiceabilityChange?.({
          isServiceable: true,
          comingSoon: false,
          vendorCount: d.vendorCount,
          message: msg,
        })
      } else {
        setStatus({ type: 'unavailable' })
        onServiceabilityChange?.({
          isServiceable: false,
          comingSoon: false,
          vendorCount: 0,
          message: "We don't deliver here yet",
        })
      }
    } catch {
      setStatus({ type: 'unavailable' })
      onServiceabilityChange?.({
        isServiceable: false,
        comingSoon: false,
        vendorCount: 0,
        message: 'Failed to check delivery availability',
      })
    }
  }, [productId, contextAreaName, setCity, setArea, onServiceabilityChange])

  const handleCheck = useCallback(async () => {
    if (!/^\d{6}$/.test(pincode)) return
    lastCheckedPincode.current = pincode
    triggerCheck(pincode)
  }, [pincode, triggerCheck])

  return (
    <div className="mb-4">
      <div className="rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-4">
        <p className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#E91E63]" />
          Gift Receiver&apos;s Location
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Enter receiver&apos;s pincode to check delivery availability
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit pincode"
            value={pincode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
              setPincode(val)
              if (status) setStatus(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pincode.length === 6) handleCheck()
            }}
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#E91E63]"
          />
          <button
            onClick={handleCheck}
            disabled={pincode.length !== 6 || status?.type === 'checking'}
            className="px-4 py-2.5 text-sm font-medium rounded-lg bg-[#E91E63] text-white disabled:opacity-50 hover:bg-[#C2185B] transition-colors whitespace-nowrap"
          >
            {status?.type === 'checking' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Check Delivery'
            )}
          </button>
        </div>

        {/* Status messages */}
        {status && status.type !== 'checking' && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : status.type === 'coming_soon'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {status.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {status.type === 'coming_soon' && <Clock className="h-4 w-4 shrink-0" />}
            {status.type === 'unavailable' && <XCircle className="h-4 w-4 shrink-0" />}
            <span>
              {status.type === 'success' && status.message}
              {status.type === 'coming_soon' && (status.areaName ? `We're coming to ${status.areaName} soon!` : "We're coming to your area soon!")}
              {status.type === 'unavailable' && "We don't deliver here yet"}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
