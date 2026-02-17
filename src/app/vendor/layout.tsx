"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  IndianRupee,
  Settings,
  Store,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const sidebarLinks = [
  { href: "/vendor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingBag },
  { href: "/vendor/products", label: "Products", icon: Package },
  { href: "/vendor/earnings", label: "Earnings", icon: IndianRupee },
  { href: "/vendor/settings", label: "Settings", icon: Settings },
]

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-teal-700 px-4 text-white lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md p-1.5 hover:bg-teal-600"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          <span className="font-semibold">Vendor Dashboard</span>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 transform border-r bg-teal-800 text-white transition-transform duration-200 lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Sidebar header */}
          <div className="flex h-14 items-center gap-2 border-b border-teal-700 px-6">
            <Store className="h-5 w-5" />
            <span className="text-lg font-semibold">Vendor Dashboard</span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 p-4">
            {sidebarLinks.map((link) => {
              const isActive =
                link.href === "/vendor"
                  ? pathname === "/vendor"
                  : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-teal-600 text-white"
                      : "text-teal-100 hover:bg-teal-700 hover:text-white"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <Separator className="bg-teal-700" />

          {/* Bottom section */}
          <div className="p-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-teal-200 transition-colors hover:bg-teal-700 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Back to Store
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
