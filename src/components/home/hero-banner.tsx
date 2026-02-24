'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Banner {
  id: string
  titleHtml: string
  subtitleHtml?: string | null
  imageUrl: string
  ctaText: string
  ctaLink: string
  secondaryCtaText?: string | null
  secondaryCtaLink?: string | null
  textPosition: string
  overlayStyle: string
  badgeText?: string | null
}

const FALLBACK_BANNERS: Banner[] = [
  {
    id: 'fallback-1',
    titleHtml: '<strong>Fresh Cakes,</strong><br/>Delivered Today',
    subtitleHtml: 'Handcrafted by local bakers, delivered to your doorstep',
    imageUrl: '',
    ctaText: 'Order Now',
    ctaLink: '/category/cakes',
    textPosition: 'left',
    overlayStyle: 'dark-left',
    badgeText: null,
  },
]

export default function HeroBanner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [loading, setLoading] = useState(true)

  const trackRef = useRef<HTMLDivElement>(null)
  const tileRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const isPausedRef = useRef(false)

  // Keep isPausedRef in sync with isPaused state
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    fetch('/api/banners')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          setBanners(json.data)
        } else {
          setBanners(FALLBACK_BANNERS)
        }
      })
      .catch(() => setBanners(FALLBACK_BANNERS))
      .finally(() => setLoading(false))
  }, [])

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= banners.length) return
      setCurrentIndex(index)
    },
    [banners.length]
  )

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }, [banners.length])

  // Auto-advance every 5s, loops from last back to first
  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      if (isPausedRef.current) return
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  // Compute translate offset from first tile's width
  const getTranslateX = useCallback((): string => {
    const tile = tileRef.current
    if (!tile) return '0px'
    const tileWidth = tile.offsetWidth
    return `-${currentIndex * (tileWidth + 12)}px`
  }, [currentIndex])

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) {
      if (delta > 0 && currentIndex < banners.length - 1) {
        goTo(currentIndex + 1)
      } else if (delta < 0 && currentIndex > 0) {
        goTo(currentIndex - 1)
      }
    }
  }

  if (loading) {
    return (
      <div className="w-full aspect-video bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse rounded-2xl" />
    )
  }

  if (banners.length === 0) return null

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Scrollable track */}
      <div
        ref={trackRef}
        className="flex gap-3"
        style={{
          transform: `translateX(${getTranslateX()})`,
          transition: 'transform 400ms ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            ref={i === 0 ? tileRef : undefined}
            className="relative flex-shrink-0 overflow-hidden rounded-2xl aspect-video
              w-[90vw]
              md:w-[calc((100%-12px)/2.5)]
              lg:w-[calc((100%-24px)/3)]
              xl:w-[calc((100%-36px)/3.5)]
              2xl:w-[calc((100%-48px)/4)]"
          >
            {/* Background image or gradient fallback */}
            {banner.imageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${banner.imageUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600" />
            )}

            {/* Dark gradient overlay: bottom-left to top-right */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />

            {/* Badge */}
            {banner.badgeText && (
              <span className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                {banner.badgeText}
              </span>
            )}

            {/* Text content — anchored bottom-left */}
            <div className="absolute bottom-0 left-0 z-10 p-6 flex flex-col gap-2 max-w-[85%]">
              <h2
                className="text-xl md:text-3xl font-bold text-white leading-tight line-clamp-2"
                dangerouslySetInnerHTML={{ __html: banner.titleHtml ?? '' }}
              />
              {banner.subtitleHtml && (
                <p
                  className="text-sm md:text-base text-white/80 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: banner.subtitleHtml }}
                />
              )}
              <div className="mt-1">
                <Link
                  href={banner.ctaLink}
                  className="inline-block bg-white text-gray-900 font-semibold text-sm px-5 py-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  {banner.ctaText}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Left arrow — hidden on mobile, hidden on first tile */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Right arrow — hidden on mobile, hidden on last tile */}
      {currentIndex < banners.length - 1 && (
        <button
          onClick={() => goTo(currentIndex + 1)}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
