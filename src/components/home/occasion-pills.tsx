"use client"

import Link from "next/link"

const OCCASIONS = [
  { emoji: "\u{1F382}", label: "Birthday", slug: "birthday" },
  { emoji: "\u{1F48D}", label: "Anniversary", slug: "anniversary" },
  { emoji: "\u{1F49D}", label: "Valentine", slug: "valentines-day" },
  { emoji: "\u{1F492}", label: "Wedding", slug: "wedding" },
  { emoji: "\u{1FA94}", label: "Diwali", slug: "diwali" },
  { emoji: "\u{1F393}", label: "Graduation", slug: "graduation" },
  { emoji: "\u{1F389}", label: "Party", slug: "party" },
  { emoji: "\u{1F476}", label: "New Baby", slug: "new-baby" },
  { emoji: "\u{1F3E5}", label: "Get Well", slug: "get-well" },
  { emoji: "\u{1F4BC}", label: "Corporate", slug: "corporate" },
  { emoji: "\u{1F64F}", label: "Thank You", slug: "thank-you" },
  { emoji: "\u{1F338}", label: "Just Because", slug: "just-because" },
]

export function OccasionPills() {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide justify-start md:justify-center py-1">
          {OCCASIONS.map((occasion) => (
            <Link
              key={occasion.slug}
              href={`/category/gifts?occasion=${occasion.slug}`}
              className="flex-shrink-0 w-[72px] flex flex-col items-center text-center py-3 rounded-full border border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-colors"
            >
              <span className="text-2xl leading-none">{occasion.emoji}</span>
              <span className="mt-1.5 text-xs text-gray-600 font-medium leading-tight">
                {occasion.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
