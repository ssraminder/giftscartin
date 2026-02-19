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

function calculateAddonTotal(addonSelections: CartItemState["addonSelections"]): number {
  let total = 0
  for (const addon of addonSelections) {
    if (addon.totalAddonPrice !== undefined) {
      total += addon.totalAddonPrice
    } else if (addon.addonPrice !== undefined) {
      total += addon.addonPrice
    }
  }
  return total
}

export function CartItem({ item }: CartItemProps) {
  const { formatPrice } = useCurrency()
  const updateQuantity = useCart((s) => s.updateQuantity)
  const removeItem = useCart((s) => s.removeItem)

  const unitPrice = Number(item.price)
  const addonTotal = calculateAddonTotal(item.addonSelections)
  const lineTotal = (unitPrice + addonTotal) * item.quantity

  // Build attribute label string (e.g. "1kg, Eggless")
  const attributeLabel = item.selectedAttributes
    ? Object.values(item.selectedAttributes).join(", ")
    : null

  return (
    <div className="flex gap-3 py-4">
      {/* Product Image */}
      <Link
        href={`/product/${item.productSlug || item.product?.slug || ""}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24"
      >
        <Image
          src={item.image || item.product?.images?.[0] || "/placeholder-product.svg"}
          alt={item.productName || item.product?.name || "Product"}
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
              href={`/product/${item.productSlug || item.product?.slug || ""}`}
              className="text-sm font-medium leading-tight line-clamp-2 hover:text-primary transition-colors"
            >
              {item.productName || item.product?.name}
            </Link>
            {attributeLabel && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {attributeLabel}
              </p>
            )}
          </div>
          <span className="text-sm font-semibold shrink-0">
            {formatPrice(lineTotal)}
          </span>
        </div>

        {/* Addon selections */}
        {item.addonSelections.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.addonSelections.map((addon) => {
              const price = addon.totalAddonPrice ?? addon.addonPrice ?? 0
              const label = addon.selectedLabels
                ? addon.selectedLabels.join(", ")
                : addon.selectedLabel || addon.text || addon.fileName || addon.groupName
              return (
                <span
                  key={addon.groupId}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  + {label} {price > 0 ? `(${formatPrice(price)})` : ""}
                </span>
              )
            })}
          </div>
        )}

        {/* Quantity Controls + Remove */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
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
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
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
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            <span className="text-xs">Remove</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
