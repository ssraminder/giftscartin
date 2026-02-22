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
  MapPin,
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
import { CitySearch } from "@/components/location/city-search"
import { POPULAR_CITIES } from "@/lib/cities-data"
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
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()
  const cartCount = useCart((s) => s.getItemCount())
  const { cityId, cityName, citySlug, areaName, pincode: cityPincode, isSelected, setCity, clearCity, setArea } = useCity()
  const [headerPincode, setHeaderPincode] = useState(cityPincode || "")
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

  // Close city dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false)
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

  function handlePincodeSubmit(val: string) {
    if (val.length !== 6 || !cityId || !citySlug || !cityName) return
    setArea({ name: "", pincode: val, isServiceable: true })
    setCityDropdownOpen(false)
  }

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

          {/* Search bar — center 50% on desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-4 md:w-1/2">
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

          {/* Right actions — 25% on desktop */}
          <div className="flex items-center gap-2 ml-auto md:w-1/4 md:justify-end">
            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {/* City selector pill */}
            <div ref={cityDropdownRef} className="relative">
              <button
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className={`flex items-center gap-1 text-sm transition-colors hover:text-[#E91E63] rounded-full border px-2.5 py-1.5 ${
                  isSelected
                    ? "border-gray-200 bg-white"
                    : "border-[#E91E63]/30 bg-pink-50"
                }`}
              >
                <MapPin className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#E91E63]' : 'text-[#E91E63] animate-pulse'}`} />
                <span className="truncate max-w-[80px] sm:max-w-[120px] font-medium text-xs sm:text-sm">
                  {isSelected ? (areaName || cityName) : "Select City"}
                </span>
                <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
              </button>

              {/* City dropdown */}
              {cityDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-4">
                  {!cityId ? (
                    <>
                      <p className="text-sm font-medium text-gray-700 mb-2">Select delivery city</p>
                      <CitySearch
                        onSelect={(selection) => {
                          setCity(selection)
                          setHeaderPincode("")
                        }}
                        autoFocus
                        placeholder="Search city or pincode..."
                      />
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2">Popular Cities</p>
                        <div className="flex flex-wrap gap-1.5">
                          {POPULAR_CITIES.filter(c => !c.isComingSoon).map((city) => (
                            <button
                              key={city.citySlug}
                              onClick={() => {
                                setCity({
                                  cityId: city.cityId,
                                  cityName: city.cityName,
                                  citySlug: city.citySlug,
                                })
                                setHeaderPincode("")
                              }}
                              className="px-2.5 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#E91E63] hover:text-[#E91E63] hover:bg-pink-50 transition-colors"
                            >
                              {city.cityName}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{cityName}</span>
                        <button
                          onClick={() => {
                            clearCity()
                            setHeaderPincode("")
                          }}
                          className="text-xs text-pink-600 hover:underline"
                        >
                          Change city
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter delivery pincode"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        value={headerPincode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          setHeaderPincode(val)
                          if (val.length === 6) {
                            handlePincodeSubmit(val)
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

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
