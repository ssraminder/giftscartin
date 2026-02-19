"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Save, CheckCircle, AlertCircle } from "lucide-react"

interface SeoSettingsData {
  id: string
  siteName: string
  siteDescription: string
  defaultOgImage: string | null
  googleVerification: string | null
  robotsTxt: string | null
}

export default function AdminSeoPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [siteName, setSiteName] = useState("Gifts Cart India")
  const [siteDescription, setSiteDescription] = useState("")
  const [defaultOgImage, setDefaultOgImage] = useState("")
  const [googleVerification, setGoogleVerification] = useState("")
  const [robotsTxt, setRobotsTxt] = useState("")

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/seo")
        const json = await res.json()
        if (json.success && json.data) {
          const d: SeoSettingsData = json.data
          setSiteName(d.siteName || "Gifts Cart India")
          setSiteDescription(d.siteDescription || "")
          setDefaultOgImage(d.defaultOgImage || "")
          setGoogleVerification(d.googleVerification || "")
          setRobotsTxt(d.robotsTxt || "")
        }
      } catch {
        // Failed to fetch
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          siteDescription,
          defaultOgImage: defaultOgImage || null,
          googleVerification: googleVerification || null,
          robotsTxt: robotsTxt || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setToast({ type: "success", message: "SEO settings saved successfully." })
      } else {
        setToast({ type: "error", message: json.error || "Failed to save settings." })
      }
    } catch {
      setToast({ type: "error", message: "Network error. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="bg-white rounded-lg border p-6 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Search className="h-6 w-6 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-900">SEO Settings</h1>
        </div>
        <p className="text-sm text-slate-500">
          Global defaults applied to all pages unless overridden per product.
        </p>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg border p-6 space-y-6">
        {/* Site Name */}
        <div className="space-y-2">
          <Label htmlFor="siteName">Site Name</Label>
          <Input
            id="siteName"
            value={siteName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSiteName(e.target.value)}
            placeholder="Gifts Cart India"
          />
        </div>

        {/* Site Description */}
        <div className="space-y-2">
          <Label htmlFor="siteDescription">Site Description</Label>
          <textarea
            id="siteDescription"
            rows={3}
            value={siteDescription}
            onChange={(e) => setSiteDescription(e.target.value)}
            placeholder="Fresh cakes, flowers and gifts delivered same day across India"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Default OG Image */}
        <div className="space-y-2">
          <Label htmlFor="defaultOgImage">Default OG Image URL</Label>
          <Input
            id="defaultOgImage"
            value={defaultOgImage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDefaultOgImage(e.target.value)}
            placeholder="https://example.com/og-image.jpg"
          />
          <p className="text-xs text-slate-500">
            Shown when no product/category image is set. 1200x630px recommended.
          </p>
        </div>

        {/* Google Verification */}
        <div className="space-y-2">
          <Label htmlFor="googleVerification">Google Verification Code</Label>
          <Input
            id="googleVerification"
            value={googleVerification}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoogleVerification(e.target.value)}
            placeholder="e.g. abc123def456"
          />
          {googleVerification && (
            <div className="rounded-md bg-slate-50 border p-3">
              <p className="text-xs text-slate-500 mb-1">Preview:</p>
              <code className="text-xs text-slate-700 break-all">
                {`<meta name="google-site-verification" content="${googleVerification}" />`}
              </code>
            </div>
          )}
        </div>

        {/* Custom robots.txt */}
        <div className="space-y-2">
          <Label htmlFor="robotsTxt">Custom robots.txt</Label>
          <textarea
            id="robotsTxt"
            rows={8}
            value={robotsTxt}
            onChange={(e) => setRobotsTxt(e.target.value)}
            placeholder={`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /vendor/\nDisallow: /api/\n\nSitemap: https://giftscart.netlify.app/sitemap.xml`}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="text-xs text-slate-500">
            Leave blank to use default rules.
          </p>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
