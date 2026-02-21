"use client"

import { useState, useEffect } from "react"
import { ProductCard } from "@/components/product/product-card"
import type { Product, ApiResponse, PaginatedData } from "@/types"

interface YouMayAlsoLikeProps {
  categorySlug: string
  currentProductId: string
}

export function YouMayAlsoLike({ categorySlug, currentProductId }: YouMayAlsoLikeProps) {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    if (!categorySlug) return

    async function fetchRelated() {
      try {
        const res = await fetch(
          `/api/products?categorySlug=${encodeURIComponent(categorySlug)}&pageSize=8&sortBy=rating`
        )
        const json: ApiResponse<PaginatedData<Product>> = await res.json()
        if (json.success && json.data) {
          setProducts(json.data.items.filter((p) => p.id !== currentProductId))
        }
      } catch {
        // silently fail
      }
    }
    fetchRelated()
  }, [categorySlug, currentProductId])

  if (products.length === 0) return null

  return (
    <section>
      <h2 className="font-bold text-xl mb-4">You May Also Like</h2>
      <div className="flex flex-row gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-48 md:w-56">
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
    </section>
  )
}
