"use client"

import { createContext, useCallback, useEffect, useState } from "react"

export interface CitySelection {
  cityId: string
  cityName: string
  citySlug: string
  pincode?: string
  areaName?: string
  zoneId?: string
  zoneName?: string
}

export interface CityContextValue {
  cityId: string | null
  cityName: string | null
  citySlug: string | null
  pincode: string | null
  areaName: string | null
  zoneId: string | null
  zoneName: string | null
  isSelected: boolean
  setCity: (city: CitySelection) => void
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
  isSelected: false,
  setCity: () => {},
  clearCity: () => {},
})

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<CitySelection | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
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
  }, [])

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
  const contextValue: CityContextValue = {
    cityId: selection?.cityId ?? null,
    cityName: selection?.cityName ?? null,
    citySlug: selection?.citySlug ?? null,
    pincode: selection?.pincode ?? null,
    areaName: selection?.areaName ?? null,
    zoneId: selection?.zoneId ?? null,
    zoneName: selection?.zoneName ?? null,
    isSelected: loaded && selection !== null,
    setCity,
    clearCity,
  }

  return (
    <CityContext.Provider value={contextValue}>
      {children}
    </CityContext.Provider>
  )
}
