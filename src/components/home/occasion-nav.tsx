import Link from "next/link"

const OCCASIONS = [
  { label: "Birthday", slug: "birthday", emoji: "🎂" },
  { label: "Anniversary", slug: "anniversary", emoji: "💍" },
  { label: "Valentine's Day", slug: "valentines-day", emoji: "❤️" },
  { label: "Mother's Day", slug: "mothers-day", emoji: "👩" },
  { label: "Father's Day", slug: "fathers-day", emoji: "👨" },
  { label: "Wedding", slug: "wedding", emoji: "💒" },
  { label: "Congratulations", slug: "congratulations", emoji: "🎉" },
  { label: "Thank You", slug: "thank-you", emoji: "🙏" },
  { label: "Get Well Soon", slug: "get-well-soon", emoji: "💐" },
  { label: "Housewarming", slug: "housewarming", emoji: "🏠" },
]

export function OccasionNav() {
  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto px-4 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Shop by Occasion
        </h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {OCCASIONS.map((occasion) => (
            <Link
              key={occasion.slug}
              href={`/category/gifts?occasion=${occasion.slug}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <span>{occasion.emoji}</span>
              <span>{occasion.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
