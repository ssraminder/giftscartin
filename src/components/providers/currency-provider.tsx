"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  symbolPosition: "before" | "after"
  exchangeRate: number
  markup: number
  rounding: "nearest" | "up" | "down" | "none"
  roundTo: number
  locale: string
}

interface CurrencyContextValue {
  currency: CurrencyInfo
  country: string
  region: "india" | "international"
  gateways: string[]
  loading: boolean
  /** Convert an INR amount to the visitor's currency */
  convertPrice: (inrAmount: number) => number
  /** Format an INR amount into the visitor's currency string */
  formatPrice: (inrAmount: number) => string
}

// Default to INR
const DEFAULT_CURRENCY: CurrencyInfo = {
  code: "INR",
  name: "Indian Rupee",
  symbol: "₹",
  symbolPosition: "before",
  exchangeRate: 1,
  markup: 0,
  rounding: "nearest",
  roundTo: 1,
  locale: "en-IN",
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: DEFAULT_CURRENCY,
  country: "IN",
  region: "india",
  gateways: ["razorpay", "cod"],
  loading: true,
  convertPrice: (amount) => amount,
  formatPrice: (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount),
})

function applyRounding(
  value: number,
  rounding: string,
  roundTo: number
): number {
  if (rounding === "none" || roundTo <= 0) return value
  const factor = 1 / roundTo
  switch (rounding) {
    case "up":
      return Math.ceil(value * factor) / factor
    case "down":
      return Math.floor(value * factor) / factor
    case "nearest":
    default:
      return Math.round(value * factor) / factor
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY)
  const [country, setCountry] = useState("IN")
  const [region, setRegion] = useState<"india" | "international">("india")
  const [gateways, setGateways] = useState<string[]>(["razorpay", "cod"])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch("/api/currencies/resolve")
        if (!res.ok) throw new Error("Failed to resolve currency")
        const json = await res.json()
        if (json.success && json.data?.currency) {
          const c = json.data.currency
          setCurrency({
            ...c,
            exchangeRate: Number(c.exchangeRate),
            markup: Number(c.markup),
            roundTo: Number(c.roundTo),
          })
          setCountry(json.data.country || "IN")
          setRegion(json.data.region || "india")
          setGateways(json.data.gateways || ["razorpay", "cod"])
        }
      } catch {
        // Keep defaults (INR)
      } finally {
        setLoading(false)
      }
    }
    resolve()
  }, [])

  const convertPrice = useCallback(
    (inrAmount: number) => {
      if (currency.code === "INR") return inrAmount
      const converted = inrAmount * currency.exchangeRate
      const withMarkup = converted * (1 + currency.markup / 100)
      return applyRounding(withMarkup, currency.rounding, currency.roundTo)
    },
    [currency]
  )

  const formatPrice = useCallback(
    (inrAmount: number) => {
      const amount = convertPrice(inrAmount)

      // Use Intl for proper locale formatting
      try {
        return new Intl.NumberFormat(currency.locale, {
          style: "currency",
          currency: currency.code,
          minimumFractionDigits: currency.roundTo >= 1 ? 0 : 2,
          maximumFractionDigits: currency.roundTo >= 1 ? 0 : 2,
        }).format(amount)
      } catch {
        // Fallback manual formatting
        const formatted = amount.toFixed(currency.roundTo >= 1 ? 0 : 2)
        return currency.symbolPosition === "before"
          ? `${currency.symbol}${formatted}`
          : `${formatted} ${currency.symbol}`
      }
    },
    [currency, convertPrice]
  )

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        country,
        region,
        gateways,
        loading,
        convertPrice,
        formatPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
