"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { ProductFormData, CategoryOption } from "./types"

interface TabGeneralProps {
  formData: ProductFormData
  categories: CategoryOption[]
  onChange: (updates: Partial<ProductFormData>) => void
  onTypeChange: (type: 'SIMPLE' | 'VARIABLE') => void
  errors: Record<string, string>
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function TabGeneral({ formData, categories, onChange, onTypeChange, errors }: TabGeneralProps) {
  return (
    <div className="space-y-6">
      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Product Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const name = e.target.value
            const updates: Partial<ProductFormData> = { name }
            // Auto-generate slug if creating or slug matches old auto-generated value
            if (!formData.slug || formData.slug === slugify(formData.name)) {
              updates.slug = slugify(name)
            }
            onChange(updates)
          }}
          placeholder="e.g. Chocolate Truffle Cake"
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Slug <span className="text-red-500">*</span></Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ slug: e.target.value })}
          placeholder="chocolate-truffle-cake"
        />
        <p className="text-xs text-slate-500">URL: /product/{formData.slug || '...'}</p>
        {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
      </div>

      {/* Product Type */}
      <div className="space-y-2">
        <Label>Product Type</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTypeChange('SIMPLE')}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              formData.productType === 'SIMPLE'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('VARIABLE')}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              formData.productType === 'VARIABLE'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Variable
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {formData.productType === 'SIMPLE'
            ? 'Simple products have a single price.'
            : 'Variable products have variations with individual pricing (e.g. different weights).'}
        </p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="categoryId">Category <span className="text-red-500">*</span></Label>
        <select
          id="categoryId"
          value={formData.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select a category...</option>
          {categories
            .filter((c) => !c.parentId)
            .map((parent) => {
              const children = categories.filter((c) => c.parentId === parent.id)
              return [
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>,
                ...children.map((child) => (
                  <option key={child.id} value={child.id}>
                    &nbsp;&nbsp;{child.name}
                  </option>
                )),
              ]
            })}
        </select>
        {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
      </div>

      {/* Short Description */}
      <div className="space-y-2">
        <Label htmlFor="shortDesc">Short Description</Label>
        <textarea
          id="shortDesc"
          rows={2}
          value={formData.shortDesc}
          onChange={(e) => onChange({ shortDesc: e.target.value })}
          placeholder="Brief description for product cards"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Full Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Full Description</Label>
        <textarea
          id="description"
          rows={6}
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Detailed product description..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Is Vegetarian */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isVeg"
            checked={formData.isVeg}
            onChange={(e) => onChange({ isVeg: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          <Label htmlFor="isVeg" className="flex items-center gap-2">
            Vegetarian
            <Badge
              variant="outline"
              className={formData.isVeg
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
              }
            >
              {formData.isVeg ? 'Veg' : 'Non-Veg'}
            </Badge>
          </Label>
        </div>
      </div>
    </div>
  )
}
