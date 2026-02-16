"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CartItem } from "@/components/cart/cart-item"
import { CartSummary } from "@/components/cart/cart-summary"
import { CouponInput } from "@/components/cart/coupon-input"
import { useCart } from "@/hooks/use-cart"

const BASE_DELIVERY_CHARGE = 49
const FREE_DELIVERY_ABOVE = 499

export default function CartPage() {
  const items = useCart((s) => s.items)
  const getSubtotal = useCart((s) => s.getSubtotal)
  const clearCart = useCart((s) => s.clearCart)

  // Coupon state (placeholder logic — no real backend call yet)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [discount, setDiscount] = useState(0)

  // Hydration guard for Zustand persisted store
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const subtotal = getSubtotal()
  const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : BASE_DELIVERY_CHARGE

  const handleApplyCoupon = (code: string) => {
    // Placeholder: apply a flat 10% discount for demo
    const calculatedDiscount = Math.round(subtotal * 0.1)
    setCouponCode(code)
    setDiscount(calculatedDiscount)
  }

  const handleRemoveCoupon = () => {
    setCouponCode(null)
    setDiscount(0)
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold sm:text-xl">
            Shopping Cart ({items.length} {items.length === 1 ? "item" : "items"})
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={clearCart}
        >
          Clear All
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card p-4">
            {items.map((item, index) => (
              <div key={item.productId}>
                <CartItem item={item} />
                {index < items.length - 1 && <Separator />}
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="mt-4 rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Have a coupon?</h3>
            <CouponInput
              appliedCode={couponCode}
              discount={discount}
              onApply={handleApplyCoupon}
              onRemove={handleRemoveCoupon}
            />
          </div>

          {/* Continue Shopping */}
          <div className="mt-4">
            <Button variant="link" asChild className="px-0 text-sm">
              <Link href="/">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <CartSummary
              subtotal={subtotal}
              deliveryCharge={deliveryCharge}
              discount={discount}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
