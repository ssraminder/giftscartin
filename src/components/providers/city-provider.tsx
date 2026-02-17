"use client"

import { createContext, useCallback, useEffect, useState } from "react"

export interface CityState {
  city: string
  citySlug: string
  pincode: string
}

export interface CityContextValue {
  city: CityState
  setCity: (name: string, slug: string) => void
  setPincode: (pincode: string) => void
  isLoaded: boolean
}

const STORAGE_KEY = "giftscart-city"

const DEFAULT_CITY: CityState = {
  city: "",
  citySlug: "",
  pincode: "",
}

export const CityContext = createContext<CityContextValue>({
  city: DEFAULT_CITY,
  setCity: () => {},
  setPincode: () => {},
  isLoaded: false,
})

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<CityState>(DEFAULT_CITY)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setCityState(JSON.parse(stored))
      }
    } catch {
      // localStorage may be unavailable
    }
    setIsLoaded(true)
  }, [])

  const setCity = useCallback((name: string, slug: string) => {
    const updated: CityState = { city: name, citySlug: slug, pincode: "" }
    setCityState(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  const setPincode = useCallback((pincode: string) => {
    setCityState((prev) => {
      const updated = { ...prev, pincode }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // localStorage may be unavailable
      }
      return updated
    })
  }, [])

  return (
    <CityContext.Provider value={{ city, setCity, setPincode, isLoaded }}>
      {children}
    </CityContext.Provider>
  )
}
