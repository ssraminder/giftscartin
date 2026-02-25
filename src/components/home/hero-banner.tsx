'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Banner {
  id: string
  titleHtml: string
  subtitleHtml?: string | null
  imageUrl: string
  subjectImageUrl?: string | null
  ctaText: string
  ctaLink: string
  secondaryCtaText?: string | null
  secondaryCtaLink?: string | null
  textPosition: string
  overlayStyle: string
  badgeText?: string | null
  contentWidth?: string
  titleSize?: string
  subtitleSize?: string
  verticalAlign?: string
  heroSize?: string
  contentPadding?: string
  contentX?: number
  contentY?: number
  contentW?: number
  contentH?: number
  heroX?: number
  heroY?: number
  heroW?: number
  heroH?: number
}

// ---- Sizing maps ----

const TITLE_SIZE_MAP: Record<string, string> = { sm: '1.25rem', md: '1.75rem', lg: '2.25rem', xl: '2.75rem', '2xl': '3.5rem' }
const SUBTITLE_SIZE_MAP: Record<string, string> = { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.25rem' }
const PADDING_MAP: Record<string, string> = { tight: '1rem', normal: '2rem', spacious: '3rem' }

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

// ---- Overlay helpers ----

function getOverlayCss(overlayStyle: string): React.CSSProperties | null {
  switch (overlayStyle) {
    case 'none':
      return null
    case 'dark-left':
      return { background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }
    case 'dark-right':
      return { background: 'linear-gradient(to left, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }
    case 'full-dark':
      return { background: 'rgba(0,0,0,0.6)' }
    case 'light-left':
      return { background: 'linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }
    case 'light-right':
      return { background: 'linear-gradient(to left, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }
    case 'full-light':
      return { background: 'rgba(255,255,255,0.75)' }
    default:
      return { background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }
  }
}

function isLightOverlay(style: string): boolean {
  return style.startsWith('light-') || style === 'full-light'
}

export default function HeroBanner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [transitionDisabled, setTransitionDisabled] = useState(false)
  const [loading, setLoading] = useState(true)

  const tileWidthRef = useRef(0)
  const isPausedRef = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)

  // Fetch banners
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
  useEffect(() => {
    measure()
  }, [banners, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Handle jump at boundaries
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

  // Auto advance — no dependencies, refs handle freshness
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

  return (
    <div
      className="relative px-4 md:px-6 lg:px-8 py-2 h-[232px] md:h-[335px] lg:h-[400px] xl:h-[437px] 2xl:h-[451px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left arrow */}
      {banners.length > 1 && (
        <button
          onClick={goPrev}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Right arrow */}
      {banners.length > 1 && (
        <button
          onClick={goNext}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

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
          {displayBanners.map((banner, i) => {
            const isNone = banner.overlayStyle === 'none'
            const light = isLightOverlay(banner.overlayStyle)
            const textColor = isNone ? '#ffffff' : light ? '#1a1a1a' : '#ffffff'
            const badgeBg = isNone ? 'rgba(255,255,255,0.2)' : light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)'
            const titleFontSize = TITLE_SIZE_MAP[banner.titleSize ?? 'lg'] ?? '2.25rem'
            const subtitleFontSize = SUBTITLE_SIZE_MAP[banner.subtitleSize ?? 'sm'] ?? '0.875rem'
            const padding = PADDING_MAP[banner.contentPadding ?? 'normal'] ?? '2rem'

            // Coordinate-based positioning (fallback to legacy values)
            const cX = banner.contentX ?? 5
            const cY = banner.contentY ?? 50
            const cW = banner.contentW ?? 55
            const cH = banner.contentH ?? 80
            const hX = banner.heroX ?? 55
            const hY = banner.heroY ?? 10
            const hW = banner.heroW ?? 40
            const hH = banner.heroH ?? 85

            const overlayCss = getOverlayCss(banner.overlayStyle)

            return (
            <div
              key={`${banner.id}-${i}`}
              className="relative flex-shrink-0 w-[87vw] sm:w-[80vw] md:w-[67vw] lg:w-[50vw] xl:w-[45vw] 2xl:w-[41vw] h-[232px] md:h-[335px] lg:h-[400px] xl:h-[437px] 2xl:h-[451px] rounded-2xl overflow-hidden"
            >
              {/* Layer 1: background image */}
              {banner.imageUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${banner.imageUrl})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600" />
              )}

              {/* Layer 2: gradient overlay */}
              {overlayCss && (
                <div className="absolute inset-0 z-[2]" style={overlayCss} />
              )}

              {/* Layer 3: Hero/subject image (desktop — coordinate positioned) */}
              {banner.subjectImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={banner.subjectImageUrl}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                  className="absolute hidden md:block"
                  style={{
                    left: `${hX}%`,
                    top: `${hY}%`,
                    width: `${hW}%`,
                    height: `${hH}%`,
                    objectFit: 'contain',
                    objectPosition: 'bottom center',
                    zIndex: 3,
                  }}
                />
              )}

              {/* Layer 3b: Hero/subject image (mobile) */}
              {banner.subjectImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={banner.subjectImageUrl}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                  className="absolute right-0 top-0 h-[55%] w-auto object-contain object-top pr-2 pt-2 md:hidden"
                  style={{ zIndex: 3 }}
                />
              )}

              {/* Mobile: bottom-to-top gradient for readability */}
              {banner.subjectImageUrl && !isNone && (
                <div
                  className="absolute inset-0 z-[4] md:hidden"
                  style={{
                    background: light
                      ? 'linear-gradient(to top, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0.1) 65%, transparent 100%)'
                      : 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.1) 65%, transparent 100%)',
                  }}
                />
              )}

              {/* Layer 4: text content (desktop — coordinate positioned) */}
              <div
                className="absolute z-10 hidden md:flex flex-col justify-center overflow-hidden"
                style={{
                  left: `${cX}%`,
                  top: `${cY}%`,
                  width: `${cW}%`,
                  height: `${cH}%`,
                  padding,
                  textAlign: banner.textPosition === 'right' ? 'right' : banner.textPosition === 'center' ? 'center' : 'left',
                }}
              >
                {banner.badgeText && (
                  <span
                    className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-2 backdrop-blur-sm"
                    style={{ color: textColor, backgroundColor: badgeBg }}
                  >
                    {banner.badgeText}
                  </span>
                )}
                <h2
                  className="font-bold leading-tight line-clamp-2"
                  style={{ color: textColor, fontSize: titleFontSize }}
                  dangerouslySetInnerHTML={{ __html: banner.titleHtml ?? '' }}
                />
                {banner.subtitleHtml && (
                  <p
                    className="mt-2 line-clamp-2"
                    style={{ color: textColor, opacity: 0.75, fontSize: subtitleFontSize }}
                    dangerouslySetInnerHTML={{ __html: banner.subtitleHtml }}
                  />
                )}
                <div className="mt-3">
                  <Link
                    href={banner.ctaLink}
                    className={`inline-block font-semibold text-sm px-5 py-2 rounded-full transition-colors ${
                      light && !isNone
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {banner.ctaText}
                  </Link>
                </div>
              </div>

              {/* Layer 4: text content (mobile — simpler bottom-aligned) */}
              <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 md:hidden">
                <div className="max-w-[85%]">
                  {banner.badgeText && (
                    <span
                      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1"
                      style={{ color: textColor, backgroundColor: badgeBg }}
                    >
                      {banner.badgeText}
                    </span>
                  )}
                  <h2
                    className="text-xl font-bold leading-tight line-clamp-2"
                    style={{ color: textColor }}
                    dangerouslySetInnerHTML={{ __html: banner.titleHtml ?? '' }}
                  />
                  {banner.subtitleHtml && (
                    <p
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: textColor, opacity: 0.75 }}
                      dangerouslySetInnerHTML={{ __html: banner.subtitleHtml }}
                    />
                  )}
                  <div className="mt-2">
                    <Link
                      href={banner.ctaLink}
                      className={`inline-block font-semibold text-xs px-4 py-1.5 rounded-full transition-colors ${
                        light && !isNone
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {banner.ctaText}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>

      {/* Dot indicators */}
      {banners.length > 1 && (
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
      )}
    </div>
  )
}
