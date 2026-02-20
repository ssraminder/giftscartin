"use client"

import { useContext } from "react"
import { CityContext } from "@/components/providers/city-provider"
import type { CityContextValue } from "@/components/providers/city-provider"

export function useCity(): CityContextValue {
  return useContext(CityContext)
}
