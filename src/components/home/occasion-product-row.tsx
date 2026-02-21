"use client"

import { useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"

import { ProductCard } from "@/components/product/product-card"
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton"
import { CityGate } from "@/components/providers/city-gate"
import { useCity } from "@/hooks/use-city"
import { usePartner } from "@/hooks/use-partner"
import type { Product } from "@/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface OccasionProductRowProps {
  occasion: string
  title: string
  linkUrl: string
}

function OccasionRowSkeleton({ title }: { title: string }) {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            {title}
          </h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-52 md:w-60">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function OccasionRowInner({
  occasion,
  title,
  linkUrl,
}: OccasionProductRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { citySlug } = useCity()
  const { partner } = usePartner()

  const vendorParam = partner?.defaultVendorId
    ? `&vendorId=${partner.defaultVendorId}`
    : ""
  const url = `/api/products?occasion=${occasion}&pageSize=8${
    citySlug ? `&citySlug=${citySlug}` : ""
  }${vendorParam}`

  const { data, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: direction === "left" ? -260 : 260,
      behavior: "smooth",
    })
  }

  if (isLoading) {
    return <OccasionRowSkeleton title={title} />
  }

  const products: Product[] = data?.data?.items || data?.data || []

  if (products.length === 0) {
    return null
  }

  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            {title}
          </h2>
          <Link
            href={linkUrl}
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-pink-600 hover:underline"
          >
            See All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative">
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-52 md:w-60 snap-start"
              >
                <ProductCard
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  basePrice={Number(product.basePrice)}
                  images={product.images}
                  avgRating={product.avgRating}
                  totalReviews={product.totalReviews}
                  weight={product.weight ?? undefined}
                  tags={product.tags}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        <div className="mt-4 text-center sm:hidden">
          <Link
            href={linkUrl}
            className="inline-flex items-center gap-1 text-sm font-semibold text-pink-600"
          >
            See All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export function OccasionProductRow(props: OccasionProductRowProps) {
  return (
    <CityGate fallback={<OccasionRowSkeleton title={props.title} />}>
      <OccasionRowInner {...props} />
    </CityGate>
  )
}
