"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, Clock, Cake, Flower2, TreePine, Package } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { usePartner } from "@/hooks/use-partner"

// ─── API Menu Types ──────────────────────────────────────────────────────────

export interface MenuNode {
  id: string
  label: string
  slug: string | null
  href: string | null
  icon: string | null
  isVisible: boolean
  itemType: string
  sortOrder: number
  children: MenuNode[]
}

// ─── Fallback menu (minimal) in case API fails ──────────────────────────────

const FALLBACK_MENU: MenuNode[] = [
  {
    id: "fb_cakes", label: "Cakes", slug: "cakes", href: null, icon: null,
    isVisible: true, itemType: "top_level", sortOrder: 1, children: [],
  },
  {
    id: "fb_flowers", label: "Flowers", slug: "flowers", href: null, icon: null,
    isVisible: true, itemType: "top_level", sortOrder: 2, children: [],
  },
  {
    id: "fb_gifts", label: "Gifts", slug: "gifts", href: null, icon: null,
    isVisible: true, itemType: "top_level", sortOrder: 3, children: [],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INTERNAL_HOSTS = [
  "giftscart.netlify.app",
  "giftscart.in",
  "www.giftscart.in",
  "localhost",
]

function buildHref(rawHref: string, refCode?: string): string {
  // If href already starts with /, use it directly; otherwise prefix with /category/
  const base = rawHref.startsWith("/") ? rawHref : `/category/${rawHref}`
  if (!refCode) return base
  if (typeof window !== "undefined" && !INTERNAL_HOSTS.some((h) => window.location.hostname.includes(h))) {
    return base
  }
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}ref=${refCode}`
}

/** Filter the tree to only visible items, recursively. */
function filterVisible(nodes: MenuNode[]): MenuNode[] {
  return (nodes || [])
    .filter((n) => n.isVisible)
    .map((n) => ({ ...n, children: filterVisible(n.children || []) }))
}

/** Determine the menu "type" based on the top-level slug */
function getMenuType(item: MenuNode): "standard" | "occasions" | "sameday" {
  if (item.slug === "occasions") return "occasions"
  if (item.slug === "same-day") return "sameday"
  return "standard"
}

// Icon map for same-day items
const SAMEDAY_ICONS: Record<string, React.ReactNode> = {
  cake: <Cake className="h-6 w-6" />,
  flower: <Flower2 className="h-6 w-6" />,
  plant: <TreePine className="h-6 w-6" />,
  package: <Package className="h-6 w-6" />,
}

// ─── Hook: Fetch menu from API ──────────────────────────────────────────────

let cachedMenuPromise: Promise<MenuNode[]> | null = null

function fetchMenuData(): Promise<MenuNode[]> {
  if (cachedMenuPromise) return cachedMenuPromise
  cachedMenuPromise = fetch("/api/admin/menu")
    .then((res) => res.json())
    .then((json) => {
      if (json.success && Array.isArray(json.data)) {
        return json.data as MenuNode[]
      }
      return FALLBACK_MENU
    })
    .catch(() => FALLBACK_MENU)
  // Clear the cached promise after 60 seconds so it refetches
  setTimeout(() => { cachedMenuPromise = null }, 60_000)
  return cachedMenuPromise
}

function applyMenuFilters(data: MenuNode[]): MenuNode[] {
  const visible = filterVisible(data)
  return visible.filter((item) => {
    const type = getMenuType(item)
    if (type === "standard") {
      // Keep items with any children (grouped or flat) or no children (plain links)
      return true
    }
    return item.children.length > 0
  })
}

function useMenuItems(serverMenuItems?: MenuNode[]): MenuNode[] {
  const [items, setItems] = useState<MenuNode[]>(
    serverMenuItems && serverMenuItems.length > 0 ? applyMenuFilters(serverMenuItems) : []
  )

  useEffect(() => {
    // Skip client-side fetch if server provided menu items
    if (serverMenuItems && serverMenuItems.length > 0) return
    fetchMenuData().then((data) => {
      setItems(applyMenuFilters(data))
    })
  }, [serverMenuItems])

  return items
}

// ─── Desktop Dropdown Renderers ──────────────────────────────────────────────

function StandardDropdown({ item, refCode }: { item: MenuNode; refCode?: string }) {
  const groups = item.children.filter((c) => c.children.length > 0)
  const gridCols = groups.length || 1
  return (
    <div
      className="max-w-7xl mx-auto px-6 py-6 grid gap-6"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    >
      {groups.map((group) => (
        <div key={group.id}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            {group.label}
          </h4>
          <ul className="space-y-0.5">
            {group.children.map((link) => (
              <li key={link.id}>
                <Link
                  href={buildHref(link.href || link.slug || "", refCode)}
                  className="text-sm text-gray-700 hover:text-pink-600 hover:translate-x-1 transition-all block py-1"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function OccasionDropdown({ item, refCode }: { item: MenuNode; refCode?: string }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {item.children.map((pill) => (
          <Link
            key={pill.id}
            href={buildHref(pill.href || pill.slug || "", refCode)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50 transition-all group"
          >
            {pill.icon && <span className="text-xl">{pill.icon}</span>}
            <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600 transition-colors">
              {pill.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SameDayDropdown({ item, refCode }: { item: MenuNode; refCode?: string }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="h-5 w-5 text-pink-600" />
        <h3 className="text-base font-semibold text-gray-900">
          Order by 3 PM for Same Day Delivery
        </h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {item.children.map((cat) => (
          <Link
            key={cat.id}
            href={buildHref(cat.href || cat.slug || "", refCode)}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50 hover:shadow-sm transition-all group"
          >
            <div className="text-gray-500 group-hover:text-pink-600 transition-colors">
              {cat.icon && SAMEDAY_ICONS[cat.icon] ? SAMEDAY_ICONS[cat.icon] : <Package className="h-6 w-6" />}
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

// ─── Desktop Mega Menu ───────────────────────────────────────────────────────

export function MegaMenu({ serverMenuItems }: { serverMenuItems?: MenuNode[] }) {
  const menuItems = useMenuItems(serverMenuItems)
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
    (id: string) => {
      clearCloseTimer()
      setActiveMenu(id)
    },
    [clearCloseTimer]
  )

  const handlePanelEnter = useCallback(() => {
    clearCloseTimer()
  }, [clearCloseTimer])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const activeItem = menuItems.find((item) => item.id === activeMenu)
  const activeType = activeItem ? getMenuType(activeItem) : null

  return (
    <>
      <nav className="hidden md:block bg-[#E91E63]" onMouseLeave={scheduleClose}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            {menuItems.map((item) => {
              const hasGroupedChildren = item.children.some(c => c.children.length > 0)
              const hasFlatChildren = item.children.length > 0 && !hasGroupedChildren

              // No children → plain link
              if (item.children.length === 0) {
                return (
                  <Link
                    key={item.id}
                    href={buildHref(item.slug || item.href || "", refCode)}
                    onMouseEnter={() => setActiveMenu(null)}
                    className="px-4 py-2.5 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                )
              }

              // Flat children → simple CSS hover dropdown
              if (hasFlatChildren) {
                return (
                  <div
                    key={item.id}
                    className="relative group"
                    onMouseEnter={() => setActiveMenu(null)}
                  >
                    <button
                      className="px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors text-white/90 hover:text-white hover:bg-white/10 whitespace-nowrap inline-flex items-center gap-1"
                    >
                      {item.label}
                      <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
                    </button>
                    <div className="absolute hidden group-hover:block top-full left-0 bg-white shadow-lg rounded-lg py-2 min-w-48 z-50 border border-gray-100">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          href={buildHref(child.href || child.slug || "", refCode)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              }

              // Grouped children → mega-menu (existing behavior)
              return (
                <button
                  key={item.id}
                  onMouseEnter={() => handleNavEnter(item.id)}
                  onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                  className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap ${
                    activeMenu === item.id
                      ? "text-white bg-white/15"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {activeItem && (
          <div
            className="absolute left-0 right-0 bg-white shadow-lg z-50 border-t border-gray-100"
            onMouseEnter={handlePanelEnter}
            onMouseLeave={scheduleClose}
          >
            {activeType === "standard" && (
              <StandardDropdown item={activeItem} refCode={refCode} />
            )}
            {activeType === "occasions" && (
              <OccasionDropdown item={activeItem} refCode={refCode} />
            )}
            {activeType === "sameday" && (
              <SameDayDropdown item={activeItem} refCode={refCode} />
            )}
          </div>
        )}
      </nav>
    </>
  )
}

// ─── Mobile Mega Menu (Sheet with Accordion) ────────────────────────────────

export function MobileMegaMenu({ serverMenuItems }: { serverMenuItems?: MenuNode[] }) {
  const menuItems = useMenuItems(serverMenuItems)
  const [open, setOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const { partner } = usePartner()
  const refCode = partner?.refCode

  function toggleItem(id: string) {
    setExpandedItem(expandedItem === id ? null : id)
  }

  function renderMobileContent(item: MenuNode) {
    const type = getMenuType(item)

    if (type === "standard") {
      const groups = item.children.filter(c => c.children.length > 0)
      const flatLinks = item.children.filter(c => c.children.length === 0)

      return (
        <div className="pl-4 pb-3 space-y-3">
          {flatLinks.length > 0 && (
            <ul className="space-y-0.5">
              {flatLinks.map((link) => (
                <li key={link.id}>
                  <Link
                    href={buildHref(link.href || link.slug || "", refCode)}
                    className="text-sm text-gray-700 hover:text-pink-600 block py-1 pl-1"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {groups.map((group) => (
            <div key={group.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.children.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={buildHref(link.href || link.slug || "", refCode)}
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
          {item.slug && (
            <Link
              href={buildHref(item.slug, refCode)}
              className="text-sm font-medium text-pink-600 hover:text-pink-700 inline-flex items-center gap-1 pt-1"
              onClick={() => setOpen(false)}
            >
              View All {item.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )
    }

    if (type === "occasions") {
      return (
        <div className="pl-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {item.children.map((pill) => (
              <Link
                key={pill.id}
                href={buildHref(pill.href || pill.slug || "", refCode)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-pink-200 hover:bg-pink-50 text-sm text-gray-700"
                onClick={() => setOpen(false)}
              >
                {pill.icon && <span>{pill.icon}</span>}
                <span>{pill.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )
    }

    if (type === "sameday") {
      return (
        <div className="pl-4 pb-3 space-y-2">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Order by 3 PM for Same Day Delivery
          </p>
          <div className="grid grid-cols-2 gap-2">
            {item.children.map((cat) => (
              <Link
                key={cat.id}
                href={buildHref(cat.href || cat.slug || "", refCode)}
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-pink-200 hover:bg-pink-50"
                onClick={() => setOpen(false)}
              >
                <span className="text-gray-500">
                  {cat.icon && SAMEDAY_ICONS[cat.icon] ? SAMEDAY_ICONS[cat.icon] : <Package className="h-5 w-5" />}
                </span>
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
          {menuItems.map((item) => {
            // No children → plain link
            if (item.children.length === 0) {
              return (
                <div key={item.id} className="border-b border-gray-50">
                  <Link
                    href={buildHref(item.slug || item.href || "", refCode)}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </div>
              )
            }

            const isExpanded = expandedItem === item.id
            return (
              <div key={item.id} className="border-b border-gray-50">
                <button
                  onClick={() => toggleItem(item.id)}
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
