"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

interface ReferralContextValue {
  referralCode: string | null
  clearReferral: () => void
}

const ReferralContext = createContext<ReferralContextValue>({
  referralCode: null,
  clearReferral: () => {},
})

const STORAGE_KEY = "gci_referral"
const COOKIE_NAME = "gci_ref"
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_AGE_SECONDS = 604800 // 7 days

function isValidRefCode(code: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(code) && code.length <= 50
}

export function ReferralProvider({ children }: { children: React.ReactNode }) {
  const [referralCode, setReferralCode] = useState<string | null>(null)

  useEffect(() => {
    // Check URL for ref param
    const params = new URLSearchParams(window.location.search)
    const ref = params.get("ref")

    if (ref && isValidRefCode(ref)) {
      // Save to localStorage
      const data = {
        code: ref,
        savedAt: Date.now(),
        expiresAt: Date.now() + EXPIRY_MS,
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        // localStorage unavailable
      }
      // Set cookie
      document.cookie = `${COOKIE_NAME}=${ref}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
      setReferralCode(ref)
    } else {
      // Check localStorage for existing referral
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as { code: string; expiresAt: number }
          if (parsed.expiresAt > Date.now()) {
            setReferralCode(parsed.code)
          } else {
            // Expired — clean up
            localStorage.removeItem(STORAGE_KEY)
            document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`
          }
        }
      } catch {
        // Corrupted or unavailable
      }
    }
  }, [])

  const clearReferral = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable
    }
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`
    setReferralCode(null)
  }, [])

  return (
    <ReferralContext.Provider value={{ referralCode, clearReferral }}>
      {children}
    </ReferralContext.Provider>
  )
}

export function useReferral() {
  return useContext(ReferralContext)
}
