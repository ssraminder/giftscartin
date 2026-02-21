"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Star } from "lucide-react"

import { useCart } from "@/hooks/use-cart"
import { useCurrency } from "@/hooks/use-currency"
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
    "same-day": { label: "Same Day", className: "bg-green-500" },
    midnight: { label: "Midnight", className: "bg-indigo-600" },
    express: { label: "Express", className: "bg-orange-500" },
  }
  const badge = deliveryBadgeConfig[deliveryBadge]

  return (
    <Link
      href={`/product/${slug}`}
      className="group block rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
    >
      {/* IMAGE SECTION */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl">
        <Image
          src={images[0] || "/placeholder-product.svg"}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Top-left: Discount badge */}
        {discount > 0 && (
          <div className="absolute top-0 left-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-br-lg">
            {discount}% OFF
          </div>
        )}

        {/* Top-right: Delivery badge */}
        <div
          className={`absolute top-0 right-0 ${badge.className} text-white text-xs font-bold px-2 py-1 rounded-bl-lg`}
        >
          {badge.label}
        </div>

        {/* Wishlist heart */}
        <button
          onClick={handleWishlist}
          className="absolute top-8 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              wishlisted ? "fill-red-500 text-red-500" : "text-gray-500"
            }`}
          />
        </button>

        {/* Bottom hover overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* CONTENT SECTION */}
      <div className="px-3 pt-2 pb-3">
        {/* Product name */}
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {name}
        </h3>

        {/* Rating row */}
        {(totalReviews ?? 0) > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{Number(avgRating ?? 0).toFixed(1)}</span>
            <span>&middot;</span>
            <span>{totalReviews} reviews</span>
          </div>
        )}

        {/* Weight */}
        {weight && (
          <div className="mt-1 text-xs text-gray-400">{weight}</div>
        )}

        {/* Price row */}
        <div className="mt-1.5 flex items-baseline gap-2">
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
          <p className="mt-1 text-xs text-orange-600 font-medium">
            {urgency}
          </p>
        )}

        {/* Add to Cart button */}
        <button
          onClick={handleAddToCart}
          className={`mt-2 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
            added
              ? "bg-green-600 text-white"
              : "bg-pink-600 hover:bg-pink-700 text-white"
          }`}
        >
          {added ? "Added \u2713" : "Add to Cart"}
        </button>
      </div>
    </Link>
  )
}
