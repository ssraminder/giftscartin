"use client"

import { useCity } from "@/hooks/use-city"
import { CityModal } from "./city-modal"

export function CityGate() {
  const { isSelected } = useCity()

  if (isSelected) return null

  return <CityModal />
}
