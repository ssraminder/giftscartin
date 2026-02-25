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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [transitionDisabled, setTransitionDisabled] = useState(false)
  const [loading, setLoading] = useState(true)

  const tileWidthRef = useRef(0)
  const isPausedRef = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)
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

  // Sync isPausedRef with isPaused state
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

  // Initialize currentIndex to middle set once banners load
  useEffect(() => {
    if (banners.length > 0) {
      setCurrentIndex(banners.length)
    }
  }, [banners.length])

  const measure = useCallback(() => {
    if (trackRef.current && trackRef.current.children.length > 0) {
      const firstTile = trackRef.current.children[0] as HTMLElement
      tileWidthRef.current = firstTile.offsetWidth
    }
  }, [])

  // Measure on mount, on banners change, and on resize
  useEffect(() => { measure() }, [banners, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Handle jump at boundaries (infinite loop)
  useEffect(() => {
    const len = banners.length
    if (len === 0) return

    if (currentIndex >= len * 2) {
      const timer = setTimeout(() => {
        setTransitionDisabled(true)
        setCurrentIndex(len)
        requestAnimationFrame(() => requestAnimationFrame(() => setTransitionDisabled(false)))
      }, 410)
      return () => clearTimeout(timer)
    }
    if (currentIndex <= len - 1) {
      const timer = setTimeout(() => {
        setTransitionDisabled(true)
        setCurrentIndex(len * 2 - 1)
        requestAnimationFrame(() => requestAnimationFrame(() => setTransitionDisabled(false)))
      }, 410)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, banners.length])

  // Auto advance — 3 second interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPausedRef.current) return
      setCurrentIndex(prev => prev + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Build display list: triple for infinite loop, or original for single banner
  const displayBanners = banners.length > 1
    ? [...banners, ...banners, ...banners]
    : banners

  const activeDot = banners.length > 0 ? currentIndex % banners.length : 0

  const goNext = useCallback(() => setCurrentIndex(prev => prev + 1), [])
  const goPrev = useCallback(() => setCurrentIndex(prev => prev - 1), [])

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

  if (loading) {
    return (
      <div className="px-4 md:px-6 lg:px-8 py-2">
        <div className="w-full h-[232px] md:h-[335px] lg:h-[400px] xl:h-[437px] 2xl:h-[451px] bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (banners.length === 0) return null

  // Single banner — no carousel
  if (banners.length === 1) {
    return (
      <div className="px-4 md:px-6 lg:px-8 py-2">
        <BannerLayerRenderer
          layers={banners[0].resolvedLayers}
          priority={true}
          className="w-full rounded-2xl"
        />
      </div>
    )
  }

  return (
    <div
      className="relative px-4 md:px-6 lg:px-8 py-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left arrow */}
      <button
        onClick={goPrev}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Right arrow */}
      <button
        onClick={goNext}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="overflow-hidden rounded-2xl">
        <div
          ref={trackRef}
          className="flex"
          style={{
            gap: '20px',
            transform: `translateX(-${currentIndex * (tileWidthRef.current + 20)}px)`,
            transition: transitionDisabled ? 'none' : 'transform 400ms ease',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {displayBanners.map((banner, i) => (
            <div
              key={`${banner.id}-${i}`}
              className="relative flex-shrink-0 w-[87vw] sm:w-[80vw] md:w-[67vw] lg:w-[50vw] xl:w-[45vw] 2xl:w-[41vw]"
            >
              <BannerLayerRenderer
                layers={banner.resolvedLayers}
                priority={i === 0}
                className="rounded-2xl"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-3">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(banners.length + i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === activeDot ? 'bg-pink-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
