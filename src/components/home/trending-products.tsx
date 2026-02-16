"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product/product-card"
import type { Product } from "@/types"

const TRENDING_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Chocolate Truffle Cake",
    slug: "chocolate-truffle-cake",
    description: "Rich chocolate truffle cake with ganache frosting",
    shortDesc: "Rich & decadent",
    categoryId: "cakes",
    basePrice: 599,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"],
    occasion: ["birthday", "anniversary"],
    weight: "500g",
    isVeg: true,
    isActive: true,
    avgRating: 4.5,
    totalReviews: 128,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "2",
    name: "Red Velvet Cake",
    slug: "red-velvet-cake",
    description: "Classic red velvet with cream cheese frosting",
    shortDesc: "Classic favorite",
    categoryId: "cakes",
    basePrice: 699,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"],
    occasion: ["birthday", "valentines-day"],
    weight: "500g",
    isVeg: true,
    isActive: true,
    avgRating: 4.7,
    totalReviews: 95,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "3",
    name: "Red Roses Bouquet",
    slug: "red-roses-bouquet",
    description: "12 premium red roses with elegant wrapping",
    shortDesc: "Romantic & elegant",
    categoryId: "flowers",
    basePrice: 699,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"],
    occasion: ["valentines-day", "anniversary"],
    weight: null,
    isVeg: true,
    isActive: true,
    avgRating: 4.8,
    totalReviews: 210,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "4",
    name: "Black Forest Cake",
    slug: "black-forest-cake",
    description: "Classic black forest with cherries and cream",
    shortDesc: "Timeless classic",
    categoryId: "cakes",
    basePrice: 549,
    images: ["/placeholder-product.svg"],
    tags: [],
    occasion: ["birthday"],
    weight: "500g",
    isVeg: true,
    isActive: true,
    avgRating: 4.3,
    totalReviews: 72,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "5",
    name: "Butterscotch Cake",
    slug: "butterscotch-cake",
    description: "Smooth butterscotch cake with caramel crunch",
    shortDesc: "Sweet & crunchy",
    categoryId: "cakes",
    basePrice: 499,
    images: ["/placeholder-product.svg"],
    tags: [],
    occasion: ["birthday"],
    weight: "500g",
    isVeg: true,
    isActive: true,
    avgRating: 4.2,
    totalReviews: 56,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "6",
    name: "Photo Cake",
    slug: "photo-cake",
    description: "Customizable photo cake with edible print",
    shortDesc: "Personalized",
    categoryId: "cakes",
    basePrice: 899,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"],
    occasion: ["birthday", "anniversary"],
    weight: "1kg",
    isVeg: true,
    isActive: true,
    avgRating: 4.6,
    totalReviews: 43,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "7",
    name: "Mixed Flower Arrangement",
    slug: "mixed-flower-arrangement",
    description: "Beautiful arrangement of seasonal mixed flowers",
    shortDesc: "Colorful & bright",
    categoryId: "flowers",
    basePrice: 899,
    images: ["/placeholder-product.svg"],
    tags: [],
    occasion: ["birthday", "congratulations"],
    weight: null,
    isVeg: true,
    isActive: true,
    avgRating: 4.4,
    totalReviews: 67,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "8",
    name: "Cake & Flowers Combo",
    slug: "cake-flowers-combo",
    description: "Chocolate cake with a bouquet of red roses",
    shortDesc: "Perfect pair",
    categoryId: "combos",
    basePrice: 1199,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"],
    occasion: ["birthday", "anniversary", "valentines-day"],
    weight: "500g + bouquet",
    isVeg: true,
    isActive: true,
    avgRating: 4.9,
    totalReviews: 156,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "9",
    name: "Money Plant",
    slug: "money-plant",
    description: "Golden money plant in ceramic pot",
    shortDesc: "Lucky charm",
    categoryId: "plants",
    basePrice: 399,
    images: ["/placeholder-product.svg"],
    tags: [],
    occasion: ["housewarming", "congratulations"],
    weight: null,
    isVeg: true,
    isActive: true,
    avgRating: 4.1,
    totalReviews: 34,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "10",
    name: "Orchid Bunch",
    slug: "orchid-bunch",
    description: "Premium orchid bunch in elegant packaging",
    shortDesc: "Premium blooms",
    categoryId: "flowers",
    basePrice: 1299,
    images: ["/placeholder-product.svg"],
    tags: [],
    occasion: ["anniversary", "thank-you"],
    weight: null,
    isVeg: true,
    isActive: true,
    avgRating: 4.6,
    totalReviews: 28,
    createdAt: "",
    updatedAt: "",
  },
]

export function TrendingProducts() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const scrollAmount = 280
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <section className="container mx-auto px-4 py-10 md:py-14">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Trending Now
          </h2>
          <p className="mt-1 text-muted-foreground">
            Our most popular picks this week
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-6 flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
      >
        {TRENDING_PRODUCTS.map((product) => (
          <div
            key={product.id}
            className="w-[180px] shrink-0 snap-start sm:w-[200px] md:w-[220px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
