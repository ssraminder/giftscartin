"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, ChefHat, Clock, HeadphonesIcon, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product/product-card"
import type { Product } from "@/types"

const TRENDING_PRODUCTS: Product[] = [
  {
    id: "1", name: "Chocolate Truffle Cake", slug: "chocolate-truffle-cake",
    description: "Rich chocolate truffle cake with ganache frosting", shortDesc: "Rich & decadent",
    categoryId: "cakes", basePrice: 599, images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary"], weight: "500g",
    isVeg: true, isActive: true, avgRating: 4.5, totalReviews: 128, createdAt: "", updatedAt: "",
  },
  {
    id: "2", name: "Red Velvet Cake", slug: "red-velvet-cake",
    description: "Classic red velvet with cream cheese frosting", shortDesc: "Classic favorite",
    categoryId: "cakes", basePrice: 699, images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "valentines-day"], weight: "500g",
    isVeg: true, isActive: true, avgRating: 4.7, totalReviews: 95, createdAt: "", updatedAt: "",
  },
  {
    id: "3", name: "Red Roses Bouquet", slug: "red-roses-bouquet",
    description: "12 premium red roses with elegant wrapping", shortDesc: "Romantic & elegant",
    categoryId: "flowers", basePrice: 699, images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["valentines-day", "anniversary"], weight: null,
    isVeg: true, isActive: true, avgRating: 4.8, totalReviews: 210, createdAt: "", updatedAt: "",
  },
  {
    id: "4", name: "Black Forest Cake", slug: "black-forest-cake",
    description: "Classic black forest with cherries and cream", shortDesc: "Timeless classic",
    categoryId: "cakes", basePrice: 549, images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday"], weight: "500g",
    isVeg: true, isActive: true, avgRating: 4.3, totalReviews: 72, createdAt: "", updatedAt: "",
  },
  {
    id: "5", name: "Butterscotch Cake", slug: "butterscotch-cake",
    description: "Smooth butterscotch cake with caramel crunch", shortDesc: "Sweet & crunchy",
    categoryId: "cakes", basePrice: 499, images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday"], weight: "500g",
    isVeg: true, isActive: true, avgRating: 4.2, totalReviews: 56, createdAt: "", updatedAt: "",
  },
  {
    id: "6", name: "Photo Cake", slug: "photo-cake",
    description: "Customizable photo cake with edible print", shortDesc: "Personalized",
    categoryId: "cakes", basePrice: 899, images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary"], weight: "1kg",
    isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 43, createdAt: "", updatedAt: "",
  },
  {
    id: "7", name: "Mixed Flower Arrangement", slug: "mixed-flower-arrangement",
    description: "Beautiful arrangement of seasonal mixed flowers", shortDesc: "Colorful & bright",
    categoryId: "flowers", basePrice: 899, images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday", "congratulations"], weight: null,
    isVeg: true, isActive: true, avgRating: 4.4, totalReviews: 67, createdAt: "", updatedAt: "",
  },
  {
    id: "8", name: "Cake & Flowers Combo", slug: "cake-flowers-combo",
    description: "Chocolate cake with a bouquet of red roses", shortDesc: "Perfect pair",
    categoryId: "combos", basePrice: 1199, images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary", "valentines-day"], weight: "500g + bouquet",
    isVeg: true, isActive: true, avgRating: 4.9, totalReviews: 156, createdAt: "", updatedAt: "",
  },
  {
    id: "9", name: "Money Plant", slug: "money-plant",
    description: "Golden money plant in ceramic pot", shortDesc: "Lucky charm",
    categoryId: "plants", basePrice: 399, images: ["/placeholder-product.svg"],
    tags: [], occasion: ["housewarming", "congratulations"], weight: null,
    isVeg: true, isActive: true, avgRating: 4.1, totalReviews: 34, createdAt: "", updatedAt: "",
  },
  {
    id: "10", name: "Orchid Bunch", slug: "orchid-bunch",
    description: "Premium orchid bunch in elegant packaging", shortDesc: "Premium blooms",
    categoryId: "flowers", basePrice: 1299, images: ["/placeholder-product.svg"],
    tags: [], occasion: ["anniversary", "thank-you"], weight: null,
    isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 28, createdAt: "", updatedAt: "",
  },
]

const WHY_CHOOSE = [
  {
    icon: ChefHat,
    title: "Freshly Prepared",
    description: "Every cake and bouquet is prepared fresh on the day of delivery",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Clock,
    title: "On-Time Delivery",
    description: "We guarantee delivery in your chosen time slot, every time",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "Not satisfied? Get a full refund or replacement — no questions asked",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description: "Our friendly team is always here to help with your orders",
    color: "bg-purple-50 text-purple-600",
  },
]

export function TrendingProducts() {
  const [showAll, setShowAll] = useState(false)
  const displayedProducts = showAll ? TRENDING_PRODUCTS : TRENDING_PRODUCTS.slice(0, 8)

  return (
    <>
      {/* Bestsellers Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="section-title">Bestsellers</h2>
            <p className="mt-4 text-muted-foreground">
              Our most popular picks this week
            </p>
          </div>
          <Link
            href="/category/cakes"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-[#E91E63] hover:underline"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {!showAll && TRENDING_PRODUCTS.length > 8 && (
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl border-2 border-pink-200 text-[#E91E63] hover:bg-pink-50 px-8"
              onClick={() => setShowAll(true)}
            >
              Load More
            </Button>
          </div>
        )}

        {/* Mobile View All */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/category/cakes"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#E91E63]"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Why Choose Gifts Cart India */}
      <section className="bg-gradient-to-b from-[#FFF5F0] to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="section-title">Why Choose Gifts Cart India?</h2>
            <p className="mt-4 text-muted-foreground">
              We go above and beyond to make your celebrations perfect
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {WHY_CHOOSE.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="card-premium p-5 sm:p-6 text-center group hover-lift"
                >
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${item.color} mb-4 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground sm:text-base">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
