"use client"

import { cn } from "@/lib/utils"
import { useCurrency } from "@/hooks/use-currency"
import type { ProductVariation, VariationSelection } from "@/types"

interface VariationSelectorProps {
  variations: ProductVariation[]
  selected: VariationSelection | null
  onChange: (selection: VariationSelection) => void
}

export function VariationSelector({ variations, selected, onChange }: VariationSelectorProps) {
  const { formatPrice } = useCurrency()

  if (variations.length === 0) return null

  // Group variations by type
  const grouped = variations.reduce<Record<string, ProductVariation[]>>((acc, v) => {
    if (!acc[v.type]) acc[v.type] = []
    acc[v.type].push(v)
    return acc
  }, {})

  const typeLabels: Record<string, string> = {
    weight: "Select Weight",
    size: "Select Size",
    pack: "Select Pack",
    tier: "Select Tier",
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            {typeLabels[type] || `Select ${type}`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {items
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((variation) => {
                const isActive = selected?.variationId === variation.id
                return (
                  <button
                    key={variation.id}
                    onClick={() =>
                      onChange({
                        variationId: variation.id,
                        type: variation.type,
                        label: variation.label,
                        price: Number(variation.price),
                      })
                    }
                    className={cn(
                      "relative flex flex-col items-center rounded-lg border px-4 py-2.5 text-center transition-all duration-200",
                      isActive
                        ? "border-[#E91E63] bg-[#FFF0F5] ring-1 ring-[#E91E63]/30 shadow-sm"
                        : "border-gray-200 hover:border-[#E91E63]/50 hover:bg-[#FFF9F5]"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isActive ? "text-[#E91E63]" : "text-[#1A1A2E]"
                      )}
                    >
                      {variation.label}
                    </span>
                    <span
                      className={cn(
                        "text-xs mt-0.5",
                        isActive ? "text-[#E91E63]/80" : "text-muted-foreground"
                      )}
                    >
                      {formatPrice(Number(variation.price))}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
