'use client'

import Link from 'next/link'

// Update these dates each season or eventually pull from DB/delivery_surcharges table
const UPCOMING_OCCASIONS: Record<string, string> = {
  holi: 'Mar 14',
  'womens-day': '8th Mar',
  'mothers-day': 'May 11',
  'fathers-day': 'Jun 15',
}

const occasions = [
  {
    id: 'same-day',
    label: 'Same Day',
    href: '/products?sameDay=true',
    emoji: '🛵',
    iconBg: 'bg-amber-100',
    highlight: true,
  },
  {
    id: 'birthday',
    label: 'Birthday',
    href: '/products?occasion=birthday',
    emoji: '🎂',
    iconBg: 'bg-pink-100',
  },
  {
    id: 'anniversary',
    label: 'Anniversary',
    href: '/products?occasion=anniversary',
    emoji: '💍',
    iconBg: 'bg-rose-100',
  },
  {
    id: 'holi',
    label: 'Holi',
    href: '/products?occasion=holi',
    emoji: '🎨',
    iconBg: 'bg-purple-100',
    badge: UPCOMING_OCCASIONS['holi'],
  },
  {
    id: 'womens-day',
    label: "Women's Day",
    href: '/products?occasion=womens-day',
    emoji: '💜',
    iconBg: 'bg-violet-100',
    badge: UPCOMING_OCCASIONS['womens-day'],
  },
  {
    id: 'wedding',
    label: 'Wedding',
    href: '/products?occasion=wedding',
    emoji: '💒',
    iconBg: 'bg-orange-100',
  },
  {
    id: 'graduation',
    label: 'Graduation',
    href: '/products?occasion=graduation',
    emoji: '🎓',
    iconBg: 'bg-blue-100',
  },
  {
    id: 'new-baby',
    label: 'New Baby',
    href: '/products?occasion=new-baby',
    emoji: '🍼',
    iconBg: 'bg-sky-100',
  },
  {
    id: 'cakes',
    label: 'Cakes',
    href: '/category/cakes',
    emoji: '🎂',
    iconBg: 'bg-amber-100',
  },
  {
    id: 'flowers',
    label: 'Flowers',
    href: '/category/flowers',
    emoji: '💐',
    iconBg: 'bg-green-100',
  },
  {
    id: 'plants',
    label: 'Plants',
    href: '/category/plants',
    emoji: '🌿',
    iconBg: 'bg-emerald-100',
  },
  {
    id: 'corporate',
    label: 'Corporate',
    href: '/products?occasion=corporate',
    emoji: '💼',
    iconBg: 'bg-slate-200',
  },
]

export function OccasionNav() {
  return (
    <section className="w-full py-4 md:py-6">
      {/* Full bleed — no max-width wrapper, padding only on sides */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory px-4">
        {occasions.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex-shrink-0 snap-start group"
            >
              <div className="flex flex-col items-center gap-1.5 w-[72px] md:w-[80px]">
                {/* Card */}
                <div
                  className={`
                    relative w-[64px] h-[64px] md:w-[72px] md:h-[72px]
                    rounded-2xl flex items-center justify-center
                    ${item.iconBg}
                    transition-all duration-200
                    group-hover:scale-105 group-hover:shadow-md
                    ${item.highlight ? 'ring-2 ring-pink-400 ring-offset-1' : ''}
                  `}
                >
                  <span className="text-[28px] md:text-[32px] select-none leading-none">
                    {item.emoji}
                  </span>

                  {/* Upcoming date badge */}
                  {item.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="bg-pink-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm">
                        {item.badge}
                      </span>
                    </div>
                  )}

                  {/* Fast badge for same-day */}
                  {item.highlight && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      <span className="bg-amber-400 text-amber-900 text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap uppercase tracking-wide">
                        Fast
                      </span>
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className="text-[11px] md:text-xs text-center text-gray-600 font-medium leading-tight line-clamp-2 group-hover:text-pink-600 transition-colors">
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
      </div>
    </section>
  )
}
