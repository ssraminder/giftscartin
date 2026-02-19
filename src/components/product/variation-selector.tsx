"use client"

import { useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/hooks/use-currency"
import type { ProductAttribute, ProductVariation } from "@/types"

interface VariationSelectorProps {
  attributes: ProductAttribute[]
  variations: ProductVariation[]
  selectedOptions: Record<string, string>
  onOptionChange: (attributeSlug: string, value: string) => void
  matchedVariation: ProductVariation | null
}

export function VariationSelector({
  attributes,
  variations,
  selectedOptions,
  onOptionChange,
  matchedVariation,
}: VariationSelectorProps) {
  const { formatPrice } = useCurrency()

  // Check if a particular option value is available given the current selections
  const isOptionAvailable = useCallback(
    (attributeSlug: string, optionValue: string) => {
      // Build a partial selection with this option included
      const testSelection = { ...selectedOptions, [attributeSlug]: optionValue }
      // Check if any active variation matches this partial selection
      return variations.some((v) => {
        const attrs = v.attributes as Record<string, string>
        return Object.entries(testSelection).every(
          ([slug, value]) => attrs[slug] === value
        )
      })
    },
    [selectedOptions, variations]
  )

  // Check if a variation with this option combination has stock
  const getStockForOption = useCallback(
    (attributeSlug: string, optionValue: string) => {
      const testSelection = { ...selectedOptions, [attributeSlug]: optionValue }
      const matched = variations.find((v) => {
        const attrs = v.attributes as Record<string, string>
        return Object.entries(testSelection).every(
          ([slug, value]) => attrs[slug] === value
        )
      })
      return matched?.stockQty
    },
    [selectedOptions, variations]
  )

  // Check if sale price is active for the matched variation
  const isSaleActive = useMemo(() => {
    if (!matchedVariation?.salePrice) return false
    const now = new Date()
    if (matchedVariation.saleFrom && new Date(matchedVariation.saleFrom) > now) return false
    if (matchedVariation.saleTo && new Date(matchedVariation.saleTo) < now) return false
    return true
  }, [matchedVariation])

  if (attributes.length === 0) return null

  return (
    <div className="space-y-4">
      {attributes
        .filter((attr) => attr.isVisible)
        .map((attribute) => (
          <div key={attribute.id}>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              {attribute.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {attribute.options.map((option) => {
                const isSelected = selectedOptions[attribute.slug] === option.value
                const available = isOptionAvailable(attribute.slug, option.value)
                const stockQty = getStockForOption(attribute.slug, option.value)
                const outOfStock = stockQty !== null && stockQty !== undefined && stockQty === 0

                return (
                  <button
                    key={option.id}
                    onClick={() => onOptionChange(attribute.slug, option.value)}
                    disabled={!available}
                    className={cn(
                      "relative flex flex-col items-center rounded-lg border px-4 py-2.5 text-center transition-all duration-200",
                      isSelected
                        ? "border-[#E91E63] bg-[#FFF0F5] ring-1 ring-[#E91E63]/30 shadow-sm"
                        : available
                          ? "border-gray-200 hover:border-[#E91E63]/50 hover:bg-[#FFF9F5]"
                          : "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isSelected ? "text-[#E91E63]" : "text-[#1A1A2E]"
                      )}
                    >
                      {option.value}
                    </span>
                    {outOfStock && available && (
                      <span className="text-[10px] text-red-500 mt-0.5">Out of Stock</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

      {/* Price display when variation is matched */}
      {matchedVariation && (
        <div className="flex items-center gap-3 mt-2">
          {isSaleActive && matchedVariation.salePrice ? (
            <>
              <span className="text-2xl font-bold text-[#E91E63]">
                {formatPrice(Number(matchedVariation.salePrice))}
              </span>
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(Number(matchedVariation.price))}
              </span>
              <span className="text-sm font-semibold text-green-600">
                {Math.round(
                  ((Number(matchedVariation.price) - Number(matchedVariation.salePrice)) /
                    Number(matchedVariation.price)) *
                    100
                )}
                % off
              </span>
            </>
          ) : (
            <span className="text-2xl font-bold text-[#E91E63]">
              {formatPrice(Number(matchedVariation.price))}
            </span>
          )}
        </div>
      )}

      {/* Stock indicator */}
      {matchedVariation && (
        <div className="flex items-center gap-1.5 text-sm">
          {matchedVariation.stockQty !== null && matchedVariation.stockQty !== undefined ? (
            matchedVariation.stockQty > 0 ? (
              <span className="text-green-600 flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                In stock
              </span>
            ) : (
              <span className="text-red-500 flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                Out of stock
              </span>
            )
          ) : (
            <span className="text-green-600 flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              In stock
            </span>
          )}
        </div>
      )}
    </div>
  )
}
