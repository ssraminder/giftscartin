"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, ChefHat, Clock, HeadphonesIcon, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductCard } from "@/components/product/product-card"
import { useCity } from "@/hooks/use-city"
import type { Product, ApiResponse, PaginatedData } from "@/types"

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

function ProductCardSkeleton() {
  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  )
}

export function TrendingProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const { citySlug } = useCity()

  useEffect(() => {
    async function fetchTrending() {
      try {
        const params = new URLSearchParams({ sortBy: "rating", pageSize: "10" })
        if (citySlug) params.set("citySlug", citySlug)
        const res = await fetch(`/api/products?${params.toString()}`)
        const json: ApiResponse<PaginatedData<Product>> = await res.json()
        if (json.success && json.data) {
          setProducts(json.data.items)
        }
      } catch {
        // Fetch failed silently
      } finally {
        setLoading(false)
      }
    }
    fetchTrending()
  }, [citySlug])

  const displayedProducts = showAll ? products : products.slice(0, 8)

  return (
    <>
      {/* Bestsellers Section */}
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

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
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

        {!loading && !showAll && products.length > 8 && (
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
