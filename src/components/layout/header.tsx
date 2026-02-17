"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  Cake,
  Flower2,
  Gift,
  LogOut,
  Package,
  Search,
  ShoppingCart,
  TreePine,
  User,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { CitySelector } from "./city-selector"
import { MobileNav } from "./mobile-nav"

const CATEGORY_LINKS = [
  { href: "/category/cakes", label: "Cakes", icon: Cake },
  { href: "/category/flowers", label: "Flowers", icon: Flower2 },
  { href: "/category/combos", label: "Combos", icon: Package },
  { href: "/category/plants", label: "Plants", icon: TreePine },
  { href: "/category/gifts", label: "Gifts", icon: Gift },
]

const OCCASION_LINKS = [
  { href: "/category/gifts?occasion=birthday", label: "Birthday" },
  { href: "/category/gifts?occasion=anniversary", label: "Anniversary" },
  { href: "/category/gifts?occasion=valentines-day", label: "Valentine's" },
  { href: "/category/gifts?occasion=wedding", label: "Wedding" },
  { href: "/category/gifts?occasion=thank-you", label: "Thank You" },
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

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()
  const cartCount = useCart((s) => s.getItemCount())

  const user = session?.user as { id?: string; name?: string | null; phone?: string; role?: string } | undefined

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Top Trust Bar */}
      <div
        className={`gradient-primary text-white transition-all duration-300 overflow-hidden ${
          scrolled ? "h-0" : "h-9"
        }`}
      >
        <div className="container mx-auto flex h-9 items-center justify-center gap-6 px-4 text-xs font-medium sm:gap-10 sm:text-sm">
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <span className="opacity-90">Free Delivery on orders above ₹499</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="opacity-90">Same Day & Midnight Delivery</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5">
            <span className="opacity-90">100% Safe Payments</span>
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div
        className={`bg-white transition-shadow duration-300 ${
          scrolled ? "shadow-md" : "shadow-sm"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center gap-3 px-4">
          {/* Mobile Hamburger */}
          <MobileNav />

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0 gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold text-[#E91E63]">Gift</span>
              <span className="text-xl font-bold text-[#1A1A2E]">India</span>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for cakes, flowers, gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-full border-2 border-pink-200 bg-white focus:border-pink-400 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Mobile Search Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 rounded-full"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
            >
              {searchOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>

            {/* City Selector */}
            <div className="hidden sm:flex items-center">
              <CitySelector />
            </div>
            <div className="sm:hidden">
              <CitySelector variant="compact" />
            </div>

            {/* Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative hidden sm:inline-flex h-10 w-10 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs gradient-primary text-white font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
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
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden sm:inline-flex gap-1.5 rounded-full hover:bg-pink-50 hover:text-pink-600"
              >
                <Link href="/login">
                  <User className="h-4 w-4" />
                  <span>Login</span>
                </Link>
              </Button>
            )}

            {/* Cart */}
            <Button variant="ghost" size="icon" asChild className="relative h-10 w-10 rounded-full hover:bg-pink-50">
              <Link href="/cart" aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
                {mounted && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full gradient-primary text-[10px] font-bold text-white shadow-sm">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar (expandable) */}
        {searchOpen && (
          <div className="border-t px-4 py-2 md:hidden bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for cakes, flowers, gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-full border-2 border-pink-200 bg-white"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Category + Occasion Navigation - Desktop */}
        <nav className="hidden md:block border-t border-gray-100">
          <div className="container mx-auto flex items-center gap-1 px-4 h-11">
            {/* Category Links with Icons */}
            {CATEGORY_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:text-[#E91E63] rounded-full hover:bg-pink-50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              )
            })}

            {/* Separator */}
            <div className="h-5 w-px bg-gray-200 mx-2" />

            {/* Occasion Links */}
            {OCCASION_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm text-gray-500 transition-all duration-200 hover:text-[#E91E63] rounded-full hover:bg-pink-50"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  )
}
