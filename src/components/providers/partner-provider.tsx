'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ActivePartner {
  id: string
  name: string
  refCode: string
  logoUrl: string | null
  primaryColor: string
  showPoweredBy: boolean
  commissionPercent: number
  defaultCityId: string | null
  defaultCitySlug: string | null
  defaultCityName: string | null
  defaultVendorId: string | null
  defaultVendorName: string | null
}

interface PartnerContextType {
  partner: ActivePartner | null
  isLoading: boolean
  clearPartner: () => void
}

const PartnerContext = createContext<PartnerContextType>({
  partner: null,
  isLoading: true,
  clearPartner: () => {},
})

const SESSION_KEY = 'giftscart_partner_v1'

const INTERNAL_HOSTS = [
  'giftscart.netlify.app',
  'giftscart.in',
  'www.giftscart.in',
  'localhost',
]

export function PartnerProvider({ children }: { children: ReactNode }) {
  const [partner, setPartner] = useState<ActivePartner | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const params   = new URLSearchParams(window.location.search)
      const ref      = params.get('ref')
      const hostname = window.location.hostname

      const isInternalHost = INTERNAL_HOSTS.some(
        h => hostname === h || hostname.endsWith(`.${h}`)
      )
      const isPartnerDomain = !isInternalHost

      // 1. Try sessionStorage restore
      try {
        const stored = sessionStorage.getItem(SESSION_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as ActivePartner
          const refMatches    = ref && parsed.refCode === ref
          const domainSession = isPartnerDomain && !ref
          if (refMatches || domainSession) {
            setPartner(parsed)
            setIsLoading(false)
            return
          }
        }
      } catch { /* sessionStorage unavailable */ }

      // 2. Build resolve query
      const resolveParams = new URLSearchParams()
      if (ref) resolveParams.set('ref', ref)
      if (isPartnerDomain) resolveParams.set('domain', hostname)

      if (resolveParams.toString() === '') {
        setIsLoading(false)
        return
      }

      // 3. Fetch from API
      try {
        const res  = await fetch(`/api/partners/resolve?${resolveParams.toString()}`)
        const data = await res.json()
        if (data.success && data.data) {
          setPartner(data.data)
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.data))
        }
      } catch (err) {
        console.error('[PartnerProvider] resolve failed:', err)
      }

      setIsLoading(false)
    }

    init()
  }, [])

  const clearPartner = () => {
    setPartner(null)
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }

  return (
    <PartnerContext.Provider value={{ partner, isLoading, clearPartner }}>
      {children}
    </PartnerContext.Provider>
  )
}

export function usePartner() {
  return useContext(PartnerContext)
}
