"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCurrency } from "@/hooks/use-currency"
import { useCart, type CartItemState } from "@/hooks/use-cart"

interface CartItemProps {
  item: CartItemState
}

export function CartItem({ item }: CartItemProps) {
  const { formatPrice } = useCurrency()
  const updateQuantity = useCart((s) => s.updateQuantity)
  const removeItem = useCart((s) => s.removeItem)

  const addonTotal = item.addons.reduce((sum, a) => sum + a.price, 0)
  const unitPrice = item.product.basePrice + addonTotal
  const lineTotal = unitPrice * item.quantity

  return (
    <div className="flex gap-3 py-4">
      {/* Product Image */}
      <Link
        href={`/product/${item.product.slug}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24"
      >
        <Image
          src={item.product.images[0] || "/placeholder-product.svg"}
          alt={item.product.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/product/${item.product.slug}`}
              className="text-sm font-medium leading-tight line-clamp-2 hover:text-primary transition-colors"
            >
              {item.product.name}
            </Link>
            {item.product.weight && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.product.weight}
              </p>
            )}
          </div>
          <span className="text-sm font-semibold shrink-0">
            {formatPrice(lineTotal)}
          </span>
        </div>

        {/* Addons */}
        {item.addons.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.addons.map((addon) => (
              <span
                key={addon.addonId}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                + {addon.name} ({formatPrice(addon.price)})
              </span>
            ))}
          </div>
        )}

        {/* Quantity Controls + Remove */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              disabled={item.quantity >= 10}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(item.productId)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            <span className="text-xs">Remove</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
