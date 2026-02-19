"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Sparkles,
  Upload,
  Loader2,
  RefreshCw,
  Check,
  Copy,
  AlertCircle,
  X,
  ImageIcon,
} from "lucide-react"

export interface GeneratedContent {
  description: string
  shortDesc: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  tags: string[]
  imagePrompt: string
  imageUrl: string | null
}

interface AIGeneratorPanelProps {
  isOpen: boolean
  onClose: () => void
  productName: string
  categoryName: string
  price: string
  weight?: string
  occasion?: string
  onApply: (result: GeneratedContent) => void
}

type GenerationPhase = 'idle' | 'content' | 'image' | 'done' | 'error'

export function AIGeneratorPanel({
  isOpen,
  onClose,
  productName,
  categoryName,
  price,
  weight,
  occasion,
  onApply,
}: AIGeneratorPanelProps) {
  const [phase, setPhase] = useState<GenerationPhase>('idle')
  const [result, setResult] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [regeneratingImage, setRegeneratingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
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
    setPhase('content')
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('productName', productName)
      formData.append('categoryName', categoryName)
      formData.append('price', price)
      if (weight) formData.append('weight', weight)
      if (occasion) formData.append('occasion', occasion)
      if (referenceFile) formData.append('referenceImage', referenceFile)

      // Show image phase after a delay (both run server-side in sequence)
      const phaseTimer = setTimeout(() => setPhase('image'), 4000)

      const res = await fetch('/api/admin/products/generate-content', {
        method: 'POST',
        body: formData,
      })

      clearTimeout(phaseTimer)

      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Generation failed')

      setResult(json.data)
      setPhase('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setError(msg)
      setPhase('error')
    }
  }

  const handleRegenerateImage = async () => {
    if (!result) return
    setRegeneratingImage(true)

    try {
      const formData = new FormData()
      formData.append('productName', productName)
      formData.append('categoryName', categoryName)
      formData.append('price', price)
      if (weight) formData.append('weight', weight)
      formData.append('regenerateImageOnly', 'true')
      formData.append('imagePrompt', result.imagePrompt)
      if (referenceFile) formData.append('referenceImage', referenceFile)

      const res = await fetch('/api/admin/products/generate-content', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Image regeneration failed')

      setResult({ ...result, imageUrl: json.data.imageUrl })
    } catch (err) {
      console.error('Image regeneration failed:', err)
    } finally {
      setRegeneratingImage(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleApplyAll = () => {
    if (result) {
      onApply(result)
      onClose()
    }
  }

  const canGenerate = productName.trim() && categoryName.trim() && price.trim()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Generate with AI
          </SheetTitle>
          <SheetDescription>
            Generate SEO content and product image using AI
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Reference Image Upload */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Reference Image (optional)</p>
            {referencePreview ? (
              <div className="relative rounded-lg border overflow-hidden h-32 w-32">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referencePreview}
                  alt="Reference"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeReferenceFile}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors h-24 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="h-5 w-5 text-slate-400 mb-1" />
                <span className="text-xs text-slate-500">Upload a reference photo</span>
              </label>
            )}
          </div>

          {/* Product Info Summary */}
          <div className="rounded-lg bg-slate-50 p-3 space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Generating for:
            </p>
            <p className="text-sm font-semibold">{productName || 'Untitled Product'}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span>Category: {categoryName || '—'}</span>
              <span>Price: {price ? `₹${price}` : '—'}</span>
              {weight && <span>Weight: {weight}</span>}
              {occasion && <span>Occasion: {occasion}</span>}
            </div>
          </div>

          {/* Generate Button */}
          {phase === 'idle' && (
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate Content &amp; Image
            </Button>
          )}

          {/* Loading State */}
          {(phase === 'content' || phase === 'image') && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {phase === 'content'
                    ? 'Writing product descriptions...'
                    : 'Generating product image...'}
                </p>
                <p className="text-xs text-slate-500 mt-1">This may take a moment</p>
              </div>
              {/* Progress steps */}
              <div className="flex items-center gap-3 mt-2">
                <div className={`flex items-center gap-1.5 text-xs ${phase === 'content' ? 'text-amber-600 font-medium' : 'text-green-600'}`}>
                  {phase === 'content' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Content
                </div>
                <div className="h-px w-4 bg-slate-300" />
                <div className={`flex items-center gap-1.5 text-xs ${phase === 'image' ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  {phase === 'image' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ImageIcon className="h-3 w-3" />
                  )}
                  Image
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {phase === 'error' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Generation failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
              <Button onClick={handleGenerate} variant="outline" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Results */}
          {phase === 'done' && result && (
            <div className="space-y-5">
              {/* Generated Image */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Generated Image</p>
                {result.imageUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg border overflow-hidden bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.imageUrl}
                        alt="AI generated product"
                        className="w-full h-48 object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 flex-1"
                        onClick={handleRegenerateImage}
                        disabled={regeneratingImage}
                      >
                        {regeneratingImage ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Regenerate Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Image generation failed — you can upload one manually.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <ResultField
                label="Description"
                value={result.description}
                onCopy={() => copyToClipboard(result.description, 'description')}
                copied={copiedField === 'description'}
              />

              {/* Short Description */}
              <ResultField
                label="Short Description"
                value={result.shortDesc}
                onCopy={() => copyToClipboard(result.shortDesc, 'shortDesc')}
                copied={copiedField === 'shortDesc'}
              />

              {/* SEO Title */}
              <ResultField
                label="SEO Title"
                value={result.metaTitle}
                onCopy={() => copyToClipboard(result.metaTitle, 'metaTitle')}
                copied={copiedField === 'metaTitle'}
                charLimit={60}
              />

              {/* Meta Description */}
              <ResultField
                label="Meta Description"
                value={result.metaDescription}
                onCopy={() => copyToClipboard(result.metaDescription, 'metaDescription')}
                copied={copiedField === 'metaDescription'}
                charLimit={155}
              />

              {/* Keywords */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.metaKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Apply All Button */}
              <div className="pt-4 border-t">
                <Button onClick={handleApplyAll} className="w-full gap-2">
                  <Check className="h-4 w-4" />
                  Apply All to Form
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ResultField({
  label,
  value,
  onCopy,
  copied,
  charLimit,
}: {
  label: string
  value: string
  onCopy: () => void
  copied: boolean
  charLimit?: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-2.5 leading-relaxed">
        {value}
      </p>
      {charLimit && (
        <p className={`text-xs ${value.length > charLimit ? 'text-red-500' : 'text-slate-400'}`}>
          {value.length}/{charLimit} characters
        </p>
      )}
    </div>
  )
}
