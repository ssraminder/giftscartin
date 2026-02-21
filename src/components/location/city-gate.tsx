"use client"

import { useCity } from "@/hooks/use-city"
import { CityModal } from "./city-modal"

export function CityGate() {
  const { shouldShowCityModal } = useCity()

  if (!shouldShowCityModal) return null

  return <CityModal />
}
