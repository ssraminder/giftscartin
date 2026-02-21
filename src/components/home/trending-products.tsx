"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowRight, ChefHat, Clock, HeadphonesIcon, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
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
    description: "Every cake and bouquet is prepared fresh on the day of delivery",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Clock,
    title: "On-Time Delivery",
    description: "We guarantee delivery in your chosen time slot, every time",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "Not satisfied? Get a full refund or replacement — no questions asked",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description: "Our friendly team is always here to help with your orders",
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}

function TrendingProductsInner() {
  const [showAll, setShowAll] = useState(false)
  const { citySlug } = useCity()
  const { partner } = usePartner()

  const vendorParam = partner?.defaultVendorId ? `&vendorId=${partner.defaultVendorId}` : ""
  const url = `/api/products?sortBy=rating&pageSize=10${citySlug ? `&citySlug=${citySlug}` : ""}${vendorParam}`

  const { data, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute cache
  })

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="section-title">Bestsellers</h2>
            <p className="mt-4 text-muted-foreground">
              Our most popular picks this week
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  const products: Product[] = data?.data?.items || data?.data || []
  const displayedProducts = showAll ? products : products.slice(0, 8)

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="section-title">Bestsellers</h2>
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-10">
          No products available yet. Check back soon!
        </p>
      )}

      {!showAll && products.length > 8 && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
            className="rounded-xl border-2 border-pink-200 text-[#E91E63] hover:bg-pink-50 px-8"
            onClick={() => setShowAll(true)}
          >
            Load More
          </Button>
        </div>
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
