'use client'

import { useCity } from '@/hooks/use-city'
import { ReactNode } from 'react'

interface CityGateProps {
  fallback: ReactNode   // shown while hydrating
  children: ReactNode   // shown after city is known
}

export function CityGate({ fallback, children }: CityGateProps) {
  const { isHydrating } = useCity()

  if (isHydrating) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
