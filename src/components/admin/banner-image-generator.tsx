'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Upload,
  Loader2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'

export interface BannerImageGeneratorProps {
  imageType: 'background' | 'hero'
  currentImageUrl?: string
  bannerContext?: { titleHtml?: string; occasion?: string; citySlug?: string }
  onAccept: (newUrl: string) => void
  onClose: () => void
}

type GeneratorState = 'idle' | 'generating' | 'result' | 'error'

const GENERATING_MESSAGES = [
  { text: 'Generating your image...', until: 5000 },
  { text: 'Adding details...', until: 12000 },
  { text: 'Almost ready...', until: Infinity },
]

export function BannerImageGenerator({
  imageType,
  currentImageUrl,
  bannerContext,
  onAccept,
  onClose,
}: BannerImageGeneratorProps) {
  const [state, setState] = useState<GeneratorState>('idle')
  const [prompt, setPrompt] = useState('')
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [promptUsed, setPromptUsed] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatingMessage, setGeneratingMessage] = useState(GENERATING_MESSAGES[0].text)
  const [showPromptDetails, setShowPromptDetails] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const generateStartRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const placeholderText =
    imageType === 'background'
      ? `A beautiful${bannerContext?.occasion ? ` ${bannerContext.occasion}` : ''} celebration scene with flowers, warm lighting, Indian aesthetic`
      : `A stunning gift product with elegant presentation on clean background`

  // Cycle generating messages based on elapsed time
  useEffect(() => {
    if (state === 'generating') {
      generateStartRef.current = Date.now()
      setGeneratingMessage(GENERATING_MESSAGES[0].text)

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - generateStartRef.current
        const msg = GENERATING_MESSAGES.find((m) => elapsed < m.until)
        if (msg) setGeneratingMessage(msg.text)
      }, 1000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [state])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File too large. Max 5MB.')
      return
    }
    setReferenceFile(file)
    const reader = new FileReader()
    reader.onload = () => setReferencePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removeReferenceFile = () => {
    setReferenceFile(null)
    setReferencePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setState('generating')
    setErrorMessage(null)

    try {
      // Convert reference image to base64 if present
      let referenceImageBase64: string | undefined
      if (referenceFile && referencePreview) {
        // Extract base64 from data URL (data:image/...;base64,XXXX)
        const parts = referencePreview.split(',')
        if (parts.length === 2) {
          referenceImageBase64 = parts[1]
        }
      }

      const res = await fetch('/api/admin/banners/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageType,
          prompt: prompt.trim(),
          currentImageUrl,
          referenceImageBase64,
          bannerContext,
        }),
      })

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Generation failed')
      }

      setGeneratedUrl(json.data.imageUrl)
      setPromptUsed(json.data.promptUsed)
      setState('result')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image generation failed'
      setErrorMessage(msg)
      setState('error')
    }
  }

  const handleAccept = () => {
    if (generatedUrl) {
      onAccept(generatedUrl)
    }
  }

  const handleDiscard = () => {
    setGeneratedUrl(null)
    setPromptUsed(null)
    setState('idle')
  }

  const handleRegenerate = () => {
    handleGenerate()
  }

  return (
    <div className="border border-purple-200 bg-purple-50/50 rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-200 bg-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">
            AI Image Generator — {imageType === 'background' ? 'Background' : 'Hero'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 hover:bg-purple-200 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-purple-700" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* === IDLE STATE === */}
        {state === 'idle' && (
          <>
            {/* Prompt textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                Describe what you want:
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholderText}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Reference image upload */}
            <div className="flex items-center gap-3">
              {referencePreview ? (
                <div className="relative w-16 h-16 rounded-lg border overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referencePreview}
                    alt="Reference"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeReferenceFile}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex-shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg hover:border-purple-400 transition-colors text-xs text-slate-500 hover:text-purple-600">
                    <Upload className="w-3.5 h-3.5" />
                    Upload reference image (optional)
                  </div>
                </label>
              )}
              {referenceFile && (
                <span className="text-xs text-slate-500 truncate max-w-[150px]">
                  {referenceFile.name}
                </span>
              )}
            </div>

            {/* Generate button */}
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Image
            </Button>
          </>
        )}

        {/* === GENERATING STATE === */}
        {state === 'generating' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">{generatingMessage}</p>
              <p className="text-xs text-slate-500 mt-1">Usually takes 15-30 seconds</p>
            </div>
          </div>
        )}

        {/* === RESULT STATE === */}
        {state === 'result' && generatedUrl && (
          <>
            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-3">
              {/* New image */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-green-700">New</span>
                </div>
                <div className="relative rounded-lg border-2 border-green-300 overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generatedUrl}
                    alt="Generated"
                    className="w-full object-contain"
                    style={{
                      aspectRatio: imageType === 'background' ? '16/10' : '4/5',
                    }}
                  />
                </div>
              </div>

              {/* Current image */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Current</span>
                </div>
                <div className="relative rounded-lg border border-gray-200 overflow-hidden bg-slate-100">
                  {currentImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentImageUrl}
                      alt="Current"
                      className="w-full object-contain"
                      style={{
                        aspectRatio: imageType === 'background' ? '16/10' : '4/5',
                      }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center text-xs text-slate-400"
                      style={{
                        aspectRatio: imageType === 'background' ? '16/10' : '4/5',
                      }}
                    >
                      No current image
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAccept}
                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Use This Image
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </Button>
            </div>

            {/* Prompt used details (collapsible) */}
            {promptUsed && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowPromptDetails(!showPromptDetails)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      showPromptDetails ? 'rotate-180' : ''
                    }`}
                  />
                  Prompt used
                </button>
                {showPromptDetails && (
                  <p className="mt-1 text-xs text-slate-400 bg-slate-50 rounded p-2 leading-relaxed">
                    {promptUsed}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* === ERROR STATE === */}
        {state === 'error' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Generation failed</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                setState('idle')
                setErrorMessage(null)
              }}
              variant="outline"
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
