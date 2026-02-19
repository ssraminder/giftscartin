"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Upload, X, Sparkles } from "lucide-react"
import type { ProductFormData } from "./types"

interface TabImagesProps {
  formData: ProductFormData
  onChange: (updates: Partial<ProductFormData>) => void
  onOpenAiPanel?: () => void
}

function ImageUploadSlot({
  image,
  onUpload,
  onRemove,
  label,
  large,
}: {
  image: string | null
  onUpload: (url: string) => void
  onRemove: () => void
  label: string
  large?: boolean
}) {
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Get signed upload URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: 'products',
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      // Upload the file
      await fetch(json.data.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      onUpload(json.data.publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  if (image) {
    return (
      <div className={`relative group rounded-lg border overflow-hidden ${large ? 'h-48' : 'h-32'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={label} className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
          <p className="text-xs text-white truncate">{label}</p>
        </div>
      </div>
    )
  }

  return (
    <label
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors ${
        large ? 'h-48' : 'h-32'
      } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      {uploading ? (
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
      ) : (
        <>
          <Upload className="h-5 w-5 text-slate-400 mb-1" />
          <span className="text-xs text-slate-500">{label}</span>
        </>
      )}
    </label>
  )
}

export function TabImages({ formData, onChange, onOpenAiPanel }: TabImagesProps) {
  const featuredImage = formData.images[0] || null
  const galleryImages = formData.images.slice(1)

  const setFeaturedImage = (url: string) => {
    onChange({ images: [url, ...galleryImages] })
  }

  const removeFeaturedImage = () => {
    onChange({ images: galleryImages })
  }

  const setGalleryImage = (index: number, url: string) => {
    const newGallery = [...galleryImages]
    newGallery[index] = url
    onChange({ images: [featuredImage || '', ...newGallery].filter(Boolean) })
  }

  const removeGalleryImage = (index: number) => {
    const newGallery = galleryImages.filter((_, i) => i !== index)
    const newImages = featuredImage ? [featuredImage, ...newGallery] : newGallery
    onChange({ images: newImages })
  }

  return (
    <div className="space-y-6">
      {/* Featured Image */}
      <div className="space-y-2">
        <Label>Featured Image</Label>
        <ImageUploadSlot
          image={featuredImage}
          onUpload={setFeaturedImage}
          onRemove={removeFeaturedImage}
          label="Upload featured image"
          large
        />
      </div>

      {/* Gallery Images */}
      <div className="space-y-2">
        <Label>Gallery Images (up to 4)</Label>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <ImageUploadSlot
              key={i}
              image={galleryImages[i] || null}
              onUpload={(url) => setGalleryImage(i, url)}
              onRemove={() => removeGalleryImage(i)}
              label={`Image ${i + 2}`}
            />
          ))}
        </div>
      </div>

      {/* AI Generator */}
      <div className="pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          className="gap-2 w-full"
          onClick={onOpenAiPanel}
        >
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </div>
    </div>
  )
}
