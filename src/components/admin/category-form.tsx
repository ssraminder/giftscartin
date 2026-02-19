"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  Zap,
  Loader2,
} from "lucide-react"

// ==================== Types ====================

type AddonType = 'CHECKBOX' | 'RADIO' | 'SELECT' | 'TEXT_INPUT' | 'TEXTAREA' | 'FILE_UPLOAD'

interface AddonOptionData {
  id?: string
  label: string
  price: number
  image: string | null
  isDefault: boolean
  sortOrder: number
}

interface AddonTemplateData {
  id?: string
  name: string
  description: string | null
  type: AddonType
  required: boolean
  maxLength: number | null
  placeholder: string | null
  acceptedFileTypes: string[]
  maxFileSizeMb: number | null
  sortOrder: number
  options: AddonOptionData[]
}

interface CategoryFormData {
  name: string
  slug: string
  description: string
  image: string
  parentId: string | null
  sortOrder: number
  isActive: boolean
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  ogImage: string
  addonTemplates: AddonTemplateData[]
}

interface ParentOption {
  id: string
  name: string
}

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    slug: string
    description: string | null
    image: string | null
    parentId: string | null
    sortOrder: number
    isActive: boolean
    metaTitle: string | null
    metaDescription: string | null
    metaKeywords: string[]
    ogImage: string | null
    _count: { products: number }
    addonTemplates: Array<{
      id: string
      name: string
      description: string | null
      type: AddonType
      required: boolean
      maxLength: number | null
      placeholder: string | null
      acceptedFileTypes: string[]
      maxFileSizeMb: number | null
      sortOrder: number
      options: Array<{
        id: string
        label: string
        price: number | string
        image: string | null
        isDefault: boolean
        sortOrder: number
      }>
    }>
  }
  parentOptions: ParentOption[]
  onSaved: () => void
}

// ==================== Constants ====================

const ADDON_TYPE_LABELS: Record<AddonType, string> = {
  CHECKBOX: 'Checkbox',
  RADIO: 'Radio',
  SELECT: 'Select',
  TEXT_INPUT: 'Text Input',
  TEXTAREA: 'Text Area',
  FILE_UPLOAD: 'File Upload',
}

const ADDON_TYPE_COLORS: Record<AddonType, string> = {
  CHECKBOX: 'bg-blue-50 text-blue-700 border-blue-200',
  RADIO: 'bg-purple-50 text-purple-700 border-purple-200',
  SELECT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  TEXT_INPUT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TEXTAREA: 'bg-teal-50 text-teal-700 border-teal-200',
  FILE_UPLOAD: 'bg-amber-50 text-amber-700 border-amber-200',
}

const HAS_OPTIONS: AddonType[] = ['CHECKBOX', 'RADIO', 'SELECT']

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'seo', label: 'SEO' },
  { id: 'templates', label: 'Addon Templates' },
] as const

type TabId = (typeof TABS)[number]['id']

// ==================== Component ====================

