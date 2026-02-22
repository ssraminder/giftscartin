"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Package,
  FolderOpen,
  MapPin,
  Map,
  Settings,
  Search,
  Shield,
  LogOut,
  Menu,
  X,
  Users,
  Truck,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { type: "section" as const, label: "Catalog" },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { type: "section" as const, label: "Operations" },
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/cities", label: "Cities", icon: MapPin },
  { href: "/admin/areas", label: "Serviceable Areas", icon: Map },
  { href: "/admin/partners", label: "Partners", icon: Users },
  { type: "section" as const, label: "Settings" },
  { href: "/admin/seo", label: "SEO Settings", icon: Search },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-slate-900 px-4 text-white lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md p-1.5 hover:bg-slate-800"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <span className="font-semibold">Admin Panel</span>
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
            "fixed inset-y-0 left-0 z-30 w-64 transform border-r bg-slate-900 text-white transition-transform duration-200 lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Sidebar header */}
          <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-6">
            <Shield className="h-5 w-5" />
            <span className="text-lg font-semibold">Admin Panel</span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 p-4">
            {sidebarLinks.map((link, index) => {
              if ('type' in link && link.type === 'section') {
                return (
                  <p
                    key={`section-${index}`}
                    className="mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {link.label}
                  </p>
                )
              }
              const navLink = link as { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
              const isActive =
                navLink.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(navLink.href)
              return (
                <Link
                  key={navLink.href}
                  href={navLink.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <navLink.icon className="h-4 w-4" />
                  {navLink.label}
                </Link>
              )
            })}
          </nav>

          <Separator className="bg-slate-800" />

          {/* Bottom section */}
          <div className="p-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Back to Store
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
