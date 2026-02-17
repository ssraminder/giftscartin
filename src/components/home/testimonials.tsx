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
    <section className="py-12 md:py-16 bg-gradient-to-b from-white to-[#FFF9F5]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="mt-4 text-muted-foreground">
            Real reviews from real celebrations
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-6 max-w-5xl mx-auto">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.id}
              className="card-premium p-6 relative group hover-lift"
            >
              {/* Quote mark */}
              <div className="absolute top-4 right-4 text-4xl text-pink-100 font-serif leading-none">
                &ldquo;
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < testimonial.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Review text */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {testimonial.text}
              </p>

              {/* Customer info */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-white font-semibold text-sm">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.city}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
