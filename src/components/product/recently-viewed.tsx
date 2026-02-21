"use client"

import { useState, useEffect, useCallback } from "react"
import { ProductCard } from "@/components/product/product-card"

const STORAGE_KEY = "recently_viewed"
const MAX_ITEMS = 8

interface RecentProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  images: string[]
  avgRating?: number
  totalReviews?: number
  weight?: string | null
  tags?: string[]
}

function getStoredProducts(): RecentProduct[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function storeProducts(products: RecentProduct[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products.slice(0, MAX_ITEMS)))
  } catch {
    // storage full or unavailable
  }
}

export function addRecentlyViewed(product: RecentProduct) {
  const existing = getStoredProducts()
  const filtered = existing.filter((p) => p.id !== product.id)
  storeProducts([product, ...filtered])
}

interface RecentlyViewedProps {
  excludeProductId?: string
}

export function RecentlyViewed({ excludeProductId }: RecentlyViewedProps) {
  const [products, setProducts] = useState<RecentProduct[]>([])

  const loadProducts = useCallback(() => {
    const stored = getStoredProducts()
    const filtered = excludeProductId
      ? stored.filter((p) => p.id !== excludeProductId)
      : stored
    setProducts(filtered)
  }, [excludeProductId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  if (products.length < 2) return null

  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="font-bold text-xl mb-4">Recently Viewed</h2>
        <div className="flex flex-row gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-48 md:w-56">
              <ProductCard
                id={product.id}
                name={product.name}
                slug={product.slug}
                basePrice={product.basePrice}
                images={product.images}
                avgRating={product.avgRating}
                totalReviews={product.totalReviews}
                weight={product.weight ?? undefined}
                tags={product.tags}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
