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

export function ProductGallery({ images }: ProductGalleryProps) {
  const displayImages = images.length > 0 ? images : ["/placeholder-product.svg"]
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (displayImages.length === 1) {
    return (
      <div className="flex flex-col gap-1">
        <div
          className="relative w-full aspect-square max-h-[500px] overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={processImageUrl(displayImages[0])}
            alt="Product image"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 55vw"
            quality={80}
            priority
          />
        </div>
        <p
          className="text-xs text-gray-400 cursor-pointer hover:text-gray-500 text-center"
          onClick={() => setLightboxOpen(true)}
        >
          Click to open expanded view
        </p>

        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-0 bg-black border-none">
            <DialogClose className="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-1.5 hover:bg-white">
              <X className="h-5 w-5" />
            </DialogClose>
            <div className="relative w-full aspect-square">
              <Image
                src={processImageUrl(displayImages[0], 1200, 90)}
                alt="Product image full size"
                fill
                className="object-contain"
                sizes="90vw"
                quality={90}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-3">
        {/* Vertical thumbnail strip */}
        <div className="hidden md:flex flex-col gap-2 w-20 max-h-[500px] overflow-y-auto shrink-0">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                "relative w-20 h-20 shrink-0 overflow-hidden rounded-lg border-2 bg-gray-100 transition-all",
                idx === selectedIndex
                  ? "ring-2 ring-green-500 border-green-500"
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
              />
            </button>
          ))}
        </div>

        {/* Hero image */}
        <div
          className="relative flex-1 aspect-square max-h-[500px] overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={processImageUrl(displayImages[selectedIndex])}
            alt="Product image"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 45vw"
            quality={80}
            priority
          />
        </div>
      </div>

      {/* Mobile horizontal thumbnails */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-1 mt-2">
        {displayImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className={cn(
              "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-gray-100 transition-all",
              idx === selectedIndex
                ? "ring-2 ring-green-500 border-green-500"
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
            />
          </button>
        ))}
      </div>

      <p
        className="text-xs text-gray-400 cursor-pointer hover:text-gray-500 text-center"
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
              src={processImageUrl(displayImages[selectedIndex], 1200, 90)}
              alt="Product image full size"
              fill
              className="object-contain"
              sizes="90vw"
              quality={90}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
