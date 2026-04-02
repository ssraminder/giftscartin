"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Star, Clock, ShoppingCart } from "lucide-react"

import { useCart } from "@/hooks/use-cart"
import { useCurrency } from "@/hooks/use-currency"
import { processImageUrl } from "@/lib/utils"
import type { Product } from "@/types"

export interface ProductCardProps {
  id: string
  name: string
  slug: string
  basePrice: number
  images: string[]
  avgRating?: number
  totalReviews?: number
  weight?: string
  tags?: string[]
  deliveryBadge?: "same-day" | "midnight" | "express"
  mrp?: number
}

function getUrgencyText(): string {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const istMs = utcMs + 5.5 * 3600000
  const ist = new Date(istMs)
  const hour = ist.getHours()
  const minutes = ist.getMinutes()

  if (hour < 16) {
    const totalMinutesLeft = (16 - hour) * 60 - minutes
    const h = Math.floor(totalMinutesLeft / 60)
    const m = totalMinutesLeft % 60
    return `Order in ${h}h ${m}m for Today's Delivery`
  } else if (hour < 18) {
    return "Last chance! Order before 6 PM for Midnight Delivery"
  } else {
    return "Order now for Tomorrow's Delivery"
  }
}

export function ProductCard({
  id,
  name,
  slug,
  basePrice,
  images,
  avgRating,
  totalReviews,
  weight,
  tags = [],
  deliveryBadge = "same-day",
  mrp,
}: ProductCardProps) {
  const { formatPrice } = useCurrency()
  const addItem = useCart((s) => s.addItem)
  const [wishlisted, setWishlisted] = useState(false)
  const [added, setAdded] = useState(false)
  const [urgency, setUrgency] = useState("")

  useEffect(() => {
    setUrgency(getUrgencyText())
    const interval = setInterval(() => {
      setUrgency(getUrgencyText())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const discount =
    mrp && Number(mrp) > Number(basePrice)
      ? Math.round((1 - Number(basePrice) / Number(mrp)) * 100)
      : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const minProduct: Product = {
      id,
      name,
      slug,
      basePrice,
      images,
      tags,
      avgRating: avgRating ?? 0,
      totalReviews: totalReviews ?? 0,
      weight: weight ?? null,
      description: null,
      shortDesc: null,
      categoryId: "",
      productType: "SIMPLE",
      occasion: [],
      isVeg: false,
      isActive: true,
      createdAt: "",
      updatedAt: "",
    }
    addItem(minProduct)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setWishlisted(!wishlisted)
  }

  const deliveryBadgeConfig = {
    "same-day": { label: "Same Day", className: "bg-green-600" },
    midnight: { label: "Midnight", className: "bg-indigo-600" },
    express: { label: "Express", className: "bg-orange-500" },
  }
  const badge = deliveryBadgeConfig[deliveryBadge]

  return (
    <Link
      href={`/product/${slug}`}
      prefetch={true}
      className="group block rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer border border-gray-100"
    >
      {/* IMAGE SECTION */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Image
          src={processImageUrl(images?.[0] || "/placeholder-product.svg", 400, 75)}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          quality={75}
          loading="lazy"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.src = "/placeholder-product.svg" }}
        />

        {/* Top-left: Discount badge */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
            {discount}% OFF
          </div>
        )}

        {/* Top-right: Delivery badge */}
        <div
          className={`absolute top-2 right-2 ${badge.className} text-white text-[10px] font-bold px-2 py-1 rounded-lg`}
        >
          {badge.label}
        </div>

        {/* Wishlist heart */}
        <button
          onClick={handleWishlist}
          className="absolute bottom-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white cursor-pointer transition-colors duration-200 shadow-sm"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`h-4 w-4 transition-colors duration-200 ${
              wishlisted ? "fill-red-500 text-red-500" : "text-gray-500"
            }`}
          />
        </button>
      </div>

      {/* CONTENT SECTION */}
      <div className="px-3 pt-3 pb-3">
        {/* Product name */}
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug min-h-[2.5rem]">
          {name}
        </h3>

        {/* Rating row */}
        {(totalReviews ?? 0) > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-gray-700">{Number(avgRating ?? 0).toFixed(1)}</span>
            <span className="text-gray-300">&middot;</span>
            <span>{totalReviews} reviews</span>
          </div>
        )}

        {/* Weight */}
        {weight && (
          <div className="mt-1 text-xs text-gray-400">{weight}</div>
        )}

        {/* Price row */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-bold text-lg text-gray-900">
            {formatPrice(basePrice)}
          </span>
          {mrp && mrp > basePrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(mrp)}
            </span>
          )}
        </div>

        {/* Urgency text */}
        {urgency && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-orange-600 font-medium">
            <Clock className="h-3 w-3 flex-shrink-0" />
            {urgency}
          </p>
        )}

        {/* Add to Cart button */}
        <button
          onClick={handleAddToCart}
          className={`mt-3 w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 ${
            added
              ? "bg-green-600 text-white"
              : "bg-pink-600 hover:bg-pink-700 text-white shadow-sm hover:shadow"
          }`}
        >
          {added ? (
            "Added \u2713"
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </Link>
  )
}
