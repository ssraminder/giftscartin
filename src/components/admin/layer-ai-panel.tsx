'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, Sparkles, RotateCcw, Check, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildLayerContext } from '@/lib/banner-layers'
import type { Layer, LayerContextSummary } from '@/lib/banner-layers'

// ==================== Types ====================

interface LayerAIPanelProps {
  layer: Layer
  allLayers: Layer[]
  mode?: 'generate' | 'restyle'
  onAcceptImage: (url: string) => void
  onAcceptText: (html: string, subtitleHtml?: string) => void
  onAcceptStyle: (updates: Partial<Layer>) => void
  onClose: () => void
}

type PanelState = 'idle' | 'generating' | 'polling' | 'result' | 'error'

// ==================== Cycling Messages ====================

const GENERATING_MESSAGES = [
  'Analyzing banner context...',
  'Crafting with AI magic...',
  'Generating creative output...',
  'Almost there...',
  'Polishing the result...',
]

function useCyclingMessage(active: boolean): string {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!active) { setIndex(0); return }
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % GENERATING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [active])
  return GENERATING_MESSAGES[index]
}

// ==================== Elapsed Timer ====================

function useElapsedTimer(active: boolean): number {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    if (!active) { setElapsed(0); return }
    startRef.current = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [active])

  return elapsed
}

// ==================== Main Component ====================

