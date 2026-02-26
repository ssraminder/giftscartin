'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Update these dates each season or eventually pull from DB/delivery_surcharges table
const UPCOMING_OCCASIONS: Record<string, string> = {
  holi: 'Mar 14',
  'womens-day': '8th Mar',
  'mothers-day': 'May 11',
  'fathers-day': 'Jun 15',
}

const occasions = [
  {
    id: 'same-day',
    label: 'Same Day',
    href: '/products?sameDay=true',
    emoji: '🛵',
    iconBg: 'bg-amber-100',
    highlight: true,
  },
  {
    id: 'birthday',
    label: 'Birthday',
    href: '/products?occasion=birthday',
    emoji: '🎂',
    iconBg: 'bg-pink-100',
  },
  {
    id: 'anniversary',
    label: 'Anniversary',
    href: '/products?occasion=anniversary',
    emoji: '💍',
    iconBg: 'bg-rose-100',
  },
  {
    id: 'holi',
    label: 'Holi',
    href: '/products?occasion=holi',
    emoji: '🎨',
    iconBg: 'bg-purple-100',
    badge: UPCOMING_OCCASIONS['holi'],
  },
  {
    id: 'womens-day',
    label: "Women's Day",
    href: '/products?occasion=womens-day',
    emoji: '💜',
    iconBg: 'bg-violet-100',
    badge: UPCOMING_OCCASIONS['womens-day'],
  },
  {
    id: 'wedding',
    label: 'Wedding',
    href: '/products?occasion=wedding',
    emoji: '💒',
    iconBg: 'bg-orange-100',
  },
  {
    id: 'graduation',
    label: 'Graduation',
    href: '/products?occasion=graduation',
    emoji: '🎓',
    iconBg: 'bg-blue-100',
  },
  {
    id: 'new-baby',
    label: 'New Baby',
    href: '/products?occasion=new-baby',
    emoji: '🍼',
    iconBg: 'bg-sky-100',
  },
  {
    id: 'cakes',
    label: 'Cakes',
    href: '/category/cakes',
    emoji: '🎂',
    iconBg: 'bg-amber-100',
  },
  {
    id: 'flowers',
    label: 'Flowers',
    href: '/category/flowers',
    emoji: '💐',
    iconBg: 'bg-green-100',
  },
  {
    id: 'plants',
    label: 'Plants',
    href: '/category/plants',
    emoji: '🌿',
    iconBg: 'bg-emerald-100',
  },
  {
    id: 'corporate',
    label: 'Corporate',
    href: '/products?occasion=corporate',
    emoji: '💼',
    iconBg: 'bg-slate-200',
  },
]

export function OccasionNav() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [tileStep, setTileStep] = useState(0)
  const [visibleCount, setVisibleCount] = useState(0)
  const [maxOffset, setMaxOffset] = useState(0)

  // Measure tile sizes and how many fit
  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const firstTile = el.querySelector('a') as HTMLElement | null
    if (!firstTile) return
    const gap = parseFloat(getComputedStyle(el).columnGap) || 20
    const tileW = firstTile.offsetWidth
    const step = tileW + gap
    const containerW = el.clientWidth
    const visible = Math.floor(containerW / step) || 1
    const total = occasions.length
    const max = Math.max(0, total - visible)
    setTileStep(step)
    setVisibleCount(visible)
    // Clamp current offset if container resized
    if (offset > max) setOffset(max)
    setMaxOffset(max)
  }, [offset])

  useEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [measure])

  const canScrollLeft = offset > 0
  const canScrollRight = offset < maxOffset

  const scrollLeft = () => setOffset((o) => Math.max(0, o - visibleCount))
  const scrollRight = () => setOffset((o) => Math.min(maxOffset, o + visibleCount))

  // Touch swipe support
  const touchStartX = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(dx) > 40) {
      if (dx > 0) setOffset((o) => Math.min(maxOffset, o + 1))
      else setOffset((o) => Math.max(0, o - 1))
    }
  }

  const translateX = -(offset * tileStep)

  return (
    <section className="w-full py-4 md:py-6 lg:py-8">
      {/* Desktop: arrows | tiles | arrows layout. Mobile: just padded tiles */}
      <div className="flex items-center px-4 md:px-2 lg:px-3">
        {/* Left arrow — desktop only, own column */}
        <div className="hidden md:flex flex-shrink-0 w-10 lg:w-12 items-center justify-center">
          {canScrollLeft ? (
            <button
              onClick={scrollLeft}
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-white shadow-lg border border-gray-200
                         flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <div className="w-9 h-9 lg:w-10 lg:h-10" />
          )}
        </div>

        {/* Overflow-hidden container — no peeking */}
        <div
          ref={containerRef}
          className="flex-1 min-w-0 overflow-hidden pt-3 lg:pt-4 pb-3 lg:pb-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex gap-4 md:gap-5 lg:gap-6 transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(${translateX}px)` }}
          >
            {occasions.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex-shrink-0 group"
              >
                <div className="flex flex-col items-center gap-1.5 md:gap-2 lg:gap-2.5 w-[72px] md:w-[110px] lg:w-[140px]">
                  {/* Card */}
                  <div
                    className={`
                      relative w-[64px] h-[64px] md:w-[96px] md:h-[96px] lg:w-[128px] lg:h-[128px]
                      rounded-2xl lg:rounded-3xl flex items-center justify-center
                      ${item.iconBg}
                      transition-all duration-200
                      group-hover:scale-105 group-hover:shadow-md
                      ${item.highlight ? 'ring-2 ring-pink-400 ring-offset-1 lg:ring-offset-2' : ''}
                    `}
                  >
                    <span className="text-[28px] md:text-[40px] lg:text-[52px] select-none leading-none">
                      {item.emoji}
                    </span>

                    {/* Upcoming date badge */}
                    {item.badge && (
                      <div className="absolute -top-2.5 lg:-top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="bg-pink-500 text-white text-[9px] md:text-[10px] lg:text-xs font-semibold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full shadow-sm">
                          {item.badge}
                        </span>
                      </div>
                    )}

                    {/* Fast badge for same-day */}
                    {item.highlight && (
                      <div className="absolute -bottom-2 lg:-bottom-3 left-1/2 -translate-x-1/2">
                        <span className="bg-amber-400 text-amber-900 text-[8px] md:text-[9px] lg:text-[11px] font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full shadow-sm whitespace-nowrap uppercase tracking-wide">
                          Fast
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <span className="text-[11px] md:text-sm lg:text-base text-center text-gray-600 font-medium leading-tight line-clamp-2 group-hover:text-pink-600 transition-colors">
                    {item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right arrow — desktop only, own column */}
        <div className="hidden md:flex flex-shrink-0 w-10 lg:w-12 items-center justify-center">
          {canScrollRight ? (
            <button
              onClick={scrollRight}
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-white shadow-lg border border-gray-200
                         flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <div className="w-9 h-9 lg:w-10 lg:h-10" />
          )}
        </div>
      </div>
    </section>
  )
}
