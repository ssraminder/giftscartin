"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Settings,
  Palette,
  Navigation,
  Truck,
  Loader2,
  Check,
  CreditCard,
  DollarSign,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { LogoUpload } from "@/components/admin/logo-upload"

type Tab = "branding" | "navigation" | "delivery"

interface PlatformSettings {
  logo_url: string | null
  site_name: string | null
  favicon_url: string | null
}

const otherSettingsLinks = [
  {
    href: "/admin/settings/currencies",
    icon: DollarSign,
    label: "Currency Settings",
    description:
      "Configure currencies, exchange rates, markup, and rounding rules for international visitors",
  },
  {
    href: "/admin/settings/payment-methods",
    icon: CreditCard,
    label: "Payment Methods",
    description:
      "Configure available payment methods for manual payment recording (Cash, UPI, Bank Transfer, etc.)",
  },
]

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("branding")
  const [settings, setSettings] = useState<PlatformSettings>({
    logo_url: null,
    site_name: "Gifts Cart India",
    favicon_url: null,
  })
  const [loading, setLoading] = useState(true)
  const [siteName, setSiteName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [nameMessage, setNameMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings/logo")
      const json = await res.json()
      if (json.success && json.data) {
        setSettings(json.data)
        setSiteName(json.data.site_name || "Gifts Cart India")
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoSave(file: File | null, url: string | null) {
    if (file) {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/settings/logo", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to upload logo")
      setSettings((prev) => ({ ...prev, logo_url: json.data.logoUrl }))
    } else if (url) {
      const res = await fetch("/api/admin/settings/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: url }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to set logo URL")
      setSettings((prev) => ({ ...prev, logo_url: json.data.logoUrl }))
    }
  }

  async function handleFaviconSave(file: File | null, url: string | null) {
    if (file) {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/settings/logo", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to upload favicon")
      const res2 = await fetch("/api/admin/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faviconUrl: json.data.logoUrl }),
      })
      const json2 = await res2.json()
      if (!json2.success) throw new Error(json2.error || "Failed to save favicon")
      setSettings((prev) => ({ ...prev, favicon_url: json.data.logoUrl }))
    } else if (url) {
      const res = await fetch("/api/admin/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faviconUrl: url }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to set favicon URL")
      setSettings((prev) => ({ ...prev, favicon_url: url }))
    }
  }

  async function handleSiteName() {
    if (!siteName.trim()) return
    setSavingName(true)
    setNameMessage(null)
    try {
      const res = await fetch("/api/admin/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName: siteName.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to save")
      setSettings((prev) => ({ ...prev, site_name: siteName.trim() }))
      setNameMessage({ type: "success", text: "Site name updated successfully" })
    } catch (err) {
      setNameMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      })
    } finally {
      setSavingName(false)
    }
  }

  const tabs: { key: Tab; label: string; icon: typeof Palette }[] = [
    { key: "branding", label: "Branding", icon: Palette },
    { key: "navigation", label: "Navigation Menu", icon: Navigation },
    { key: "delivery", label: "Delivery", icon: Truck },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500">
            Manage branding, navigation, and platform configuration
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[#E91E63] text-[#E91E63]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Branding Tab */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              {/* Logo Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-lg text-gray-900">Platform Logo</h2>
                <p className="text-sm text-gray-500 mt-1 mb-6">
                  This logo appears in the header and footer across all pages
                </p>
                <LogoUpload
                  currentUrl={settings.logo_url}
                  label="Logo"
                  previewClass="w-48 h-24"
                  acceptTypes="image/png,image/jpeg,image/svg+xml"
                  recommendationText="Recommended: PNG or SVG, transparent background, min 200x60px"
                  onSave={handleLogoSave}
                />
              </div>

              {/* Site Name Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-lg text-gray-900">Site Display Name</h2>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Shown in browser tab, emails, and fallback if logo fails to load
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="flex-1 w-full sm:w-auto">
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => {
                        setSiteName(e.target.value)
                        setNameMessage(null)
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-base focus:outline-none focus:border-pink-400"
                      placeholder="Gifts Cart India"
                    />
                  </div>
                  <button
                    onClick={handleSiteName}
                    disabled={
                      savingName || siteName.trim() === (settings.site_name || "")
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E91E63] text-white text-sm font-medium hover:bg-[#D81B60] transition-colors disabled:opacity-50 shrink-0"
                  >
                    {savingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save
                  </button>
                </div>
                {nameMessage && (
                  <p
                    className={`text-sm mt-2 ${
                      nameMessage.type === "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {nameMessage.type === "success" ? "\u2705 " : ""}
                    {nameMessage.text}
                  </p>
                )}
              </div>

              {/* Favicon Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-lg text-gray-900">Favicon</h2>
                <p className="text-sm text-gray-500 mt-1 mb-6">
                  Small icon shown in browser tabs and bookmarks
                </p>
                <LogoUpload
                  currentUrl={settings.favicon_url}
                  label="Favicon"
                  previewClass="w-16 h-16"
                  acceptTypes="image/x-icon,image/png,image/svg+xml"
                  recommendationText="Recommended: .ico or .png, 32x32 or 64x64 pixels"
                  onSave={handleFaviconSave}
                />
              </div>
            </div>
          )}

          {/* Navigation Tab (placeholder) */}
          {activeTab === "navigation" && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Navigation className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Navigation Menu
              </h3>
              <p className="text-sm text-gray-500">
                Configure header navigation links and category menu ordering.
              </p>
              <span className="inline-block mt-4 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                Coming soon
              </span>
            </div>
          )}

          {/* Delivery Tab (placeholder) */}
          {activeTab === "delivery" && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delivery Configuration
              </h3>
              <p className="text-sm text-gray-500">
                Manage delivery slots, charges, holidays, and surcharges across
                cities.
              </p>
              <span className="inline-block mt-4 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                Coming soon
              </span>
            </div>
          )}
        </>
      )}

      {/* Other Settings Links */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Other Settings</h2>
        <div className="space-y-3">
          {otherSettingsLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <link.icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{link.label}</p>
                    <p className="text-sm text-slate-500">{link.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
