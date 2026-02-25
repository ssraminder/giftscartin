'use client'

import { useState, useRef, useEffect } from 'react'
import { Bold, Italic, Underline, Type, Paintbrush, Highlighter, Eraser } from 'lucide-react'

// ---- Types ----

interface FormattingToolbarProps {
  value: string
  onChange: (newValue: string) => void
  label: string
}

// ---- Constants ----

const FONT_SIZES: { label: string; value: string }[] = [
  { label: 'XS', value: '0.75rem' },
  { label: 'SM', value: '0.875rem' },
  { label: 'Base', value: '1rem' },
  { label: 'LG', value: '1.25rem' },
  { label: 'XL', value: '1.5rem' },
  { label: '2XL', value: '1.875rem' },
  { label: '3XL', value: '2.25rem' },
  { label: '4XL', value: '3rem' },
  { label: '5XL', value: '3.75rem' },
]

const COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Near-white', value: '#F8F8F8' },
  { label: 'Light gray', value: '#E5E7EB' },
  { label: 'Dark gray', value: '#374151' },
  { label: 'Black', value: '#000000' },
  { label: 'Near-black', value: '#111827' },
  { label: 'Pink', value: '#E91E63' },
  { label: 'Hot pink', value: '#FF1493' },
  { label: 'Gold', value: '#FFD700' },
  { label: 'Saffron', value: '#FF6B00' },
  { label: 'Deep red', value: '#C0392B' },
  { label: 'Purple', value: '#7C3AED' },
]

const HIGHLIGHT_PRESETS: { label: string; value: string }[] = [
  { label: 'None', value: 'transparent' },
  { label: 'Semi-white', value: 'rgba(255,255,255,0.15)' },
  { label: 'White 30%', value: 'rgba(255,255,255,0.3)' },
  { label: 'Semi-black', value: 'rgba(0,0,0,0.3)' },
  { label: 'Pink', value: 'rgba(233,30,99,0.2)' },
  { label: 'Gold', value: 'rgba(255,215,0,0.25)' },
  { label: 'Dark', value: 'rgba(0,0,0,0.7)' },
  { label: 'Black 50%', value: 'rgba(0,0,0,0.5)' },
]

// ---- Style utility ----

function applyStyleToContent(
  html: string,
  property: string,
  value: string
): string {
  // Check if outermost element is a span with style
  const spanMatch = html.match(/^<span style="([^"]*)">([\s\S]*)<\/span>$/)

  if (spanMatch) {
    const existingStyles = spanMatch[1]
    const innerContent = spanMatch[2]

    const styleRegex = new RegExp(`${property}\\s*:[^;]+;?`, 'g')
    let newStyles: string

    if (styleRegex.test(existingStyles)) {
      newStyles = existingStyles.replace(
        new RegExp(`${property}\\s*:[^;]+;?`, 'g'),
        `${property}: ${value};`
      )
    } else {
      newStyles = `${existingStyles}; ${property}: ${value};`.replace(/^;\s*/, '')
    }

    // Clean up double semicolons
    newStyles = newStyles.replace(/;;\s*/g, '; ').replace(/;\s*$/, ';').trim()

    return `<span style="${newStyles}">${innerContent}</span>`
  }

  return `<span style="${property}: ${value};">${html}</span>`
}

function detectCurrentStyle(html: string, property: string): string | null {
  const spanMatch = html.match(/^<span style="([^"]*)">([\s\S]*)<\/span>$/)
  if (!spanMatch) return null

  const styles = spanMatch[1]
  const propRegex = new RegExp(`${property}\\s*:\\s*([^;]+)`)
  const match = styles.match(propRegex)
  return match ? match[1].trim() : null
}

function detectFontSizeLabel(html: string): string | null {
  const current = detectCurrentStyle(html, 'font-size')
  if (!current) return null
  const found = FONT_SIZES.find(s => s.value === current)
  return found ? found.label : null
}

function isWrappedWith(html: string, tag: string): boolean {
  const regex = new RegExp(`^<${tag}[^>]*>([\\s\\S]*)<\\/${tag}>$`, 'i')
  return regex.test(html.trim())
}

function toggleWrap(html: string, tag: string): string {
  const trimmed = html.trim()
  const regex = new RegExp(`^<${tag}[^>]*>([\\s\\S]*)<\\/${tag}>$`, 'i')
  const match = trimmed.match(regex)
  if (match) {
    return match[1]
  }
  return `<${tag}>${trimmed}</${tag}>`
}

function toggleUnderline(html: string): string {
  const trimmed = html.trim()
  const regex = /^<span style="text-decoration:\s*underline;?">([\s\S]*)<\/span>$/i
  const match = trimmed.match(regex)
  if (match) {
    return match[1]
  }
  // Check if already wrapped in a span with other styles + underline
  const spanMatch = trimmed.match(/^<span style="([^"]*)">([\s\S]*)<\/span>$/)
  if (spanMatch && /text-decoration:\s*underline/.test(spanMatch[1])) {
    const newStyles = spanMatch[1].replace(/text-decoration:\s*underline;?\s*/g, '').trim()
    if (!newStyles || newStyles === ';') return spanMatch[2]
    return `<span style="${newStyles}">${spanMatch[2]}</span>`
  }
  return `<span style="text-decoration: underline;">${trimmed}</span>`
}

function hasUnderline(html: string): boolean {
  return /text-decoration:\s*underline/.test(html)
}

// ---- Dropdown component ----

function Dropdown({ children, trigger }: { children: React.ReactNode; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[180px]">
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  )
}

// ---- Main component ----

