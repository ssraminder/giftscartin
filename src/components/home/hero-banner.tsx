"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

const CARDS = [
  {
    title: "Birthday Joy",
    subtitle: "Make their day extra special",
    gradient: "from-pink-400 via-rose-400 to-pink-500",
    accent: "bg-pink-600",
    href: "/category/gifts?occasion=birthday",
    cta: "Send Gifts",
  },
  {
    title: "Anniversaries Made Special",
    subtitle: "Celebrate love with perfect gifts",
    gradient: "from-purple-400 via-violet-400 to-purple-500",
    accent: "bg-purple-600",
    href: "/category/gifts?occasion=anniversary",
    cta: "Shop Now",
  },
  {
    title: "Fresh Cakes Today",
    subtitle: "Handcrafted by local bakers",
    gradient: "from-amber-400 via-orange-400 to-amber-500",
    accent: "bg-amber-600",
    href: "/category/cakes",
    cta: "Order Cakes",
  },
  {
    title: "Beautiful Flowers",
    subtitle: "Farm-fresh bouquets delivered",
    gradient: "from-green-400 via-emerald-400 to-teal-500",
    accent: "bg-emerald-600",
    href: "/category/flowers",
    cta: "Shop Flowers",
  },
  {
    title: "Midnight Surprise",
    subtitle: "Delivered right at 12 AM",
    gradient: "from-indigo-400 via-blue-500 to-indigo-600",
    accent: "bg-indigo-600",
    href: "/category/cakes?slot=midnight",
    cta: "Book Now",
  },
  {
    title: "Same Day Delivery",
    subtitle: "Order before 4 PM, get it today",
    gradient: "from-rose-400 via-pink-500 to-fuchsia-500",
    accent: "bg-fuchsia-600",
    href: "/category/cakes?slot=same-day",
    cta: "Order Now",
  },
]

// How many cards visible at once per breakpoint
const VISIBLE_DESKTOP = 3
const VISIBLE_MOBILE = 1

export function HeroBanner() {
  const [current, setCurrent] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const visible = isMobile ? VISIBLE_MOBILE : VISIBLE_DESKTOP
  const maxIndex = Math.max(0, CARDS.length - visible)

  const next = useCallback(() => {
    setCurrent((prev) => (prev >= maxIndex ? 0 : prev + 1))
  }, [maxIndex])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev <= 0 ? maxIndex : prev - 1))
  }, [maxIndex])

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next])

  return (
    <section className="bg-gray-50 py-4 md:py-6">
      <div className="max-w-7xl mx-auto px-4 relative">
        {/* Card carousel */}
        <div className="overflow-hidden rounded-2xl">
          <div
            className="flex transition-transform duration-500 ease-in-out gap-4"
            style={{
              transform: `translateX(calc(-${current} * (${100 / visible}% + ${current > 0 ? 16 * (visible - 1) / visible : 0}px)))`,
              width: `${(CARDS.length / visible) * 100}%`,
            }}
          >
            {CARDS.map((card, index) => (
              <Link
                key={index}
                href={card.href}
                className="block flex-shrink-0 group"
                style={{ width: `calc(${100 / CARDS.length * visible}% - ${16 * (visible - 1) / visible}px)` }}
              >
                <div
                  className={`relative bg-gradient-to-br ${card.gradient} rounded-2xl overflow-hidden h-[200px] md:h-[260px] p-6 flex flex-col justify-end transition-transform duration-300 group-hover:scale-[1.02]`}
                >
                  {/* Decorative circles */}
                  <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-white/10" />
                  <div className="absolute top-12 right-12 w-16 h-16 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-black/5" />

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-sm text-white/80">{card.subtitle}</p>
                    <span className={`inline-block mt-3 px-4 py-1.5 ${card.accent} text-white text-xs font-semibold rounded-full group-hover:shadow-lg transition-shadow`}>
                      {card.cta}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        {current > 0 && (
          <button
            onClick={prev}
            className="absolute left-1 md:left-0 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {current < maxIndex && (
          <button
            onClick={next}
            className="absolute right-1 md:right-0 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2 rounded-full transition-all ${
                index === current
                  ? "w-6 bg-[#E91E63]"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
