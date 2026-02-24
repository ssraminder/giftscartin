'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

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
  }
]

export default function HeroBanner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/banners')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.length > 0) {
          setBanners(json.data)
        } else {
          setBanners(FALLBACK_BANNERS)
        }
      })
      .catch(() => setBanners(FALLBACK_BANNERS))
      .finally(() => setLoading(false))
  }, [])

  const prev = () => setCurrent(i => (i - 1 + banners.length) % banners.length)
  const next = useCallback(() => setCurrent(i => (i + 1) % banners.length), [banners.length])

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [banners.length, next])

  if (loading) {
    return <div className="w-full h-[420px] md:h-[520px] bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse" />
  }

  const banner = banners[current]

  return (
    <div className="relative w-full overflow-hidden">
      {/* Banner slide */}
      <div
        className="relative w-full h-[420px] md:h-[520px] bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: banner.imageUrl
            ? `url(${banner.imageUrl})`
            : undefined,
          backgroundColor: banner.imageUrl ? undefined : '#e91e8c',
        }}
      >
        {/* Gradient fallback when no image */}
        {!banner.imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600" />
        )}

        {/* Overlay */}
        <div className={`absolute inset-0 ${
          banner.overlayStyle === 'dark-right'
            ? 'bg-gradient-to-l from-black/60 via-black/30 to-transparent'
            : banner.overlayStyle === 'full-dark'
            ? 'bg-black/50'
            : 'bg-gradient-to-r from-black/60 via-black/30 to-transparent'
        }`} />

        {/* Content */}
        <div className={`relative z-10 h-full flex flex-col justify-center px-8 md:px-16 ${
          banner.textPosition === 'right'
            ? 'ml-auto max-w-2xl items-end text-right'
            : 'max-w-2xl items-start text-left'
        }`}>
          {banner.badgeText && (
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {banner.badgeText}
            </span>
          )}
          <h2
            className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3"
            dangerouslySetInnerHTML={{ __html: banner.titleHtml ?? '' }}
          />
          {banner.subtitleHtml && (
            <p
              className="text-white/90 text-base md:text-lg mb-6"
              dangerouslySetInnerHTML={{ __html: banner.subtitleHtml }}
            />
          )}
          <div className="flex gap-3 flex-wrap">
            <Link
              href={banner.ctaLink}
              className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              {banner.ctaText}
            </Link>
            {banner.secondaryCtaText && (
              <Link
                href={banner.secondaryCtaLink ?? '#'}
                className="border-2 border-white text-white font-semibold px-6 py-3 rounded-full hover:bg-white/10 transition-colors"
              >
                {banner.secondaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navigation arrows — only show if multiple banners */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
          >
            ›
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
