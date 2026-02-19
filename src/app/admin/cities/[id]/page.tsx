"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { CityForm } from "@/components/admin/city-form"

interface CityZone {
  id: string
  name: string
  pincodes: string[]
  extraCharge: number
  isActive: boolean
}

interface CityData {
  id: string
  name: string
  slug: string
  state: string
  isActive: boolean
  lat: number
  lng: number
  baseDeliveryCharge: number
  freeDeliveryAbove: number
  zones: CityZone[]
}

export default function EditCityPage() {
  const params = useParams()
  const id = params.id as string

  const [city, setCity] = useState<CityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCity() {
      try {
        const res = await fetch(`/api/admin/cities/${id}`)
        const json = await res.json()
        if (json.success) {
          setCity(json.data)
        } else {
          setError(json.error || "City not found")
        }
      } catch {
        setError("Failed to fetch city")
      } finally {
        setLoading(false)
      }
    }
    fetchCity()
  }, [id])

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/cities"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cities
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {loading ? "Edit City" : city ? `Edit City: ${city.name}` : "City Not Found"}
        </h1>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && city && <CityForm city={city} />}
    </div>
  )
}
