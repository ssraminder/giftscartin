"use client"

import { useContext } from "react"
import { CityContext } from "@/components/providers/city-provider"

export function useCity() {
  return useContext(CityContext)
}
