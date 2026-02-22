"use client"

import { createContext, useCallback, useEffect, useState } from "react"
import { usePartner } from "@/components/providers/partner-provider"

export interface CitySelection {
  cityId: string
  cityName: string
  citySlug: string
  pincode?: string
  areaName?: string
  zoneId?: string
  zoneName?: string
  source?: string
}

export interface CityContextValue {
  cityId: string | null
  cityName: string | null
  citySlug: string | null
  pincode: string | null
  areaName: string | null
  zoneId: string | null
  zoneName: string | null
  isServiceable: boolean | null  // null = not checked yet
  isSelected: boolean
  isHydrating: boolean  // true until localStorage has been read
  shouldShowCityModal: boolean
  setCity: (city: CitySelection) => void
  setArea: (area: { name: string; pincode: string; isServiceable: boolean }) => void
  clearCity: () => void
}

const STORAGE_KEY = "giftscart_city_v2"
const COOKIE_NAME = "gci_city_slug"

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
}

function removeCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0`
}

export const CityContext = createContext<CityContextValue>({
  cityId: null,
  cityName: null,
  citySlug: null,
  pincode: null,
  areaName: null,
  zoneId: null,
  zoneName: null,
  isServiceable: null,
  isSelected: false,
  isHydrating: true,
  shouldShowCityModal: false,
  setCity: () => {},
  setArea: () => {},
  clearCity: () => {},
})

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<CitySelection | null>(null)
  const [loaded, setLoaded] = useState(false)
  const { partner, isLoading: partnerLoading } = usePartner()

  useEffect(() => {
    if (partnerLoading) return  // wait for partner to resolve first

    if (partner?.defaultCityId && partner?.defaultCitySlug) {
      // Partner has a default city — set silently, skip modal
      setSelection({
        cityId: partner.defaultCityId,
        cityName: partner.defaultCityName || '',
        citySlug: partner.defaultCitySlug,
        pincode: undefined,
        areaName: undefined,
        source: 'partner',
      })
      setCookie(COOKIE_NAME, partner.defaultCitySlug)
      setLoaded(true)
      return
    }

    // Normal flow — read from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CitySelection
        if (parsed.cityId && parsed.citySlug) {
          setSelection(parsed)
          setCookie(COOKIE_NAME, parsed.citySlug)
        }
      }
    } catch {
      // localStorage may be unavailable
    }
    setLoaded(true)
  }, [partnerLoading, partner])

  // Pre-warm the city resolve serverless function after 2 seconds
  // This prevents cold start latency for the first real user search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/city/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Ch' }),
      }).catch(() => {}) // silently ignore errors
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const setCity = useCallback((city: CitySelection) => {
    setSelection(city)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(city))
      setCookie(COOKIE_NAME, city.citySlug)
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  const setArea = useCallback((area: { name: string; pincode: string; isServiceable: boolean }) => {
    setSelection((prev) => {
      if (!prev) return prev
      const updated = {
        ...prev,
        areaName: area.name,
        pincode: area.pincode,
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // localStorage may be unavailable
      }
      return updated
    })
  }, [])

  const clearCity = useCallback(() => {
    setSelection(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
      removeCookie(COOKIE_NAME)
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  // Don't render until loaded to prevent hydration mismatch
  const isSelected = loaded && selection !== null
  const shouldShowCityModal =
    !isSelected &&
    loaded &&
    !partner?.defaultCityId

  const contextValue: CityContextValue = {
    cityId: selection?.cityId ?? null,
    cityName: selection?.cityName ?? null,
    citySlug: selection?.citySlug ?? null,
    pincode: selection?.pincode ?? null,
    areaName: selection?.areaName ?? null,
    zoneId: selection?.zoneId ?? null,
    zoneName: selection?.zoneName ?? null,
    isServiceable: null, // checked inline by city modal / area search
    isSelected,
    isHydrating: !loaded,
    shouldShowCityModal,
    setCity,
    setArea,
    clearCity,
  }

  return (
    <CityContext.Provider value={contextValue}>
      {children}
    </CityContext.Provider>
  )
}