export function FormattingToolbar({ value, onChange, label }: FormattingToolbarProps) {
  const [customColor, setCustomColor] = useState('#E91E63')

  const isBold = isWrappedWith(value, 'strong')
  const isItalic = isWrappedWith(value, 'em')
  const isUnderlined = hasUnderline(value)
  const currentSizeLabel = detectFontSizeLabel(value)
  const currentColor = detectCurrentStyle(value, 'color')

  const btnClass = (active: boolean) =>
    `p-1 rounded text-xs transition-colors ${
      active
        ? 'bg-purple-100 text-purple-700 border border-purple-300'
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`

  return (
    <div className="flex items-center gap-1 flex-wrap mb-1">
      <span className="text-[10px] text-gray-400 mr-1 select-none">{label}:</span>

      {/* Bold */}
      <button
        type="button"
        title="Bold"
        className={btnClass(isBold)}
        onClick={() => onChange(toggleWrap(value, 'strong'))}
      >
        <Bold className="w-3 h-3" />
      </button>

      {/* Italic */}
      <button
        type="button"
        title="Italic"
        className={btnClass(isItalic)}
        onClick={() => onChange(toggleWrap(value, 'em'))}
      >
        <Italic className="w-3 h-3" />
      </button>

      {/* Underline */}
      <button
        type="button"
        title="Underline"
        className={btnClass(isUnderlined)}
        onClick={() => onChange(toggleUnderline(value))}
      >
        <Underline className="w-3 h-3" />
      </button>

      <span className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* Font Size */}
      <Dropdown
        trigger={
          <button
            type="button"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          >
            <Type className="w-3 h-3" />
            {currentSizeLabel ? `${currentSizeLabel}` : 'Size'}
            <span className="text-[9px]">&#9662;</span>
          </button>
        }
      >
        <div className="space-y-0.5">
          {FONT_SIZES.map(s => (
            <button
              key={s.label}
              type="button"
              className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-purple-50 ${
                currentSizeLabel === s.label ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'
              }`}
              onClick={() => onChange(applyStyleToContent(value, 'font-size', s.value))}
            >
              {s.label} <span className="text-gray-400 ml-1">({s.value})</span>
            </button>
          ))}
        </div>
      </Dropdown>

      {/* Text Color */}
      <Dropdown
        trigger={
          <button
            type="button"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          >
            <Paintbrush className="w-3 h-3" />
            {currentColor && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block"
                style={{ backgroundColor: currentColor }}
              />
            )}
            Color
            <span className="text-[9px]">&#9662;</span>
          </button>
        }
      >
        <div>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {COLOR_PRESETS.map(c => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                className={`w-6 h-6 rounded border transition-transform hover:scale-110 ${
                  currentColor === c.value ? 'ring-2 ring-purple-500 ring-offset-1' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c.value }}
                onClick={() => onChange(applyStyleToContent(value, 'color', c.value))}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 border-t border-gray-100 pt-2">
            <span
              className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
              style={{ backgroundColor: customColor }}
            />
            <input
              type="text"
              value={customColor}
              onChange={e => setCustomColor(e.target.value)}
              placeholder="#hex"
              className="w-20 text-xs border rounded px-1.5 py-0.5"
            />
            <button
              type="button"
              className="text-[10px] px-2 py-0.5 bg-purple-600 text-white rounded hover:bg-purple-700"
              onClick={() => {
                if (/^#[0-9A-Fa-f]{3,8}$/.test(customColor)) {
                  onChange(applyStyleToContent(value, 'color', customColor))
                }
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </Dropdown>

      {/* Highlight / Background Color */}
      <Dropdown
        trigger={
          <button
            type="button"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          >
            <Highlighter className="w-3 h-3" />
            BG
            <span className="text-[9px]">&#9662;</span>
          </button>
        }
      >
        <div className="grid grid-cols-4 gap-1">
          {HIGHLIGHT_PRESETS.map(h => (
            <button
              key={h.label}
              type="button"
              title={h.label}
              className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-gray-50 border border-gray-100"
              onClick={() => {
                if (h.value === 'transparent') {
                  // Remove background-color
                  const spanMatch = value.match(/^<span style="([^"]*)">([\s\S]*)<\/span>$/)
                  if (spanMatch) {
                    const newStyles = spanMatch[1].replace(/background-color:\s*[^;]+;?\s*/g, '').trim()
                    if (!newStyles || newStyles === ';') {
                      onChange(spanMatch[2])
                    } else {
                      onChange(`<span style="${newStyles}">${spanMatch[2]}</span>`)
                    }
                  }
                } else {
                  onChange(applyStyleToContent(value, 'background-color', h.value))
                }
              }}
            >
              <span
                className="w-5 h-5 rounded border border-gray-200"
                style={{
                  backgroundColor: h.value === 'transparent' ? '#fff' : h.value,
                  backgroundImage: h.value === 'transparent' ? 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%)' : undefined,
                  backgroundSize: h.value === 'transparent' ? '6px 6px' : undefined,
                  backgroundPosition: h.value === 'transparent' ? '0 0, 3px 3px' : undefined,
                }}
              />
              <span className="text-[9px] text-gray-500 leading-tight text-center">{h.label}</span>
            </button>
          ))}
        </div>
      </Dropdown>

      <span className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* Clear Styles */}
      <button
        type="button"
        title="Clear all styles"
        className="p-1 rounded text-xs bg-white text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        onClick={() => {
          const stripped = value.replace(/\sstyle="[^"]*"/g, '')
          onChange(stripped)
        }}
      >
        <Eraser className="w-3 h-3" />
      </button>
    </div>
  )
}

// Re-export the color presets for use in the color picker fields
export { COLOR_PRESETS, applyStyleToContent }
