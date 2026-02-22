"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ShoppingCart, CheckCircle } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"

interface CartConfirmationBannerProps {
  product: {
    name: string
    image: string
    price: number
  }
  onViewCart: () => void
  onContinueShopping: () => void
}

export function CartConfirmationBanner({
  product,
  onViewCart,
  onContinueShopping,
}: CartConfirmationBannerProps) {
  const { formatPrice } = useCurrency()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Trigger slide-up animation after mount
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <>
      {/* Mobile banner (below lg) — fixed to bottom, above bottom nav */}
      <div
        className={`fixed bottom-16 left-0 right-0 z-50 bg-white shadow-2xl border-t-2 border-[#E91E63] lg:hidden transition-all duration-300 ease-out ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        style={{ boxShadow: "0 -8px 30px rgba(0,0,0,0.12)" }}
      >
        <div className="px-4 py-3">
          {/* Row 1: Product info */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={product.image || "/placeholder-product.svg"}
                alt={product.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <p className="font-medium text-sm text-gray-900 truncate flex-1">
              {product.name}
            </p>
            <p className="text-pink-600 font-semibold text-sm flex-shrink-0">
              {formatPrice(product.price)}
            </p>
          </div>

          {/* Row 2: Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onContinueShopping}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </button>
            <button
              onClick={onViewCart}
              className="flex-1 py-2.5 rounded-xl bg-[#E91E63] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#D81B60] transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              View Cart
            </button>
          </div>
        </div>
      </div>

      {/* Desktop banner (lg+) — fixed bottom-right card */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl hidden lg:block transition-all duration-300 ease-out ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}
      >
        <div className="p-5">
          {/* Row 1: Product info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={product.image || "/placeholder-product.svg"}
                alt={product.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">
                {product.name}
              </p>
              <p className="text-pink-600 font-semibold text-sm">
                {formatPrice(product.price)}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
          </div>

          {/* Row 2: Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onContinueShopping}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </button>
            <button
              onClick={onViewCart}
              className="flex-1 py-2.5 rounded-xl bg-[#E91E63] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#D81B60] transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              View Cart
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