export function CategoryForm({
  open,
  onOpenChange,
  mode,
  initialData,
  parentOptions,
  onSaved,
}: CategoryFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [linkedGroupCount, setLinkedGroupCount] = useState<number | null>(null)

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: null,
    sortOrder: 0,
    isActive: true,
    metaTitle: '',
    metaDescription: '',
    metaKeywords: [],
    ogImage: '',
    addonTemplates: [],
  })

  // Addon template editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editTemplate, setEditTemplate] = useState<AddonTemplateData>({
    name: '',
    description: null,
    type: 'CHECKBOX',
    required: false,
    maxLength: null,
    placeholder: null,
    acceptedFileTypes: [],
    maxFileSizeMb: 5,
    sortOrder: 0,
    options: [],
  })

  // Keyword input
  const [keywordInput, setKeywordInput] = useState('')

  // Initialize form with existing data on open
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setFormData({
          name: initialData.name,
          slug: initialData.slug,
          description: initialData.description || '',
          image: initialData.image || '',
          parentId: initialData.parentId,
          sortOrder: initialData.sortOrder,
          isActive: initialData.isActive,
          metaTitle: initialData.metaTitle || '',
          metaDescription: initialData.metaDescription || '',
          metaKeywords: initialData.metaKeywords || [],
          ogImage: initialData.ogImage || '',
          addonTemplates: initialData.addonTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            type: t.type,
            required: t.required,
            maxLength: t.maxLength,
            placeholder: t.placeholder,
            acceptedFileTypes: t.acceptedFileTypes,
            maxFileSizeMb: t.maxFileSizeMb,
            sortOrder: t.sortOrder,
            options: t.options.map((o) => ({
              id: o.id,
              label: o.label,
              price: Number(o.price),
              image: o.image,
              isDefault: o.isDefault,
              sortOrder: o.sortOrder,
            })),
          })),
        })
        // Fetch linked group count
        fetchLinkedGroupCount(initialData.addonTemplates.map((t) => t.id))
      } else {
        setFormData({
          name: '',
          slug: '',
          description: '',
          image: '',
          parentId: null,
          sortOrder: 0,
          isActive: true,
          metaTitle: '',
          metaDescription: '',
          metaKeywords: [],
          ogImage: '',
          addonTemplates: [],
        })
        setLinkedGroupCount(null)
      }
      setActiveTab('general')
      setEditingIndex(null)
      setError(null)
      setSyncResult(null)
    }
  }, [open, mode, initialData])

  const fetchLinkedGroupCount = async (templateIds: string[]) => {
    if (templateIds.length === 0) {
      setLinkedGroupCount(0)
      return
    }
    try {
      // Use the sync-templates endpoint to estimate — we'll just show what we know
      // For now, just set to null (unknown) unless we add a dedicated count endpoint
      setLinkedGroupCount(null)
    } catch {
      setLinkedGroupCount(null)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Auto-generate slug only in create mode or if slug was auto-generated
      ...(mode === 'create' || prev.slug === generateSlug(prev.name)
        ? { slug: generateSlug(name) }
        : {}),
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || null,
        image: formData.image || null,
        parentId: formData.parentId || null,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
        metaKeywords: formData.metaKeywords,
        ogImage: formData.ogImage || null,
        addonTemplates: formData.addonTemplates.map((t, i) => ({
          ...(t.id ? { id: t.id } : {}),
          name: t.name,
          description: t.description,
          type: t.type,
          required: t.required,
          maxLength: t.maxLength,
          placeholder: t.placeholder,
          acceptedFileTypes: t.acceptedFileTypes,
          maxFileSizeMb: t.maxFileSizeMb,
          sortOrder: i,
          options: t.options.map((o, oi) => ({
            label: o.label,
            price: o.price,
            image: o.image,
            isDefault: o.isDefault,
            sortOrder: oi,
          })),
        })),
      }

      const url =
        mode === 'edit' && initialData
          ? `/api/admin/categories/${initialData.id}`
          : '/api/admin/categories'

      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed to save category')
        return
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncAll = async () => {
    if (!initialData?.id) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch(`/api/admin/categories/${initialData.id}/sync-templates`, {
        method: 'POST',
      })
      const json = await res.json()
      if (json.success) {
        setSyncResult(`Synced ${json.data.groupsUpdated} addon group${json.data.groupsUpdated !== 1 ? 's' : ''} across ${json.data.templatesProcessed} template${json.data.templatesProcessed !== 1 ? 's' : ''}.`)
      } else {
        setSyncResult(`Error: ${json.error}`)
      }
    } catch {
      setSyncResult('Failed to sync templates')
    } finally {
      setSyncing(false)
    }
  }

  // ==================== Template editing ====================

  const startNewTemplate = () => {
    setEditingIndex(-1)
    setEditTemplate({
      name: '',
      description: null,
      type: 'CHECKBOX',
      required: false,
      maxLength: null,
      placeholder: null,
      acceptedFileTypes: [],
      maxFileSizeMb: 5,
      sortOrder: formData.addonTemplates.length,
      options: [],
    })
  }

  const startEditTemplate = (index: number) => {
    setEditingIndex(index)
    setEditTemplate({ ...formData.addonTemplates[index] })
  }

  const saveTemplate = () => {
    if (!editTemplate.name.trim()) return
    const newTemplates = [...formData.addonTemplates]
    if (editingIndex === -1) {
      newTemplates.push(editTemplate)
    } else if (editingIndex !== null) {
      newTemplates[editingIndex] = {
        ...editTemplate,
        id: formData.addonTemplates[editingIndex]?.id,
      }
    }
    setFormData((prev) => ({ ...prev, addonTemplates: newTemplates }))
    setEditingIndex(null)
  }

  const deleteTemplate = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      addonTemplates: prev.addonTemplates.filter((_, i) => i !== index),
    }))
  }

  // Quick-add presets
  const quickAddNameOnCake = () => {
    const t: AddonTemplateData = {
      name: 'Name on Cake',
      description: null,
      type: 'TEXT_INPUT',
      required: false,
      maxLength: 20,
      placeholder: 'E.g. Happy Birthday Priya',
      acceptedFileTypes: [],
      maxFileSizeMb: null,
      sortOrder: formData.addonTemplates.length,
      options: [],
    }
    setFormData((prev) => ({ ...prev, addonTemplates: [...prev.addonTemplates, t] }))
  }

  const quickAddMessageCard = () => {
    const t: AddonTemplateData = {
      name: 'Message Card',
      description: null,
      type: 'CHECKBOX',
      required: false,
      maxLength: null,
      placeholder: null,
      acceptedFileTypes: [],
      maxFileSizeMb: null,
      sortOrder: formData.addonTemplates.length,
      options: [
        { label: 'No Card', price: 0, image: null, isDefault: true, sortOrder: 0 },
        { label: 'Printed Card', price: 49, image: null, isDefault: false, sortOrder: 1 },
        { label: 'Premium Card', price: 99, image: null, isDefault: false, sortOrder: 2 },
      ],
    }
    setFormData((prev) => ({ ...prev, addonTemplates: [...prev.addonTemplates, t] }))
  }

  const quickAddUploadPhoto = () => {
    const t: AddonTemplateData = {
      name: 'Upload Your Photo',
      description: null,
      type: 'FILE_UPLOAD',
      required: true,
      maxLength: null,
      placeholder: null,
      acceptedFileTypes: ['image/jpeg', 'image/png'],
      maxFileSizeMb: 5,
      sortOrder: formData.addonTemplates.length,
      options: [],
    }
    setFormData((prev) => ({ ...prev, addonTemplates: [...prev.addonTemplates, t] }))
  }

  // Option editing helpers
  const addOption = () => {
    setEditTemplate({
      ...editTemplate,
      options: [
        ...editTemplate.options,
        { label: '', price: 0, image: null, isDefault: false, sortOrder: editTemplate.options.length },
      ],
    })
  }

  const updateOption = (index: number, updates: Partial<AddonOptionData>) => {
    const newOpts = [...editTemplate.options]
    newOpts[index] = { ...newOpts[index], ...updates }
    setEditTemplate({ ...editTemplate, options: newOpts })
  }

  const removeOption = (index: number) => {
    setEditTemplate({
      ...editTemplate,
      options: editTemplate.options.filter((_, i) => i !== index),
    })
  }

  // Keyword helpers
  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !formData.metaKeywords.includes(kw)) {
      setFormData((prev) => ({
        ...prev,
        metaKeywords: [...prev.metaKeywords, kw],
      }))
    }
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) => {
    setFormData((prev) => ({
      ...prev,
      metaKeywords: prev.metaKeywords.filter((k) => k !== kw),
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === 'edit' ? 'Edit Category' : 'Add Category'}
          </SheetTitle>
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex gap-1 border-b mt-4 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ==================== General Tab ==================== */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
                placeholder="e.g. Cakes"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="auto-generated from name"
              />
              <p className="text-xs text-slate-500">URL: /category/{formData.slug || '...'}</p>
            </div>

            <div className="space-y-2">
              <Label>Parent Category</Label>
              <select
                value={formData.parentId || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, parentId: e.target.value || null }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">None (top-level)</option>
                {parentOptions
                  .filter((p) => p.id !== initialData?.id) // don't allow self-referencing
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Category description..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formData.image}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, image: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="catActive">Active</Label>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SEO Tab ==================== */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Meta Title</Label>
                <span className={`text-xs ${formData.metaTitle.length > 60 ? 'text-red-600' : 'text-slate-400'}`}>
                  {formData.metaTitle.length}/60
                </span>
              </div>
              <Input
                value={formData.metaTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))
                }
                placeholder="e.g. Order Cakes Online — Fresh & Same Day Delivery"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Meta Description</Label>
                <span className={`text-xs ${formData.metaDescription.length > 160 ? 'text-red-600' : 'text-slate-400'}`}>
                  {formData.metaDescription.length}/160
                </span>
              </div>
              <textarea
                value={formData.metaDescription}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))
                }
                placeholder="Category meta description for search engines..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label>Meta Keywords</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeywordInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addKeyword()
                    }
                  }}
                  placeholder="Type keyword and press Enter"
                />
                <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                  Add
                </Button>
              </div>
              {formData.metaKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.metaKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>OG Image URL</Label>
              <Input
                value={formData.ogImage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, ogImage: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        {/* ==================== Addon Templates Tab ==================== */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              Templates defined here are applied to new products in this category.
              Changes here auto-propagate to all linked products that haven&apos;t been customised.
            </p>

            {/* Existing templates */}
            {formData.addonTemplates.map((template, index) => (
              <div key={index} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-slate-300" />
                    <span className="font-medium text-sm">{template.name}</span>
                    <Badge variant="outline" className={`text-xs ${ADDON_TYPE_COLORS[template.type]}`}>
                      {ADDON_TYPE_LABELS[template.type]}
                    </Badge>
                    {template.required && (
                      <Badge variant="outline" className="text-xs border-red-200 bg-red-50 text-red-700">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEditTemplate(index)}
                      className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(index)}
                      className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {HAS_OPTIONS.includes(template.type) && template.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {template.options.map((opt, oi) => (
                      <Badge key={oi} variant="secondary" className="text-xs gap-1">
                        {opt.label}
                        {opt.price > 0 && <span className="text-slate-500">+&#8377;{opt.price}</span>}
                        {opt.isDefault && <span className="text-blue-600">(default)</span>}
                      </Badge>
                    ))}
                  </div>
                )}
                {template.type === 'TEXT_INPUT' && (
                  <p className="text-xs text-slate-500 mt-1">
                    Max {template.maxLength || '—'} chars · Placeholder: {template.placeholder || '—'}
                  </p>
                )}
                {template.type === 'FILE_UPLOAD' && (
                  <p className="text-xs text-slate-500 mt-1">
                    Accepted: {template.acceptedFileTypes.join(', ') || 'any'} · Max {template.maxFileSizeMb || 5}MB
                  </p>
                )}
              </div>
            ))}

            {/* Edit/Add panel */}
            {editingIndex !== null && (
              <div className="rounded-lg border-2 border-slate-300 bg-slate-50 p-4 space-y-4">
                <h4 className="text-sm font-medium">
                  {editingIndex === -1 ? 'Add Addon Template' : 'Edit Addon Template'}
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={editTemplate.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditTemplate({ ...editTemplate, name: e.target.value })
                      }
                      placeholder="e.g. Name on Cake"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select
                      value={editTemplate.type}
                      onChange={(e) =>
                        setEditTemplate({ ...editTemplate, type: e.target.value as AddonType })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {Object.entries(ADDON_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="templateRequired"
                    checked={editTemplate.required}
                    onChange={(e) =>
                      setEditTemplate({ ...editTemplate, required: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Label htmlFor="templateRequired">Required</Label>
                </div>

                {(editTemplate.type === 'TEXT_INPUT' || editTemplate.type === 'TEXTAREA') && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Max Length</Label>
                      <Input
                        type="number"
                        value={editTemplate.maxLength ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditTemplate({
                            ...editTemplate,
                            maxLength: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="e.g. 20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Placeholder</Label>
                      <Input
                        value={editTemplate.placeholder || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditTemplate({
                            ...editTemplate,
                            placeholder: e.target.value || null,
                          })
                        }
                        placeholder="e.g. Happy Birthday Priya"
                      />
                    </div>
                  </div>
                )}

                {editTemplate.type === 'FILE_UPLOAD' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Accepted File Types</Label>
                      <div className="flex gap-3">
                        {['image/jpeg', 'image/png', 'application/pdf'].map((ft) => (
                          <label key={ft} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={editTemplate.acceptedFileTypes.includes(ft)}
                              onChange={(e) => {
                                const types = e.target.checked
                                  ? [...editTemplate.acceptedFileTypes, ft]
                                  : editTemplate.acceptedFileTypes.filter((t) => t !== ft)
                                setEditTemplate({ ...editTemplate, acceptedFileTypes: types })
                              }}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            {ft.split('/')[1].toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Max File Size (MB)</Label>
                      <Input
                        type="number"
                        value={editTemplate.maxFileSizeMb ?? 5}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditTemplate({
                            ...editTemplate,
                            maxFileSizeMb: parseInt(e.target.value) || 5,
                          })
                        }
                        className="w-24"
                      />
                    </div>
                  </div>
                )}

                {/* Options for CHECKBOX/RADIO/SELECT */}
                {HAS_OPTIONS.includes(editTemplate.type) && (
                  <div className="space-y-3">
                    <Label>Options</Label>
                    {editTemplate.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                        <Input
                          value={opt.label}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateOption(i, { label: e.target.value })
                          }
                          placeholder="Label"
                          className="flex-1"
                        />
                        <div className="relative flex-shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            &#8377;
                          </span>
                          <Input
                            type="number"
                            value={opt.price || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateOption(i, { price: parseFloat(e.target.value) || 0 })
                            }
                            className="w-20 pl-5"
                            placeholder="0"
                          />
                        </div>
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={opt.isDefault}
                            onChange={(e) => updateOption(i, { isDefault: e.target.checked })}
                            className="h-3.5 w-3.5 rounded border-slate-300"
                          />
                          Default
                        </label>
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="rounded p-1 text-slate-400 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add Option
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveTemplate}
                    disabled={!editTemplate.name.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingIndex(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Add button */}
            {editingIndex === null && (
              <Button type="button" variant="outline" onClick={startNewTemplate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Addon Template
              </Button>
            )}

            {/* Quick-add buttons */}
            {editingIndex === null && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Quick Add</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={quickAddNameOnCake} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" />
                    Name on Cake
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={quickAddMessageCard} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" />
                    Message Card
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={quickAddUploadPhoto} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" />
                    Upload Photo
                  </Button>
                </div>
              </div>
            )}

            {/* Propagation section — only show in edit mode when templates exist */}
            {mode === 'edit' && initialData && formData.addonTemplates.length > 0 && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <Zap className="h-4 w-4" />
                  Propagate to products
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAll}
                  disabled={syncing}
                  className="gap-2"
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  Sync to All Linked Products
                </Button>
                {syncResult && (
                  <p className="text-xs text-amber-700">{syncResult}</p>
                )}
                {linkedGroupCount !== null && (
                  <p className="text-xs text-amber-600">
                    Will update: {linkedGroupCount} addon group{linkedGroupCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        <div className="flex gap-3 mt-8 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'edit' ? 'Update Category' : 'Create Category'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
