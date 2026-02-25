"use client"

import Link from "next/link"
import { ShoppingBag, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCurrency } from "@/hooks/use-currency"

interface CartSummaryProps {
  subtotal: number
  deliveryCharge: number
  extraDeliveryCharge?: number
  discount: number
  /** If true, render "Place Order" button instead of "Proceed to Checkout" link */
  isCheckout?: boolean
  onPlaceOrder?: () => void
  placing?: boolean
}

export function CartSummary({
  subtotal,
  deliveryCharge,
  extraDeliveryCharge = 0,
  discount,
  isCheckout = false,
  onPlaceOrder,
  placing = false,
}: CartSummaryProps) {
  const { formatPrice } = useCurrency()
  const total = subtotal - discount + deliveryCharge + extraDeliveryCharge
  const freeDeliveryThreshold = 499

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold">Order Summary</h3>
        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            {deliveryCharge === 0 ? (
              <span className="text-green-600 font-medium">FREE</span>
            ) : (
              <span>{formatPrice(deliveryCharge)}</span>
            )}
          </div>

          {extraDeliveryCharge > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance surcharge</span>
              <span>{formatPrice(extraDeliveryCharge)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>

        {/* Free delivery nudge */}
        {subtotal > 0 && subtotal < freeDeliveryThreshold && deliveryCharge > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-2.5 text-xs">
            <Truck className="h-4 w-4 shrink-0 text-primary" />
            <span>
              Add{" "}
              <span className="font-semibold text-primary">
                {formatPrice(freeDeliveryThreshold - subtotal)}
              </span>{" "}
              more for free delivery
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {isCheckout ? (
          <Button
            className="w-full"
            size="lg"
            onClick={onPlaceOrder}
            disabled={placing || subtotal === 0}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {placing ? "Placing Order..." : "Place Order"}
          </Button>
        ) : (
          <Button className="w-full" size="lg" asChild disabled={subtotal === 0}>
            <Link href="/checkout">Proceed to Checkout</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
