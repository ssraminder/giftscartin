"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { VendorForm } from "@/components/admin/vendor-form"
import { ChevronLeft } from "lucide-react"

interface City {
  id: string
  name: string
}

export default function NewVendorPage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch("/api/admin/cities")
        if (res.ok) {
          const json = await res.json()
          if (json.success) {
            setCities(
              json.data.map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
              }))
            )
          }
        }
      } catch {
        // non-critical
      } finally {
        setLoading(false)
      }
    }
    fetchCities()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/vendors"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Vendors
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add New Vendor</h1>
        <p className="text-sm text-slate-500">
          Create a new vendor account with user login and default working hours.
        </p>
      </div>

      <VendorForm cities={cities} />
    </div>
  )
}
