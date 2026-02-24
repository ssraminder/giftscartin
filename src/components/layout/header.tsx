"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import {
  ChevronDown,
  Gift,
  LogOut,
  Package,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCart } from "@/hooks/use-cart"
import { usePartner } from "@/hooks/use-partner"
import { HeaderLocationPicker } from "@/components/location/header-location-picker"
import type { MenuNode } from "@/components/layout/mega-menu"

const INTERNAL_HOSTS_HEADER = [
  "giftscart.netlify.app",
  "giftscart.in",
  "www.giftscart.in",
  "localhost",
]

const MARQUEE_ITEMS = [
  "Free Delivery above \u20B9499",
  "Same Day Delivery Available",
  "4.8\u2B50 Rated",
  "Midnight Delivery in Chandigarh",
]

const CATEGORY_NAV = [
  { label: "Birthday", href: "/category/birthday" },
  { label: "Anniversary", href: "/category/anniversary" },
  { label: "Cakes", href: "/category/cakes" },
  { label: "Flowers", href: "/category/flowers" },
  { label: "Combos", href: "/category/combos" },
  { label: "Plants", href: "/category/plants" },
  { label: "Same Day", href: "/category/same-day" },
  { label: "Under \u20B9499", href: "/category/gifts?maxPrice=499" },
]

function getInitials(name: string | null | undefined): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface HeaderProps {
  logoUrl?: string | null
  menuItems?: MenuNode[]
}

export function Header({ logoUrl = null }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()
  const cartCount = useCart((s) => s.getItemCount())
  const { partner } = usePartner()
  const router = useRouter()

  const withRef = (path: string) => {
    if (!partner?.refCode) return path
    const onPartnerDomain =
      typeof window !== "undefined" &&
      !INTERNAL_HOSTS_HEADER.some((h) => window.location.hostname.includes(h))
    if (onPartnerDomain) return path
    const sep = path.includes("?") ? "&" : "?"
    return `${path}${sep}ref=${partner.refCode}`
  }

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(
        withRef(
          `/category/cakes?search=${encodeURIComponent(searchQuery.trim())}`
        )
      )
      setMobileSearchOpen(false)
    }
  }

  return (
    <>
      <header
        className={`w-full bg-white transition-shadow duration-200 ${
          scrolled ? "shadow-md" : ""
        }`}
      >
        {/* ── Row 1: Top Bar (desktop only) ─────────────────────── */}
        <div className="hidden md:flex border-b border-gray-100 bg-[#FFF8F0]">
          <div className="container mx-auto px-4 flex items-center justify-between h-10">
            {/* Left: delivery location selector */}
            <div className="shrink-0">
              <HeaderLocationPicker />
            </div>

            {/* Right: marquee trust strip */}
            <div className="flex-1 ml-6 overflow-hidden">
              <div className="flex items-center whitespace-nowrap animate-marquee">
                {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((msg, i) => (
                  <span
                    key={i}
                    className="inline-block px-8 text-xs text-gray-500 font-medium"
                  >
                    {msg}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Main Header ────────────────────────────────── */}
        <div className="border-b border-gray-100">
          <div className="container mx-auto flex items-center gap-3 md:gap-4 px-4 h-14 md:h-16">
            {/* Logo */}
            <Link
              href={withRef("/")}
              className="flex items-center shrink-0 gap-1.5"
            >
              {partner?.logoUrl ? (
                <div className="flex flex-col items-start">
                  <Image
                    src={partner.logoUrl}
                    alt={partner.name}
                    width={160}
                    height={32}
                    className="h-8 max-w-[160px] object-contain"
                    unoptimized
                  />
                  {partner.showPoweredBy && (
                    <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                      powered by Gifts Cart India
                    </span>
                  )}
                </div>
              ) : logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Gifts Cart"
                  width={140}
                  height={40}
                  className="object-contain"
                  priority
                />
              ) : (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div className="hidden sm:flex flex-col leading-none">
                    <div className="flex items-baseline">
                      <span className="text-lg font-bold text-[#E91E63]">
                        Gifts
                      </span>
                      <span className="text-lg font-bold text-[#1A1A2E]">
                        Cart
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 tracking-wide">
                      INDIA
                    </span>
                  </div>
                </>
              )}
            </Link>

            {/* Search bar — desktop */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 justify-center mx-4"
            >
              <div className="relative w-full max-w-[520px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cakes, flowers, gifts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#E91E63] focus:bg-white transition-colors placeholder:text-gray-400"
                />
              </div>
            </form>

            {/* Right-side icons */}
            <div className="flex items-center gap-1 md:gap-2 ml-auto shrink-0">
              {/* Mobile: search icon */}
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5 text-gray-700" />
              </button>

              {/* Cart */}
              <Link
                href="/cart"
                className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-pink-50 transition-colors relative"
                aria-label="Cart"
              >
                <ShoppingCart className="h-5 w-5 text-gray-700" />
                {mounted && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#E91E63] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Login / Avatar */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] gradient-primary text-white font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-[10px] text-gray-400 leading-none">
                        Hi
                      </span>
                      <span className="text-xs font-semibold text-gray-800 leading-tight max-w-[80px] truncate">
                        {user.name?.split(" ")[0] || "User"}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-gray-400 hidden md:block" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 rounded-xl shadow-lg"
                  >
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium">
                        {user.name || "User"}
                      </p>
                      {user.phone && (
                        <p className="text-xs text-muted-foreground">
                          {user.phone}
                        </p>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="cursor-pointer">
                        <Package className="mr-2 h-4 w-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="cursor-pointer">
                        <Package className="mr-2 h-4 w-4" />
                        Track Order
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => logout()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  aria-label="Login"
                >
                  <User className="h-5 w-5 text-gray-700" />
                  <span className="hidden md:inline text-sm font-medium text-gray-700">
                    Login
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 3: Category Nav (desktop only) ────────────────── */}
        <div className="hidden md:block border-b border-gray-100">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {CATEGORY_NAV.map((cat) => (
                <Link
                  key={cat.label}
                  href={withRef(cat.href)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-[#E91E63] whitespace-nowrap transition-colors"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Full-Screen Search Overlay ────────────────── */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-white md:hidden">
          <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100">
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100"
              aria-label="Close search"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
            <form onSubmit={handleSearch} className="flex-1">
              <input
                type="text"
                placeholder="Search cakes, flowers, gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 px-4 rounded-full border border-gray-200 bg-gray-50 text-base focus:outline-none focus:border-[#E91E63] placeholder:text-gray-400"
                autoFocus
              />
            </form>
          </div>

          {/* Popular search suggestions */}
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Popular Searches
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Chocolate Cake",
                "Red Roses",
                "Birthday Gifts",
                "Anniversary",
                "Same Day Delivery",
                "Photo Cake",
              ].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term)
                    router.push(
                      withRef(
                        `/category/cakes?search=${encodeURIComponent(term)}`
                      )
                    )
                    setMobileSearchOpen(false)
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:border-[#E91E63] hover:text-[#E91E63] transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
