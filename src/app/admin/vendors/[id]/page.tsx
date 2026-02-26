"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { VendorForm } from "@/components/admin/vendor-form"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ShoppingBag,
  Star,
  Calendar,
  Package,
  MapPin,
} from "lucide-react"

interface WorkingHoursData {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

interface PincodeData {
  pincode: string
  deliveryCharge: number
}

interface VendorData {
  id: string
  businessName: string
  ownerName: string
  phone: string
  email: string | null
  cityId: string
  address: string
  categories: string[]
  commissionRate: number
  autoAccept: boolean
  status: string
  isOnline: boolean
  rating: number
  totalOrders: number
  createdAt: string
  updatedAt: string
  workingHours: WorkingHoursData[]
  pincodes: PincodeData[]
  _count: { orders: number; products: number }
}

interface City {
  id: string
  name: string
}

export default function EditVendorPage() {
  const params = useParams()
  const id = params.id as string
  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        const [vendorRes, citiesRes] = await Promise.all([
          fetch(`/api/admin/vendors/${id}`),
          fetch("/api/admin/cities"),
        ])

        if (vendorRes.ok) {
          const vendorJson = await vendorRes.json()
          if (vendorJson.success) {
            setVendor(vendorJson.data)
          } else {
            setError(vendorJson.error || "Failed to load vendor")
          }
        } else {
          setError("Vendor not found")
        }

        if (citiesRes.ok) {
          const citiesJson = await citiesRes.json()
          if (citiesJson.success) {
            setCities(
              citiesJson.data.map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
              }))
            )
          }
        }
      } catch {
        setError("Failed to connect to server")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Vendors
        </Link>
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-500">
            {error || "Vendor not found"}
          </p>
        </div>
      </div>
    )
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "APPROVED": return "bg-emerald-100 text-emerald-700"
      case "PENDING": return "bg-amber-100 text-amber-700"
      case "SUSPENDED": return "bg-orange-100 text-orange-700"
      case "TERMINATED": return "bg-red-100 text-red-700"
      default: return "bg-slate-100 text-slate-700"
    }
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            Edit: {vendor.businessName}
          </h1>
          <Badge className={statusColor(vendor.status)}>{vendor.status}</Badge>
        </div>
        <p className="text-sm text-slate-500">
          Update vendor information, working hours, and delivery settings.
        </p>
      </div>

      {/* Vendor stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShoppingBag className="h-4 w-4" />
            Total Orders
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {vendor._count.orders}
          </p>
        </div>
        <Link
          href={`/admin/vendors/${id}/products`}
          className="rounded-lg border bg-white p-4 hover:border-[#E91E63]/30 hover:bg-pink-50/30 transition-colors group"
        >
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Package className="h-4 w-4" />
            Products
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {vendor._count.products}
          </p>
          <p className="mt-1 text-xs text-[#E91E63] opacity-0 group-hover:opacity-100 transition-opacity">
            Manage Products &rarr;
          </p>
        </Link>
        <Link
          href={`/admin/vendors/${id}/coverage`}
          className="rounded-lg border bg-white p-4 hover:border-[#E91E63]/30 hover:bg-pink-50/30 transition-colors group"
        >
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" />
            Coverage
          </div>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Service Areas
          </p>
          <p className="mt-1 text-xs text-[#E91E63] opacity-0 group-hover:opacity-100 transition-opacity">
            Manage Coverage &rarr;
          </p>
        </Link>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Star className="h-4 w-4" />
            Rating
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {Number(vendor.rating).toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            Joined
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {new Date(vendor.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <VendorForm vendor={vendor} cities={cities} />
    </div>
  )
}
