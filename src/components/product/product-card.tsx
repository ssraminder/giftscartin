"use client"

import Image from "next/image"
import Link from "next/link"
import { Star, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/hooks/use-cart"
import type { Product } from "@/types"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCart((s) => s.addItem)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product)
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
        <Image
          src={product.images[0] || "/placeholder-product.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {product.isVeg && (
          <Badge
            variant="success"
            className="absolute left-2 top-2 text-[10px] px-1.5 py-0"
          >
            VEG
          </Badge>
        )}
        {product.tags.includes("bestseller") && (
          <Badge
            variant="accent"
            className="absolute right-2 top-2 text-[10px] px-1.5 py-0"
          >
            Bestseller
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {product.weight && (
          <p className="mt-0.5 text-xs text-muted-foreground">{product.weight}</p>
        )}

        {/* Rating */}
        {product.totalReviews > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <div className="flex items-center gap-0.5 rounded bg-green-600 px-1 py-0.5">
              <Star className="h-2.5 w-2.5 fill-white text-white" />
              <span className="text-[10px] font-semibold text-white">
                {product.avgRating.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              ({product.totalReviews})
            </span>
          </div>
        )}

        {/* Price + Add to Cart */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-foreground">
            {formatPrice(product.basePrice)}
          </span>
          <Button
            size="sm"
            variant="default"
            className="h-8 w-8 rounded-full p-0 shrink-0"
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Link>
  )
}
