"use client"

import { useState } from "react"
import Image from "next/image"
import { cn, processImageUrl } from "@/lib/utils"

interface ProductGalleryProps {
  images: string[]
  name: string
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const displayImages = images.length > 0 ? images : ["/placeholder-product.svg"]
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative w-full aspect-square max-h-[400px] overflow-hidden rounded-xl bg-muted">
        <Image
          src={processImageUrl(displayImages[selectedIndex])}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
          quality={75}
          priority
        />
      </div>

      {/* Thumbnail strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                idx === selectedIndex
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <Image
                src={processImageUrl(img, 120, 70)}
                alt={`${name} view ${idx + 1}`}
                fill
                className="object-cover"
                sizes="120px"
                quality={70}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
