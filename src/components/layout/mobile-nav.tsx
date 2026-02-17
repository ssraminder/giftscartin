"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Menu,
  Home,
  Cake,
  Flower2,
  Gift,
  TreePine,
  Package,
  User,
  ShoppingCart,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CitySelector } from "./city-selector"

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/category/cakes", label: "Cakes", icon: Cake },
  { href: "/category/flowers", label: "Flowers", icon: Flower2 },
  { href: "/category/combos", label: "Combos", icon: Package },
  { href: "/category/plants", label: "Plants", icon: TreePine },
  { href: "/category/gifts", label: "Gifts", icon: Gift },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-10 w-10 rounded-full"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <SheetContent side="left" className="w-[300px] p-0 bg-white">
        <SheetHeader className="p-5 pb-3 bg-gradient-to-r from-[#E91E63] to-[#FF6B9D]">
          <SheetTitle className="text-left text-lg font-bold text-white flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
              <Gift className="h-4 w-4 text-white" />
            </div>
            Gifts Cart India
          </SheetTitle>
          <SheetDescription className="text-left text-xs text-white/80">
            Send Love, Send Gifts — Anywhere in India
          </SheetDescription>
        </SheetHeader>

        {/* City Selector */}
        <div className="px-5 py-3">
          <CitySelector variant="compact" />
        </div>

        <Separator />

        {/* Navigation Links */}
        <nav className="flex flex-col py-2">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-pink-50 hover:text-[#E91E63]"
              >
                <Icon className="h-4.5 w-4.5 text-gray-400" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <Separator />

        {/* Account & Cart Links */}
        <div className="flex flex-col py-2">
          <Link
            href="/cart"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-pink-50 hover:text-[#E91E63]"
          >
            <ShoppingCart className="h-4.5 w-4.5 text-gray-400" />
            My Cart
          </Link>
          <Link
            href="/orders"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-pink-50 hover:text-[#E91E63]"
          >
            <Package className="h-4.5 w-4.5 text-gray-400" />
            My Orders
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-pink-50 hover:text-[#E91E63]"
          >
            <User className="h-4.5 w-4.5 text-gray-400" />
            Login / Sign Up
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
