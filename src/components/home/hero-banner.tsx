"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const SLIDES = [
  {
    gradient: "from-pink-500 via-pink-600 to-purple-700",
    heading: "Fresh Cakes Delivered Today",
    subtext: "Handcrafted by local bakers, delivered to your doorstep",
    cta: "Order Now",
    href: "/category/cakes",
  },
  {
    gradient: "from-green-500 via-emerald-600 to-teal-700",
    heading: "Beautiful Flowers for Every Occasion",
    subtext: "Farm-fresh bouquets arranged with love",
    cta: "Shop Flowers",
    href: "/category/flowers",
  },
  {
    gradient: "from-orange-500 via-amber-600 to-red-700",
    heading: "Midnight Surprise Delivery",
    subtext: "Make their birthday extra special at 12 AM",
    cta: "Book Midnight",
    href: "/category/cakes?slot=midnight",
  },
]

export function HeroBanner() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(next, 4000)
    return () => clearInterval(timer)
  }, [next])

  return (
    <section className="relative w-full h-[240px] md:h-[420px] overflow-hidden">
      {SLIDES.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
          />
          <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                {slide.heading}
              </h2>
              <p className="mt-3 text-lg text-white/90">{slide.subtext}</p>
              <Button
                size="lg"
                className="mt-6 bg-white text-gray-900 hover:bg-gray-100 font-semibold rounded-full px-8"
                asChild
              >
                <Link href={slide.href}>{slide.cta}</Link>
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/20 flex items-center justify-center text-white opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/20 flex items-center justify-center text-white opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === current
                ? "w-7 bg-white"
                : "w-2.5 bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
