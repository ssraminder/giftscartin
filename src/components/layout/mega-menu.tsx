"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, Clock, Cake, Flower2, TreePine, Package } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { usePartner } from "@/hooks/use-partner"

// ─── Menu Data ───────────────────────────────────────────────────────────────

interface SubcategoryGroup {
  heading: string
  links: { label: string; slug: string }[]
}

interface FeaturedCard {
  title: string
  products: string[]
  viewAllLabel: string
  viewAllSlug: string
}

interface StandardMenuData {
  type: "standard"
  columns: SubcategoryGroup[]
  featured: FeaturedCard
}

interface OccasionPill {
  icon: string
  label: string
  slug: string
}

interface OccasionMenuData {
  type: "occasions"
  pills: OccasionPill[]
}

interface SameDayCategory {
  icon: React.ReactNode
  label: string
  slug: string
}

interface SameDayMenuData {
  type: "sameday"
  heading: string
  categories: SameDayCategory[]
}

type MenuData = StandardMenuData | OccasionMenuData | SameDayMenuData

interface MenuItem {
  label: string
  slug: string
  data: MenuData
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: "Cakes",
    slug: "cakes",
    data: {
      type: "standard",
      columns: [
        {
          heading: "By Flavour",
          links: [
            { label: "Chocolate Cakes", slug: "chocolate-cakes" },
            { label: "Red Velvet Cakes", slug: "red-velvet-cakes" },
            { label: "Black Forest Cakes", slug: "black-forest-cakes" },
            { label: "Butterscotch Cakes", slug: "butterscotch-cakes" },
            { label: "Vanilla Cakes", slug: "vanilla-cakes" },
            { label: "Pineapple Cakes", slug: "pineapple-cakes" },
          ],
        },
        {
          heading: "By Type",
          links: [
            { label: "Photo Cakes", slug: "photo-cakes" },
            { label: "Designer Cakes", slug: "designer-cakes" },
            { label: "Eggless Cakes", slug: "eggless-cakes" },
            { label: "Tier Cakes", slug: "tier-cakes" },
            { label: "Jar Cakes", slug: "jar-cakes" },
            { label: "Cup Cakes", slug: "cup-cakes" },
          ],
        },
        {
          heading: "By Occasion",
          links: [
            { label: "Birthday Cakes", slug: "birthday-cakes" },
            { label: "Anniversary Cakes", slug: "anniversary-cakes" },
            { label: "Wedding Cakes", slug: "wedding-cakes" },
            { label: "Baby Shower Cakes", slug: "baby-shower-cakes" },
            { label: "Farewell Cakes", slug: "farewell-cakes" },
            { label: "Congratulations Cakes", slug: "congratulations-cakes" },
          ],
        },
      ],
      featured: {
        title: "Best Sellers this Week",
        products: ["Chocolate Truffle Cake", "Red Velvet Heart Cake", "Black Forest Classic"],
        viewAllLabel: "View All Cakes",
        viewAllSlug: "cakes",
      },
    },
  },
  {
    label: "Flowers",
    slug: "flowers",
    data: {
      type: "standard",
      columns: [
        {
          heading: "By Flower",
          links: [
            { label: "Red Roses", slug: "red-roses" },
            { label: "Mixed Roses", slug: "mixed-roses" },
            { label: "Sunflowers", slug: "sunflowers" },
            { label: "Lilies", slug: "lilies" },
            { label: "Orchids", slug: "orchids" },
            { label: "Carnations", slug: "carnations" },
          ],
        },
        {
          heading: "By Arrangement",
          links: [
            { label: "Bouquets", slug: "bouquets" },
            { label: "Flower Boxes", slug: "flower-boxes" },
            { label: "Vase Arrangements", slug: "vase-arrangements" },
            { label: "Hand-Tied Bunches", slug: "hand-tied-bunches" },
            { label: "Table Arrangements", slug: "table-arrangements" },
          ],
        },
        {
          heading: "By Occasion",
          links: [
            { label: "Valentine's Day Flowers", slug: "valentines-day-flowers" },
            { label: "Mother's Day Flowers", slug: "mothers-day-flowers" },
            { label: "Birthday Flowers", slug: "birthday-flowers" },
            { label: "Anniversary Flowers", slug: "anniversary-flowers" },
            { label: "Sympathy Flowers", slug: "sympathy-flowers" },
          ],
        },
      ],
      featured: {
        title: "Trending Bouquets",
        products: ["Premium Red Rose Bouquet", "Sunflower Delight", "Mixed Flower Box"],
        viewAllLabel: "View All Flowers",
        viewAllSlug: "flowers",
      },
    },
  },
  {
    label: "Combos & Hampers",
    slug: "combos",
    data: {
      type: "standard",
      columns: [
        {
          heading: "Cake Combos",
          links: [
            { label: "Cake + Flowers", slug: "cake-flowers-combo" },
            { label: "Cake + Chocolate", slug: "cake-chocolate-combo" },
            { label: "Cake + Teddy", slug: "cake-teddy-combo" },
            { label: "Cake + Card", slug: "cake-card-combo" },
            { label: "Cake + Balloon", slug: "cake-balloon-combo" },
          ],
        },
        {
          heading: "Gift Hampers",
          links: [
            { label: "Chocolate Hampers", slug: "chocolate-hampers" },
            { label: "Dry Fruit Hampers", slug: "dry-fruit-hampers" },
            { label: "Spa Hampers", slug: "spa-hampers" },
            { label: "Corporate Hampers", slug: "corporate-hampers" },
          ],
        },
        {
          heading: "Occasion Bundles",
          links: [
            { label: "Birthday Bundles", slug: "birthday-bundles" },
            { label: "Anniversary Packages", slug: "anniversary-packages" },
            { label: "Festival Specials", slug: "festival-specials" },
            { label: "New Baby Hampers", slug: "new-baby-hampers" },
          ],
        },
      ],
      featured: {
        title: "Popular Combos",
        products: ["Cake & Roses Combo", "Premium Gift Hamper", "Birthday Surprise Box"],
        viewAllLabel: "View All Combos",
        viewAllSlug: "combos",
      },
    },
  },
  {
    label: "Plants",
    slug: "plants",
    data: {
      type: "standard",
      columns: [
        {
          heading: "Indoor Plants",
          links: [
            { label: "Money Plant", slug: "money-plant" },
            { label: "Peace Lily", slug: "peace-lily" },
            { label: "Snake Plant", slug: "snake-plant" },
            { label: "Jade Plant", slug: "jade-plant" },
            { label: "Bamboo", slug: "bamboo" },
          ],
        },
        {
          heading: "Flowering Plants",
          links: [
            { label: "Adenium", slug: "adenium" },
            { label: "Hibiscus", slug: "hibiscus" },
            { label: "Bougainvillea", slug: "bougainvillea" },
            { label: "Rose Plant", slug: "rose-plant" },
          ],
        },
      ],
      featured: {
        title: "Top Picks",
        products: ["Lucky Bamboo Set", "Peace Lily in Ceramic Pot", "Money Plant Golden"],
        viewAllLabel: "View All Plants",
        viewAllSlug: "plants",
      },
    },
  },
  {
    label: "Gifts",
    slug: "gifts",
    data: {
      type: "standard",
      columns: [
        {
          heading: "By Category",
          links: [
            { label: "Chocolates", slug: "chocolates" },
            { label: "Dry Fruits", slug: "dry-fruits" },
            { label: "Soft Toys", slug: "soft-toys" },
            { label: "Mugs & Cushions", slug: "mugs-cushions" },
            { label: "Personalised Gifts", slug: "personalised-gifts" },
          ],
        },
        {
          heading: "By Recipient",
          links: [
            { label: "Gifts for Him", slug: "gifts-for-him" },
            { label: "Gifts for Her", slug: "gifts-for-her" },
            { label: "Gifts for Kids", slug: "gifts-for-kids" },
            { label: "Gifts for Parents", slug: "gifts-for-parents" },
          ],
        },
        {
          heading: "By Price",
          links: [
            { label: "Under \u20B9499", slug: "gifts?maxPrice=499" },
            { label: "\u20B9500 - \u20B9999", slug: "gifts?minPrice=500&maxPrice=999" },
            { label: "\u20B91000 - \u20B91999", slug: "gifts?minPrice=1000&maxPrice=1999" },
            { label: "Above \u20B92000", slug: "gifts?minPrice=2000" },
          ],
        },
      ],
      featured: {
        title: "Best Gift Ideas",
        products: ["Personalised Photo Frame", "Premium Chocolate Box", "Spa Gift Set"],
        viewAllLabel: "View All Gifts",
        viewAllSlug: "gifts",
      },
    },
  },
  {
    label: "Occasions",
    slug: "occasions",
    data: {
      type: "occasions",
      pills: [
        { icon: "\u{1F382}", label: "Birthday", slug: "gifts?occasion=birthday" },
        { icon: "\u{1F48D}", label: "Anniversary", slug: "gifts?occasion=anniversary" },
        { icon: "\u{1F49D}", label: "Valentine's Day", slug: "gifts?occasion=valentines-day" },
        { icon: "\u{1F469}", label: "Mother's Day", slug: "gifts?occasion=mothers-day" },
        { icon: "\u{1F468}", label: "Father's Day", slug: "gifts?occasion=fathers-day" },
        { icon: "\u{1F393}", label: "Graduation", slug: "gifts?occasion=graduation" },
        { icon: "\u{1F490}", label: "Farewell", slug: "gifts?occasion=farewell" },
        { icon: "\u{1F476}", label: "Baby Shower", slug: "gifts?occasion=baby-shower" },
        { icon: "\u{1F4BC}", label: "Corporate", slug: "gifts?occasion=corporate" },
        { icon: "\u{1FA94}", label: "Diwali", slug: "gifts?occasion=diwali" },
        { icon: "\u{1F384}", label: "Christmas", slug: "gifts?occasion=christmas" },
        { icon: "\u{1F38A}", label: "New Year", slug: "gifts?occasion=new-year" },
      ],
    },
  },
  {
    label: "Same Day Delivery",
    slug: "same-day-delivery",
    data: {
      type: "sameday",
      heading: "Order by 3 PM for Same Day Delivery",
      categories: [
        { icon: <Cake className="h-6 w-6" />, label: "Cakes", slug: "cakes?delivery=same-day" },
        { icon: <Flower2 className="h-6 w-6" />, label: "Flowers", slug: "flowers?delivery=same-day" },
        { icon: <TreePine className="h-6 w-6" />, label: "Plants", slug: "plants?delivery=same-day" },
        { icon: <Package className="h-6 w-6" />, label: "Combos", slug: "combos?delivery=same-day" },
      ],
    },
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INTERNAL_HOSTS = [
  "giftscart.netlify.app",
  "giftscart.in",
  "www.giftscart.in",
  "localhost",
]

function buildHref(slug: string, refCode?: string): string {
  const base = `/category/${slug}`
  if (!refCode) return base
  if (typeof window !== "undefined" && !INTERNAL_HOSTS.some((h) => window.location.hostname.includes(h))) {
    return base
  }
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}ref=${refCode}`
}

// ─── Desktop Mega Menu ──────────────────────────────────────────────────────

function StandardDropdown({ data, refCode }: { data: StandardMenuData; refCode?: string }) {
  const gridCols = data.columns.length + 1 // +1 for featured card
  return (
    <div
      className="max-w-7xl mx-auto px-6 py-6 grid gap-6"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    >
      {data.columns.map((col) => (
        <div key={col.heading}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            {col.heading}
          </h4>
          <ul className="space-y-0.5">
            {col.links.map((link) => (
              <li key={link.slug}>
                <Link
                  href={buildHref(link.slug, refCode)}
                  className="text-sm text-gray-700 hover:text-pink-600 hover:translate-x-1 transition-all block py-1"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 flex flex-col">
        <div className="h-32 rounded-lg bg-gray-100 mb-2" />
        <h4 className="font-semibold text-sm text-gray-900 mb-1">{data.featured.title}</h4>
        <ul className="space-y-0.5 flex-1">
          {data.featured.products.map((name) => (
            <li key={name} className="text-xs text-gray-500">{name}</li>
          ))}
        </ul>
        <Link
          href={buildHref(data.featured.viewAllSlug, refCode)}
          className="mt-3 text-sm font-medium text-pink-600 hover:text-pink-700 inline-flex items-center gap-1"
        >
          {data.featured.viewAllLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

function OccasionDropdown({ data, refCode }: { data: OccasionMenuData; refCode?: string }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.pills.map((pill) => (
          <Link
            key={pill.slug}
            href={buildHref(pill.slug, refCode)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50 transition-all group"
          >
            <span className="text-xl">{pill.icon}</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600 transition-colors">
              {pill.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SameDayDropdown({ data, refCode }: { data: SameDayMenuData; refCode?: string }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="h-5 w-5 text-pink-600" />
        <h3 className="text-base font-semibold text-gray-900">{data.heading}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.categories.map((cat) => (
          <Link
            key={cat.slug}
            href={buildHref(cat.slug, refCode)}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50 hover:shadow-sm transition-all group"
          >
            <div className="text-gray-500 group-hover:text-pink-600 transition-colors">
              {cat.icon}
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600 transition-colors">
              {cat.label}
            </span>
            <span className="text-xs text-pink-600 font-medium inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              Shop Now <ChevronRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function MegaMenu() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { partner } = usePartner()
  const refCode = partner?.refCode

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      setActiveMenu(null)
    }, 150)
  }, [clearCloseTimer])

  const handleNavEnter = useCallback(
    (slug: string) => {
      clearCloseTimer()
      setActiveMenu(slug)
    },
    [clearCloseTimer]
  )

  const handlePanelEnter = useCallback(() => {
    clearCloseTimer()
  }, [clearCloseTimer])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const activeItem = MENU_ITEMS.find((item) => item.slug === activeMenu)

  return (
    <>
      {/* Desktop mega menu */}
      <nav className="hidden md:block bg-white border-b border-gray-200" onMouseLeave={scheduleClose}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.slug}
                onMouseEnter={() => handleNavEnter(item.slug)}
                onClick={() => setActiveMenu(activeMenu === item.slug ? null : item.slug)}
                className={`px-4 py-3 text-sm font-medium cursor-pointer transition-colors border-b-2 whitespace-nowrap ${
                  activeMenu === item.slug
                    ? "text-pink-600 border-pink-500"
                    : "text-gray-600 border-transparent hover:text-pink-600 hover:border-pink-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown panel */}
        {activeItem && (
          <div
            className="absolute left-0 right-0 bg-white shadow-lg z-50 border-t border-gray-100"
            onMouseEnter={handlePanelEnter}
            onMouseLeave={scheduleClose}
          >
            {activeItem.data.type === "standard" && (
              <StandardDropdown data={activeItem.data} refCode={refCode} />
            )}
            {activeItem.data.type === "occasions" && (
              <OccasionDropdown data={activeItem.data} refCode={refCode} />
            )}
            {activeItem.data.type === "sameday" && (
              <SameDayDropdown data={activeItem.data} refCode={refCode} />
            )}
          </div>
        )}
      </nav>
    </>
  )
}

