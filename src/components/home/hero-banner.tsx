'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [transitionDisabled, setTransitionDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tileWidth, setTileWidth] = useState(0)

  const firstTileRef = useRef<HTMLDivElement>(null)
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

  // Initialize currentIndex to middle set once banners load
  useEffect(() => {
    if (banners.length > 1) {
      setTransitionDisabled(true)
      setCurrentIndex(banners.length)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionDisabled(false)
        })
      })
    }
  }, [banners.length])

  // Read tile width after mount and on resize
  useEffect(() => {
    const measure = () => {
      if (firstTileRef.current) {
        setTileWidth(firstTileRef.current.offsetWidth)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Handle jump at boundaries
  useEffect(() => {
    if (banners.length <= 1) return

    if (currentIndex === banners.length * 2) {
      setTimeout(() => {
        setTransitionDisabled(true)
        setCurrentIndex(banners.length)
        requestAnimationFrame(() => requestAnimationFrame(() => setTransitionDisabled(false)))
      }, 400)
    }
    if (currentIndex === banners.length - 1) {
      setTimeout(() => {
        setTransitionDisabled(true)
        setCurrentIndex(banners.length * 2 - 1)
        requestAnimationFrame(() => requestAnimationFrame(() => setTransitionDisabled(false)))
      }, 400)
    }
  }, [currentIndex, banners.length])

  // Auto advance
  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      if (!isPaused) setCurrentIndex(prev => prev + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [isPaused, banners.length])

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
        <div className="w-full h-[250px] md:h-[360px] lg:h-[430px] xl:h-[470px] 2xl:h-[485px] bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (banners.length === 0) return null

  return (
    <div
      className="relative px-4 md:px-6 lg:px-8 py-2 h-[250px] md:h-[360px] lg:h-[430px] xl:h-[470px] 2xl:h-[485px]"
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
          className="flex"
          style={{
            gap: '20px',
            transform: `translateX(-${currentIndex * (tileWidth + 20)}px)`,
            transition: transitionDisabled ? 'none' : 'transform 400ms ease',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {displayBanners.map((banner, i) => (
            <div
              key={`${banner.id}-${i}`}
              ref={i === 0 ? firstTileRef : undefined}
              className="relative flex-shrink-0 w-[87vw] sm:w-[80vw] md:w-[67vw] lg:w-[50vw] xl:w-[45vw] 2xl:w-[41vw] h-[250px] md:h-[360px] lg:h-[430px] xl:h-[470px] 2xl:h-[485px] rounded-2xl overflow-hidden"
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

              {/* Layer 1b: Hero/subject image (desktop) */}
              {banner.subjectImageUrl && (
                <div className="absolute right-0 bottom-0 w-[52%] h-full hidden md:flex items-end justify-center z-[1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.subjectImageUrl}
                    alt=""
                    className="h-[90%] w-auto object-contain object-bottom"
                  />
                </div>
              )}

              {/* Layer 1b: Hero/subject image (mobile) */}
              {banner.subjectImageUrl && (
                <div className="absolute right-0 top-0 h-[55%] w-auto flex items-start justify-end z-[1] md:hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.subjectImageUrl}
                    alt=""
                    className="h-full w-auto object-contain object-top pr-2 pt-2"
                  />
                </div>
              )}

              {/* Layer 2: gradient overlay */}
              {banner.subjectImageUrl ? (
                <>
                  <div
                    className="absolute inset-0 z-[2] hidden md:block"
                    style={{
                      background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.1) 60%, transparent 100%)',
                    }}
                  />
                  <div
                    className="absolute inset-0 z-[2] md:hidden"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.1) 65%, transparent 100%)',
                    }}
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent z-[2]" />
              )}

              {/* Badge */}
              {banner.badgeText && (
                <span className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {banner.badgeText}
                </span>
              )}

              {/* Layer 3: text content */}
              <div
                className={`absolute z-10 flex flex-col gap-2 justify-end ${
                  banner.subjectImageUrl
                    ? 'left-0 bottom-0 md:w-[48%] w-full p-6'
                    : 'bottom-0 left-0 p-6 max-w-[85%]'
                }`}
              >
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
