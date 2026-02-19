"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Save, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { TabGeneral } from "./tab-general"
import { TabPricing } from "./tab-pricing"
import { TabInventory } from "./tab-inventory"
import { TabImages } from "./tab-images"
import { TabAttributes } from "./tab-attributes"
import { TabVariations } from "./tab-variations"
import { TabAddons } from "./tab-addons"
import { TabSeo } from "./tab-seo"
import { TabAdvanced } from "./tab-advanced"
import { AIGeneratorPanel, type GeneratedContent } from "@/components/admin/ai-generator-panel"
import type {
  ProductFormProps,
  ProductFormData,
  ProductWithRelations,
} from "./types"

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'images', label: 'Images' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'variations', label: 'Variations' },
  { id: 'addons', label: 'Add-ons' },
  { id: 'seo', label: 'SEO' },
  { id: 'advanced', label: 'Advanced' },
] as const

type TabId = (typeof TABS)[number]['id']

function initFormData(data?: ProductWithRelations): ProductFormData {
  if (!data) {
    return {
      name: '',
      slug: '',
      productType: 'SIMPLE',
      categoryId: '',
      shortDesc: '',
      description: '',
      isVeg: true,
      isActive: true,
      basePrice: 0,
      sku: '',
      stockQty: null,
      dailyLimit: null,
      images: [],
      attributes: [],
      variations: [],
      addonGroups: [],
      metaTitle: '',
      metaDescription: '',
      metaKeywords: [],
      ogImage: '',
      canonicalUrl: '',
      occasion: [],
      tags: [],
      weight: '',
      sortOrder: 0,
      upsellIds: [],
      upsellProducts: [],
    }
  }

  return {
    name: data.name,
    slug: data.slug,
    productType: data.productType,
    categoryId: data.categoryId,
    shortDesc: data.shortDesc || '',
    description: data.description || '',
    isVeg: data.isVeg,
    isActive: data.isActive,
    basePrice: Number(data.basePrice),
    sku: '',
    stockQty: null,
    dailyLimit: null,
    images: data.images,
    attributes: data.attributes.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      isForVariations: a.isForVariations,
      sortOrder: a.sortOrder,
      options: a.options.map((o) => ({
        id: o.id,
        value: o.value,
        sortOrder: o.sortOrder,
      })),
    })),
    variations: data.variations.map((v) => ({
      id: v.id,
      attributes: v.attributes as Record<string, string>,
      price: Number(v.price),
      salePrice: v.salePrice ? Number(v.salePrice) : null,
      sku: v.sku,
      stockQty: v.stockQty,
      image: v.image,
      isActive: v.isActive,
      sortOrder: v.sortOrder,
    })),
    addonGroups: data.addonGroups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      type: g.type,
      required: g.required,
      maxLength: g.maxLength,
      placeholder: g.placeholder,
      acceptedFileTypes: g.acceptedFileTypes,
      maxFileSizeMb: g.maxFileSizeMb,
      templateGroupId: g.templateGroupId,
      isOverridden: g.isOverridden,
      sortOrder: g.sortOrder,
      options: g.options.map((o) => ({
        id: o.id,
        label: o.label,
        price: Number(o.price),
        image: o.image,
        isDefault: o.isDefault,
        sortOrder: o.sortOrder,
      })),
    })),
    metaTitle: data.metaTitle || '',
    metaDescription: data.metaDescription || '',
    metaKeywords: data.metaKeywords || [],
    ogImage: data.ogImage || '',
    canonicalUrl: data.canonicalUrl || '',
    occasion: data.occasion || [],
    tags: data.tags || [],
    weight: data.weight || '',
    sortOrder: 0,
    upsellIds: data.upsells.map((u) => u.upsellProduct.id),
    upsellProducts: data.upsells.map((u) => u.upsellProduct),
  }
}

