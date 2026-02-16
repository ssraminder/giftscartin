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
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left text-lg font-bold text-primary">
            GiftIndia
          </SheetTitle>
          <SheetDescription className="text-left text-xs">
            Fresh gifts delivered across India
          </SheetDescription>
        </SheetHeader>

        {/* City Selector */}
        <div className="px-4 py-2">
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
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-primary"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
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
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-primary"
          >
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            My Cart
          </Link>
          <Link
            href="/orders"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-primary"
          >
            <Package className="h-4 w-4 text-muted-foreground" />
            My Orders
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-primary"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            Login / Sign Up
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
