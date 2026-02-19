"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, MapPin, Plus, Pencil, Loader2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface City {
  id: string
  name: string
  slug: string
  state: string
  isActive: boolean
  baseDeliveryCharge: number
  freeDeliveryAbove: number
  _count: { zones: number; vendors: number }
}

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCities = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/cities")
      const json = await res.json()
      if (json.success) {
        setCities(json.data)
      } else {
        setError(json.error || "Failed to fetch cities")
      }
    } catch {
      setError("Failed to fetch cities")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCities()
  }, [fetchCities])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cities</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage delivery cities and zones
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCities} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin/cities/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add City
            </Button>
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && cities.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MapPin className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No cities yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Add your first delivery city to get started.
          </p>
          <Link href="/admin/cities/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add City
            </Button>
          </Link>
        </div>
      )}

      {/* Cities table */}
      {!loading && cities.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Zones</th>
                  <th className="px-4 py-3">Vendors</th>
                  <th className="px-4 py-3">Base Charge</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr key={city.id} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{city.name}</td>
                    <td className="px-4 py-3 text-slate-600">{city.state}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          city.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }
                      >
                        {city.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{city._count.zones}</td>
                    <td className="px-4 py-3 text-slate-600">{city._count.vendors}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPrice(Number(city.baseDeliveryCharge))}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/cities/${city.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
