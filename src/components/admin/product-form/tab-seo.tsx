"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Sparkles } from "lucide-react"
import { useState } from "react"
import type { ProductFormData } from "./types"

interface TabSeoProps {
  formData: ProductFormData
  onChange: (updates: Partial<ProductFormData>) => void
}

export function TabSeo({ formData, onChange }: TabSeoProps) {
  const [keywordInput, setKeywordInput] = useState('')

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !formData.metaKeywords.includes(kw)) {
      onChange({ metaKeywords: [...formData.metaKeywords, kw] })
      setKeywordInput('')
    }
  }

  const removeKeyword = (index: number) => {
    onChange({ metaKeywords: formData.metaKeywords.filter((_, i) => i !== index) })
  }

  const titleLength = formData.metaTitle.length
  const descLength = formData.metaDescription.length

  return (
    <div className="space-y-6">
      {/* Meta Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="metaTitle">Meta Title</Label>
          <span className={`text-xs ${titleLength > 60 ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
            {titleLength}/60
          </span>
        </div>
        <Input
          id="metaTitle"
          value={formData.metaTitle}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ metaTitle: e.target.value })}
          placeholder="e.g. Chocolate Truffle Cake - Order Online | Gifts Cart"
          maxLength={80}
        />
      </div>

      {/* Meta Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="metaDescription">Meta Description</Label>
          <span className={`text-xs ${descLength > 160 ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
            {descLength}/160
          </span>
        </div>
        <textarea
          id="metaDescription"
          rows={2}
          value={formData.metaDescription}
          onChange={(e) => onChange({ metaDescription: e.target.value })}
          placeholder="Order Chocolate Truffle Cake online. Fresh cakes delivered same day..."
          maxLength={200}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Meta Keywords */}
      <div className="space-y-2">
        <Label>Meta Keywords</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {formData.metaKeywords.map((kw, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              {kw}
              <button type="button" onClick={() => removeKeyword(i)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={keywordInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeywordInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addKeyword()
              }
            }}
            placeholder="Type a keyword and press Enter"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
            Add
          </Button>
        </div>
      </div>

      {/* OG Image URL */}
      <div className="space-y-2">
        <Label htmlFor="ogImage">OG Image URL</Label>
        <Input
          id="ogImage"
          value={formData.ogImage}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ogImage: e.target.value })}
          placeholder="https://..."
        />
        <p className="text-xs text-slate-500">
          Used when sharing on Facebook and WhatsApp. 1200x630px recommended.
        </p>
      </div>

      {/* Canonical URL */}
      <div className="space-y-2">
        <Label htmlFor="canonicalUrl">Canonical URL</Label>
        <Input
          id="canonicalUrl"
          value={formData.canonicalUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ canonicalUrl: e.target.value })}
          placeholder="Leave blank to auto-generate from product slug"
        />
        <p className="text-xs text-slate-500">
          Leave blank to auto-generate from product slug.
        </p>
      </div>

      {/* Google Search Preview */}
      {(formData.metaTitle || formData.name) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Google Search Preview</p>
          <div className="rounded-lg border border-slate-200 bg-white p-4 max-w-lg">
            <p className="text-xs text-emerald-700 truncate">
              giftscart.netlify.app &rsaquo; product &rsaquo; {formData.slug || '...'}
            </p>
            <p className="text-base text-blue-700 font-medium truncate mt-0.5">
              {formData.metaTitle || `${formData.name} - Order Online | Gifts Cart`}
            </p>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              {formData.metaDescription || `Order ${formData.name} online. Fresh delivery same day in Chandigarh.`}
            </p>
          </div>
        </div>
      )}

      {/* AI generate placeholder */}
      <div className="pt-4 border-t">
        <Button disabled variant="outline" className="gap-2 w-full">
          <Sparkles className="h-4 w-4" />
          Fill SEO fields with AI (coming soon)
        </Button>
      </div>
    </div>
  )
}
