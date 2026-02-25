'use client'

import React, { useRef, useEffect } from 'react'
import { Pencil, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DraggableResizable } from '@/components/admin/draggable-resizable'
import { loadGoogleFont } from '@/lib/banner-layers'
import type { Layer, LayerType, BackgroundLayer, ImageLayer, TextLayer, ShapeLayer, BadgeLayer, ButtonLayer } from '@/lib/banner-layers'

interface BannerCanvasProps {
  layers: Layer[]
  selectedId: string | null
  onSelectLayer: (id: string | null) => void
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void
  onDeleteLayer: (id: string) => void
  mode: 'edit' | 'preview'
  onModeChange: (mode: 'edit' | 'preview') => void
  snapToGrid: boolean
  onSnapToGridChange: (snap: boolean) => void
  aspectRatio: string
  onAspectRatioChange: (ratio: string) => void
}

function getLayerAccentColor(type: LayerType): string {
  const colors: Record<LayerType, string> = {
    background: '#6B7280',
    image: '#3B82F6',
    text: '#E91E63',
    shape: '#8B5CF6',
    badge: '#F59E0B',
    button: '#10B981',
  }
  return colors[type]
}

export function BannerCanvas({
  layers,
  selectedId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  mode,
  onModeChange,
  snapToGrid,
  onSnapToGridChange,
  aspectRatio,
  onAspectRatioChange,
}: BannerCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    if (!selectedId || mode !== 'edit') return

    const handleKey = (e: KeyboardEvent) => {
      const layer = layers.find(l => l.id === selectedId)
      if (!layer || layer.type === 'background') return

      const step = e.shiftKey ? 2.5 : 0.5
      const updates: Partial<Layer> = {}

      switch (e.key) {
        case 'ArrowLeft':  updates.x = Math.max(0, layer.x - step); break
        case 'ArrowRight': updates.x = Math.min(100 - layer.w, layer.x + step); break
        case 'ArrowUp':    updates.y = Math.max(0, layer.y - step); break
        case 'ArrowDown':  updates.y = Math.min(100 - layer.h, layer.y + step); break
        case '+': case '=': updates.w = Math.min(100 - layer.x, layer.w + step); break
        case '-': updates.w = Math.max(5, layer.w - step); break
        case 'Escape': onSelectLayer(null); return
        case 'Delete':
        case 'Backspace':
          if (e.target === document.body) {
            onDeleteLayer(selectedId)
            return
          }
          break
        default: return
      }

      if (Object.keys(updates).length > 0) {
        e.preventDefault()
        onUpdateLayer(selectedId, updates)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedId, layers, mode, onSelectLayer, onUpdateLayer, onDeleteLayer])

  function renderLayerContent(layer: Layer) {
    if ('fontFamily' in layer) loadGoogleFont(layer.fontFamily)

    switch (layer.type) {
      case 'image': {
        const l = layer as ImageLayer
        return (
          <img
            src={l.imageUrl}
            alt=""
            className="w-full h-full pointer-events-none select-none"
            style={{
              objectFit: l.objectFit,
              objectPosition: l.objectPosition,
              borderRadius: l.borderRadius,
              filter: l.dropShadow ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : 'none',
            }}
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        )
      }

      case 'text': {
        const l = layer as TextLayer
        return (
          <div
            className="w-full h-full pointer-events-none select-none overflow-hidden"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: l.verticalAlign === 'top' ? 'flex-start'
                : l.verticalAlign === 'bottom' ? 'flex-end' : 'center',
              fontFamily: `'${l.fontFamily}', sans-serif`,
              fontSize: `${l.fontSize}px`,
              fontWeight: l.fontWeight,
              lineHeight: l.lineHeight,
              letterSpacing: `${l.letterSpacing}px`,
              textAlign: l.textAlign,
            }}
            dangerouslySetInnerHTML={{ __html: l.html }}
          />
        )
      }

      case 'shape': {
        const l = layer as ShapeLayer
        return (
          <div
            className="w-full h-full pointer-events-none"
            style={{
              background: l.fill,
              borderRadius: l.shape === 'circle' ? '50%' : l.borderRadius,
              border: l.borderWidth > 0
                ? `${l.borderWidth}px solid ${l.borderColor}`
                : 'none',
            }}
          />
        )
      }

      case 'badge': {
        const l = layer as BadgeLayer
        return (
          <div
            className="pointer-events-none"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              width: 'fit-content',
              whiteSpace: 'nowrap',
              padding: `${l.paddingY}px ${l.paddingX}px`,
              borderRadius: `${l.borderRadius}px`,
              backgroundColor: l.bgColor,
              color: l.textColor,
              fontFamily: `'${l.fontFamily}', sans-serif`,
              fontSize: `${l.fontSize}px`,
              fontWeight: l.fontWeight,
              border: l.borderWidth > 0
                ? `${l.borderWidth}px solid ${l.borderColor}`
                : 'none',
            }}
          >
            {l.icon && <span>{l.icon}</span>}
            {l.text}
          </div>
        )
      }

      case 'button': {
        const l = layer as ButtonLayer
        return (
          <div
            className="pointer-events-none"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'fit-content',
              whiteSpace: 'nowrap',
              padding: `${l.paddingY}px ${l.paddingX}px`,
              borderRadius: `${l.borderRadius}px`,
              backgroundColor: l.bgColor,
              color: l.textColor,
              fontFamily: `'${l.fontFamily}', sans-serif`,
              fontSize: `${l.fontSize}px`,
              fontWeight: l.fontWeight,
              border: l.borderWidth > 0
                ? `${l.borderWidth}px solid ${l.borderColor}`
                : 'none',
            }}
          >
            {l.text}
          </div>
        )
      }

      default:
        return null
    }
  }

  function renderLayer(layer: Layer) {
    if (!layer.visible) return null

    // Background layer — no drag, fills canvas
    if (layer.type === 'background') {
      const bg = layer as BackgroundLayer
      return (
        <div
          key={layer.id}
          className="absolute inset-0"
          style={{ zIndex: layer.zIndex, opacity: layer.opacity / 100 }}
          onClick={() => mode === 'edit' && onSelectLayer(layer.id)}
        >
          {bg.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bg.imageUrl}
              alt=""
              className="w-full h-full"
              style={{ objectFit: bg.objectFit, objectPosition: bg.objectPosition }}
              draggable={false}
            />
          ) : bg.gradient ? (
            <div className="w-full h-full" style={{ background: bg.gradient }} />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: bg.color }} />
          )}
          {/* Selected indicator for background */}
          {selectedId === layer.id && mode === 'edit' && (
            <div className="absolute inset-0 ring-2 ring-pink-500 ring-inset pointer-events-none" />
          )}
        </div>
      )
    }

    // All other layers — wrapped in DraggableResizable
    const isSelected = selectedId === layer.id
    const isLocked = layer.locked

    return (
      <DraggableResizable
        key={layer.id}
        x={layer.x} y={layer.y} w={layer.w} h={layer.h}
        containerRef={canvasRef}
        label={layer.name}
        accentColor={getLayerAccentColor(layer.type)}
        disabled={isLocked || mode === 'preview'}
        isSelected={isSelected}
        zIndex={layer.zIndex + (isSelected ? 1000 : 0)}
        rotation={layer.rotation}
        opacity={layer.opacity}
        snapToGrid={snapToGrid}
        onChange={(newX, newY, newW, newH) => onUpdateLayer(layer.id, { x: newX, y: newY, w: newW, h: newH })}
        onClick={() => onSelectLayer(layer.id)}
      >
        {renderLayerContent(layer)}
      </DraggableResizable>
    )
  }

  return (
    <div>
      {/* Canvas toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={mode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('edit')}
          >
            <Pencil className="w-3 h-3 mr-1" /> Edit Layout
          </Button>
          <Button
            type="button"
            variant={mode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('preview')}
          >
            <Eye className="w-3 h-3 mr-1" /> Preview
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={aspectRatio}
            onChange={(e) => onAspectRatioChange(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="16/5">Banner 16:5</option>
            <option value="16/4">Wide 16:4</option>
            <option value="16/6">Tall 16:6</option>
            <option value="1/1">Square 1:1</option>
            <option value="9/16">Mobile 9:16</option>
          </select>

          <label className="flex items-center gap-1 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => onSnapToGridChange(e.target.checked)}
            />
            Snap
          </label>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full overflow-hidden rounded-xl bg-gray-100"
        style={{ aspectRatio, maxHeight: '400px', userSelect: 'none' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelectLayer(null)
        }}
      >
        {[...layers]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(layer => renderLayer(layer))}

        {/* Empty state */}
        {layers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No layers yet
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      {mode === 'edit' && selectedId && (
        <p className="text-xs text-gray-400 mt-1 text-center">
          Arrow keys: Move &middot; +/- Resize &middot; Shift = x5 &middot; Delete Remove &middot; Esc Deselect
        </p>
      )}
    </div>
  )
}
