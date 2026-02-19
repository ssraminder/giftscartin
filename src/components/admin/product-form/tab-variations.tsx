"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2, Wand2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import type { ProductFormData, VariationData } from "./types"

interface TabVariationsProps {
  formData: ProductFormData
  onChange: (updates: Partial<ProductFormData>) => void
}

export function TabVariations({ formData, onChange }: TabVariationsProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkPrice, setBulkPrice] = useState('')

  if (formData.productType === 'SIMPLE') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-800">
          Upgrade to <strong>Variable</strong> product in the General tab to add variations.
        </p>
      </div>
    )
  }

  const variationAttrs = formData.attributes.filter((a) => a.isForVariations)

  if (variationAttrs.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">
          Add at least one attribute marked &quot;For Variations&quot; in the <strong>Attributes</strong> tab first.
        </p>
      </div>
    )
  }

  // Cartesian product
  const generateVariations = () => {
    const optionSets = variationAttrs.map((attr) => ({
      slug: attr.slug,
      name: attr.name,
      options: attr.options.map((o) => o.value),
    }))

    const combos: Record<string, string>[][] = [[]]
    for (const set of optionSets) {
      const newCombos: Record<string, string>[][] = []
      for (const combo of combos) {
        for (const opt of set.options) {
          newCombos.push([...combo, { [set.slug]: opt }])
        }
      }
      combos.length = 0
      combos.push(...newCombos)
    }

    const variations: VariationData[] = combos.map((combo, i) => {
      const attrs: Record<string, string> = {}
      for (const pair of combo) {
        Object.assign(attrs, pair)
      }
      // Check if a matching variation already exists
      const existing = formData.variations.find((v) => {
        return Object.keys(attrs).every((k) => v.attributes[k] === attrs[k])
      })
      if (existing) return existing

      return {
        attributes: attrs,
        price: formData.basePrice || 0,
        salePrice: null,
        sku: null,
        stockQty: null,
        image: null,
        isActive: true,
        sortOrder: i,
      }
    })

    onChange({ variations })
    setSelectedRows(new Set())
  }

  const totalCount = variationAttrs.reduce(
    (count, attr) => count * (attr.options.length || 1),
    1
  )

  const updateVariation = (index: number, updates: Partial<VariationData>) => {
    const newVars = [...formData.variations]
    newVars[index] = { ...newVars[index], ...updates }
    onChange({ variations: newVars })
  }

  const toggleRow = (index: number) => {
    const next = new Set(selectedRows)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelectedRows(next)
  }

  const toggleAll = () => {
    if (selectedRows.size === formData.variations.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(formData.variations.map((_, i) => i)))
    }
  }

  const bulkSetPrice = () => {
    const price = parseFloat(bulkPrice)
    if (isNaN(price)) return
    const newVars = formData.variations.map((v, i) =>
      selectedRows.has(i) ? { ...v, price } : v
    )
    onChange({ variations: newVars })
    setBulkPrice('')
  }

  const bulkToggleActive = (active: boolean) => {
    const newVars = formData.variations.map((v, i) =>
      selectedRows.has(i) ? { ...v, isActive: active } : v
    )
    onChange({ variations: newVars })
  }

  const bulkDelete = () => {
    const newVars = formData.variations.filter((_, i) => !selectedRows.has(i))
    onChange({ variations: newVars })
    setSelectedRows(new Set())
  }

  const attrLabels = (attrs: Record<string, string>) => {
    return variationAttrs.map((a) => attrs[a.slug]).filter(Boolean)
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <strong>Vendor availability</strong> is managed per variation in the vendor dashboard.
        Vendors who only offer eggless products will mark &quot;With Egg&quot; variations as unavailable.
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={generateVariations} className="gap-2">
          <Wand2 className="h-4 w-4" />
          Generate All Variations
        </Button>
        <span className="text-sm text-slate-500">
          This will create {totalCount} variation{totalCount !== 1 ? 's' : ''}.
        </span>
      </div>

      {/* Variations table */}
      {formData.variations.length > 0 && (
        <>
          {/* Bulk actions */}
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-slate-50 p-3 text-sm">
              <span className="text-slate-600">{selectedRows.size} selected:</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={bulkPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkPrice(e.target.value)}
                  placeholder="Price"
                  className="h-8 w-24"
                />
                <Button type="button" variant="outline" size="sm" onClick={bulkSetPrice}>
                  Set Price
                </Button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => bulkToggleActive(true)}>
                Activate
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => bulkToggleActive(false)}>
                Deactivate
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={bulkDelete} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === formData.variations.length && formData.variations.length > 0}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Attributes</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Price (INR)</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Sale Price</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">SKU</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Stock</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {formData.variations.map((v, i) => (
                  <tr key={i} className={selectedRows.has(i) ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(i)}
                        onChange={() => toggleRow(i)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {attrLabels(v.attributes).map((label, li) => (
                          <Badge key={li} variant="secondary" className="text-xs">{label}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={v.price || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateVariation(i, { price: parseFloat(e.target.value) || 0 })
                        }
                        className="h-8 w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={v.salePrice ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateVariation(i, { salePrice: e.target.value ? parseFloat(e.target.value) : null })
                        }
                        className="h-8 w-24"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={v.sku || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateVariation(i, { sku: e.target.value || null })
                        }
                        className="h-8 w-24"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={v.stockQty ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateVariation(i, { stockQty: e.target.value ? parseInt(e.target.value) : null })
                        }
                        className="h-8 w-20"
                        placeholder="Unltd"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={v.isActive}
                        onChange={(e) => updateVariation(i, { isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <p className="text-xs text-slate-500">
            {formData.variations.length} variation{formData.variations.length !== 1 ? 's' : ''} ·{' '}
            Price range: {formatPrice(Math.min(...formData.variations.map((v) => v.price)))} –{' '}
            {formatPrice(Math.max(...formData.variations.map((v) => v.price)))}
          </p>
        </>
      )}
    </div>
  )
}
