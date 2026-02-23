// Header — updated city display with inline location dropdown
"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
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
import { useCity } from "@/hooks/use-city"
import { usePartner } from "@/hooks/use-partner"
import { LocationSearch } from "@/components/location/location-search"
import type { ResolvedLocation } from "@/components/location/location-search"
import { MegaMenu, MobileMegaMenu, type MenuNode } from "@/components/layout/mega-menu"

const INTERNAL_HOSTS_HEADER = [
  'giftscart.netlify.app',
  'giftscart.in',
  'www.giftscart.in',
  'localhost',
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

export function Header({ logoUrl = null, menuItems = [] }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const locationDropdownRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()
  const cartCount = useCart((s) => s.getItemCount())
  const { cityName, areaName, isSelected, setCity, clearCity } = useCity()
  const { partner } = usePartner()
  const router = useRouter()

  const withRef = (path: string) => {
    if (!partner?.refCode) return path
    const onPartnerDomain = typeof window !== 'undefined' &&
      !INTERNAL_HOSTS_HEADER.some(h => window.location.hostname.includes(h))
    if (onPartnerDomain) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}ref=${partner.refCode}`
  }

  const user = session?.user as { id?: string; name?: string | null; phone?: string; role?: string } | undefined

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close location dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(withRef(`/category/cakes?search=${encodeURIComponent(searchQuery.trim())}`))
      setMobileSearchOpen(false)
    }
  }

  function handleLocationSelect(location: ResolvedLocation) {
    setCity({
      cityId: location.cityId || '',
      cityName: location.cityName || location.areaName || '',
      citySlug: location.citySlug || (location.cityName || '').toLowerCase().replace(/\s+/g, '-'),
      pincode: location.pincode || undefined,
      areaName: location.areaName || undefined,
      lat: location.lat || undefined,
      lng: location.lng || undefined,
      source: location.type,
    })
    setLocationDropdownOpen(false)
  }

  // Display text for location
  const locationDisplayText = isSelected
    ? (areaName || cityName || 'Location set')
    : null

  return (
    <header className="w-full">
      {/* ROW 1: Top utility bar — desktop only */}
      <div className="hidden md:block bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto flex items-center justify-between px-4 h-8">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{"\u{1F4DE}"} +91 98765 43210</span>
            <span className="mx-1.5">|</span>
            <span>support@giftscart.in</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Link href={withRef("/orders")} className="hover:text-[#E91E63] transition-colors">
              Track Order
            </Link>
            <span>|</span>
            <Link href={withRef("/category/gifts?occasion=corporate")} className="hover:text-[#E91E63] transition-colors">
              Corporate Gifting
            </Link>
            <span>|</span>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="hover:text-[#E91E63] transition-colors flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{user.name || "My Account"}</span>
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{user.name || "User"}</p>
                    {user.phone && (
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className="hover:text-[#E91E63] transition-colors flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: Main header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          {/* Logo — 25% on desktop */}
          <Link href={withRef("/")} className="flex items-center shrink-0 gap-1 md:w-1/4">
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                  <Gift className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-baseline">
                  <span className="text-xl font-bold text-[#E91E63]">Gifts</span>
                  <span className="text-xl font-bold text-[#1A1A2E]">Cart</span>
                </div>
              </>
            )}
          </Link>

          {/* Location selector — FNP style */}
          <div ref={locationDropdownRef} className="relative hidden sm:block">
            <button
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              className="flex items-center gap-1.5 text-sm hover:text-[#E91E63] transition-colors"
            >
              {/* India flag */}
              <span className="text-base leading-none">{"\u{1F1EE}\u{1F1F3}"}</span>
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-gray-400 leading-none">Where to deliver?</span>
                {locationDisplayText ? (
                  <span className="text-xs font-semibold text-gray-800 max-w-[140px] truncate leading-tight">
                    {locationDisplayText}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-red-500 leading-tight">
                    Location missing
                  </span>
                )}
              </div>
              <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
            </button>

            {/* Location dropdown */}
            {locationDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">
                    {isSelected ? `Delivering to ${cityName || 'your area'}` : 'Where should we deliver?'}
                  </p>
                  {isSelected && (
                    <button
                      onClick={() => {
                        clearCity()
                      }}
                      className="text-xs text-pink-600 hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
                <LocationSearch
                  onSelect={handleLocationSelect}
                  autoFocus
                  compact
                />
              </div>
            )}
          </div>

          {/* Search bar — center on desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search cakes, flowers, gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-4 pr-12 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-pink-400 focus:bg-white transition-colors placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full gradient-primary text-white hover:opacity-90 transition-opacity"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto md:w-1/4 md:justify-end">
            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {/* Mobile location button — FNP style */}
            <button
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              className="sm:hidden flex items-center gap-1 text-sm"
            >
              <span className="text-base leading-none">{"\u{1F1EE}\u{1F1F3}"}</span>
              {locationDisplayText ? (
                <span className="text-xs font-semibold text-gray-800 max-w-[70px] truncate">
                  {locationDisplayText}
                </span>
              ) : (
                <span className="text-xs font-semibold text-red-500">
                  Location missing
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {/* Mobile location dropdown (below header) */}
            {locationDropdownOpen && (
              <div className="sm:hidden fixed inset-x-0 top-[56px] bg-white border-b border-gray-200 shadow-lg z-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">
                    {isSelected ? `Delivering to ${cityName || 'your area'}` : 'Where should we deliver?'}
                  </p>
                  {isSelected && (
                    <button
                      onClick={() => clearCity()}
                      className="text-xs text-pink-600 hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
                <LocationSearch
                  onSelect={handleLocationSelect}
                  autoFocus
                />
              </div>
            )}

            {/* Cart icon */}
            <Link
              href="/cart"
              className="relative flex items-center justify-center h-9 w-9 rounded-full hover:bg-pink-50 transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* Login — mobile icon only */}
            {!user && (
              <Link
                href="/login"
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-pink-50 transition-colors"
                aria-label="Login"
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            {/* Account avatar — mobile */}
            {user && (
              <Link
                href="/orders"
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-full"
                aria-label="Account"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] gradient-primary text-white font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search bar (expandable) */}
        {mobileSearchOpen && (
          <div className="border-t px-4 py-2 md:hidden bg-white">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search cakes, flowers, gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-4 pr-12 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-pink-400 placeholder:text-gray-400"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full gradient-primary text-white"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ROW 3: Mega menu (desktop) + mobile menu trigger */}
      <div className="relative">
        <MegaMenu serverMenuItems={menuItems} />
        <div className="md:hidden bg-white border-b border-gray-200 px-4">
          <MobileMegaMenu serverMenuItems={menuItems} />
        </div>
      </div>
    </header>
  )
}
