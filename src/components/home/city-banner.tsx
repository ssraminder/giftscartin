import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"

const CITIES = [
  { name: "Chandigarh", slug: "chandigarh", products: 28, color: "from-pink-600 to-rose-500" },
  { name: "Mohali", slug: "mohali", products: 28, color: "from-purple-600 to-indigo-500" },
  { name: "Panchkula", slug: "panchkula", products: 28, color: "from-amber-600 to-orange-500" },
]

export function CityBanner() {
  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="section-title text-xl md:text-2xl font-bold text-gray-900">
            We Deliver Across India
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3 max-w-3xl mx-auto">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/${city.slug}`}
              className="group relative overflow-hidden rounded-2xl cursor-pointer hover-lift"
            >
              <div className={`bg-gradient-to-br ${city.color} p-6 sm:p-8 text-center text-white`}>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/20 mb-3 group-hover:bg-white/30 transition-colors duration-200">
                  <MapPin className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <h3 className="text-lg font-bold">{city.name}</h3>
                <p className="mt-1 text-sm text-white/80">
                  {city.products} products available
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white/90 group-hover:text-white transition-colors duration-200">
                  Explore
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