export function LayerAIPanel({
  layer,
  allLayers,
  mode: initialMode,
  onAcceptImage,
  onAcceptText,
  onAcceptStyle,
  onClose,
}: LayerAIPanelProps) {
  const [state, setState] = useState<PanelState>('idle')
  const [prompt, setPrompt] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [activeTab, setActiveTab] = useState<string>(initialMode || 'generate')

  // Results
  const [resultImageUrl, setResultImageUrl] = useState('')
  const [resultTitleHtml, setResultTitleHtml] = useState('')
  const [resultSubtitleHtml, setResultSubtitleHtml] = useState('')
  const [resultExplanation, setResultExplanation] = useState('')
  const [resultColors, setResultColors] = useState<string[]>([])
  const [resultStyleUpdates, setResultStyleUpdates] = useState<Partial<Layer>>({})

  // Polling for image jobs
  const [jobId, setJobId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Context
  const ctx = buildLayerContext(allLayers, layer.id)
  const cyclingMsg = useCyclingMessage(state === 'generating' || state === 'polling')
  const elapsed = useElapsedTimer(state === 'generating' || state === 'polling')

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ==================== Placeholders per layer type ====================

  function getPlaceholder(): string {
    switch (layer.type) {
      case 'background': return 'Warm birthday celebration with bokeh lights, Indian aesthetic'
      case 'image': return 'A beautiful cake with roses and gold decoration'
      case 'text':
        return activeTab === 'generate'
          ? 'Write a compelling headline for a midnight cake delivery banner'
          : 'Make the title pink and bold, matching the rose background'
      case 'shape': return 'Suggest a gradient overlay that creates good text contrast'
      case 'badge': return 'Suggest a punchy badge for this occasion'
      case 'button': return 'Suggest a compelling CTA for this banner'
      default: return 'Describe what you want...'
    }
  }

  function getHelperText(): string {
    switch (layer.type) {
      case 'background': return 'Will be full-width banner background (16:5 landscape)'
      case 'image': return 'Hero image overlaid on banner'
      case 'text': return activeTab === 'generate' ? 'Generates new text copy' : 'Restyling existing text'
      case 'shape': return 'Generates a CSS gradient or color overlay'
      case 'badge': return 'Generates badge text, icon, and colors'
      case 'button': return 'Generates CTA text and colors'
      default: return ''
    }
  }

  // ==================== Poll for image job completion ====================

  const pollJobStatus = useCallback((id: string) => {
    setState('polling')
    setJobId(id)

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/banners/generate-image?jobId=${id}`)
        const json = await res.json()
        if (!json.success) return

        if (json.data.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current)
          setResultImageUrl(json.data.imageUrl)
          setState('result')
        } else if (json.data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          setErrorMsg(json.data.errorMessage || 'Image generation failed')
          setState('error')
        }
      } catch {
        // Network error, keep polling
      }
    }, 3000)
  }, [])

  // ==================== Generate Handlers ====================

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setState('generating')
    setErrorMsg('')

    try {
      const layerContext = ctx

      if (layer.type === 'background' || layer.type === 'image') {
        // Image generation — async job
        const res = await fetch('/api/admin/banners/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageType: layer.type === 'background' ? 'background' : 'hero',
            prompt: prompt.trim(),
            layerContext,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          setErrorMsg(json.error || 'Failed to start generation')
          setState('error')
          return
        }
        pollJobStatus(json.data.jobId)
      } else if (layer.type === 'text') {
        // Text generation — synchronous
        const textLayer = layer as { html: string }
        const apiMode = activeTab === 'generate' ? 'generate_copy' : undefined
        const res = await fetch('/api/admin/banners/style-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titleHtml: textLayer.html || '',
            subtitleHtml: '',
            styleInstruction: prompt.trim(),
            mode: apiMode,
            layerContext,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          setErrorMsg(json.error || 'Text generation failed')
          setState('error')
          return
        }
        setResultTitleHtml(json.data.titleHtml || '')
        setResultSubtitleHtml(json.data.subtitleHtml || '')
        setResultExplanation(json.data.explanation || '')
        setResultColors(json.data.suggestedColors || [])
        setState('result')
      } else if (layer.type === 'badge') {
        const res = await fetch('/api/admin/banners/style-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleInstruction: prompt.trim(),
            mode: 'badge',
            layerContext,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          setErrorMsg(json.error || 'Badge generation failed')
          setState('error')
          return
        }
        const d = json.data
        setResultStyleUpdates({
          text: d.text,
          icon: d.icon || '',
          bgColor: d.bgColor,
          textColor: d.textColor,
          borderRadius: d.borderRadius ?? 999,
        } as Partial<Layer>)
        setResultExplanation(d.explanation || '')
        setState('result')
      } else if (layer.type === 'button') {
        const res = await fetch('/api/admin/banners/style-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleInstruction: prompt.trim(),
            mode: 'button',
            layerContext,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          setErrorMsg(json.error || 'Button generation failed')
          setState('error')
          return
        }
        const d = json.data
        setResultStyleUpdates({
          text: d.text,
          bgColor: d.bgColor,
          textColor: d.textColor,
        } as Partial<Layer>)
        setResultExplanation(d.explanation || '')
        setState('result')
      } else if (layer.type === 'shape') {
        const res = await fetch('/api/admin/banners/style-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleInstruction: prompt.trim(),
            mode: 'shape_fill',
            layerContext,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          setErrorMsg(json.error || 'Shape generation failed')
          setState('error')
          return
        }
        const d = json.data
        setResultStyleUpdates({ fill: d.fill } as Partial<Layer>)
        setResultExplanation(d.explanation || '')
        setState('result')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed')
      setState('error')
    }
  }

  const handleRegenerate = () => {
    setResultImageUrl('')
    setResultTitleHtml('')
    setResultSubtitleHtml('')
    setResultExplanation('')
    setResultColors([])
    setResultStyleUpdates({})
    if (pollRef.current) clearInterval(pollRef.current)
    handleGenerate()
  }

  const handleAccept = () => {
    if (layer.type === 'background' || layer.type === 'image') {
      onAcceptImage(resultImageUrl)
    } else if (layer.type === 'text') {
      onAcceptText(resultTitleHtml, resultSubtitleHtml)
    } else {
      onAcceptStyle(resultStyleUpdates)
    }
  }

  const handleDiscard = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setState('idle')
    setResultImageUrl('')
    setResultTitleHtml('')
    setResultSubtitleHtml('')
    setResultExplanation('')
    setResultColors([])
    setResultStyleUpdates({})
    setJobId(null)
  }

  // ==================== Render ====================

  return (
    <div className="border rounded-lg bg-purple-50/50 p-3 mb-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-xs font-semibold text-purple-700">AI Generate</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab selector for text layers */}
      {layer.type === 'text' && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`flex-1 text-xs py-1 rounded border transition-colors ${
              activeTab === 'generate'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Generate Copy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restyle')}
            className={`flex-1 text-xs py-1 rounded border transition-colors ${
              activeTab === 'restyle'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Restyle
          </button>
        </div>
      )}

      {/* Idle state — prompt input */}
      {(state === 'idle' || state === 'error') && (
        <>
          <p className="text-[10px] text-gray-500">{getHelperText()}</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full text-xs border rounded p-2 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          {state === 'error' && (
            <p className="text-xs text-red-600 bg-red-50 rounded p-1.5">{errorMsg}</p>
          )}
          <Button
            size="sm"
            className="w-full text-xs bg-purple-600 hover:bg-purple-700"
            onClick={handleGenerate}
            disabled={!prompt.trim()}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {state === 'error' ? 'Try Again' : 'Generate'}
          </Button>
        </>
      )}

      {/* Generating / Polling state */}
      {(state === 'generating' || state === 'polling') && (
        <div className="text-center py-4 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
          <p className="text-xs text-gray-600">{cyclingMsg}</p>
          <p className="text-[10px] text-gray-400">{elapsed}s elapsed</p>
          {state === 'polling' && jobId && (
            <p className="text-[10px] text-gray-400">Job: {jobId.slice(0, 8)}...</p>
          )}
        </div>
      )}

      {/* Result state */}
      {state === 'result' && (
        <div className="space-y-2">
          {/* Image result */}
          {(layer.type === 'background' || layer.type === 'image') && resultImageUrl && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">Generated</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resultImageUrl}
                    alt="Generated"
                    className="w-full rounded border object-cover"
                    style={{ aspectRatio: layer.type === 'background' ? '16/5' : '1/1' }}
                  />
                </div>
                {layer.type === 'image' && 'imageUrl' in layer && (layer as { imageUrl: string }).imageUrl && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Current</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={(layer as { imageUrl: string }).imageUrl}
                      alt="Current"
                      className="w-full rounded border object-contain"
                      style={{ aspectRatio: '1/1' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text result */}
          {layer.type === 'text' && resultTitleHtml && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500">Generated HTML:</p>
              <div
                className="rounded p-2 border bg-gray-900 text-white text-sm"
                dangerouslySetInnerHTML={{ __html: resultTitleHtml }}
              />
              {resultColors.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">Colors:</span>
                  {resultColors.map(c => (
                    <span
                      key={c}
                      className="w-4 h-4 rounded border inline-block"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Badge/Button style result */}
          {(layer.type === 'badge' || layer.type === 'button' || layer.type === 'shape') && (
            <div className="space-y-2">
              {/* Badge preview */}
              {layer.type === 'badge' && resultStyleUpdates && 'text' in resultStyleUpdates && (
                <div className="flex items-center justify-center p-3 bg-gray-800 rounded">
                  <span
                    className="inline-flex items-center gap-1 text-sm"
                    style={{
                      padding: '4px 12px',
                      borderRadius: `${(resultStyleUpdates as Record<string, unknown>).borderRadius ?? 999}px`,
                      backgroundColor: (resultStyleUpdates as Record<string, string>).bgColor || 'rgba(255,255,255,0.2)',
                      color: (resultStyleUpdates as Record<string, string>).textColor || '#fff',
                    }}
                  >
                    {(resultStyleUpdates as Record<string, string>).icon && (
                      <span>{(resultStyleUpdates as Record<string, string>).icon}</span>
                    )}
                    {(resultStyleUpdates as Record<string, string>).text}
                  </span>
                </div>
              )}
              {/* Button preview */}
              {layer.type === 'button' && resultStyleUpdates && 'text' in resultStyleUpdates && (
                <div className="flex items-center justify-center p-3 bg-gray-100 rounded">
                  <span
                    className="inline-flex items-center text-sm font-semibold"
                    style={{
                      padding: '8px 20px',
                      borderRadius: '999px',
                      backgroundColor: (resultStyleUpdates as Record<string, string>).bgColor || '#E91E63',
                      color: (resultStyleUpdates as Record<string, string>).textColor || '#fff',
                    }}
                  >
                    {(resultStyleUpdates as Record<string, string>).text}
                  </span>
                </div>
              )}
              {/* Shape preview */}
              {layer.type === 'shape' && resultStyleUpdates && 'fill' in resultStyleUpdates && (
                <div className="rounded border overflow-hidden" style={{ height: '40px' }}>
                  <div
                    className="w-full h-full"
                    style={{ background: (resultStyleUpdates as Record<string, string>).fill }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          {resultExplanation && (
            <p className="text-[10px] text-gray-500 italic">{resultExplanation}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="flex-1 text-xs bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
            >
              <Check className="w-3 h-3 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={handleRegenerate}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={handleDiscard}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Context preview */}
      <ContextPreview ctx={ctx} />
    </div>
  )
}

// ==================== Context Preview ====================

function ContextPreview({ ctx }: { ctx: LayerContextSummary }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-xs text-gray-400">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 hover:text-gray-600 cursor-pointer"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        Context being sent to AI
      </button>
      {open && (
        <div className="mt-2 bg-gray-50 rounded p-2 space-y-1 text-[10px]">
          <p>Theme: {ctx.occasionHint}</p>
          <p>Background: {ctx.backgroundHasDarkTones ? 'Dark' : 'Light'}</p>
          {ctx.existingColors.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span>Palette:</span>
              {ctx.existingColors.slice(0, 5).map(c => (
                <span
                  key={c}
                  className="w-4 h-4 rounded border inline-block"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}
          {ctx.existingFonts.length > 0 && (
            <p>Fonts in use: {ctx.existingFonts.join(', ')}</p>
          )}
          {ctx.textLayers.length > 0 && (
            <p>Main text: &quot;{ctx.textLayers[0].html.replace(/<[^>]*>/g, '').slice(0, 40)}...&quot;</p>
          )}
        </div>
      )}
    </div>
  )
}
