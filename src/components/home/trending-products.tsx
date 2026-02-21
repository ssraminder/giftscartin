"use client"

import { useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ArrowRight,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock,
  HeadphonesIcon,
  RotateCcw,
} from "lucide-react"

import { ProductCard } from "@/components/product/product-card"
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton"
import { CityGate } from "@/components/providers/city-gate"
import { useCity } from "@/hooks/use-city"
import { usePartner } from "@/hooks/use-partner"
import type { Product } from "@/types"

const WHY_CHOOSE = [
  {
    icon: ChefHat,
    title: "Freshly Prepared",
    description:
      "Every cake and bouquet is prepared fresh on the day of delivery",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Clock,
    title: "On-Time Delivery",
    description:
      "We guarantee delivery in your chosen time slot, every time",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description:
      "Not satisfied? Get a full refund or replacement — no questions asked",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description:
      "Our friendly team is always here to help with your orders",
    color: "bg-purple-50 text-purple-600",
  },
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function TrendingSkeleton() {
  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded animate-shimmer" />
          <div className="mt-4 h-4 w-64 bg-gray-200 rounded animate-shimmer" />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-52 md:w-60">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  )
}

function TrendingProductsInner() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { citySlug } = useCity()
  const { partner } = usePartner()

  const vendorParam = partner?.defaultVendorId
    ? `&vendorId=${partner.defaultVendorId}`
    : ""
  const url = `/api/products?sortBy=rating&pageSize=10${citySlug ? `&citySlug=${citySlug}` : ""}${vendorParam}`

  const { data, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const scrollAmount = 260
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="section-title">Today&apos;s Best Sellers</h2>
            <p className="mt-4 text-muted-foreground">
              Our most popular picks this week
            </p>
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-52 md:w-60">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    )
  }

  const products: Product[] = data?.data?.items || data?.data || []

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      {/* Section header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="section-title">Today&apos;s Best Sellers</h2>
          <p className="mt-4 text-muted-foreground">
            Our most popular picks this week
          </p>
        </div>
        <Link
          href="/category/cakes"
          className="hidden sm:flex items-center gap-1 text-sm font-semibold text-[#E91E63] hover:underline"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="relative">
          {/* Left arrow — desktop only */}
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>

          {/* Scroll row */}
          <div
            ref={scrollRef}
            className="flex flex-row gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-52 md:w-60 snap-start"
              >
                <ProductCard
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  basePrice={Number(product.basePrice)}
                  images={product.images}
                  avgRating={product.avgRating}
                  totalReviews={product.totalReviews}
                  weight={product.weight ?? undefined}
                  tags={product.tags}
                />
              </div>
            ))}
          </div>

          {/* Right arrow — desktop only */}
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-10">
          No products available yet. Check back soon!
        </p>
      )}

      {/* Mobile View All */}
      <div className="mt-6 text-center sm:hidden">
        <Link
          href="/category/cakes"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#E91E63]"
        >
          View All Products
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

export function TrendingProducts() {
  return (
    <>
      <CityGate fallback={<TrendingSkeleton />}>
        <TrendingProductsInner />
      </CityGate>

      {/* Why Choose Gifts Cart India */}
      <section className="bg-gradient-to-b from-[#FFF5F0] to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="section-title">Why Choose Gifts Cart India?</h2>
            <p className="mt-4 text-muted-foreground">
              We go above and beyond to make your celebrations perfect
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {WHY_CHOOSE.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="card-premium p-5 sm:p-6 text-center group hover-lift"
                >
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${item.color} mb-4 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground sm:text-base">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
