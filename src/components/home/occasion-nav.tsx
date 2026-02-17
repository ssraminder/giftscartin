import Link from "next/link"

const OCCASIONS = [
  { label: "Birthday", slug: "birthday", gradient: "from-pink-400 to-pink-500", emoji: "🎂" },
  { label: "Anniversary", slug: "anniversary", gradient: "from-amber-400 to-amber-500", emoji: "💍" },
  { label: "Valentine's", slug: "valentines-day", gradient: "from-red-400 to-red-500", emoji: "❤️" },
  { label: "Wedding", slug: "wedding", gradient: "from-yellow-300 to-amber-400", emoji: "💒" },
  { label: "Diwali", slug: "diwali", gradient: "from-orange-400 to-orange-500", emoji: "🪔" },
  { label: "Thank You", slug: "thank-you", gradient: "from-green-400 to-green-500", emoji: "🙏" },
]

export function OccasionNav() {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-white to-[#FFF5F0]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="section-title">Shop by Occasion</h2>
          <p className="mt-4 text-muted-foreground">
            The perfect gift for every moment
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6 max-w-4xl mx-auto">
          {OCCASIONS.map((occasion) => (
            <Link
              key={occasion.slug}
              href={`/category/gifts?occasion=${occasion.slug}`}
              className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover-lift"
            >
              <div
                className={`bg-gradient-to-br ${occasion.gradient} p-4 sm:p-5 text-center`}
              >
                <span className="text-2xl sm:text-3xl block mb-2">
                  {occasion.emoji}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white">
                  {occasion.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
