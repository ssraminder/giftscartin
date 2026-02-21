"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

const CATEGORIES = [
  {
    name: "Cakes",
    slug: "cakes",
    count: 8,
    gradient: "from-pink-200 to-rose-300",
  },
  {
    name: "Flowers",
    slug: "flowers",
    count: 5,
    gradient: "from-green-200 to-emerald-300",
  },
  {
    name: "Combos",
    slug: "combos",
    count: 5,
    gradient: "from-purple-200 to-violet-300",
  },
  {
    name: "Plants",
    slug: "plants",
    count: 5,
    gradient: "from-lime-200 to-green-300",
  },
  {
    name: "Gifts",
    slug: "gifts",
    count: 5,
    gradient: "from-amber-200 to-orange-300",
  },
]

export function CategoryGrid() {
  const router = useRouter()

  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="group relative rounded-2xl overflow-hidden"
              onMouseEnter={() =>
                router.prefetch(`/category/${category.slug}`)
              }
            >
              <div
                className={`h-[200px] bg-gradient-to-br ${category.gradient} transition-transform duration-300 group-hover:scale-105`}
              />
              <span className="absolute top-2 right-2 bg-white/80 text-xs rounded-full px-2 py-0.5 text-gray-700 font-medium">
                {category.count} Products
              </span>
              <span className="absolute bottom-2 left-3 text-lg font-bold text-white drop-shadow-md">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
