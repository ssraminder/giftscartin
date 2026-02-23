// CityProvider — thin wrapper around Zustand location store + pincode prefetch
"use client"

import { createContext, useCallback, useEffect, useRef, useState } from "react"
import { usePartner } from "@/components/providers/partner-provider"
import { useLocation } from "@/hooks/use-location"

export interface CitySelection {
  cityId: string
  cityName: string
  citySlug: string
  pincode?: string
  areaName?: string
  zoneId?: string
  zoneName?: string
  lat?: number
  lng?: number
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
  lat: number | null
  lng: number | null
  isServiceable: boolean | null  // null = not checked yet
  isSelected: boolean
  isHydrating: boolean  // true until localStorage has been read
  /** @deprecated No longer used — site is browsable without city selection */
  shouldShowCityModal: boolean
  setCity: (city: CitySelection) => void
  setArea: (area: { name: string; pincode: string; isServiceable: boolean }) => void
  clearCity: () => void
}

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
  lat: null,
  lng: null,
  isServiceable: null,
  isSelected: false,
  isHydrating: true,
  shouldShowCityModal: false,
  setCity: () => {},
  setArea: () => {},
  clearCity: () => {},
})

/** Silently prefetch serviceable pincodes for the given city */
async function prefetchPincodes(cityId: string) {
  try {
    const res = await fetch(`/api/serviceability/pincodes?cityId=${cityId}`)
    const json = await res.json()
    if (json.success) {
      useLocation.getState().setPincodeCache(json.data)
    }
  } catch {
    // Silent failure — not critical
  }
}

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const { partner, isLoading: partnerLoading } = usePartner()
  const prefetchedCityRef = useRef<string | null>(null)

  // Subscribe to the Zustand location store
  const locationCityId = useLocation((s) => s.cityId)
  const locationCityName = useLocation((s) => s.cityName)
  const locationCitySlug = useLocation((s) => s.citySlug)
  const locationPincode = useLocation((s) => s.pincode)
  const locationAreaName = useLocation((s) => s.areaName)
  const locationPincodesFetched = useLocation((s) => s.pincodesFetched)
  const locationSetCity = useLocation((s) => s.setCity)
  const locationClearLocation = useLocation((s) => s.clearLocation)

  // On mount: handle partner default city, then mark loaded
  useEffect(() => {
    if (partnerLoading) return

    if (partner?.defaultCityId && partner?.defaultCitySlug) {
      // Partner has default city — set in Zustand store
      locationSetCity({
        cityId: partner.defaultCityId,
        cityName: partner.defaultCityName || '',
        citySlug: partner.defaultCitySlug,
      })
      setCookie(COOKIE_NAME, partner.defaultCitySlug)
    } else if (locationCitySlug) {
      // Zustand already hydrated from localStorage — sync cookie
      setCookie(COOKIE_NAME, locationCitySlug)
    }

    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerLoading, partner])

  // Prefetch pincodes when cityId is set and not yet fetched
  useEffect(() => {
    if (!locationCityId) return
    if (locationPincodesFetched) return
    if (prefetchedCityRef.current === locationCityId) return

    prefetchedCityRef.current = locationCityId
    prefetchPincodes(locationCityId)
  }, [locationCityId, locationPincodesFetched])

  const setCity = useCallback((city: CitySelection) => {
    locationSetCity({
      cityId: city.cityId,
      cityName: city.cityName,
      citySlug: city.citySlug,
      pincode: city.pincode,
      areaName: city.areaName,
    })
    setCookie(COOKIE_NAME, city.citySlug)

    // Trigger prefetch for the new city
    prefetchedCityRef.current = city.cityId
    prefetchPincodes(city.cityId)
  }, [locationSetCity])

  const setArea = useCallback((area: { name: string; pincode: string; isServiceable: boolean }) => {
    const state = useLocation.getState()
    if (!state.cityId) return
    locationSetCity({
      cityId: state.cityId,
      cityName: state.cityName || '',
      citySlug: state.citySlug || '',
      pincode: area.pincode,
      areaName: area.name,
    })
  }, [locationSetCity])

  const clearCity = useCallback(() => {
    locationClearLocation()
    removeCookie(COOKIE_NAME)
  }, [locationClearLocation])

  const isSelected = loaded && locationCityId !== null

  const contextValue: CityContextValue = {
    cityId: locationCityId,
    cityName: locationCityName,
    citySlug: locationCitySlug,
    pincode: locationPincode,
    areaName: locationAreaName,
    zoneId: null,
    zoneName: null,
    lat: null,
    lng: null,
    isServiceable: null,
    isSelected,
    isHydrating: !loaded,
    shouldShowCityModal: false,
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
