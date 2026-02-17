"use client"

import { useEffect } from "react"
import { useCart } from "@/hooks/use-cart"

export function CartHydration() {
  useEffect(() => {
    useCart.persist.rehydrate()
  }, [])

  return null
}
