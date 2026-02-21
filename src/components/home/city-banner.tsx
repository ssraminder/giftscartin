import Link from "next/link"
import { MapPin } from "lucide-react"

const CITIES = [
  { name: "Chandigarh", slug: "chandigarh", products: 28, color: "from-pink-500 to-rose-500" },
  { name: "Mohali", slug: "mohali", products: 28, color: "from-purple-500 to-indigo-500" },
  { name: "Panchkula", slug: "panchkula", products: 28, color: "from-amber-500 to-orange-500" },
]

export function CityBanner() {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-6">
          We Deliver Across India
        </h2>
        <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/${city.slug}`}
              className="group relative overflow-hidden rounded-2xl hover-lift"
            >
              <div className={`bg-gradient-to-br ${city.color} p-6 sm:p-8 text-center text-white`}>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/20 mb-3">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{city.name}</h3>
                <p className="mt-1 text-sm text-white/80">
                  {city.products} products available
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
