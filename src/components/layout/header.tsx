"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ShoppingCart, User, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CitySelector } from "./city-selector"
import { MobileNav } from "./mobile-nav"

const CATEGORY_LINKS = [
  { href: "/category/cakes", label: "Cakes" },
  { href: "/category/flowers", label: "Flowers" },
  { href: "/category/combos", label: "Combos" },
  { href: "/category/plants", label: "Plants" },
  { href: "/category/gifts", label: "Gifts" },
]

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // TODO: Replace with actual cart count from Zustand store
  const cartCount = 0

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Main Bar */}
      <div className="container mx-auto flex h-14 items-center gap-2 px-4 md:h-16">
        {/* Mobile Hamburger */}
        <MobileNav />

        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <span className="text-xl font-bold text-primary">Gift</span>
          <span className="text-xl font-bold text-foreground">India</span>
        </Link>

        {/* City Selector - Desktop */}
        <div className="hidden sm:block ml-3">
          <CitySelector />
        </div>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for cakes, flowers, gifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-full bg-muted/50 border-muted"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search"
          >
            {searchOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </Button>

          {/* Mobile City Selector */}
          <div className="sm:hidden">
            <CitySelector variant="compact" />
          </div>

          {/* Login Button - Desktop */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:inline-flex gap-1.5"
          >
            <Link href="/login">
              <User className="h-4 w-4" />
              <span>Login</span>
            </Link>
          </Button>

          {/* Cart */}
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar (expandable) */}
      {searchOpen && (
        <div className="border-t px-4 py-2 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for cakes, flowers, gifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-full bg-muted/50 border-muted"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Category Navigation - Desktop */}
      <nav className="hidden md:block border-t">
        <div className="container mx-auto flex items-center gap-6 px-4 h-10">
          {CATEGORY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
