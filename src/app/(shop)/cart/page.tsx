"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ShoppingCart, Tag, ChevronDown, ChevronUp, Sparkles, Loader2, CalendarDays } from "lucide-react"

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
  const setCoupon = useCart((s) => s.setCoupon)
  const storedCouponCode = useCart((s) => s.couponCode)
  const storedCouponDiscount = useCart((s) => s.couponDiscount)

  const [couponCode, setCouponCode] = useState<string | null>(storedCouponCode)
  const [discount, setDiscount] = useState(storedCouponDiscount)
  const [couponExpanded, setCouponExpanded] = useState(!!storedCouponCode)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Hydration guard for Zustand persisted store
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync from Zustand store on mount
  useEffect(() => {
    if (mounted) {
      setCouponCode(storedCouponCode)
      setDiscount(storedCouponDiscount)
      if (storedCouponCode) setCouponExpanded(true)
    }
  }, [mounted, storedCouponCode, storedCouponDiscount])

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const subtotal = getSubtotal()
  const baseDeliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : BASE_DELIVERY_CHARGE
  const deliveryCharge = baseDeliveryCharge

  // Get delivery date from first cart item (all items share the same date)
  const deliveryDateStr = items.length > 0 ? items[0].deliveryDate : null
  const deliveryDateDisplay = deliveryDateStr
    ? new Date(deliveryDateStr + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null

  const handleApplyCoupon = async (code: string) => {
    setCouponLoading(true)
    setCouponError(null)

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderTotal: subtotal }),
      })

      const json = await res.json()
      if (json.success && json.data) {
        if (json.data.valid) {
          const discountAmount = json.data.discount as number
          setCouponCode(code)
          setDiscount(discountAmount)
          setCoupon(code, discountAmount)
        } else {
          setCouponError(json.data.message || "Invalid coupon")
        }
      } else {
        setCouponError(json.error || "Failed to validate coupon")
      }
    } catch {
      setCouponError("Network error. Please try again.")
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode(null)
    setDiscount(0)
    setCouponError(null)
    setCoupon(null, 0)
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-sm">
          {/* Large gradient circle with cart icon */}
          <div className="relative mb-8">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 border border-pink-100/50">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-rose-100">
                <ShoppingCart className="h-10 w-10 text-pink-400" />
              </div>
            </div>
            <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800">Your cart is empty</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Looks like you haven&apos;t added anything to your cart yet.
            Explore our collection of cakes, flowers, and gifts!
          </p>

          <Link
            href="/"
            className="btn-gradient mt-8 inline-flex items-center justify-center px-8 py-3 text-sm"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Start Shopping
          </Link>

          <Link
            href="/"
            className="mt-3 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Browse popular categories
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#FFF9F5] min-h-screen">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Cart Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl text-gray-800">
                Shopping Cart
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length} {items.length === 1 ? "item" : "items"} in your cart
              </p>
            </div>
          </div>
          <button
            className="text-sm text-gray-500 hover:text-red-500 underline underline-offset-2 transition-colors"
            onClick={() => {
              if (confirm('Remove all items from cart?')) {
                clearCart()
              }
            }}
          >
            Clear Cart
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Cart Items Card */}
            <div className="card-premium p-4 sm:p-5">
              {items.map((item, index) => (
                <div key={item.id || item.productId}>
                  <CartItem item={item} />
                  {index < items.length - 1 && (
                    <Separator className="my-1 bg-gray-100" />
                  )}
                </div>
              ))}
            </div>

            {/* Delivery Date Display */}
            {deliveryDateDisplay && (
              <div className="card-premium overflow-hidden">
                <div className="px-4 py-3 sm:px-5 flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-[#E91E63]" />
                  <div>
                    <p className="text-xs text-gray-500">Delivery Date</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {deliveryDateDisplay}
                    </p>
                  </div>
                  <p className="ml-auto text-xs text-gray-400">
                    Time slot selected at checkout
                  </p>
                </div>
              </div>
            )}

            {/* Coupon Section */}
            <div className="card-premium overflow-hidden">
              <button
                onClick={() => setCouponExpanded(!couponExpanded)}
                className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-50">
                    <Tag className="h-4 w-4 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Have a coupon?</p>
                    <p className="text-xs text-muted-foreground">Apply coupon code for extra savings</p>
                  </div>
                </div>
                {couponExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {couponExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                  <CouponInput
                    appliedCode={couponCode}
                    discount={discount}
                    onApply={handleApplyCoupon}
                    onRemove={handleRemoveCoupon}
                  />
                  {couponLoading && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Validating coupon...
                    </div>
                  )}
                  {couponError && (
                    <p className="mt-2 text-xs text-red-600">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Continue Shopping */}
            <div className="pt-1">
              <Link
                href="/"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Right Column: Order Summary Sidebar */}
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
    </div>
  )
}
