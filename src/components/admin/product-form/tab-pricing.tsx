"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/utils"
import type { ProductFormData } from "./types"

interface TabPricingProps {
  formData: ProductFormData
  onChange: (updates: Partial<ProductFormData>) => void
  errors: Record<string, string>
}

export function TabPricing({ formData, onChange, errors }: TabPricingProps) {
  if (formData.productType === 'VARIABLE') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-800">
          Pricing for Variable products is managed per variation in the <strong>Variations</strong> tab.
        </p>
      </div>
    )
  }

  const discount = formData.basePrice > 0 && formData.basePrice > (formData as unknown as { salePrice?: number }).salePrice!
    ? 0 : 0
  const salePrice = (formData as unknown as Record<string, number | undefined>).salePrice

  const discountPercent = formData.basePrice > 0 && salePrice && salePrice > 0 && salePrice < formData.basePrice
    ? Math.round(((formData.basePrice - salePrice) / formData.basePrice) * 100)
    : null

  return (
    <div className="space-y-6">
      {/* Regular Price */}
      <div className="space-y-2">
        <Label htmlFor="basePrice">Regular Price (INR) <span className="text-red-500">*</span></Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">&#8377;</span>
          <Input
            id="basePrice"
            type="number"
            min={0}
            step={1}
            value={formData.basePrice || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ basePrice: parseFloat(e.target.value) || 0 })
            }
            className="pl-7"
            placeholder="0"
          />
        </div>
        {errors.basePrice && <p className="text-sm text-red-500">{errors.basePrice}</p>}
      </div>

      {/* Live Preview */}
      {formData.basePrice > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Price Preview</p>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-slate-900">
              {formatPrice(formData.basePrice)}
            </p>
            {discountPercent !== null && salePrice !== undefined && (
              <p className="text-sm text-emerald-600">
                Sale: {formatPrice(salePrice)} ({discountPercent}% off)
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        {discount}
        All prices are in INR. International customers will see converted prices based on their currency.
      </p>
    </div>
  )
}
