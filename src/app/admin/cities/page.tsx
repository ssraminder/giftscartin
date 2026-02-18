"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, MapPin } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface City {
  id: string
  name: string
  slug: string
  state: string
  isActive: boolean
  baseDeliveryCharge: number
  freeDeliveryAbove: number
  _count?: { zones: number; vendors: number }
}

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCities = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cities")
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setCities(json.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch cities:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCities()
  }, [fetchCities])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchCities()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cities</h1>
          <p className="text-sm text-slate-500">
            Manage delivery cities and zones
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : cities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-500">
              No cities configured
            </p>
            <p className="text-sm text-slate-400">
              Cities will appear here once added
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <Card
              key={city.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{city.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      city.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }
                  >
                    {city.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">{city.state}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>
                      Delivery: {formatPrice(Number(city.baseDeliveryCharge))}
                    </span>
                    <span>
                      Free above: {formatPrice(Number(city.freeDeliveryAbove))}
                    </span>
                  </div>
                  {city._count && (
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{city._count.zones} zones</span>
                      <span>{city._count.vendors} vendors</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