// ─── Mobile Mega Menu (Sheet with Accordion) ────────────────────────────────

export function MobileMegaMenu() {
  const [open, setOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const { partner } = usePartner()
  const refCode = partner?.refCode

  function toggleItem(slug: string) {
    setExpandedItem(expandedItem === slug ? null : slug)
  }

  function renderMobileContent(item: MenuItem) {
    const { data } = item
    if (data.type === "standard") {
      return (
        <div className="pl-4 pb-3 space-y-3">
          {data.columns.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                {col.heading}
              </p>
              <ul className="space-y-0.5">
                {col.links.map((link) => (
                  <li key={link.slug}>
                    <Link
                      href={buildHref(link.slug, refCode)}
                      className="text-sm text-gray-700 hover:text-pink-600 block py-1 pl-1"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link
            href={buildHref(data.featured.viewAllSlug, refCode)}
            className="text-sm font-medium text-pink-600 hover:text-pink-700 inline-flex items-center gap-1 pt-1"
            onClick={() => setOpen(false)}
          >
            {data.featured.viewAllLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )
    }
    if (data.type === "occasions") {
      return (
        <div className="pl-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {data.pills.map((pill) => (
              <Link
                key={pill.slug}
                href={buildHref(pill.slug, refCode)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-pink-200 hover:bg-pink-50 text-sm text-gray-700"
                onClick={() => setOpen(false)}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )
    }
    if (data.type === "sameday") {
      return (
        <div className="pl-4 pb-3 space-y-2">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {data.heading}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {data.categories.map((cat) => (
              <Link
                key={cat.slug}
                href={buildHref(cat.slug, refCode)}
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-pink-200 hover:bg-pink-50"
                onClick={() => setOpen(false)}
              >
                <span className="text-gray-500">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-700">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="md:hidden flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 border-b-2 border-transparent"
          aria-label="Browse categories"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Menu</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 overflow-y-auto">
        <SheetHeader className="p-4 border-b border-gray-100">
          <SheetTitle className="text-left text-base">Browse Categories</SheetTitle>
        </SheetHeader>
        <div className="py-2">
          {MENU_ITEMS.map((item) => {
            const isExpanded = expandedItem === item.slug
            return (
              <div key={item.slug} className="border-b border-gray-50">
                <button
                  onClick={() => toggleItem(item.slug)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>{item.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isExpanded && renderMobileContent(item)}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
