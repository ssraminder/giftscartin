"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  MapPin,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/cities", label: "Cities", icon: MapPin },
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
            {sidebarLinks.map((link) => {
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
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
