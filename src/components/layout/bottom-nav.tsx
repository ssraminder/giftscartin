"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react"
import { useCart } from "@/hooks/use-cart"

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/category/cakes", label: "Categories", icon: LayoutGrid },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/login", label: "Account", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const cartCount = useCart((s) => s.getItemCount())

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden" style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-2 transition-colors relative ${
                isActive ? "text-[#E91E63]" : "text-gray-400"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.label === "Cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full gradient-primary text-[9px] font-bold text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full gradient-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
