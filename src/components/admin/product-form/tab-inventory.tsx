"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductFormData } from "./types"

interface TabInventoryProps {
  formData: ProductFormData
  onChange: (updates: Partial<ProductFormData>) => void
}

export function TabInventory({ formData, onChange }: TabInventoryProps) {
  return (
    <div className="space-y-6">
      {/* SKU */}
      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          value={formData.sku}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ sku: e.target.value })}
          placeholder="e.g. CAKE-CHO-TRF"
        />
        <p className="text-xs text-slate-500">Stock Keeping Unit — optional unique identifier.</p>
      </div>

      {/* Stock Quantity */}
      <div className="space-y-2">
        <Label htmlFor="stockQty">Stock Quantity</Label>
        <Input
          id="stockQty"
          type="number"
          min={0}
          value={formData.stockQty ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            onChange({ stockQty: val === '' ? null : parseInt(val, 10) })
          }}
          placeholder="Leave blank for unlimited"
        />
        <p className="text-xs text-slate-500">Leave blank for unlimited stock.</p>
      </div>

      {/* Daily Limit */}
      <div className="space-y-2">
        <Label htmlFor="dailyLimit">Daily Order Limit</Label>
        <Input
          id="dailyLimit"
          type="number"
          min={0}
          value={formData.dailyLimit ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value
            onChange({ dailyLimit: val === '' ? null : parseInt(val, 10) })
          }}
          placeholder="Leave blank for no limit"
        />
        <p className="text-xs text-slate-500">Maximum orders per day regardless of stock.</p>
      </div>
    </div>
  )
}
