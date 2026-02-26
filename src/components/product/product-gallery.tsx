"use client"

import { useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { cn, processImageUrl } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog"

interface ProductGalleryProps {
  images: string[]
}

const PLACEHOLDER = "/placeholder-product.svg"

function validImages(images: string[]): string[] {
  if (!images || images.length === 0) return []
  return images.filter((img) => typeof img === "string" && img.trim() !== "")
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const filtered = validImages(images)
  const hasImages = filtered.length > 0
  const displayImages = hasImages ? filtered : [PLACEHOLDER]
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const heroSrc = displayImages[selectedIndex] || displayImages[0]

  // Single image or placeholder — no thumbnail strip
  if (displayImages.length <= 1) {
    return (
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            "relative w-full aspect-square max-h-[500px] overflow-hidden rounded-xl bg-gray-100",
            hasImages && "cursor-pointer"
          )}
          onClick={() => hasImages && setLightboxOpen(true)}
        >
          <Image
            src={processImageUrl(heroSrc)}
            alt="Product image"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 55vw"
            quality={80}
            priority
            onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
          />
        </div>
        {hasImages && (
          <p
            className="text-center text-xs text-gray-400 mt-2 cursor-pointer hover:text-gray-500"
            onClick={() => setLightboxOpen(true)}
          >
            Click to open expanded view
          </p>
        )}

        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-0 bg-black border-none">
            <DialogClose className="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-1.5 hover:bg-white">
              <X className="h-5 w-5" />
            </DialogClose>
            <div className="relative w-full aspect-square">
              <Image
                src={processImageUrl(heroSrc, 1200, 90)}
                alt="Product image full size"
                fill
                className="object-contain"
                sizes="90vw"
                quality={90}
                onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Multiple images — show thumbnail strip
  return (
    <div className="flex flex-col gap-1">
      {/* Desktop: vertical thumbnails + hero */}
      <div className="flex flex-row gap-3">
        {/* Left vertical thumbnail strip (hidden on mobile) */}
        <div className="hidden md:flex flex-col gap-2 w-[80px] flex-shrink-0 max-h-[500px] overflow-y-auto">
          {displayImages.slice(0, 5).map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                "relative w-[80px] h-[80px] shrink-0 overflow-hidden rounded-lg border-2 bg-gray-100 transition-all cursor-pointer",
                idx === selectedIndex
                  ? "border-green-500 ring-2 ring-green-500"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <Image
                src={processImageUrl(img, 120, 70)}
                alt={`View ${idx + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                quality={70}
                loading="lazy"
                onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
              />
            </button>
          ))}
        </div>

        {/* Hero image */}
        <div
          className="relative flex-1 aspect-square max-h-[500px] overflow-hidden rounded-xl bg-gray-100 cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={processImageUrl(heroSrc)}
            alt="Product image"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 45vw"
            quality={80}
            priority
            onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
          />
        </div>
      </div>

      {/* Mobile: horizontal thumbnail scroll below hero */}
      <div className="flex md:hidden flex-row gap-2 overflow-x-auto mt-2">
        {displayImages.slice(0, 5).map((img, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className={cn(
              "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-gray-100 transition-all cursor-pointer",
              idx === selectedIndex
                ? "border-green-500 ring-2 ring-green-500"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Image
              src={processImageUrl(img, 120, 70)}
              alt={`View ${idx + 1}`}
              fill
              className="object-cover"
              sizes="64px"
              quality={70}
              loading="lazy"
              onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
            />
          </button>
        ))}
      </div>

      <p
        className="text-center text-xs text-gray-400 mt-2 cursor-pointer hover:text-gray-500"
        onClick={() => setLightboxOpen(true)}
      >
        Click to open expanded view
      </p>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-0 bg-black border-none">
          <DialogClose className="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-1.5 hover:bg-white">
            <X className="h-5 w-5" />
          </DialogClose>
          <div className="relative w-full aspect-square">
            <Image
              src={processImageUrl(heroSrc, 1200, 90)}
              alt="Product image full size"
              fill
              className="object-contain"
              sizes="90vw"
              quality={90}
              onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
