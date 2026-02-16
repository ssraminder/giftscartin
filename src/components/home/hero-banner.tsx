"use client"

import Link from "next/link"
import { ArrowRight, Clock, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white" />
        <div className="absolute -right-10 top-10 h-48 w-48 rounded-full bg-white" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-white" />
      </div>

      <div className="container relative mx-auto px-4 py-12 md:py-20 lg:py-24">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-medium text-white backdrop-blur-sm">
            Now delivering in Chandigarh
          </span>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Make Every{" "}
            <span className="text-yellow-300">Celebration</span>{" "}
            Special
          </h1>

          <p className="mt-4 text-base text-pink-100 sm:text-lg md:text-xl">
            Fresh cakes, beautiful flowers &amp; thoughtful gifts delivered to
            your loved ones. Same-day &amp; midnight delivery available.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="bg-white text-pink-600 hover:bg-pink-50 font-semibold"
              asChild
            >
              <Link href="/category/cakes">
                Order Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/category/flowers">
                Send Flowers
              </Link>
            </Button>
          </div>

          {/* USP pills */}
          <div className="mt-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur-sm">
              <Truck className="h-4 w-4" />
              <span>Free Delivery above ₹499</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur-sm">
              <Clock className="h-4 w-4" />
              <span>Same Day & Midnight Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