export function ProductForm({ mode, initialData, categories, onSave }: ProductFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [formData, setFormData] = useState<ProductFormData>(() => initFormData(initialData))
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showTypeConfirm, setShowTypeConfirm] = useState(false)
  const [pendingType, setPendingType] = useState<'SIMPLE' | 'VARIABLE'>('SIMPLE')
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | null>(null)

  const updateForm = useCallback((updates: Partial<ProductFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleTypeChange = (type: 'SIMPLE' | 'VARIABLE') => {
    if (type === formData.productType) return
    if (type === 'VARIABLE' && formData.basePrice > 0) {
      setPendingType(type)
      setShowTypeConfirm(true)
      return
    }
    if (type === 'SIMPLE' && formData.variations.length > 0) {
      setPendingType(type)
      setShowTypeConfirm(true)
      return
    }
    updateForm({ productType: type })
  }

  const confirmTypeChange = () => {
    if (pendingType === 'VARIABLE') {
      updateForm({ productType: 'VARIABLE' })
    } else {
      updateForm({ productType: 'SIMPLE', variations: [], attributes: [] })
    }
    setShowTypeConfirm(false)
  }

  const selectedCategory = categories.find((c) => c.id === formData.categoryId)
  const categoryName = selectedCategory?.name || ''

  const handleAiApply = (result: GeneratedContent) => {
    const updates: Partial<ProductFormData> = {
      description: result.description,
      shortDesc: result.shortDesc,
      metaTitle: result.metaTitle,
      metaDescription: result.metaDescription,
      metaKeywords: result.metaKeywords,
      tags: result.tags,
    }
    if (result.pendingImageDataUrl) {
      // Store data URL for preview; actual upload happens on save
      setPendingImageDataUrl(result.pendingImageDataUrl)
      const galleryImages = formData.images.filter((img) => !img.startsWith('data:'))
      updates.images = [result.pendingImageDataUrl, ...galleryImages]
    }
    updateForm(updates)
    setToast({ type: 'success', message: 'AI content applied — review and edit as needed' })
    setTimeout(() => setToast(null), 4000)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = 'Product name is required'
    if (!formData.slug.trim()) errs.slug = 'Slug is required'
    if (!formData.categoryId) errs.categoryId = 'Category is required'
    if (formData.productType === 'SIMPLE' && formData.basePrice <= 0) {
      errs.basePrice = 'Price must be greater than 0'
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      // Switch to tab with first error
      if (errs.name || errs.slug || errs.categoryId) setActiveTab('general')
      else if (errs.basePrice) setActiveTab('pricing')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setIsSaving(true)
    setToast(null)
    try {
      const saveData = pendingImageDataUrl
        ? { ...formData, pendingImageDataUrl }
        : formData
      await onSave(saveData as ProductFormData)
      setPendingImageDataUrl(null)
      setToast({ type: 'success', message: mode === 'create' ? 'Product created.' : 'Product saved.' })
      setTimeout(() => setToast(null), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save product'
      setToast({ type: 'error', message: msg })
      setTimeout(() => setToast(null), 6000)
    } finally {
      setIsSaving(false)
    }
  }

  // Determine visible tabs based on product type
  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === 'pricing' && formData.productType === 'VARIABLE') return false
    if (tab.id === 'variations' && formData.productType === 'SIMPLE') return false
    if (tab.id === 'attributes' && formData.productType === 'SIMPLE') return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg border p-6">
        {activeTab === 'general' && (
          <TabGeneral
            formData={formData}
            categories={categories}
            onChange={updateForm}
            onTypeChange={handleTypeChange}
            errors={errors}
          />
        )}
        {activeTab === 'pricing' && (
          <TabPricing formData={formData} onChange={updateForm} errors={errors} />
        )}
        {activeTab === 'inventory' && (
          <TabInventory formData={formData} onChange={updateForm} />
        )}
        {activeTab === 'images' && (
          <TabImages formData={formData} onChange={updateForm} onOpenAiPanel={() => setAiPanelOpen(true)} />
        )}
        {activeTab === 'attributes' && (
          <TabAttributes formData={formData} onChange={updateForm} />
        )}
        {activeTab === 'variations' && (
          <TabVariations formData={formData} onChange={updateForm} />
        )}
        {activeTab === 'addons' && (
          <TabAddons formData={formData} categories={categories} productId={initialData?.id} onChange={updateForm} />
        )}
        {activeTab === 'seo' && (
          <TabSeo formData={formData} onChange={updateForm} onOpenAiPanel={() => setAiPanelOpen(true)} />
        )}
        {activeTab === 'advanced' && (
          <TabAdvanced formData={formData} onChange={updateForm} />
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
        </Button>
      </div>

      {/* AI Generator Panel */}
      <AIGeneratorPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        productName={formData.name}
        categoryName={categoryName}
        price={String(formData.basePrice || '')}
        weight={formData.weight || undefined}
        occasion={formData.occasion.length > 0 ? formData.occasion.join(', ') : undefined}
        onApply={handleAiApply}
      />

      {/* Type change confirmation dialog */}
      {showTypeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Switch Product Type?</h3>
            <p className="text-sm text-slate-600 mb-4">
              {pendingType === 'VARIABLE'
                ? 'Switching to Variable will move pricing to variations.'
                : 'Switching to Simple will remove all variations and attributes.'}
              {' '}Continue?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowTypeConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmTypeChange}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export type { ProductFormProps, ProductFormData, ProductWithRelations, CategoryOption } from './types'
