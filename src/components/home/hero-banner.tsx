'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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

const CLONE_COUNT = 3
const AUTO_PLAY_MS = 4000

export default function HeroBanner({ banners: propBanners }: HeroBannerProps = {}) {
  const [banners, setBanners] = useState<ResolvedBanner[]>([])
  const [currentIndex, setCurrentIndex] = useState(CLONE_COUNT)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [slideWidth, setSlideWidth] = useState(0)
  const [gap, setGap] = useState(16)
  const containerRef = useRef<HTMLDivElement>(null)
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
        ? (rawLayers as Layer[])
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

  // Measure container and compute responsive slide dimensions
  useEffect(() => {
    if (!containerRef.current) return
    const measure = () => {
      const el = containerRef.current!
      const cs = getComputedStyle(el)
      const pl = parseFloat(cs.paddingLeft) || 0
      const visibleArea = el.clientWidth - pl
      const isMobile = el.clientWidth < 768
      const g = isMobile ? 12 : 16
      // Mobile: ~1.1 tiles visible, Desktop: ~2.5 tiles visible
      const visibleCount = isMobile ? 1.1 : 2.5
      const gapsInView = Math.floor(visibleCount)
      const sw = (visibleArea - gapsInView * g) / visibleCount
      setSlideWidth(sw)
      setGap(g)
      setIsTransitioning(false)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const realCount = banners.length

  // Build extended slides: [last N clones] + [real slides] + [first N clones]
  const extendedSlides = useMemo(() => {
    if (realCount === 0) return []
    const before = banners.slice(-CLONE_COUNT)
    const after = banners.slice(0, CLONE_COUNT)
    return [...before, ...banners, ...after]
  }, [banners, realCount])

  const goTo = useCallback((index: number) => {
    setIsTransitioning(true)
    setCurrentIndex(index)
  }, [])

  const goNext = useCallback(() => {
    goTo(currentIndex + 1)
  }, [currentIndex, goTo])

  const goPrev = useCallback(() => {
    goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  // After transition ends on a clone, instantly snap to the matching real slide
  const handleTransitionEnd = useCallback(() => {
    setIsTransitioning(false)
    setCurrentIndex((prev) => {
      if (prev >= CLONE_COUNT + realCount) {
        return CLONE_COUNT + (prev - CLONE_COUNT - realCount)
      }
      if (prev < CLONE_COUNT) {
        return CLONE_COUNT + realCount - (CLONE_COUNT - prev)
      }
      return prev
    })
  }, [realCount])

  // Auto-play
  useEffect(() => {
    if (realCount <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return
    }
    timerRef.current = setInterval(goNext, AUTO_PLAY_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [realCount, isPaused, goNext])

  // Touch / swipe
  const touchStartX = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    setIsPaused(true)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(dx) > 50) {
      if (dx > 0) goNext()
      else goPrev()
    }
    setIsPaused(false)
  }

  const activeDot =
    realCount > 0
      ? ((currentIndex - CLONE_COUNT) % realCount + realCount) % realCount
      : 0
  const translateX = -(currentIndex * (slideWidth + gap))

  // No banners after loading
  if (!loading && realCount === 0) return null

  const showTrack = !loading && slideWidth > 0 && realCount > 0

  return (
    <div
      className="relative py-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className="overflow-hidden pl-4 md:pl-6 lg:pl-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showTrack ? (
          <div
            className="flex"
            style={{
              gap: `${gap}px`,
              transform: `translateX(${translateX}px)`,
              transition: isTransitioning
                ? 'transform 500ms ease-in-out'
                : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedSlides.map((banner, idx) => (
              <div
                key={`${banner.id}-${idx}`}
                className="flex-shrink-0 rounded-2xl overflow-hidden aspect-[16/9]"
                style={{ width: `${slideWidth}px` }}
              >
                <BannerLayerRenderer
                  layers={banner.resolvedLayers}
                  priority={idx >= CLONE_COUNT && idx < CLONE_COUNT + 2}
                  className="w-full h-full"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 md:gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 aspect-[16/9] bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse rounded-2xl"
                style={{ width: '38%' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      {showTrack && realCount > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10
                       w-8 h-8 rounded-full bg-white/80 hover:bg-white
                       flex items-center justify-center shadow-md transition-colors"
            aria-label="Previous banner"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10
                       w-8 h-8 rounded-full bg-white/80 hover:bg-white
                       flex items-center justify-center shadow-md transition-colors"
            aria-label="Next banner"
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {showTrack && realCount > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(CLONE_COUNT + i)}
              aria-label={`Go to slide ${i + 1}`}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === activeDot ? '20px' : '6px',
                height: '6px',
                backgroundColor:
                  i === activeDot ? '#E91E63' : 'rgba(0,0,0,0.2)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
