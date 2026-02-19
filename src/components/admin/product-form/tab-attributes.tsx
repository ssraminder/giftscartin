"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, X } from "lucide-react"
import type { ProductFormData, AttributeData } from "./types"

interface TabAttributesProps {
  formData: ProductFormData
  onChange: (updates: Partial<ProductFormData>) => void
}

const QUICK_ADD_PRESETS: Record<string, { name: string; slug: string; options: string[] }> = {
  weight: { name: 'Weight', slug: 'weight', options: ['500g', '1kg', '1.5kg', '2kg'] },
  'egg-preference': { name: 'Egg Preference', slug: 'egg-preference', options: ['Eggless', 'With Egg'] },
  flavor: { name: 'Flavor', slug: 'flavor', options: ['Chocolate', 'Vanilla', 'Butterscotch', 'Red Velvet'] },
  size: { name: 'Size', slug: 'size', options: ['Small', 'Medium', 'Large'] },
  'stem-count': { name: 'Stem Count', slug: 'stem-count', options: ['10', '20', '30', '50'] },
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '')
}

export function TabAttributes({ formData, onChange }: TabAttributesProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editOptions, setEditOptions] = useState<string[]>([])
  const [editIsForVariations, setEditIsForVariations] = useState(true)
  const [optionInput, setOptionInput] = useState('')

  if (formData.productType === 'SIMPLE') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-800">
          Upgrade to <strong>Variable</strong> product in the General tab to add attributes and variations.
        </p>
      </div>
    )
  }

  const startEdit = (index: number) => {
    const attr = formData.attributes[index]
    setEditingIndex(index)
    setEditName(attr.name)
    setEditOptions(attr.options.map((o) => o.value))
    setEditIsForVariations(attr.isForVariations)
  }

  const startNew = () => {
    setEditingIndex(-1)
    setEditName('')
    setEditOptions([])
    setEditIsForVariations(true)
    setOptionInput('')
  }

  const saveEdit = () => {
    if (!editName.trim() || editOptions.length === 0) return

    const attr: AttributeData = {
      name: editName.trim(),
      slug: slugify(editName.trim()),
      isForVariations: editIsForVariations,
      sortOrder: editingIndex === -1 ? formData.attributes.length : editingIndex!,
      options: editOptions.map((v, i) => ({
        value: v,
        sortOrder: i,
        ...(editingIndex !== -1 && formData.attributes[editingIndex!]?.options[i]?.id
          ? { id: formData.attributes[editingIndex!].options[i].id }
          : {}),
      })),
    }

    if (editingIndex !== -1 && formData.attributes[editingIndex!]?.id) {
      attr.id = formData.attributes[editingIndex!].id
    }

    const newAttrs = [...formData.attributes]
    if (editingIndex === -1) {
      newAttrs.push(attr)
    } else {
      newAttrs[editingIndex!] = attr
    }
    onChange({ attributes: newAttrs })
    setEditingIndex(null)
  }

  const deleteAttribute = (index: number) => {
    const newAttrs = formData.attributes.filter((_, i) => i !== index)
    onChange({ attributes: newAttrs })
  }

  const addOptionChip = () => {
    const val = optionInput.trim()
    if (val && !editOptions.includes(val)) {
      setEditOptions([...editOptions, val])
      setOptionInput('')
    }
  }

  const removeOptionChip = (index: number) => {
    setEditOptions(editOptions.filter((_, i) => i !== index))
  }

  const quickAdd = (key: string) => {
    const preset = QUICK_ADD_PRESETS[key]
    if (!preset) return
    // Don't add if already exists
    if (formData.attributes.some((a) => a.slug === preset.slug)) return

    const attr: AttributeData = {
      name: preset.name,
      slug: preset.slug,
      isForVariations: true,
      sortOrder: formData.attributes.length,
      options: preset.options.map((v, i) => ({ value: v, sortOrder: i })),
    }
    onChange({ attributes: [...formData.attributes, attr] })
  }

  return (
    <div className="space-y-6">
      {/* Existing attributes */}
      {formData.attributes.length > 0 && (
        <div className="space-y-3">
          {formData.attributes.map((attr, index) => (
            <div key={index} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{attr.name}</span>
                  {attr.isForVariations && (
                    <Badge variant="outline" className="text-xs">For Variations</Badge>
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
                    onClick={() => deleteAttribute(index)}
                    className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attr.options.map((opt, oi) => (
                  <Badge key={oi} variant="secondary" className="text-xs">
                    {opt.value}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Panel */}
      {editingIndex !== null && (
        <div className="rounded-lg border-2 border-slate-300 bg-slate-50 p-4 space-y-4">
          <h4 className="text-sm font-medium">
            {editingIndex === -1 ? 'Add Attribute' : 'Edit Attribute'}
          </h4>
          <div className="space-y-2">
            <Label>Attribute Name</Label>
            <Input
              value={editName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
              placeholder="e.g. Weight"
            />
          </div>
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {editOptions.map((opt, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                  {opt}
                  <button type="button" onClick={() => removeOptionChip(i)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={optionInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptionInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOptionChip()
                  }
                }}
                placeholder="Type an option and press Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addOptionChip}>
                Add
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isForVariations"
              checked={editIsForVariations}
              onChange={(e) => setEditIsForVariations(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="isForVariations">Used for variations</Label>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={saveEdit} disabled={!editName.trim() || editOptions.length === 0}>
              Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingIndex(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Add Attribute button */}
      {editingIndex === null && (
        <Button type="button" variant="outline" onClick={startNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Attribute
        </Button>
      )}

      {/* Quick-add buttons */}
      {editingIndex === null && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Quick Add</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(QUICK_ADD_PRESETS).map(([key, preset]) => {
              const exists = formData.attributes.some((a) => a.slug === key)
              return (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exists}
                  onClick={() => quickAdd(key)}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  {preset.name}
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
