'use client'

import React, { useState } from 'react'
import { Layers, Sparkles, Wand2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GOOGLE_FONTS, loadGoogleFont } from '@/lib/banner-layers'
import { LayerAIPanel } from '@/components/admin/layer-ai-panel'
import type {
  Layer, BackgroundLayer, ImageLayer, TextLayer,
  ShapeLayer, BadgeLayer, ButtonLayer,
} from '@/lib/banner-layers'

// ==================== Shared Props ====================

interface PropertiesPanelProps {
  layer: Layer | null
  allLayers: Layer[]
  onUpdate: (updates: Partial<Layer>) => void
}

// ==================== Color Picker ====================

const PRESET_COLORS = [
  '#FFFFFF', '#F8F8F8', '#E5E7EB', '#374151', '#000000', '#111827',
  '#E91E63', '#FF1493', '#FFD700', '#FF6B00', '#C0392B', '#7C3AED',
]

function ColorPickerField({
  label, value, onChange, showTransparency = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  showTransparency?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(value)

  return (
    <div className="relative">
      <label className="text-xs text-gray-500">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 border rounded px-2 py-1 mt-1 text-sm"
      >
        <span
          className="w-4 h-4 rounded border"
          style={{ backgroundColor: value }}
        />
        <span className="flex-1 text-left truncate text-xs">{value}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 bg-white border rounded-lg shadow-xl p-3 w-56 mt-1">
          <div className="grid grid-cols-6 gap-1 mb-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className="w-7 h-7 rounded border-2 hover:scale-110 transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: value === c ? '#E91E63' : 'transparent',
                }}
                onClick={() => { onChange(c); setCustom(c); setOpen(false) }}
              />
            ))}
          </div>

          {showTransparency && (
            <div className="mb-2">
              <p className="text-xs text-gray-400 mb-1">Transparency</p>
              <div className="flex flex-wrap gap-1">
                {[
                  'rgba(255,255,255,0.15)',
                  'rgba(255,255,255,0.30)',
                  'rgba(0,0,0,0.20)',
                  'rgba(0,0,0,0.50)',
                ].map(c => (
                  <button
                    key={c}
                    type="button"
                    className="text-xs border rounded px-2 py-0.5 hover:bg-gray-50"
                    onClick={() => { onChange(c); setOpen(false) }}
                  >
                    {c.includes('255') ? 'White' : 'Black'} {c.match(/[\d.]+\)$/)?.[0].replace(')', '')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-1">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onBlur={() => { if (custom) { onChange(custom); setOpen(false) } }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onChange(custom); setOpen(false) } }}
              placeholder="#ffffff or rgba(...)"
              className="flex-1 text-xs border rounded px-2 py-1"
            />
            <button
              type="button"
              className="text-xs bg-gray-100 border rounded px-2"
              onClick={() => { onChange(custom); setOpen(false) }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Font Family Select ====================

function FontFamilySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500">Font</label>
      <select
        value={value}
        onChange={(e) => { loadGoogleFont(e.target.value); onChange(e.target.value) }}
        className="w-full text-sm border rounded px-2 py-1 mt-1"
        style={{ fontFamily: `'${value}', sans-serif` }}
      >
        {GOOGLE_FONTS.map(f => (
          <option key={f.family} value={f.family} style={{ fontFamily: `'${f.family}', sans-serif` }}>
            {f.family}
          </option>
        ))}
      </select>
    </div>
  )
}

// ==================== Font Weight Selector ====================

function FontWeightSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const weights = [300, 400, 500, 600, 700, 800, 900]
  return (
    <div>
      <label className="text-xs text-gray-500">Weight</label>
      <div className="flex gap-0.5 mt-1">
        {weights.map(w => (
          <button
            key={w}
            type="button"
            onClick={() => onChange(w)}
            className={`flex-1 text-[10px] py-1 rounded border transition-colors ${
              value === w
                ? 'bg-pink-500 text-white border-pink-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  )
}

// ==================== Object Position Grid ====================

function ObjectPositionGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const positions = [
    'left top', 'center top', 'right top',
    'left center', 'center center', 'right center',
    'left bottom', 'center bottom', 'right bottom',
  ]
  return (
    <div>
      <label className="text-xs text-gray-500">Position</label>
      <div className="grid grid-cols-3 gap-1 mt-1 w-20">
        {positions.map(pos => (
          <button
            key={pos}
            type="button"
            onClick={() => onChange(pos)}
            className={`w-6 h-6 rounded border transition-colors ${
              value === pos
                ? 'bg-pink-500 border-pink-500'
                : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span className={`block w-2 h-2 mx-auto rounded-full ${value === pos ? 'bg-white' : 'bg-gray-400'}`} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ==================== Common Layer Properties ====================

function CommonLayerProperties({ layer, layerType, onUpdate }: { layer: Layer; layerType: string; onUpdate: (u: Partial<Layer>) => void }) {
  if (layer.type === 'background') return null

  const isImage = layerType === 'image'

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500">Layer Name</label>
        <input
          value={layer.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">X %</label>
          <input
            type="number" step="0.5" min={0} max={100}
            value={Math.round((layer.x as number) * 10) / 10}
            onChange={(e) => onUpdate({ x: parseFloat(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Y %</label>
          <input
            type="number" step="0.5" min={isImage ? -100 : 0} max={100}
            value={Math.round((layer.y as number) * 10) / 10}
            onChange={(e) => onUpdate({ y: parseFloat(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">W %</label>
          <input
            type="number" step="0.5" min={5} max={isImage ? 200 : 100}
            value={Math.round((layer.w as number) * 10) / 10}
            onChange={(e) => onUpdate({ w: parseFloat(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">H %</label>
          <input
            type="number" step="0.5" min={5} max={isImage ? 200 : 100}
            value={Math.round((layer.h as number) * 10) / 10}
            onChange={(e) => onUpdate({ h: parseFloat(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Rotation</label>
          <input
            type="number" step="1" min="-360" max="360"
            value={layer.rotation}
            onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Opacity %</label>
          <input
            type="range" min="0" max="100"
            value={layer.opacity}
            onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) })}
            className="w-full mt-2"
          />
          <span className="text-xs text-gray-400">{layer.opacity}%</span>
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox" checked={layer.visible}
            onChange={(e) => onUpdate({ visible: e.target.checked })}
          />
          Visible
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox" checked={layer.locked}
            onChange={(e) => onUpdate({ locked: e.target.checked })}
          />
          Locked
        </label>
      </div>
    </div>
  )
}

// ==================== Background Properties ====================

function BackgroundProperties({ layer, allLayers, onUpdate }: { layer: BackgroundLayer; allLayers: Layer[]; onUpdate: (u: Partial<Layer>) => void }) {
  const [showAIPanel, setShowAIPanel] = useState(false)

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline" size="sm"
        className="w-full text-xs"
        onClick={() => setShowAIPanel(!showAIPanel)}
      >
        <Sparkles className="w-3 h-3 mr-1" /> Generate Background
      </Button>

      {showAIPanel && (
        <LayerAIPanel
          layer={layer}
          allLayers={allLayers}
          onAcceptImage={(url) => {
            onUpdate({ imageUrl: url })
            setShowAIPanel(false)
          }}
          onAcceptText={() => {}}
          onAcceptStyle={() => {}}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      <div>
        <label className="text-xs text-gray-500">Image URL</label>
        <input
          value={layer.imageUrl}
          onChange={(e) => onUpdate({ imageUrl: e.target.value })}
          placeholder="https://..."
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
        {layer.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={layer.imageUrl}
            alt="bg preview"
            className="w-full h-16 mt-1 rounded object-cover border"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        )}
      </div>

      <ColorPickerField
        label="Fallback Color"
        value={layer.color}
        onChange={(v) => onUpdate({ color: v })}
      />

      <div>
        <label className="text-xs text-gray-500">Object Fit</label>
        <select
          value={layer.objectFit}
          onChange={(e) => onUpdate({ objectFit: e.target.value as BackgroundLayer['objectFit'] })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>

      <ObjectPositionGrid value={layer.objectPosition} onChange={(v) => onUpdate({ objectPosition: v })} />
    </div>
  )
}

// ==================== Image Properties ====================

function ImageProperties({ layer, allLayers, onUpdate }: { layer: ImageLayer; allLayers: Layer[]; onUpdate: (u: Partial<Layer>) => void }) {
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [removingBg, setRemovingBg] = useState(false)

  const handleRemoveBg = async () => {
    if (!layer.imageUrl) return
    setRemovingBg(true)
    try {
      const res = await fetch('/api/admin/banners/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: layer.imageUrl }),
      })
      const json = await res.json()
      if (json.success && json.data?.imageUrl) {
        onUpdate({ imageUrl: json.data.imageUrl })
      }
    } catch {
      // silently fail
    } finally {
      setRemovingBg(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs"
          onClick={() => setShowAIPanel(!showAIPanel)}>
          <Sparkles className="w-3 h-3 mr-1" /> Generate Image
        </Button>
        <Button variant="outline" size="sm" className="text-xs"
          onClick={handleRemoveBg} disabled={removingBg || !layer.imageUrl}>
          <Wand2 className="w-3 h-3 mr-1" /> Remove BG
        </Button>
      </div>

      {showAIPanel && (
        <LayerAIPanel
          layer={layer}
          allLayers={allLayers}
          onAcceptImage={(url) => {
            onUpdate({ imageUrl: url })
            setShowAIPanel(false)
          }}
          onAcceptText={() => {}}
          onAcceptStyle={() => {}}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      <div>
        <label className="text-xs text-gray-500">Image URL</label>
        <input
          value={layer.imageUrl}
          onChange={(e) => onUpdate({ imageUrl: e.target.value })}
          placeholder="https://..."
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
        {layer.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={layer.imageUrl}
            alt="preview"
            className="w-full h-16 mt-1 rounded object-contain border"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        )}
      </div>

      <div>
        <label className="text-xs text-gray-500">Object Fit</label>
        <select
          value={layer.objectFit}
          onChange={(e) => onUpdate({ objectFit: e.target.value as ImageLayer['objectFit'] })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
        </select>
      </div>

      <ObjectPositionGrid value={layer.objectPosition} onChange={(v) => onUpdate({ objectPosition: v })} />

      <div className="mt-3">
        <p className="text-xs font-medium text-gray-500 mb-1">Hero presets</p>
        <div className="flex flex-col gap-1">
          {[
            {
              label: '\u2197 Right, overflow top',
              updates: {
                x: 52, y: -8, w: 45, h: 115,
                objectFit: 'contain' as const, objectPosition: 'bottom center'
              }
            },
            {
              label: '\u2192 Right, contained',
              updates: {
                x: 54, y: 5, w: 42, h: 88,
                objectFit: 'contain' as const, objectPosition: 'center center'
              }
            },
            {
              label: '\u2B1B Right half fill',
              updates: {
                x: 50, y: 0, w: 50, h: 100,
                objectFit: 'cover' as const, objectPosition: 'center center'
              }
            },
            {
              label: '\u2199 Right, overflow bottom',
              updates: {
                x: 52, y: 5, w: 45, h: 115,
                objectFit: 'contain' as const, objectPosition: 'top center'
              }
            },
          ].map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onUpdate(preset.updates)}
              className="text-left text-xs px-2 py-1.5 rounded border hover:bg-pink-50 hover:border-pink-300 transition-colors text-gray-600"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">Border Radius (px)</label>
        <input
          type="number" min="0" max="999" step="1"
          value={layer.borderRadius}
          onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) || 0 })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox" checked={layer.dropShadow}
          onChange={(e) => onUpdate({ dropShadow: e.target.checked })}
        />
        Drop Shadow
      </label>
    </div>
  )
}

// ==================== Text Properties ====================

function TextProperties({ layer, allLayers, onUpdate }: { layer: TextLayer; allLayers: Layer[]; onUpdate: (u: Partial<Layer>) => void }) {
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiPanelMode, setAIPanelMode] = useState<'generate' | 'restyle'>('generate')

  return (
    <div className="space-y-3">
      <FontFamilySelect value={layer.fontFamily} onChange={(v) => onUpdate({ fontFamily: v })} />

      <div>
        <label className="text-xs text-gray-500">Font Size (px)</label>
        <div className="flex items-center gap-2">
          <input
            type="range" min="12" max="120"
            value={layer.fontSize}
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number" min="12" max="120"
            value={layer.fontSize}
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 48 })}
            className="w-16 text-sm border rounded px-2 py-1"
          />
        </div>
      </div>

      <FontWeightSelector value={layer.fontWeight} onChange={(v) => onUpdate({ fontWeight: v })} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 flex items-center gap-1">
            Line Height
            {(layer as TextLayer).lineHeight < 1 && (
              <span className="text-amber-500 text-[10px]">&#9888; tight</span>
            )}
          </label>
          <input
            type="number" step="0.05" min={0.5} max={3}
            value={(layer as TextLayer).lineHeight}
            onChange={(e) => onUpdate({ lineHeight: parseFloat(e.target.value) })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Letter Spacing (px)</label>
          <input
            type="number" min="-5" max="20" step="0.5"
            value={layer.letterSpacing}
            onChange={(e) => onUpdate({ letterSpacing: parseFloat(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">Text Align</label>
        <div className="flex gap-1 mt-1">
          {(['left', 'center', 'right'] as const).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => onUpdate({ textAlign: a })}
              className={`flex-1 text-xs py-1 rounded border transition-colors ${
                layer.textAlign === a
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">Vertical Align</label>
        <div className="flex gap-1 mt-1">
          {(['top', 'center', 'bottom'] as const).map(a => (
            <button
              key={a}
              type="button"
              onClick={() => onUpdate({ verticalAlign: a })}
              className={`flex-1 text-xs py-1 rounded border transition-colors ${
                layer.verticalAlign === a
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">HTML Content</label>
        <textarea
          rows={3}
          value={layer.html}
          onChange={(e) => onUpdate({ html: e.target.value })}
          className="w-full text-sm border rounded px-2 py-1 mt-1 font-mono"
          placeholder="Your text here"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs"
          onClick={() => { setAIPanelMode('generate'); setShowAIPanel(true) }}>
          <Sparkles className="w-3 h-3 mr-1" /> Generate Copy
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs"
          onClick={() => { setAIPanelMode('restyle'); setShowAIPanel(true) }}>
          <Palette className="w-3 h-3 mr-1" /> Restyle
        </Button>
      </div>

      {showAIPanel && (
        <LayerAIPanel
          layer={layer}
          allLayers={allLayers}
          mode={aiPanelMode}
          onAcceptImage={() => {}}
          onAcceptText={(html) => {
            onUpdate({ html })
            setShowAIPanel(false)
          }}
          onAcceptStyle={() => {}}
          onClose={() => setShowAIPanel(false)}
        />
      )}
    </div>
  )
}

// ==================== Shape Properties ====================

function ShapeProperties({ layer, allLayers, onUpdate }: { layer: ShapeLayer; allLayers: Layer[]; onUpdate: (u: Partial<Layer>) => void }) {
  const [showAIPanel, setShowAIPanel] = useState(false)

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" className="w-full text-xs"
        onClick={() => setShowAIPanel(!showAIPanel)}>
        <Sparkles className="w-3 h-3 mr-1" /> AI Suggest Overlay
      </Button>

      {showAIPanel && (
        <LayerAIPanel
          layer={layer}
          allLayers={allLayers}
          onAcceptImage={() => {}}
          onAcceptText={() => {}}
          onAcceptStyle={(updates) => {
            onUpdate(updates)
            setShowAIPanel(false)
          }}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      <div>
        <label className="text-xs text-gray-500">Shape</label>
        <div className="flex gap-1 mt-1">
          {([
            { v: 'rectangle' as const, l: 'Rectangle' },
            { v: 'circle' as const, l: 'Circle' },
            { v: 'gradient-overlay' as const, l: 'Gradient' },
          ]).map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => onUpdate({ shape: v })}
              className={`flex-1 text-xs py-1 rounded border transition-colors ${
                layer.shape === v
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <ColorPickerField
        label="Fill Color"
        value={layer.fill}
        onChange={(v) => onUpdate({ fill: v })}
        showTransparency
      />

      <div>
        <label className="text-xs text-gray-500">CSS Gradient (raw)</label>
        <input
          value={layer.fill}
          onChange={(e) => onUpdate({ fill: e.target.value })}
          placeholder="linear-gradient(...)"
          className="w-full text-xs border rounded px-2 py-1 mt-1 font-mono"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">Border Radius (px)</label>
        <input
          type="number" min="0" max="999" step="1"
          value={layer.borderRadius}
          onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) || 0 })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Border Width (px)</label>
          <input
            type="number" min="0" max="20" step="1"
            value={layer.borderWidth}
            onChange={(e) => onUpdate({ borderWidth: parseInt(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
        <ColorPickerField
          label="Border Color"
          value={layer.borderColor}
          onChange={(v) => onUpdate({ borderColor: v })}
        />
      </div>
    </div>
  )
}

// ==================== Badge Properties ====================

function BadgeProperties({ layer, allLayers, onUpdate }: { layer: BadgeLayer; allLayers: Layer[]; onUpdate: (u: Partial<Layer>) => void }) {
  const [showAIPanel, setShowAIPanel] = useState(false)

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" className="w-full text-xs"
        onClick={() => setShowAIPanel(!showAIPanel)}>
        <Sparkles className="w-3 h-3 mr-1" /> AI Suggest Badge
      </Button>

      {showAIPanel && (
        <LayerAIPanel
          layer={layer}
          allLayers={allLayers}
          onAcceptImage={() => {}}
          onAcceptText={() => {}}
          onAcceptStyle={(updates) => {
            onUpdate(updates)
            setShowAIPanel(false)
          }}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      <div>
        <label className="text-xs text-gray-500">Text</label>
        <input
          value={layer.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">Icon (emoji)</label>
        <input
          value={layer.icon}
          onChange={(e) => onUpdate({ icon: e.target.value })}
          placeholder=""
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <FontFamilySelect value={layer.fontFamily} onChange={(v) => onUpdate({ fontFamily: v })} />

      <div>
        <label className="text-xs text-gray-500">Font Size (px)</label>
        <input
          type="number" min="10" max="32" step="1"
          value={layer.fontSize}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 13 })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <FontWeightSelector value={layer.fontWeight} onChange={(v) => onUpdate({ fontWeight: v })} />

      <ColorPickerField
        label="Background Color"
        value={layer.bgColor}
        onChange={(v) => onUpdate({ bgColor: v })}
        showTransparency
      />

      <ColorPickerField
        label="Text Color"
        value={layer.textColor}
        onChange={(v) => onUpdate({ textColor: v })}
      />

      <div>
        <label className="text-xs text-gray-500">Border Radius (px)</label>
        <div className="flex gap-1 mb-1">
          {[
            { label: 'Square', v: 4 },
            { label: 'Rounded', v: 12 },
            { label: 'Pill', v: 999 },
          ].map(({ label, v }) => (
            <button
              key={label}
              type="button"
              onClick={() => onUpdate({ borderRadius: v })}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                layer.borderRadius === v
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="number" min="0" max="999" step="1"
          value={layer.borderRadius}
          onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) || 0 })}
          className="w-full text-sm border rounded px-2 py-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Padding X (px)</label>
          <input
            type="number" min="0" max="60" step="1"
            value={layer.paddingX}
            onChange={(e) => onUpdate({ paddingX: parseInt(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Padding Y (px)</label>
          <input
            type="number" min="0" max="40" step="1"
            value={layer.paddingY}
            onChange={(e) => onUpdate({ paddingY: parseInt(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Border Width (px)</label>
          <input
            type="number" min="0" max="10" step="1"
            value={layer.borderWidth}
            onChange={(e) => onUpdate({ borderWidth: parseInt(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
        <ColorPickerField
          label="Border Color"
          value={layer.borderColor}
          onChange={(v) => onUpdate({ borderColor: v })}
        />
      </div>
    </div>
  )
}

// ==================== Button Properties ====================

function ButtonProperties({ layer, allLayers, onUpdate }: { layer: ButtonLayer; allLayers: Layer[]; onUpdate: (u: Partial<Layer>) => void }) {
  const [showAIPanel, setShowAIPanel] = useState(false)

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" className="w-full text-xs"
        onClick={() => setShowAIPanel(!showAIPanel)}>
        <Sparkles className="w-3 h-3 mr-1" /> AI Suggest CTA
      </Button>

      {showAIPanel && (
        <LayerAIPanel
          layer={layer}
          allLayers={allLayers}
          onAcceptImage={() => {}}
          onAcceptText={() => {}}
          onAcceptStyle={(updates) => {
            onUpdate(updates)
            setShowAIPanel(false)
          }}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      <div>
        <label className="text-xs text-gray-500">Button Text</label>
        <input
          value={layer.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">Link (href)</label>
        <input
          value={layer.href}
          onChange={(e) => onUpdate({ href: e.target.value })}
          placeholder="/category/cakes"
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <FontFamilySelect value={layer.fontFamily} onChange={(v) => onUpdate({ fontFamily: v })} />

      <div>
        <label className="text-xs text-gray-500">Font Size (px)</label>
        <input
          type="number" min="12" max="36" step="1"
          value={layer.fontSize}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 15 })}
          className="w-full text-sm border rounded px-2 py-1 mt-1"
        />
      </div>

      <FontWeightSelector value={layer.fontWeight} onChange={(v) => onUpdate({ fontWeight: v })} />

      <ColorPickerField
        label="Background Color"
        value={layer.bgColor}
        onChange={(v) => onUpdate({ bgColor: v })}
      />

      <ColorPickerField
        label="Text Color"
        value={layer.textColor}
        onChange={(v) => onUpdate({ textColor: v })}
      />

      <div>
        <label className="text-xs text-gray-500">Border Radius (px)</label>
        <div className="flex gap-1 mb-1">
          {[
            { label: 'Square', v: 4 },
            { label: 'Rounded', v: 12 },
            { label: 'Pill', v: 999 },
          ].map(({ label, v }) => (
            <button
              key={label}
              type="button"
              onClick={() => onUpdate({ borderRadius: v })}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                layer.borderRadius === v
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="number" min="0" max="999" step="1"
          value={layer.borderRadius}
          onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) || 0 })}
          className="w-full text-sm border rounded px-2 py-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Padding X (px)</label>
          <input
            type="number" min="0" max="60" step="1"
            value={layer.paddingX}
            onChange={(e) => onUpdate({ paddingX: parseInt(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Padding Y (px)</label>
          <input
            type="number" min="0" max="40" step="1"
            value={layer.paddingY}
            onChange={(e) => onUpdate({ paddingY: parseInt(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Border Width (px)</label>
          <input
            type="number" min="0" max="10" step="1"
            value={layer.borderWidth}
            onChange={(e) => onUpdate({ borderWidth: parseInt(e.target.value) || 0 })}
            className="w-full text-sm border rounded px-2 py-1 mt-1"
          />
        </div>
        <ColorPickerField
          label="Border Color"
          value={layer.borderColor}
          onChange={(v) => onUpdate({ borderColor: v })}
        />
      </div>
    </div>
  )
}

// ==================== Main Properties Panel ====================

export function PropertiesPanel({ layer, allLayers, onUpdate }: PropertiesPanelProps) {
  if (!layer) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm p-4 text-center">
        <div>
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Select a layer to edit its properties
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {/* Common fields */}
      <CommonLayerProperties layer={layer} layerType={layer.type} onUpdate={onUpdate} />

      {/* Divider */}
      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {layer.type.charAt(0).toUpperCase() + layer.type.slice(1)} Settings
        </p>

        {layer.type === 'background' && <BackgroundProperties layer={layer as BackgroundLayer} allLayers={allLayers} onUpdate={onUpdate} />}
        {layer.type === 'image' && <ImageProperties layer={layer as ImageLayer} allLayers={allLayers} onUpdate={onUpdate} />}
        {layer.type === 'text' && <TextProperties layer={layer as TextLayer} allLayers={allLayers} onUpdate={onUpdate} />}
        {layer.type === 'shape' && <ShapeProperties layer={layer as ShapeLayer} allLayers={allLayers} onUpdate={onUpdate} />}
        {layer.type === 'badge' && <BadgeProperties layer={layer as BadgeLayer} allLayers={allLayers} onUpdate={onUpdate} />}
        {layer.type === 'button' && <ButtonProperties layer={layer as ButtonLayer} allLayers={allLayers} onUpdate={onUpdate} />}
      </div>
    </div>
  )
}
