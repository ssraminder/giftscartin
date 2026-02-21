"use client"

import { useEffect, useState, useCallback } from "react"
import { useCity } from "@/hooks/use-city"
import { ProductCard } from "@/components/product/product-card"
import { Zap, Clock } from "lucide-react"

interface SameDayProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  images: string[]
  avgRating: number
  totalReviews: number
  weight: string | null
  tags: string[]
  isSameDayEligible: boolean
  category: { id: string; name: string; slug: string }
}

interface CategoryFilter {
  slug: string
  name: string
}

export default function SameDayPage() {
  const { citySlug, cityName } = useCity()
  const [products, setProducts] = useState<SameDayProduct[]>([])
  const [cutoffTime, setCutoffTime] = useState<string | null>(null)
  const [sameDayClosed, setSameDayClosed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState("")
  const [displayCity, setDisplayCity] = useState("")

  // Extract unique categories from products
  const categories: CategoryFilter[] = []
  const seen = new Set<string>()
  for (const p of products) {
    if (!seen.has(p.category.slug)) {
      seen.add(p.category.slug)
      categories.push({ slug: p.category.slug, name: p.category.name })
    }
  }

  const fetchProducts = useCallback(async () => {
    if (!citySlug) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ city: citySlug })
      if (categoryFilter) params.set("category", categoryFilter)
      const res = await fetch(`/api/products/same-day?${params}`)
      const json = await res.json()
      if (json.success) {
        setProducts(json.data.products)
        setCutoffTime(json.data.cutoffTime)
        setSameDayClosed(json.data.sameDayClosed)
        setDisplayCity(json.data.city)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [citySlug, categoryFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = categoryFilter
    ? products.filter((p) => p.category.slug === categoryFilter)
    : products

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-full bg-amber-100 p-2">
            <Zap className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Same Day Delivery — {displayCity || cityName || "Select City"}
          </h1>
        </div>

        {sameDayClosed ? (
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <Clock className="h-4 w-4 flex-shrink-0" />
            Same day ordering has closed for today. Showing tomorrow&apos;s availability.
          </div>
        ) : cutoffTime ? (
          <p className="text-slate-600">
            Order before <span className="font-semibold text-amber-700">{cutoffTime}</span> for delivery today
          </p>
        ) : null}
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !categoryFilter
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setCategoryFilter(cat.slug)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                categoryFilter === cat.slug
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">
            {!citySlug
              ? "Please select a city to see same-day delivery options"
              : "No same-day delivery products available right now"}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {citySlug ? "Check back tomorrow or try a different category" : ""}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              basePrice={product.basePrice}
              images={product.images}
              avgRating={product.avgRating}
              totalReviews={product.totalReviews}
              weight={product.weight ?? undefined}
              tags={product.tags}
              deliveryBadge="same-day"
            />
          ))}
        </div>
      )}
    </div>
  )
}
