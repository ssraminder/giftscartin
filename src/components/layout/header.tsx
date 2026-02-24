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
  Building2,
  MoreHorizontal,
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
  const { user, logout } = useAuth()
  const cartCount = useCart((s) => s.getItemCount())
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

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(withRef(`/category/cakes?search=${encodeURIComponent(searchQuery.trim())}`))
      setMobileSearchOpen(false)
    }
  }

  return (
    <header className="w-full border-b border-gray-100">
      {/* Main header row — FNP style clean single row */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto flex items-center gap-2 md:gap-4 px-4 h-16">
          {/* Logo */}
          <Link href={withRef("/")} className="flex items-center shrink-0 gap-1.5">
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
                    <span className="text-lg font-bold text-[#E91E63]">Gifts</span>
                    <span className="text-lg font-bold text-[#1A1A2E]">Cart</span>
                  </div>
                  <span className="text-[9px] text-gray-400 tracking-wide">INDIA</span>
                </div>
              </>
            )}
          </Link>

          {/* Location selector — FNP "Where to deliver?" style */}
          <div className="hidden md:block border-l border-gray-200 pl-4 ml-2">
            <HeaderLocationPicker />
          </div>

          {/* Search bar — centered, prominent, FNP style */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 justify-center mx-4">
            <div className="relative w-full max-w-[480px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cakes, flowers & gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#E91E63] focus:bg-white transition-colors placeholder:text-gray-400"
              />
            </div>
          </form>

          {/* Right side utility icons — FNP style */}
          <div className="flex items-center gap-1 md:gap-0.5 ml-auto shrink-0">
            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {/* Mobile location button */}
            <div className="md:hidden">
              <HeaderLocationPicker />
            </div>

            {/* Cart icon */}
            <Link
              href="/cart"
              className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-pink-50 transition-colors"
              aria-label="Cart"
            >
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {mounted && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Account / Login */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] gradient-primary text-white font-semibold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-[10px] text-gray-400 leading-none">Hi</span>
                    <span className="text-xs font-semibold text-gray-800 leading-tight max-w-[80px] truncate">
                      {user.name?.split(" ")[0] || "User"}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-gray-400 hidden md:block" />
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
                className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-50 transition-colors"
                aria-label="Login"
              >
                <User className="h-5 w-5 text-gray-700" />
              </Link>
            )}

            {/* More menu — desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden md:flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 transition-colors">
                <MoreHorizontal className="h-5 w-5 text-gray-600" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                <DropdownMenuItem asChild>
                  <Link href={withRef("/orders")} className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    Track Order
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={withRef("/category/gifts?occasion=corporate")} className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" />
                    Corporate Gifting
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile search bar (expandable) */}
        {mobileSearchOpen && (
          <div className="border-t px-4 py-2 md:hidden bg-white">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cakes, flowers, gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#E91E63] placeholder:text-gray-400"
                autoFocus
              />
            </form>
          </div>
        )}
      </div>

      {/* Navigation bar — FNP style pink/red background */}
      <div className="relative">
        <MegaMenu serverMenuItems={menuItems} />
        <div className="md:hidden bg-white border-b border-gray-200 px-4">
          <MobileMegaMenu serverMenuItems={menuItems} />
        </div>
      </div>
    </header>
  )
}
