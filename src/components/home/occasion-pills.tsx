"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

const OCCASIONS = [
  { emoji: "\u{1F382}", label: "Birthday", slug: "birthday", bg: "bg-pink-100", ring: "ring-pink-200" },
  { emoji: "\u{1F48D}", label: "Anniversary", slug: "anniversary", bg: "bg-purple-100", ring: "ring-purple-200" },
  { emoji: "\u26A1", label: "Same Day", slug: "same-day", bg: "bg-amber-100", ring: "ring-amber-200" },
  { emoji: "\u{1F490}", label: "Flowers", slug: "flowers", bg: "bg-green-100", ring: "ring-green-200", isCategory: true },
  { emoji: "\u{1F382}", label: "Cakes", slug: "cakes", bg: "bg-rose-100", ring: "ring-rose-200", isCategory: true },
  { emoji: "\u{1F381}", label: "Combos", slug: "combos", bg: "bg-violet-100", ring: "ring-violet-200", isCategory: true },
  { emoji: "\u{1F49D}", label: "Valentine", slug: "valentines-day", bg: "bg-red-100", ring: "ring-red-200" },
  { emoji: "\u{1F492}", label: "Wedding", slug: "wedding", bg: "bg-orange-100", ring: "ring-orange-200" },
  { emoji: "\u{1F331}", label: "Plants", slug: "plants", bg: "bg-lime-100", ring: "ring-lime-200", isCategory: true },
  { emoji: "\u{1F389}", label: "Party", slug: "party", bg: "bg-fuchsia-100", ring: "ring-fuchsia-200" },
  { emoji: "\u{1F4BC}", label: "Corporate", slug: "corporate", bg: "bg-blue-100", ring: "ring-blue-200" },
  { emoji: "\u{1F393}", label: "Graduation", slug: "graduation", bg: "bg-teal-100", ring: "ring-teal-200" },
]

export function OccasionPills() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true })
      return () => el.removeEventListener("scroll", checkScroll)
    }
  }, [])

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" })
  }

  return (
    <section className="py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4 relative">
        {/* Section header */}
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-5 text-center">
          What are you looking for?
        </h2>

        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 translate-y-2 z-10 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors hidden md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Scrollable row of circles */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-1 md:px-8 py-1"
        >
          {OCCASIONS.map((item) => {
            const href = item.isCategory
              ? `/category/${item.slug}`
              : item.slug === "same-day"
                ? "/category/cakes?slot=same-day"
                : `/category/gifts?occasion=${item.slug}`

            return (
              <Link
                key={item.slug}
                href={href}
                className="flex-shrink-0 flex flex-col items-center gap-2 group w-[72px] md:w-[80px]"
              >
                <div
                  className={`w-16 h-16 md:w-[72px] md:h-[72px] rounded-full ${item.bg} ring-2 ${item.ring} flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md group-hover:ring-[#E91E63]/40`}
                >
                  <span className="text-2xl md:text-3xl">{item.emoji}</span>
                </div>
                <span className="text-[11px] md:text-xs text-gray-700 font-medium text-center leading-tight group-hover:text-[#E91E63] transition-colors">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 translate-y-2 z-10 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors hidden md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  )
}
