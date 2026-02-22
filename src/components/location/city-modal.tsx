"use client"

import { useState } from "react"
import { Gift, MapPin } from "lucide-react"
import { useCity } from "@/hooks/use-city"
import { CitySearch } from "./city-search"
import { POPULAR_CITIES } from "@/lib/cities-data"
import type { CitySelection } from "@/components/providers/city-provider"

export function CityModal() {
  const { setCity } = useCity()
  const [animateIn, setAnimateIn] = useState(true)

  function finishSelection(selection: CitySelection) {
    setAnimateIn(false)
    setTimeout(() => {
      setCity(selection)
    }, 150)
  }

  function handleCitySelect(selection: CitySelection) {
    finishSelection(selection)
  }

  function handleCityChipClick(city: typeof POPULAR_CITIES[number]) {
    finishSelection({
      cityId: city.cityId,
      cityName: city.cityName,
      citySlug: city.citySlug,
    })
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
      </div>
    </div>
  )
}
