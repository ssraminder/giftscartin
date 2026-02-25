'use client'

import React, { useState, useRef } from 'react'
import {
  Eye, EyeOff, Lock, Unlock, Trash2, Copy, Plus, X,
  Image as ImageIcon, Type, Square, Tag, MousePointer, GripVertical,
  Sparkles, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Layer, LayerType } from '@/lib/banner-layers'

interface LayersPanelProps {
  layers: Layer[]
  selectedId: string | null
  onSelect: (id: string) => void
  onReorder: (layers: Layer[]) => void
  onToggleVisible: (id: string) => void
  onToggleLocked: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onAddLayer: (type: LayerType, useAI?: boolean) => void
  onAutoCompose?: (brief: string) => Promise<void>
  autoComposing?: boolean
}

const TYPE_ICONS: Record<LayerType, React.ElementType> = {
  background: ImageIcon,
  image: ImageIcon,
  text: Type,
  shape: Square,
  badge: Tag,
  button: MousePointer,
}

export function LayersPanel({
  layers,
  selectedId,
  onSelect,
  onReorder,
  onToggleVisible,
  onToggleLocked,
  onDelete,
  onDuplicate,
  onAddLayer,
  onAutoCompose,
  autoComposing,
}: LayersPanelProps) {
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [showAutoCompose, setShowAutoCompose] = useState(false)
  const [composeBrief, setComposeBrief] = useState('')
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingNameVal, setEditingNameVal] = useState('')
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  // Sort layers: highest zIndex first (front-to-back)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex)

  const handleDragStart = (index: number) => {
    dragItem.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverItem.current = index
  }

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) return

    const reordered = [...sortedLayers]
    const [removed] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, removed)

    // Recalculate zIndex: bottom gets 0, each layer above gets +10
    const updated = reordered.map((layer, i) => ({
      ...layer,
      zIndex: (reordered.length - 1 - i) * 10,
    }))

    dragItem.current = null
    dragOverItem.current = null
    onReorder(updated)
  }

  const startEditName = (layer: Layer) => {
    setEditingNameId(layer.id)
    setEditingNameVal(layer.name)
  }

  const commitEditName = () => {
    if (editingNameId && editingNameVal.trim()) {
      const updated = layers.map(l =>
        l.id === editingNameId ? { ...l, name: editingNameVal.trim() } : l
      )
      onReorder(updated)
    }
    setEditingNameId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</span>
        <button
          type="button"
          onClick={() => setShowAddPicker(!showAddPicker)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-pink-500 text-white hover:bg-pink-600 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Add Layer Picker */}
      {showAddPicker && (
        <div className="border-b bg-white p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Add Layer</span>
            <button
              type="button"
              onClick={() => setShowAddPicker(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <span className="text-[10px] text-gray-400 col-span-2">Manual</span>
            {([
              { type: 'image' as LayerType, label: 'Image', icon: ImageIcon },
              { type: 'text' as LayerType, label: 'Text', icon: Type },
              { type: 'badge' as LayerType, label: 'Badge', icon: Tag },
              { type: 'button' as LayerType, label: 'Button', icon: MousePointer },
              { type: 'shape' as LayerType, label: 'Shape', icon: Square },
            ]).map(item => (
              <button
                key={item.type}
                type="button"
                onClick={() => { onAddLayer(item.type, false); setShowAddPicker(false) }}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs border rounded hover:bg-gray-50 transition-colors"
              >
                <item.icon className="w-3.5 h-3.5 text-gray-500" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Auto-compose */}
      <div className="px-3 py-2">
        {!showAutoCompose ? (
          <Button
            type="button"
            variant="outline" size="sm"
            className="w-full text-xs"
            onClick={() => setShowAutoCompose(true)}
          >
            <Sparkles className="w-3 h-3 mr-1" /> Auto-compose Banner
          </Button>
        ) : (
          <div className="border rounded-lg p-3 bg-purple-50">
            <p className="text-xs font-medium mb-2">Describe your banner:</p>
            <textarea
              value={composeBrief}
              onChange={(e) => setComposeBrief(e.target.value)}
              placeholder="Mother's Day flower and cake promotion with midnight delivery"
              className="w-full text-xs border rounded p-2 h-16 resize-none"
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="flex-1 text-xs"
                onClick={async () => {
                  if (onAutoCompose && composeBrief.trim()) {
                    await onAutoCompose(composeBrief.trim())
                    setShowAutoCompose(false)
                    setComposeBrief('')
                  }
                }}
                disabled={autoComposing || !composeBrief.trim()}>
                {autoComposing
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <><Sparkles className="w-3 h-3 mr-1" /> Compose</>
                }
              </Button>
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => { setShowAutoCompose(false); setComposeBrief('') }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto">
        {sortedLayers.map((layer, index) => {
          const isSelected = selectedId === layer.id
          const IconComp = TYPE_ICONS[layer.type]

          return (
            <div
              key={layer.id}
              draggable={layer.type !== 'background'}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onClick={() => onSelect(layer.id)}
              className={`group flex items-center gap-1 h-10 px-1.5 cursor-pointer transition-colors border-l-[3px] ${
                isSelected
                  ? 'bg-pink-50 border-l-pink-500'
                  : 'bg-white border-l-transparent hover:bg-gray-50'
              } ${!layer.visible ? 'opacity-50' : ''} ${layer.locked ? 'opacity-75' : ''}`}
            >
              {/* Drag handle */}
              {layer.type !== 'background' ? (
                <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0 cursor-grab" />
              ) : (
                <div className="w-3 flex-shrink-0" />
              )}

              {/* Visibility toggle */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleVisible(layer.id) }}
                className="p-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                {layer.visible ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
              </button>

              {/* Type icon */}
              <IconComp className="w-3 h-3 text-gray-400 flex-shrink-0" />

              {/* Layer name */}
              <div className="flex-1 min-w-0">
                {editingNameId === layer.id ? (
                  <input
                    type="text"
                    value={editingNameVal}
                    onChange={(e) => setEditingNameVal(e.target.value)}
                    onBlur={commitEditName}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitEditName(); if (e.key === 'Escape') setEditingNameId(null) }}
                    className="w-full text-xs border rounded px-1 py-0.5 focus:outline-none focus:border-pink-400"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="text-xs text-gray-700 truncate block"
                    onDoubleClick={(e) => { e.stopPropagation(); startEditName(layer) }}
                  >
                    {layer.name}
                  </span>
                )}
              </div>

              {/* Lock toggle */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleLocked(layer.id) }}
                className="p-0.5 text-gray-300 hover:text-gray-500 flex-shrink-0"
              >
                {layer.locked ? (
                  <Lock className="w-3 h-3 text-amber-500" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
              </button>

              {/* Duplicate */}
              {layer.type !== 'background' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(layer.id) }}
                  className="p-0.5 text-gray-300 hover:text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}

              {/* Delete */}
              {layer.type !== 'background' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(layer.id) }}
                  className="p-0.5 text-gray-300 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
