"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Search } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import type { ProductFormData, UpsellProduct } from "./types"

interface TabAdvancedProps {
  formData: ProductFormData
  onChange: (updates: Partial<ProductFormData>) => void
}

const OCCASIONS = [
  'Birthday', 'Anniversary', 'Wedding', 'Valentine', 'Baby Shower',
  'Housewarming', 'Congratulations', 'Thank You', 'Get Well Soon',
  'Diwali', 'Rakhi', 'Christmas', 'New Year', 'Mother\'s Day', 'Father\'s Day',
]

export function TabAdvanced({ formData, onChange }: TabAdvancedProps) {
  const [tagInput, setTagInput] = useState('')
  const [upsellSearch, setUpsellSearch] = useState('')
  const [upsellResults, setUpsellResults] = useState<UpsellProduct[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUpsellResults([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}&pageSize=10`)
      const json = await res.json()
      if (json.success) {
        setUpsellResults(
          (json.data.items || []).filter(
            (p: UpsellProduct) => !formData.upsellIds.includes(p.id)
          )
        )
      }
    } catch {
      // ignore
    } finally {
      setSearchLoading(false)
    }
  }, [formData.upsellIds])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(upsellSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [upsellSearch, searchProducts])

  const toggleOccasion = (occ: string) => {
    if (formData.occasion.includes(occ)) {
      onChange({ occasion: formData.occasion.filter((o) => o !== occ) })
    } else {
      onChange({ occasion: [...formData.occasion, occ] })
    }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      onChange({ tags: [...formData.tags, tag] })
      setTagInput('')
    }
  }

  const removeTag = (index: number) => {
    onChange({ tags: formData.tags.filter((_, i) => i !== index) })
  }

  const addUpsell = (product: UpsellProduct) => {
    onChange({
      upsellIds: [...formData.upsellIds, product.id],
      upsellProducts: [...formData.upsellProducts, product],
    })
    setUpsellSearch('')
    setUpsellResults([])
  }

  const removeUpsell = (productId: string) => {
    onChange({
      upsellIds: formData.upsellIds.filter((id) => id !== productId),
      upsellProducts: formData.upsellProducts.filter((p) => p.id !== productId),
    })
  }

  return (
    <div className="space-y-6">
      {/* Occasions */}
      <div className="space-y-2">
        <Label>Occasions</Label>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((occ) => {
            const selected = formData.occasion.includes(occ)
            return (
              <button
                key={occ}
                type="button"
                onClick={() => toggleOccasion(occ)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {occ}
              </button>
            )
          })}
        </div>
      </div>

      {/* Product Tags */}
      <div className="space-y-2">
        <Label>Product Tags</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {formData.tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              {tag}
              <button type="button" onClick={() => removeTag(i)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Type a tag and press Enter"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>
            Add
          </Button>
        </div>
      </div>

      {/* Weight/Size */}
      <div className="space-y-2">
        <Label htmlFor="weight">Weight / Size Description</Label>
        <Input
          id="weight"
          value={formData.weight}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ weight: e.target.value })}
          placeholder="e.g. 500g, 30cm diameter"
        />
      </div>

      {/* Sort Order */}
      <div className="space-y-2">
        <Label htmlFor="sortOrder">Sort Order</Label>
        <Input
          id="sortOrder"
          type="number"
          value={formData.sortOrder}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ sortOrder: parseInt(e.target.value) || 0 })}
          className="w-24"
        />
        <p className="text-xs text-slate-500">Lower values appear higher in listings.</p>
      </div>

      {/* Upsell Products */}
      <div className="space-y-2">
        <Label>Upsell Products</Label>
        <p className="text-xs text-slate-500 mb-2">
          These appear as &quot;Complete Your Gift&quot; suggestions on the product page.
        </p>

        {/* Selected upsells */}
        {formData.upsellProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.upsellProducts.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5"
              >
                <span className="text-sm">{p.name}</span>
                <span className="text-xs text-slate-500">{formatPrice(Number(p.basePrice))}</span>
                <button
                  type="button"
                  onClick={() => removeUpsell(p.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={upsellSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUpsellSearch(e.target.value)}
            placeholder="Search products to add as upsells..."
            className="pl-9"
          />
        </div>

        {/* Results dropdown */}
        {upsellResults.length > 0 && (
          <div className="rounded-lg border bg-white shadow-sm max-h-48 overflow-y-auto">
            {upsellResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addUpsell(p)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-slate-500">{formatPrice(Number(p.basePrice))}</span>
              </button>
            ))}
          </div>
        )}
        {searchLoading && (
          <p className="text-xs text-slate-400">Searching...</p>
        )}
      </div>
    </div>
  )
}
