"use client"

import { useState, useCallback } from "react"
import { Gift, MapPin, ArrowLeft, Loader2, CheckCircle2, Bell } from "lucide-react"
import { useCity } from "@/hooks/use-city"
import { CitySearch } from "./city-search"
import { AreaSearchInput, type AreaResult } from "@/components/layout/area-search-input"
import { POPULAR_CITIES } from "@/lib/cities-data"
import type { CitySelection } from "@/components/providers/city-provider"

type ModalStep = "city" | "area"

interface ServiceabilityResult {
  isServiceable: boolean
  vendorCount: number
  areaName: string
  pincode: string
}

export function CityModal() {
  const { setCity } = useCity()
  const [animateIn, setAnimateIn] = useState(true)
  const [step, setStep] = useState<ModalStep>("city")
  const [selectedCity, setSelectedCity] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [checkingServiceability, setCheckingServiceability] = useState(false)
  const [serviceResult, setServiceResult] = useState<ServiceabilityResult | null>(null)

  // Manual pincode fallback
  const [showManualPincode, setShowManualPincode] = useState(false)
  const [manualPincode, setManualPincode] = useState("")
  const [manualPincodeError, setManualPincodeError] = useState("")

  // Notify form for unserviceable areas
  const [notifyEmail, setNotifyEmail] = useState("")
  const [notifySending, setNotifySending] = useState(false)
  const [notifySent, setNotifySent] = useState(false)

  function finishSelection(selection: CitySelection) {
    setAnimateIn(false)
    setTimeout(() => {
      setCity(selection)
    }, 150)
  }

  function handleCitySelect(selection: CitySelection) {
    // Move to area step instead of completing immediately
    setSelectedCity({
      id: selection.cityId,
      name: selection.cityName,
      slug: selection.citySlug,
    })
    setServiceResult(null)
    setShowManualPincode(false)
    setStep("area")
  }

  function handleCityChipClick(city: typeof POPULAR_CITIES[number]) {
    handleCitySelect({
      cityId: city.cityId,
      cityName: city.cityName,
      citySlug: city.citySlug,
    })
  }

  function handleSkipArea() {
    if (!selectedCity) return
    finishSelection({
      cityId: selectedCity.id,
      cityName: selectedCity.name,
      citySlug: selectedCity.slug,
    })
  }

  const checkServiceability = useCallback(async (pincode: string, areaName: string) => {
    if (!selectedCity) return

    setCheckingServiceability(true)
    setServiceResult(null)

    try {
      const res = await fetch("/api/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      })
      const data = await res.json()

      if (data.success) {
        setServiceResult({
          isServiceable: data.data?.isServiceable ?? false,
          vendorCount: data.data?.vendorCount ?? 0,
          areaName,
          pincode,
        })
      } else {
        setServiceResult({
          isServiceable: false,
          vendorCount: 0,
          areaName,
          pincode,
        })
      }
    } catch {
      setServiceResult({
        isServiceable: false,
        vendorCount: 0,
        areaName,
        pincode,
      })
    } finally {
      setCheckingServiceability(false)
    }
  }, [selectedCity])

  const handleAreaSelect = useCallback((area: AreaResult) => {
    if (!area.pincode) {
      // Could not extract pincode — show manual fallback
      setShowManualPincode(true)
      setServiceResult(null)
      return
    }

    setShowManualPincode(false)
    checkServiceability(area.pincode, area.displayName)
  }, [checkServiceability])

  function handleManualPincodeCheck() {
    if (!/^\d{6}$/.test(manualPincode)) {
      setManualPincodeError("Enter a valid 6-digit pincode")
      return
    }
    setManualPincodeError("")
    setShowManualPincode(false)
    checkServiceability(manualPincode, selectedCity?.name ?? "")
  }

  function handleShopNow() {
    if (!selectedCity || !serviceResult) return
    finishSelection({
      cityId: selectedCity.id,
      cityName: selectedCity.name,
      citySlug: selectedCity.slug,
      pincode: serviceResult.pincode,
      areaName: serviceResult.areaName,
    })
  }

  async function handleNotify() {
    if (!notifyEmail) return
    setNotifySending(true)
    try {
      await fetch("/api/city/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: notifyEmail, cityName: serviceResult?.areaName || selectedCity?.name }),
      })
      setNotifySent(true)
    } catch {
      // silently fail
    } finally {
      setNotifySending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Panel */}
      <div
        className={`relative w-full sm:max-w-md mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl transition-all duration-300 ${
          animateIn
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0"
        }`}
      >
        {/* ═══════ STEP 1: City Selection ═══════ */}
        {step === "city" && (
          <>
            {/* Header */}
            <div className="px-6 pt-8 pb-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E91E63] to-[#9C27B0]">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-[#E91E63]">Gifts</span>
                    <span className="text-2xl font-bold text-[#1A1A2E]">Cart</span>
                  </div>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Where should we deliver?
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select your city to see available products
              </p>
            </div>

            {/* Search */}
            <div className="px-6 pb-4">
              <CitySearch onSelect={handleCitySelect} autoFocus placeholder="Search city or enter pincode..." />
            </div>

            {/* Popular Cities */}
            <div className="px-6 pb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Popular Cities
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.map((city) => (
                  <button
                    key={city.citySlug}
                    onClick={() => handleCityChipClick(city)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-all hover:border-[#E91E63] hover:bg-pink-50 hover:text-[#E91E63] active:scale-95"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {city.cityName}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-safe-area-inset-bottom sm:hidden" />
          </>
        )}

        {/* ═══════ STEP 2: Area Selection ═══════ */}
        {step === "area" && selectedCity && (
          <>
            {/* Header with back button */}
            <div className="px-6 pt-6 pb-4">
              <button
                onClick={() => {
                  setStep("city")
                  setServiceResult(null)
                  setShowManualPincode(false)
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Change city
              </button>

              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-5 w-5 text-[#E91E63]" />
                <h2 className="text-lg font-bold text-gray-900">{selectedCity.name}</h2>
              </div>
              <p className="text-sm text-gray-500">
                Enter recipient&apos;s area to check delivery availability
              </p>
            </div>

            {/* Area Search */}
            <div className="px-6 pb-4">
              <AreaSearchInput
                cityName={selectedCity.name}
                onAreaSelect={handleAreaSelect}
                placeholder="Enter area, street or landmark"
              />
            </div>

            {/* Manual pincode fallback */}
            {showManualPincode && (
              <div className="px-6 pb-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-800 mb-2">
                    Could not detect pincode for this area.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={manualPincode}
                      onChange={(e) => {
                        setManualPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
                        setManualPincodeError("")
                      }}
                      placeholder="Enter 6-digit pincode"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-pink-400 focus:ring-1 focus:ring-pink-400 outline-none"
                      inputMode="numeric"
                    />
                    <button
                      onClick={handleManualPincodeCheck}
                      className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
                    >
                      Check
                    </button>
                  </div>
                  {manualPincodeError && (
                    <p className="text-xs text-red-500 mt-1">{manualPincodeError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {checkingServiceability && (
              <div className="px-6 pb-4">
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
                  <span className="text-sm text-gray-500">Checking delivery availability...</span>
                </div>
              </div>
            )}

            {/* Serviceability result */}
            {serviceResult && !checkingServiceability && (
              <div className="px-6 pb-4">
                {serviceResult.isServiceable ? (
                  <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-green-800">
                        We deliver to {serviceResult.areaName || selectedCity.name}
                      </p>
                    </div>
                    {serviceResult.vendorCount > 0 && (
                      <p className="text-sm text-green-700 ml-7">
                        {serviceResult.vendorCount}+ vendor{serviceResult.vendorCount > 1 ? "s" : ""} available
                      </p>
                    )}
                    <button
                      onClick={handleShopNow}
                      className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Shop Now
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                    <p className="font-semibold text-red-800 mb-1">
                      Sorry, we don&apos;t deliver to this area yet
                    </p>
                    <p className="text-sm text-red-600 mb-3">
                      We&apos;re expanding soon!
                    </p>

                    {notifySent ? (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        We&apos;ll notify you when we start delivering here!
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Your email"
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-pink-400 focus:ring-1 focus:ring-pink-400 outline-none"
                        />
                        <button
                          onClick={handleNotify}
                          disabled={!notifyEmail || notifySending}
                          className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 flex items-center gap-1"
                        >
                          {notifySending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Bell className="h-3.5 w-3.5" />
                              Notify Me
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Skip area button */}
            <div className="px-6 pb-6 text-center">
              <button
                onClick={handleSkipArea}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip &mdash; browse all products in {selectedCity.name}
              </button>
            </div>

            <div className="h-safe-area-inset-bottom sm:hidden" />
          </>
        )}
      </div>
    </div>
  )
}
