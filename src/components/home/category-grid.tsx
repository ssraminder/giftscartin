"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Cake, Flower2, Gift, TreePine, Package } from "lucide-react"

const CATEGORIES = [
  {
    name: "Cakes",
    slug: "cakes",
    count: "8 Products",
    icon: Cake,
    gradient: "from-pink-100 to-pink-50",
    iconBg: "bg-pink-200",
    iconColor: "text-pink-600",
  },
  {
    name: "Flowers",
    slug: "flowers",
    count: "5 Products",
    icon: Flower2,
    gradient: "from-rose-100 to-rose-50",
    iconBg: "bg-rose-200",
    iconColor: "text-rose-600",
  },
  {
    name: "Combos",
    slug: "combos",
    count: "5 Products",
    icon: Package,
    gradient: "from-purple-100 to-purple-50",
    iconBg: "bg-purple-200",
    iconColor: "text-purple-600",
  },
  {
    name: "Plants",
    slug: "plants",
    count: "5 Products",
    icon: TreePine,
    gradient: "from-green-100 to-green-50",
    iconBg: "bg-green-200",
    iconColor: "text-green-600",
  },
  {
    name: "Gifts",
    slug: "gifts",
    count: "5 Products",
    icon: Gift,
    gradient: "from-amber-100 to-amber-50",
    iconBg: "bg-amber-200",
    iconColor: "text-amber-600",
  },
]

export function CategoryGrid() {
  const router = useRouter()

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="section-title">Shop by Category</h2>
        <p className="mt-4 text-muted-foreground">
          Find the perfect gift for every celebration
        </p>
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-4 sm:gap-6 md:grid-cols-5 max-w-3xl w-full">
          {CATEGORIES.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group flex flex-col items-center text-center"
                onMouseEnter={() => router.prefetch(`/category/${category.slug}`)}
              >
                <div
                  className={`relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br ${category.gradient} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
                >
                  <div
                    className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full ${category.iconBg} transition-transform duration-300`}
                  >
                    <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${category.iconColor}`} />
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {category.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {category.count}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
