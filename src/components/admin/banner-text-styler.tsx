'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, X, RotateCcw, Check } from 'lucide-react'

interface BannerTextStylerProps {
  titleHtml: string
  subtitleHtml: string
  ctaText?: string
  backgroundImageUrl?: string
  overlayStyle?: string
  onAccept: (titleHtml: string, subtitleHtml: string) => void
  onClose: () => void
}

type StylerState = 'idle' | 'generating' | 'result' | 'error'

const QUICK_STYLES = [
  {
    label: 'Pink & Gold',
    instruction: 'Use hot pink (#E91E63) for emphasis words with gold (#FFD700) accents on key phrases. White base text.',
  },
  {
    label: 'Dark & Elegant',
    instruction: 'Deep charcoal text (#1a1a1a) with dark navy (#1B2B4B) for emphasis. Clean and premium.',
  },
  {
    label: 'Bright & Playful',
    instruction: 'Colorful gradient text, use vibrant colors for each word, fun and celebratory feel.',
  },
  {
    label: 'Minimal White',
    instruction: 'Pure white text, bold weight for title, remove all color styling, clean minimal look.',
  },
  {
    label: 'Warm Saffron',
    instruction: 'Warm saffron orange (#FF6B00) and deep red (#C0392B) palette, Indian festive style.',
  },
  {
    label: 'Reset Styles',
    instruction: 'Remove all inline styles and color formatting, return to plain text with only <strong> and <br/> tags.',
  },
]

export function BannerTextStyler({
  titleHtml,
  subtitleHtml,
  ctaText,
  backgroundImageUrl,
  overlayStyle,
  onAccept,
  onClose,
}: BannerTextStylerProps) {
  const [instruction, setInstruction] = useState('')
  const [state, setState] = useState<StylerState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    titleHtml: string
    subtitleHtml: string
    explanation: string
    suggestedColors: string[]
  } | null>(null)

  async function handleApply() {
    if (!instruction.trim()) return

    setState('generating')
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/banners/style-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleHtml,
          subtitleHtml,
          ctaText,
          styleInstruction: instruction,
          backgroundImageUrl,
          overlayStyle,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setResult(json.data)
        setState('result')
      } else {
        setError(json.error || 'Failed to style text')
        setState('error')
      }
    } catch {
      setError('Request failed. Please try again.')
      setState('error')
    }
  }

  return (
    <div className="border border-purple-200 bg-purple-50/50 rounded-lg p-4 mt-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">AI Text Styler</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Instruction input */}
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Style instruction:</label>
        <textarea
          rows={2}
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder="Change text color palette to pink, matching the background. Make the title bolder."
          className="w-full rounded-md border px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Quick styles */}
      <div>
        <span className="text-xs text-gray-500 mb-1.5 block">Quick styles:</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_STYLES.map(qs => (
            <button
              key={qs.label}
              type="button"
              onClick={() => setInstruction(qs.instruction)}
              className="text-xs px-2.5 py-1 rounded-full border border-purple-200 bg-white text-purple-700 hover:bg-purple-100 transition-colors"
            >
              {qs.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apply button */}
      <Button
        type="button"
        onClick={handleApply}
        disabled={state === 'generating' || !instruction.trim()}
        className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
        size="sm"
      >
        {state === 'generating' ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            Crafting your style...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Apply Style
          </>
        )}
      </Button>

      {/* Error */}
      {state === 'error' && error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Result */}
      {state === 'result' && result && (
        <div className="space-y-3 border-t border-purple-200 pt-3">
          {/* Title preview */}
          <div>
            <span className="text-[11px] text-gray-500 mb-1 block">Title preview:</span>
            <div className="rounded bg-gray-900 px-3 py-2 text-lg font-bold leading-tight text-white max-h-20 overflow-hidden">
              <span dangerouslySetInnerHTML={{ __html: result.titleHtml }} />
            </div>
          </div>

          {/* Subtitle preview */}
          {result.subtitleHtml && (
            <div>
              <span className="text-[11px] text-gray-500 mb-1 block">Subtitle preview:</span>
              <div className="rounded bg-gray-900 px-2 py-1.5 text-sm text-white/80 max-h-16 overflow-hidden">
                <span dangerouslySetInnerHTML={{ __html: result.subtitleHtml }} />
              </div>
            </div>
          )}

          {/* Colors used */}
          {result.suggestedColors.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Colors used:</span>
              {result.suggestedColors.map((c, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] text-gray-600">
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-gray-200"
                    style={{ backgroundColor: c }}
                  />
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* AI note */}
          {result.explanation && (
            <p className="text-xs text-purple-600 italic">{result.explanation}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setState('idle')
                setResult(null)
              }}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Try Again
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onAccept(result.titleHtml, result.subtitleHtml)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              Use This Style
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-gray-500"
            >
              <X className="w-3 h-3 mr-1" />
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
