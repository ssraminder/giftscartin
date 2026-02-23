"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface LocationState {
  cityId: string | null
  cityName: string | null
  citySlug: string | null
  pincode: string | null
  areaName: string | null
  locationSkipped: boolean
  serviceablePincodes: string[]
  comingSoonPincodes: string[]
  pincodesFetched: boolean

  setCity: (city: {
    cityId: string
    cityName: string
    citySlug: string
    pincode?: string | null
    areaName?: string | null
  }) => void
  setPincodeCache: (data: {
    serviceablePincodes: string[]
    comingSoonPincodes: string[]
  }) => void
  setSkipped: () => void
  clearLocation: () => void
  clearPincode: () => void

  /** Instant local check -- no API call */
  checkPincodeLocally: (pincode: string) => 'serviceable' | 'coming_soon' | 'unknown'
}

export const useLocation = create<LocationState>()(
  persist(
    (set, get) => ({
      cityId: null,
      cityName: null,
      citySlug: null,
      pincode: null,
      areaName: null,
      locationSkipped: false,
      serviceablePincodes: [],
      comingSoonPincodes: [],
      pincodesFetched: false,

      setCity: (city) => {
        set({
          cityId: city.cityId,
          cityName: city.cityName,
          citySlug: city.citySlug,
          pincode: city.pincode ?? null,
          areaName: city.areaName ?? null,
          // Reset pincode cache when city changes
          pincodesFetched: false,
          serviceablePincodes: [],
          comingSoonPincodes: [],
        })
      },

      setPincodeCache: (data) => {
        set({
          serviceablePincodes: data.serviceablePincodes,
          comingSoonPincodes: data.comingSoonPincodes,
          pincodesFetched: true,
        })
      },

      setSkipped: () => {
        set({ locationSkipped: true })
      },

      clearLocation: () => {
        set({
          cityId: null,
          cityName: null,
          citySlug: null,
          pincode: null,
          areaName: null,
          locationSkipped: false,
          serviceablePincodes: [],
          comingSoonPincodes: [],
          pincodesFetched: false,
        })
      },

      clearPincode: () => {
        set({
          pincode: null,
          areaName: null,
        })
      },

      checkPincodeLocally: (pincode: string) => {
        const state = get()
        if (!state.pincodesFetched) return 'unknown'
        if (state.serviceablePincodes.includes(pincode)) return 'serviceable'
        if (state.comingSoonPincodes.includes(pincode)) return 'coming_soon'
        return 'unknown'
      },
    }),
    {
      name: "giftscart-location",
      // Only persist location fields, NOT the pincode cache
      partialize: (state) => ({
        cityId: state.cityId,
        cityName: state.cityName,
        citySlug: state.citySlug,
        pincode: state.pincode,
        areaName: state.areaName,
        locationSkipped: state.locationSkipped,
      }),
    }
  )
)
