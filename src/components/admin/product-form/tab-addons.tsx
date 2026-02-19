"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  RefreshCw,
  Unlink,
  ClipboardList,
  Loader2,
} from "lucide-react"
import type {
  ProductFormData,
  AddonGroupData,
  AddonOptionData,
  AddonType,
  CategoryOption,
} from "./types"

interface TabAddonsProps {
  formData: ProductFormData
  categories: CategoryOption[]
  productId?: string
  onChange: (updates: Partial<ProductFormData>) => void
}

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

export function TabAddons({ formData, categories, productId, onChange }: TabAddonsProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [syncingIndex, setSyncingIndex] = useState<number | null>(null)
  const [editGroup, setEditGroup] = useState<AddonGroupData>({
    name: '',
    description: null,
    type: 'CHECKBOX',
    required: false,
    maxLength: null,
    placeholder: null,
    acceptedFileTypes: [],
    maxFileSizeMb: 5,
    templateGroupId: null,
    isOverridden: false,
    sortOrder: 0,
    options: [],
  })

  const selectedCategory = categories.find((c) => c.id === formData.categoryId)
  const templates = selectedCategory?.addonTemplates || []

  const applyTemplates = () => {
    const newGroups: AddonGroupData[] = templates.map((t, i) => ({
      name: t.name,
      description: t.description,
      type: t.type,
      required: t.required,
      maxLength: t.maxLength,
      placeholder: t.placeholder,
      acceptedFileTypes: t.acceptedFileTypes,
      maxFileSizeMb: t.maxFileSizeMb,
      templateGroupId: t.id,
      isOverridden: false,
      sortOrder: i,
      options: t.options.map((o) => ({
        label: o.label,
        price: Number(o.price),
        image: o.image,
        isDefault: o.isDefault,
        sortOrder: o.sortOrder,
      })),
    }))
    // Merge: keep existing non-template groups, add templates that don't exist yet
    const existing = formData.addonGroups.filter(
      (g) => !g.templateGroupId || !templates.some((t) => t.id === g.templateGroupId)
    )
    onChange({ addonGroups: [...newGroups, ...existing] })
  }

  const startNew = () => {
    setEditingIndex(-1)
    setEditGroup({
      name: '',
      description: null,
      type: 'CHECKBOX',
      required: false,
      maxLength: null,
      placeholder: null,
      acceptedFileTypes: [],
      maxFileSizeMb: 5,
      templateGroupId: null,
      isOverridden: false,
      sortOrder: formData.addonGroups.length,
      options: [],
    })
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditGroup({ ...formData.addonGroups[index] })
  }

  const saveEdit = () => {
    if (!editGroup.name.trim()) return

    const newGroups = [...formData.addonGroups]
    if (editingIndex === -1) {
      newGroups.push(editGroup)
    } else {
      // Preserve id if editing existing
      newGroups[editingIndex!] = {
        ...editGroup,
        id: formData.addonGroups[editingIndex!]?.id,
      }
    }
    onChange({ addonGroups: newGroups })
    setEditingIndex(null)
  }

  const deleteGroup = (index: number) => {
    onChange({ addonGroups: formData.addonGroups.filter((_, i) => i !== index) })
  }

  const resyncGroup = async (index: number) => {
    const group = formData.addonGroups[index]
    if (!group.templateGroupId) return

    // If we have a productId and the group has a persisted id, use the API
    if (productId && group.id) {
      setSyncingIndex(index)
      try {
        const res = await fetch(`/api/admin/products/${productId}/sync-addon-group`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addonGroupId: group.id }),
        })
        const json = await res.json()
        if (json.success && json.data) {
          const synced: AddonGroupData = {
            id: json.data.id,
            name: json.data.name,
            description: json.data.description,
            type: json.data.type,
            required: json.data.required,
            maxLength: json.data.maxLength,
            placeholder: json.data.placeholder,
            acceptedFileTypes: json.data.acceptedFileTypes ?? [],
            maxFileSizeMb: json.data.maxFileSizeMb,
            templateGroupId: json.data.templateGroupId,
            isOverridden: false,
            sortOrder: json.data.sortOrder,
            options: (json.data.options ?? []).map((o: { id: string; label: string; price: number | string; image: string | null; isDefault: boolean; sortOrder: number }) => ({
              id: o.id,
              label: o.label,
              price: Number(o.price),
              image: o.image,
              isDefault: o.isDefault,
              sortOrder: o.sortOrder,
            })),
          }
          const newGroups = [...formData.addonGroups]
          newGroups[index] = synced
          onChange({ addonGroups: newGroups })
        }
      } catch {
        // Fallback to local resync
        localResyncGroup(index)
      } finally {
        setSyncingIndex(null)
      }
    } else {
      // Local resync from category templates
      localResyncGroup(index)
    }
  }

  const localResyncGroup = (index: number) => {
    const group = formData.addonGroups[index]
    if (!group.templateGroupId) return
    const template = templates.find((t) => t.id === group.templateGroupId)
    if (!template) return

    const synced: AddonGroupData = {
      ...group,
      name: template.name,
      description: template.description,
      type: template.type,
      required: template.required,
      maxLength: template.maxLength,
      placeholder: template.placeholder,
      acceptedFileTypes: template.acceptedFileTypes,
      maxFileSizeMb: template.maxFileSizeMb,
      isOverridden: false,
      options: template.options.map((o) => ({
        label: o.label,
        price: Number(o.price),
        image: o.image,
        isDefault: o.isDefault,
        sortOrder: o.sortOrder,
      })),
    }
    const newGroups = [...formData.addonGroups]
    newGroups[index] = synced
    onChange({ addonGroups: newGroups })
  }

  const handleDetach = (index: number) => {
    const newGroups = [...formData.addonGroups]
    newGroups[index] = { ...newGroups[index], isOverridden: true }
    onChange({ addonGroups: newGroups })
  }

  // Quick-add presets
  const quickAddNameOnCake = () => {
    const group: AddonGroupData = {
      name: 'Name on Cake',
      description: null,
      type: 'TEXT_INPUT',
      required: false,
      maxLength: 20,
      placeholder: 'E.g. Happy Birthday Priya',
      acceptedFileTypes: [],
      maxFileSizeMb: null,
      templateGroupId: null,
      isOverridden: false,
      sortOrder: formData.addonGroups.length,
      options: [],
    }
    onChange({ addonGroups: [...formData.addonGroups, group] })
  }

  const quickAddMessageCard = () => {
    const group: AddonGroupData = {
      name: 'Message Card',
      description: null,
      type: 'CHECKBOX',
      required: false,
      maxLength: null,
      placeholder: null,
      acceptedFileTypes: [],
      maxFileSizeMb: null,
      templateGroupId: null,
      isOverridden: false,
      sortOrder: formData.addonGroups.length,
      options: [
        { label: 'No Card', price: 0, image: null, isDefault: true, sortOrder: 0 },
        { label: 'Printed Card', price: 49, image: null, isDefault: false, sortOrder: 1 },
        { label: 'Premium Card', price: 99, image: null, isDefault: false, sortOrder: 2 },
      ],
    }
    onChange({ addonGroups: [...formData.addonGroups, group] })
  }

  const quickAddUploadPhoto = () => {
    const group: AddonGroupData = {
      name: 'Upload Your Photo',
      description: null,
      type: 'FILE_UPLOAD',
      required: true,
      maxLength: null,
      placeholder: null,
      acceptedFileTypes: ['image/jpeg', 'image/png'],
      maxFileSizeMb: 5,
      templateGroupId: null,
      isOverridden: false,
      sortOrder: formData.addonGroups.length,
      options: [],
    }
    onChange({ addonGroups: [...formData.addonGroups, group] })
  }

  // Option editing helpers
  const addOption = () => {
    setEditGroup({
      ...editGroup,
      options: [
        ...editGroup.options,
        { label: '', price: 0, image: null, isDefault: false, sortOrder: editGroup.options.length },
      ],
    })
  }

  const updateOption = (index: number, updates: Partial<AddonOptionData>) => {
    const newOpts = [...editGroup.options]
    newOpts[index] = { ...newOpts[index], ...updates }
    setEditGroup({ ...editGroup, options: newOpts })
  }

  const removeOption = (index: number) => {
    setEditGroup({
      ...editGroup,
      options: editGroup.options.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      {/* Category template banner */}
      {templates.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <ClipboardList className="h-4 w-4" />
            This category has {templates.length} addon template{templates.length !== 1 ? 's' : ''}.
          </div>
          <Button type="button" variant="outline" size="sm" onClick={applyTemplates}>
            Apply Category Defaults
          </Button>
        </div>
      )}

      {/* Existing groups */}
      {formData.addonGroups.map((group, index) => (
        <div key={index} className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-300" />
              <span className="font-medium text-sm">{group.name}</span>
              <Badge variant="outline" className={`text-xs ${ADDON_TYPE_COLORS[group.type]}`}>
                {ADDON_TYPE_LABELS[group.type]}
              </Badge>
              {group.required && (
                <Badge variant="outline" className="text-xs border-red-200 bg-red-50 text-red-700">
                  Required
                </Badge>
              )}
              {group.templateGroupId && !group.isOverridden && (
                <>
                  <Badge variant="outline" className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700">
                    Synced with template
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleDetach(index)}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    <Unlink className="h-3 w-3" />
                    Detach from template
                  </button>
                </>
              )}
              {group.templateGroupId && group.isOverridden && (
                <>
                  <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700">
                    Customised
                  </Badge>
                  <button
                    type="button"
                    onClick={() => resyncGroup(index)}
                    disabled={syncingIndex === index}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                  >
                    {syncingIndex === index ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Re-sync with template
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => startEdit(index)}
                className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => deleteGroup(index)}
                className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {/* Options preview */}
          {HAS_OPTIONS.includes(group.type) && group.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {group.options.map((opt, oi) => (
                <Badge key={oi} variant="secondary" className="text-xs gap-1">
                  {opt.label}
                  {opt.price > 0 && <span className="text-slate-500">+&#8377;{opt.price}</span>}
                  {opt.isDefault && <span className="text-blue-600">(default)</span>}
                </Badge>
              ))}
            </div>
          )}
          {group.type === 'TEXT_INPUT' && (
            <p className="text-xs text-slate-500 mt-1">
              Max {group.maxLength || '—'} chars · Placeholder: {group.placeholder || '—'}
            </p>
          )}
          {group.type === 'FILE_UPLOAD' && (
            <p className="text-xs text-slate-500 mt-1">
              Accepted: {group.acceptedFileTypes.join(', ') || 'any'} · Max {group.maxFileSizeMb || 5}MB
            </p>
          )}
        </div>
      ))}

      {/* Edit/Add panel */}
      {editingIndex !== null && (
        <div className="rounded-lg border-2 border-slate-300 bg-slate-50 p-4 space-y-4">
          <h4 className="text-sm font-medium">
            {editingIndex === -1 ? 'Add Addon Group' : 'Edit Addon Group'}
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                value={editGroup.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditGroup({ ...editGroup, name: e.target.value })}
                placeholder="e.g. Name on Cake"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={editGroup.type}
                onChange={(e) => setEditGroup({ ...editGroup, type: e.target.value as AddonType })}
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
              id="addonRequired"
              checked={editGroup.required}
              onChange={(e) => setEditGroup({ ...editGroup, required: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="addonRequired">Required</Label>
          </div>

          {/* Per-type fields */}
          {(editGroup.type === 'TEXT_INPUT' || editGroup.type === 'TEXTAREA') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Max Length</Label>
                <Input
                  type="number"
                  value={editGroup.maxLength ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditGroup({ ...editGroup, maxLength: e.target.value ? parseInt(e.target.value) : null })
                  }
                  placeholder="e.g. 20"
                />
              </div>
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={editGroup.placeholder || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditGroup({ ...editGroup, placeholder: e.target.value || null })
                  }
                  placeholder="e.g. Happy Birthday Priya"
                />
              </div>
            </div>
          )}

          {editGroup.type === 'FILE_UPLOAD' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Accepted File Types</Label>
                <div className="flex gap-3">
                  {['image/jpeg', 'image/png', 'application/pdf'].map((ft) => (
                    <label key={ft} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={editGroup.acceptedFileTypes.includes(ft)}
                        onChange={(e) => {
                          const types = e.target.checked
                            ? [...editGroup.acceptedFileTypes, ft]
                            : editGroup.acceptedFileTypes.filter((t) => t !== ft)
                          setEditGroup({ ...editGroup, acceptedFileTypes: types })
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
                  value={editGroup.maxFileSizeMb ?? 5}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditGroup({ ...editGroup, maxFileSizeMb: parseInt(e.target.value) || 5 })
                  }
                  className="w-24"
                />
              </div>
            </div>
          )}

          {/* Options (for CHECKBOX / RADIO / SELECT) */}
          {HAS_OPTIONS.includes(editGroup.type) && (
            <div className="space-y-3">
              <Label>Options</Label>
              {editGroup.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  <Input
                    value={opt.label}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(i, { label: e.target.value })}
                    placeholder="Label"
                    className="flex-1"
                  />
                  <div className="relative flex-shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">&#8377;</span>
                    <Input
                      type="number"
                      value={opt.price || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(i, { price: parseFloat(e.target.value) || 0 })}
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
            <Button type="button" size="sm" onClick={saveEdit} disabled={!editGroup.name.trim()}>
              Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingIndex(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add button */}
      {editingIndex === null && (
        <Button type="button" variant="outline" onClick={startNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Addon Group
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
    </div>
  )
}
