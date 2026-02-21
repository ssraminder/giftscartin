"use client"

import { useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { ProductCard } from "@/components/product/product-card"
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton"
import { CityGate } from "@/components/providers/city-gate"
import { useCity } from "@/hooks/use-city"
import { usePartner } from "@/hooks/use-partner"
import type { Product } from "@/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function TrendingSkeleton() {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="h-7 w-48 bg-gray-200 rounded animate-shimmer" />
            <div className="mt-3 h-4 w-64 bg-gray-200 rounded animate-shimmer" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-52 md:w-60">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
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
      <section className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                Today&apos;s Best Sellers
              </h2>
              <p className="mt-2 text-sm text-gray-500">
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
        </div>
      </section>
    )
  }

  const products: Product[] = data?.data?.items || data?.data || []

  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Today&apos;s Best Sellers
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Our most popular picks this week
            </p>
          </div>
          <Link
            href="/category/cakes"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-pink-600 hover:underline"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => scroll("left")}
              className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>

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

            <button
              onClick={() => scroll("right")}
              className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-10">
            No products available yet. Check back soon!
          </p>
        )}

        <div className="mt-4 text-center sm:hidden">
          <Link
            href="/category/cakes"
            className="inline-flex items-center gap-1 text-sm font-semibold text-pink-600"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export function TrendingProducts() {
  return (
    <CityGate fallback={<TrendingSkeleton />}>
      <TrendingProductsInner />
    </CityGate>
  )
}
