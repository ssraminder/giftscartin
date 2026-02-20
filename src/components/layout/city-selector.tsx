"use client"

import { useState } from "react"
import { MapPin, ChevronDown, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCity } from "@/hooks/use-city"
import { cn } from "@/lib/utils"

const CITIES = [
  { name: "Chandigarh", slug: "chandigarh", state: "Chandigarh", id: "city_chandigarh" },
  { name: "Mohali", slug: "mohali", state: "Punjab", id: "city_mohali" },
  { name: "Panchkula", slug: "panchkula", state: "Haryana", id: "city_panchkula" },
]

interface CitySelectorProps {
  variant?: "header" | "compact"
}

export function CitySelector({ variant = "header" }: CitySelectorProps) {
  const { cityName, citySlug, setCity } = useCity()
  const [open, setOpen] = useState(false)
  const [pincodeInput, setPincodeInput] = useState("")
  const [pincodeError, setPincodeError] = useState("")

  function handleCitySelect(c: typeof CITIES[number]) {
    setCity({
      cityId: c.id,
      cityName: c.name,
      citySlug: c.slug,
    })
    setPincodeInput("")
    setPincodeError("")
    setOpen(false)
  }

  function handlePincodeSubmit() {
    if (!/^\d{6}$/.test(pincodeInput)) {
      setPincodeError("Enter a valid 6-digit pincode")
      return
    }
    setPincodeError("")

    // Auto-detect city from pincode prefix
    if (pincodeInput.startsWith("16")) {
      setCity({ cityId: "city_chandigarh", cityName: "Chandigarh", citySlug: "chandigarh", pincode: pincodeInput })
    } else if (pincodeInput.startsWith("140")) {
      setCity({ cityId: "city_mohali", cityName: "Mohali", citySlug: "mohali", pincode: pincodeInput })
    } else if (pincodeInput.startsWith("134")) {
      setCity({ cityId: "city_panchkula", cityName: "Panchkula", citySlug: "panchkula", pincode: pincodeInput })
    }
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1 text-sm transition-colors hover:text-primary",
          variant === "header" &&
            "rounded-full border border-border px-3 py-1.5 bg-background",
          variant === "compact" && "px-2 py-1"
        )}
      >
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate max-w-[120px]">
          {cityName || "Select City"}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose your delivery location</DialogTitle>
            <DialogDescription>
              Select a city or enter your pincode to check availability
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Pincode Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter pincode"
                  value={pincodeInput}
                  onChange={(e) => {
                    setPincodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                    setPincodeError("")
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handlePincodeSubmit()}
                  className="pl-9"
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
              <Button onClick={handlePincodeSubmit}>Check</Button>
            </div>
            {pincodeError && (
              <p className="text-sm text-destructive">{pincodeError}</p>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or select a city
                </span>
              </div>
            </div>

            {/* City List */}
            <div className="grid gap-2">
              {CITIES.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => handleCitySelect(c)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                    citySlug === c.slug && "border-primary bg-primary/5"
                  )}
                >
                  <MapPin
                    className={cn(
                      "h-5 w-5 shrink-0",
                      citySlug === c.slug
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.state}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
