"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/utils"
import type { ProductAddon } from "@/types"
import type { AddonSelection } from "@/types"

interface AddonSelectorProps {
  addons: ProductAddon[]
  selected: AddonSelection[]
  onChange: (selected: AddonSelection[]) => void
}

export function AddonSelector({ addons, selected, onChange }: AddonSelectorProps) {
  if (addons.length === 0) return null

  const isSelected = (addonId: string) =>
    selected.some((s) => s.addonId === addonId)

  const toggleAddon = (addon: ProductAddon) => {
    if (isSelected(addon.id)) {
      onChange(selected.filter((s) => s.addonId !== addon.id))
    } else {
      onChange([...selected, { addonId: addon.id, name: addon.name, price: addon.price }])
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">Make it Extra Special</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {addons.map((addon) => {
          const active = isSelected(addon.id)
          return (
            <button
              key={addon.id}
              onClick={() => toggleAddon(addon)}
              className={cn(
                "relative flex flex-col items-center rounded-lg border p-3 text-center transition-colors",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              {active && (
                <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="relative mb-2 h-14 w-14 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={addon.image || "/placeholder-product.svg"}
                  alt={addon.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <p className="text-xs font-medium leading-tight line-clamp-2">{addon.name}</p>
              <p className="mt-1 text-xs font-semibold text-primary">
                +{formatPrice(addon.price)}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
