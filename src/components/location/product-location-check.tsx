'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { useLocation } from '@/hooks/use-location'

interface ProductLocationCheckProps {
  productId: string
  onServiceabilityChange?: (result: {
    isServiceable: boolean
    comingSoon: boolean
    vendorCount: number
    message: string
  }) => void
}

type CheckState =
  | { type: 'empty' }
  | { type: 'checking' }
  | { type: 'serviceable'; areaName: string; slotSummary: string }
  | { type: 'coming_soon'; areaName: string }
  | { type: 'not_serviceable' }

export function ProductLocationCheck({ productId, onServiceabilityChange }: ProductLocationCheckProps) {
  const cityId = useLocation((s) => s.cityId)
  const cityName = useLocation((s) => s.cityName)
  const storePincode = useLocation((s) => s.pincode)
  const storeAreaName = useLocation((s) => s.areaName)
  const setCity = useLocation((s) => s.setCity)
  const clearPincode = useLocation((s) => s.clearPincode)
  const checkPincodeLocally = useLocation((s) => s.checkPincodeLocally)

  const [pincodeInput, setPincodeInput] = useState(storePincode ?? '')
  const [state, setState] = useState<CheckState>({ type: 'empty' })
  const lastCheckedRef = useRef<string | null>(null)

  // Auto-check when store has a pincode on mount
  useEffect(() => {
    if (storePincode && /^\d{6}$/.test(storePincode)) {
      setPincodeInput(storePincode)
      if (lastCheckedRef.current !== storePincode) {
        lastCheckedRef.current = storePincode
        checkPincode(storePincode)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storePincode, productId])

  const checkPincode = useCallback(
    async (pin: string) => {
      if (!/^\d{6}$/.test(pin)) return

      // Step 1: Try local cache first
      const localResult = checkPincodeLocally(pin)

      if (localResult === 'serviceable') {
        // Show green instantly
        setState({
          type: 'serviceable',
          areaName: storeAreaName || '',
          slotSummary: '',
        })
        onServiceabilityChange?.({
          isServiceable: true,
          comingSoon: false,
          vendorCount: 1,
          message: 'Delivery available',
        })
        // Background fetch for slot details
        fetchFullServiceability(pin)
        return
      }

      if (localResult === 'coming_soon') {
        setState({ type: 'coming_soon', areaName: storeAreaName || '' })
        onServiceabilityChange?.({
          isServiceable: false,
          comingSoon: true,
          vendorCount: 0,
          message: "We're coming to your area soon!",
        })
        return
      }

      // Step 2: Unknown — need full API check
      setState({ type: 'checking' })
      fetchFullServiceability(pin)
    },
    [checkPincodeLocally, storeAreaName, onServiceabilityChange, productId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const fetchFullServiceability = useCallback(
    async (pin: string) => {
      try {
        const res = await fetch('/api/serviceability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pincode: pin, productId }),
        })
        const json = await res.json()
        const d = json.success ? json.data : null

        if (d?.comingSoon) {
          const area = d.areaName || ''
          setState({ type: 'coming_soon', areaName: area })
          onServiceabilityChange?.({
            isServiceable: false,
            comingSoon: true,
            vendorCount: 0,
            message: area ? `We're coming to ${area} soon!` : "We're coming to your area soon!",
          })
        } else if (d?.isServiceable && d.vendorCount > 0) {
          const area = d.areaName || storeAreaName || ''
          const slots = d.availableSlots || d.deliverySlots || []

          // Build slot summary
          let slotSummary = ''
          const slotNames = (slots as { name: string }[]).map((s) => s.name?.toLowerCase())
          if (slotNames.some((n) => n?.includes('same day') || n?.includes('standard'))) {
            slotSummary = 'Same day'
          }
          if (slotNames.some((n) => n?.includes('midnight'))) {
            slotSummary += slotSummary ? ' \u00b7 Midnight available' : 'Midnight available'
          }
          if (!slotSummary && slots.length > 0) {
            slotSummary = `${slots.length} delivery slot${slots.length > 1 ? 's' : ''} available`
          }

          setState({ type: 'serviceable', areaName: area, slotSummary })

          // Update store with confirmed city data
          const cName = d.city?.name || d.cityName || ''
          const cSlug = d.city?.slug || cName.toLowerCase().replace(/\s+/g, '-')
          const cId = d.city?.id || ''
          if (cId) {
            setCity({
              cityId: cId,
              cityName: cName,
              citySlug: cSlug,
              pincode: pin,
              areaName: area || undefined,
            })
          }

          onServiceabilityChange?.({
            isServiceable: true,
            comingSoon: false,
            vendorCount: d.vendorCount,
            message: 'Delivery available',
          })
        } else {
          setState({ type: 'not_serviceable' })
          onServiceabilityChange?.({
            isServiceable: false,
            comingSoon: false,
            vendorCount: 0,
            message: "We don't deliver here yet",
          })
        }
      } catch {
        setState({ type: 'not_serviceable' })
        onServiceabilityChange?.({
          isServiceable: false,
          comingSoon: false,
          vendorCount: 0,
          message: 'Failed to check delivery availability',
        })
      }
    },
    [productId, storeAreaName, setCity, onServiceabilityChange]
  )

  const handleCheck = useCallback(() => {
    if (!/^\d{6}$/.test(pincodeInput)) return
    lastCheckedRef.current = pincodeInput
    checkPincode(pincodeInput)
  }, [pincodeInput, checkPincode])

  const handleChange = useCallback(() => {
    setState({ type: 'empty' })
    setPincodeInput('')
    clearPincode()
    onServiceabilityChange?.({
      isServiceable: false,
      comingSoon: false,
      vendorCount: 0,
      message: '',
    })
  }, [clearPincode, onServiceabilityChange])

  // Border/bg colors per state
  const borderColor =
    state.type === 'serviceable'
      ? 'border-[#A5D6A7]'
      : state.type === 'coming_soon'
        ? 'border-[#90CAF9]'
        : state.type === 'not_serviceable'
          ? 'border-[#EF9A9A]'
          : 'border-[#FFD6E4]'

  const headerBg =
    state.type === 'serviceable'
      ? 'bg-[#E8F5E9]'
      : state.type === 'coming_soon'
        ? 'bg-[#E3F2FD]'
        : state.type === 'not_serviceable'
          ? 'bg-[#FFEBEE]'
          : 'bg-[#FFF0F5]'

  return (
    <div className="mb-4">
      <div className={`rounded-xl border-2 ${borderColor} overflow-hidden`}>
        {/* Header */}
        <div className={`${headerBg} px-4 py-2.5 flex items-center justify-between`}>
          <p className="font-semibold text-sm text-gray-800 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#E91E63]" />
            Gift Receiver&apos;s Location
          </p>
          {(state.type === 'serviceable' || state.type === 'coming_soon' || state.type === 'not_serviceable') && (
            <button
              onClick={handleChange}
              className="text-xs font-medium text-[#E91E63] hover:underline"
            >
              Change
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-3 bg-white">
          {/* STATE: empty */}
          {state.type === 'empty' && (
            <div>
              {cityId && cityName && !storePincode && (
                <p className="text-xs text-gray-500 mb-2">
                  Enter pincode in {cityName}
                </p>
              )}
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
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pincodeInput.length === 6) handleCheck()
                  }}
                  className="flex-1 px-3 py-2.5 text-base border border-gray-200 rounded-lg focus:outline-none focus:border-[#E91E63]"
                />
                <button
                  onClick={handleCheck}
                  disabled={pincodeInput.length !== 6}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-[#E91E63] text-white disabled:opacity-50 hover:bg-[#C2185B] transition-colors whitespace-nowrap"
                >
                  Check
                </button>
              </div>
            </div>
          )}

          {/* STATE: checking */}
          {state.type === 'checking' && (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="h-4 w-4 animate-spin text-[#E91E63]" />
              <span className="text-sm text-gray-600">Checking availability...</span>
            </div>
          )}

          {/* STATE: serviceable (green) */}
          {state.type === 'serviceable' && (
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#2E7D32] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#2E7D32]">
                    Delivery available
                  </p>
                  {state.slotSummary && (
                    <p className="text-xs text-gray-500 mt-0.5">{state.slotSummary}</p>
                  )}
                </div>
              </div>
              {pincodeInput && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  {pincodeInput}
                </span>
              )}
            </div>
          )}

          {/* STATE: coming_soon (blue) */}
          {state.type === 'coming_soon' && (
            <div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#1565C0] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#1565C0]">
                    Coming to your area soon!
                  </p>
                  <button className="text-xs text-[#1565C0] hover:underline mt-0.5">
                    Notify me when available
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE: not_serviceable (red) */}
          {state.type === 'not_serviceable' && (
            <div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#C62828] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#C62828]">
                    We don&apos;t deliver here yet
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Try a nearby pincode
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
