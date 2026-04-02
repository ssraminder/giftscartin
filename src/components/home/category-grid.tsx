"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Cake, Flower2, Package, TreePine, Gift } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const CATEGORIES: {
  name: string
  slug: string
  count: number
  gradient: string
  icon: LucideIcon
  iconColor: string
}[] = [
  {
    name: "Cakes",
    slug: "cakes",
    count: 8,
    gradient: "from-pink-500 to-rose-400",
    icon: Cake,
    iconColor: "text-white/90",
  },
  {
    name: "Flowers",
    slug: "flowers",
    count: 5,
    gradient: "from-green-500 to-emerald-400",
    icon: Flower2,
    iconColor: "text-white/90",
  },
  {
    name: "Combos",
    slug: "combos",
    count: 5,
    gradient: "from-purple-500 to-violet-400",
    icon: Package,
    iconColor: "text-white/90",
  },
  {
    name: "Plants",
    slug: "plants",
    count: 5,
    gradient: "from-lime-500 to-green-400",
    icon: TreePine,
    iconColor: "text-white/90",
  },
  {
    name: "Gifts",
    slug: "gifts",
    count: 5,
    gradient: "from-amber-500 to-orange-400",
    icon: Gift,
    iconColor: "text-white/90",
  },
]

export function CategoryGrid() {
  const router = useRouter()

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="section-title text-xl md:text-2xl font-bold text-gray-900">
            Shop by Category
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-5">
          {CATEGORIES.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group relative rounded-2xl overflow-hidden cursor-pointer hover-lift"
                onMouseEnter={() =>
                  router.prefetch(`/category/${category.slug}`)
                }
              >
                <div
                  className={`h-[180px] md:h-[200px] bg-gradient-to-br ${category.gradient} flex flex-col items-center justify-center gap-3 transition-all duration-300`}
                >
                  <div className="bg-white/20 rounded-2xl p-4 group-hover:bg-white/30 transition-colors duration-200">
                    <Icon className={`h-8 w-8 md:h-10 md:w-10 ${category.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-white drop-shadow-sm block">
                      {category.name}
                    </span>
                    <span className="text-xs text-white/80 font-medium">
                      {category.count} Products
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
