import { Star } from "lucide-react"

const TESTIMONIALS = [
  {
    id: "t1",
    name: "Priya Sharma",
    city: "Chandigarh",
    rating: 5,
    text: "Ordered a chocolate truffle cake for my husband's birthday. It was so fresh and delicious! The delivery was right on time at midnight. Will definitely order again!",
  },
  {
    id: "t2",
    name: "Rahul Mehta",
    city: "Mohali",
    rating: 5,
    text: "The flower arrangement I ordered for our anniversary was absolutely stunning. My wife loved it! The packaging was beautiful and the flowers were super fresh.",
  },
  {
    id: "t3",
    name: "Anita Kaur",
    city: "Panchkula",
    rating: 4,
    text: "Great selection of cakes and combos. I ordered the cake & flowers combo and everything arrived in perfect condition. The prices are very reasonable too!",
  },
]

export function Testimonials() {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-6">
          What Our Customers Say
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 italic line-clamp-3 leading-relaxed">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500">{t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
