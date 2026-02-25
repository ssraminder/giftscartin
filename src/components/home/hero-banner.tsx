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

const SLIDE_GAP = 16 // gap-4 = 1rem
const AUTO_PLAY_MS = 5000
const TRANSITION_MS = 400

export default function HeroBanner({ banners: propBanners }: HeroBannerProps = {}) {
  const [banners, setBanners] = useState<ResolvedBanner[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [transitionEnabled, setTransitionEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [slideWidth, setSlideWidth] = useState(0)

  const trackRef = useRef<HTMLDivElement>(null)
  const isPausedRef = useRef(false)
  const touchStartX = useRef(0)

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

  // Sync ref
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

  const len = banners.length
  const hasMultiple = len > 1

  // For infinite loop: displayBanners = [lastClone, ...banners, firstClone]
  // Index 0 = clone of last, index len+1 = clone of first
  // Start at index 1 (first real slide)
  useEffect(() => {
    if (hasMultiple) setCurrentIndex(1)
    else setCurrentIndex(0)
  }, [hasMultiple])

  // Measure slide width from DOM
  const measure = useCallback(() => {
    if (trackRef.current && trackRef.current.children.length > 0) {
      setSlideWidth((trackRef.current.children[0] as HTMLElement).offsetWidth)
    }
  }, [])

  useEffect(() => { measure() }, [banners, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Infinite loop boundary jumps
  useEffect(() => {
    if (!hasMultiple) return

    if (currentIndex === len + 1) {
      // Reached clone of first → jump back to real first
      const t = setTimeout(() => {
        setTransitionEnabled(false)
        setCurrentIndex(1)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTransitionEnabled(true))
        )
      }, TRANSITION_MS + 20)
      return () => clearTimeout(t)
    }

    if (currentIndex === 0) {
      // Reached clone of last → jump to real last
      const t = setTimeout(() => {
        setTransitionEnabled(false)
        setCurrentIndex(len)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTransitionEnabled(true))
        )
      }, TRANSITION_MS + 20)
      return () => clearTimeout(t)
    }
  }, [currentIndex, len, hasMultiple])

  // Auto-advance
  useEffect(() => {
    if (!hasMultiple) return
    const interval = setInterval(() => {
      if (isPausedRef.current) return
      setTransitionEnabled(true)
      setCurrentIndex(prev => prev + 1)
    }, AUTO_PLAY_MS)
    return () => clearInterval(interval)
  }, [hasMultiple])

  const goNext = useCallback(() => {
    setTransitionEnabled(true)
    setCurrentIndex(prev => prev + 1)
  }, [])

  const goPrev = useCallback(() => {
    setTransitionEnabled(true)
    setCurrentIndex(prev => prev - 1)
  }, [])

  const goToDot = useCallback((dotIndex: number) => {
    setTransitionEnabled(true)
    setCurrentIndex(dotIndex + 1) // +1 because index 0 is lastClone
  }, [])

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) {
      if (delta > 0) goNext()
      else goPrev()
    }
  }

  const activeDot = hasMultiple ? ((currentIndex - 1 + len) % len) : 0

  if (loading) {
    return (
      <div className="px-4 md:px-6 lg:px-8 py-2">
        <div className="w-[92vw] sm:w-[55vw] md:w-[45vw] lg:w-[37vw] 2xl:w-[31vw] max-w-[600px] aspect-[4/3] md:aspect-[16/9] bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (len === 0) return null

  // Single banner — no carousel
  if (len === 1) {
    return (
      <div className="px-4 md:px-6 lg:px-8 py-2">
        <div className="relative overflow-hidden rounded-2xl w-[92vw] sm:w-[55vw] md:w-[45vw] lg:w-[37vw] 2xl:w-[31vw] max-w-[600px] aspect-[4/3] md:aspect-[16/9]">
          <BannerLayerRenderer
            layers={banners[0].resolvedLayers}
            priority={true}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    )
  }

  // Build display list with clones: [lastClone, ...banners, firstClone]
  const displayBanners = [
    banners[len - 1],
    ...banners,
    banners[0],
  ]

  const offset = slideWidth > 0
    ? currentIndex * (slideWidth + SLIDE_GAP)
    : 0

  return (
    <div
      className="relative px-4 md:px-6 lg:px-8 py-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left arrow */}
      <button
        onClick={goPrev}
        className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20
                   items-center justify-center w-9 h-9 rounded-full
                   bg-black/30 hover:bg-black/50 text-white transition-colors"
        aria-label="Previous banner"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Right arrow */}
      <button
        onClick={goNext}
        className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20
                   items-center justify-center w-9 h-9 rounded-full
                   bg-black/30 hover:bg-black/50 text-white transition-colors"
        aria-label="Next banner"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="overflow-hidden rounded-2xl">
        <div
          ref={trackRef}
          className="flex gap-4"
          style={{
            transform: `translateX(-${offset}px)`,
            transition: transitionEnabled ? `transform ${TRANSITION_MS}ms ease` : 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {displayBanners.map((banner, i) => (
            <div
              key={`${banner.id}-${i}`}
              className="relative flex-shrink-0 rounded-2xl overflow-hidden
                         w-[92vw] sm:w-[55vw] md:w-[45vw] lg:w-[37vw] 2xl:w-[31vw] max-w-[600px]"
            >
              <div className="relative w-full aspect-[4/3] md:aspect-[16/9]">
                <BannerLayerRenderer
                  layers={banner.resolvedLayers}
                  priority={i <= 2}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goToDot(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === activeDot ? '20px' : '6px',
              height: '6px',
              backgroundColor: i === activeDot
                ? '#E91E63'
                : 'rgba(0,0,0,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
