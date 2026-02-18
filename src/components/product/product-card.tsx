"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Star, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCurrency } from "@/hooks/use-currency"
import { useCart } from "@/hooks/use-cart"
import type { Product } from "@/types"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { formatPrice } = useCurrency()
  const addItem = useCart((s) => s.addItem)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product)
  }

  const isBestseller = product.tags.includes("bestseller")
  const isNew = product.tags.includes("new")

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block rounded-xl bg-white transition-all duration-300 hover-lift overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Image
          src={product.images[0] || "/placeholder-product.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Ribbon badges */}
        {isBestseller && (
          <div className="absolute top-0 left-0">
            <div className="gradient-primary text-white text-[10px] font-bold px-3 py-1 rounded-br-lg shadow-sm">
              Bestseller
            </div>
          </div>
        )}
        {isNew && !isBestseller && (
          <div className="absolute top-0 left-0">
            <div className="bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg shadow-sm">
              New
            </div>
          </div>
        )}

        {/* Veg badge */}
        {product.isVeg && (
          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-sm border border-green-500 bg-white">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          </div>
        )}

        {/* Add to cart - visible on hover (desktop), always visible (mobile) */}
        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/30 to-transparent pt-8">
          <Button
            size="sm"
            className="w-full btn-gradient h-9 rounded-lg text-xs font-semibold gap-1.5 shadow-lg"
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add to Cart
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="p-3 sm:p-4">
        <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-[#E91E63] transition-colors min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Rating */}
        {product.totalReviews > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold text-foreground">
                {Number(product.avgRating).toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              ({product.totalReviews})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-base font-bold text-[#E91E63]">
            {formatPrice(Number(product.basePrice))}
          </span>
          {product.weight && (
            <span className="text-[11px] text-muted-foreground">{product.weight}</span>
          )}
        </div>

        {/* Delivery info */}
        <div className="mt-2 flex items-center gap-1 text-[11px] text-green-600 font-medium">
          <Truck className="h-3 w-3" />
          <span>Earliest: Today</span>
        </div>
      </div>
    </Link>
  )
}
