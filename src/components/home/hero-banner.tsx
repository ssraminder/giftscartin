'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type Layer, migrateOldBannerToLayers } from '@/lib/banner-layers'
import { BannerLayerRenderer } from '@/components/home/banner-layer-renderer'

interface HeroBannerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  banners?: any[]
}

interface ResolvedBanner {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  resolvedLayers: Layer[]
}

export default function HeroBanner({ banners: propBanners }: HeroBannerProps = {}) {
  const [banners, setBanners] = useState<ResolvedBanner[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Resolve layers for a banner — migrate old format if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolveBanner = useCallback((banner: any): ResolvedBanner | null => {
    const isActive = banner.is_active || banner.isActive
    if (!isActive) return null

    const rawLayers = banner.layers
    const hasLayers = Array.isArray(rawLayers) && rawLayers.length > 0
    return {
      ...banner,
      resolvedLayers: hasLayers
        ? rawLayers as Layer[]
        : migrateOldBannerToLayers(banner),
    }
  }, [])

  // Fetch banners (if not passed as prop)
  useEffect(() => {
    if (propBanners) {
      const resolved = propBanners
        .map(resolveBanner)
        .filter((b): b is ResolvedBanner => b !== null)
      setBanners(resolved)
      setLoading(false)
      return
    }

    fetch('/api/banners')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          const resolved = json.data
            .map(resolveBanner)
            .filter((b: ResolvedBanner | null): b is ResolvedBanner => b !== null)
          setBanners(resolved)
        }
      })
      .catch(() => { /* no banners */ })
      .finally(() => setLoading(false))
  }, [propBanners, resolveBanner])

  const goTo = useCallback((index: number) => {
    setBanners(prev => {
      const len = prev.length
      if (len === 0) return prev
      setActiveIndex((index + len) % len)
      return prev
    })
  }, [])

  // Auto-play — 5 second interval
  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return
    }
    timerRef.current = setInterval(() => {
      setActiveIndex(i => (i + 1) % banners.length)
    }, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [banners.length, isPaused])

  // Touch handlers for swipe
  const touchStartX = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) {
      if (delta > 0) goTo(activeIndex + 1)
      else goTo(activeIndex - 1)
    }
  }

  if (loading) {
    return (
      <div className="px-4 md:px-6 lg:px-8 py-2">
        <div className="w-full h-[260px] md:h-auto md:aspect-[16/9] md:max-h-[420px] md:min-h-[280px] bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (banners.length === 0) return null

  return (
    <div
      className="relative px-4 md:px-6 lg:px-8 py-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="relative w-full overflow-hidden rounded-2xl h-[260px] md:h-auto md:aspect-[16/9] md:max-h-[420px] md:min-h-[280px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slide track — all slides stacked, only active one visible via opacity */}
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            aria-hidden={index !== activeIndex}
            className="absolute inset-0 w-full h-full transition-opacity duration-500"
            style={{
              opacity: index === activeIndex ? 1 : 0,
              pointerEvents: index === activeIndex ? 'auto' : 'none',
              zIndex: index === activeIndex ? 1 : 0,
            }}
          >
            <BannerLayerRenderer
              layers={banner.resolvedLayers}
              priority={index === 0}
              className="w-full h-full"
            />
          </div>
        ))}

        {/* Prev/Next arrows — only show if more than 1 banner */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10
                         w-8 h-8 rounded-full bg-white/80 hover:bg-white
                         flex items-center justify-center shadow-md
                         transition-colors"
              aria-label="Previous banner"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10
                         w-8 h-8 rounded-full bg-white/80 hover:bg-white
                         flex items-center justify-center shadow-md
                         transition-colors"
              aria-label="Next banner"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </>
        )}

        {/* Dot navigation */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10
                          flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="transition-all duration-300 rounded-full"
                style={{
                  width:  i === activeIndex ? '20px' : '6px',
                  height: '6px',
                  backgroundColor: i === activeIndex
                    ? '#E91E63'
                    : 'rgba(255,255,255,0.7)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
