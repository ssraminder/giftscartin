import Link from "next/link"
import { Cake, Flower2, Gift, TreePine, Package } from "lucide-react"

const CATEGORIES = [
  {
    name: "Cakes",
    slug: "cakes",
    description: "Freshly baked cakes for every occasion",
    icon: Cake,
    color: "bg-pink-50 text-pink-600 hover:bg-pink-100",
    iconBg: "bg-pink-100",
  },
  {
    name: "Flowers",
    slug: "flowers",
    description: "Beautiful bouquets & arrangements",
    icon: Flower2,
    color: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    iconBg: "bg-rose-100",
  },
  {
    name: "Combos",
    slug: "combos",
    description: "Perfect cake & flower combos",
    icon: Package,
    color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
    iconBg: "bg-purple-100",
  },
  {
    name: "Plants",
    slug: "plants",
    description: "Lucky plants & green gifts",
    icon: TreePine,
    color: "bg-green-50 text-green-600 hover:bg-green-100",
    iconBg: "bg-green-100",
  },
  {
    name: "Gifts",
    slug: "gifts",
    description: "Curated gifts for loved ones",
    icon: Gift,
    color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
    iconBg: "bg-orange-100",
  },
]

export function CategoryGrid() {
  return (
    <section className="container mx-auto px-4 py-10 md:py-14">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          Shop by Category
        </h2>
        <p className="mt-2 text-muted-foreground">
          Find the perfect gift for every celebration
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className={`group flex flex-col items-center rounded-xl border p-5 text-center transition-colors ${category.color}`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${category.iconBg} transition-transform group-hover:scale-110`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{category.name}</h3>
              <p className="mt-1 text-xs opacity-70 hidden sm:block">
                {category.description}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
