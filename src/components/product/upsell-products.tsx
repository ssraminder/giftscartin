"use client"

import Image from "next/image"
import Link from "next/link"
import { Plus } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"
import { useCart } from "@/hooks/use-cart"
import { processImageUrl } from "@/lib/utils"
import type { UpsellProduct } from "@/types"

interface UpsellProductsProps {
  upsells: UpsellProduct[]
}

export function UpsellProducts({ upsells }: UpsellProductsProps) {
  const { formatPrice } = useCurrency()
  const addItem = useCart((s) => s.addItem)

  if (upsells.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#1A1A2E]">Complete Your Gift</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
        {upsells.map((product) => (
          <div
            key={product.id}
            className="flex-shrink-0 w-40 sm:w-auto rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <Link href={`/product/${product.slug}`}>
              <div className="relative aspect-square bg-gray-50">
                <Image
                  src={processImageUrl(product.images[0], 200, 75)}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 160px, 200px"
                  loading="lazy"
                />
              </div>
            </Link>
            <div className="p-3 space-y-1.5">
              <Link href={`/product/${product.slug}`}>
                <p className="text-xs font-medium text-[#1A1A2E] line-clamp-2 leading-tight hover:text-[#E91E63] transition-colors">
                  {product.name}
                </p>
              </Link>
              <p className="text-[10px] text-muted-foreground">{product.category.name}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#E91E63]">
                  {formatPrice(Number(product.basePrice))}
                </span>
                <button
                  onClick={() =>
                    addItem(
                      {
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        images: product.images,
                        basePrice: Number(product.basePrice),
                        productType: "SIMPLE",
                      } as Parameters<typeof addItem>[0],
                      1,
                      [],
                      null
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF0F5] text-[#E91E63] hover:bg-[#E91E63] hover:text-white transition-colors"
                  title="Add to cart"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
