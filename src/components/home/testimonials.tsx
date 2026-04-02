import { Star, Quote } from "lucide-react"

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
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="section-title text-xl md:text-2xl font-bold text-gray-900">
            What Our Customers Say
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 relative"
            >
              {/* Quote icon */}
              <div className="absolute top-4 right-4">
                <Quote className="h-8 w-8 text-pink-100" strokeWidth={1.5} />
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Review text */}
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 mb-4">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
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
