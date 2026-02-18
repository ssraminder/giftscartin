"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  AlertCircle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Clock,
  IndianRupee,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface VendorProduct {
  id: string
  productId: string
  costPrice: number
  sellingPrice: number | null
  isAvailable: boolean
  preparationTime: number
  dailyLimit: number | null
  product: {
    id: string
    name: string
    slug: string
    basePrice: number
    images: string[]
    isVeg: boolean
    isActive: boolean
    avgRating: number
    category: { id: string; name: string; slug: string }
    variations: {
      id: string
      type: string
      label: string
      price: number
    }[]
  }
}

export default function VendorProductsPage() {
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    costPrice: 0,
    preparationTime: 120,
    dailyLimit: null as number | null,
  })

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/vendor/products")
      const json = await res.json()
      if (json.success) {
        setProducts(json.data)
      } else {
        setError(json.error || "Failed to load products")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const toggleAvailability = async (vp: VendorProduct) => {
    setToggling(vp.id)
    try {
      const res = await fetch("/api/vendor/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: vp.productId,
          costPrice: vp.costPrice,
          isAvailable: !vp.isAvailable,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === vp.id ? { ...p, isAvailable: !p.isAvailable } : p
          )
        )
      }
    } catch {
      // Ignore
    } finally {
      setToggling(null)
    }
  }

  const startEditing = (vp: VendorProduct) => {
    setEditingId(vp.id)
    setEditForm({
      costPrice: vp.costPrice,
      preparationTime: vp.preparationTime,
      dailyLimit: vp.dailyLimit,
    })
  }

  const saveEdit = async (vp: VendorProduct) => {
    try {
      const res = await fetch("/api/vendor/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: vp.productId,
          costPrice: editForm.costPrice,
          preparationTime: editForm.preparationTime,
          dailyLimit: editForm.dailyLimit,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === vp.id
              ? {
                  ...p,
                  costPrice: editForm.costPrice,
                  preparationTime: editForm.preparationTime,
                  dailyLimit: editForm.dailyLimit,
                }
              : p
          )
        )
        setEditingId(null)
      }
    } catch {
      alert("Failed to save changes")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-24 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">
            Manage your product catalog and availability
          </p>
        </div>
        <button
          onClick={fetchProducts}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="flex gap-4">
        <Badge className="bg-green-100 text-green-800">
          {products.filter((p) => p.isAvailable).length} Available
        </Badge>
        <Badge className="bg-slate-100 text-slate-800">
          {products.filter((p) => !p.isAvailable).length} Unavailable
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="text-slate-500">No products linked to your store yet</p>
            <p className="text-sm text-slate-400">
              Contact admin to assign products to your store
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((vp) => (
            <Card
              key={vp.id}
              className={!vp.isAvailable ? "opacity-60" : ""}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Product image */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={vp.product.images[0] || "/placeholder-product.svg"}
                      alt={vp.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">
                          {vp.product.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {vp.product.category.name}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleAvailability(vp)}
                        disabled={toggling === vp.id}
                        className="shrink-0"
                        title={vp.isAvailable ? "Mark unavailable" : "Mark available"}
                      >
                        {vp.isAvailable ? (
                          <ToggleRight className="h-6 w-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Pricing */}
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="text-slate-500">
                        MRP: {formatPrice(vp.product.basePrice)}
                      </span>
                      <span className="font-medium text-teal-700">
                        Cost: {formatPrice(vp.costPrice)}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {vp.preparationTime} min
                      </span>
                      {vp.dailyLimit && (
                        <span>Limit: {vp.dailyLimit}/day</span>
                      )}
                      {vp.product.isVeg && (
                        <span className="rounded border border-green-600 px-1 text-green-600">
                          VEG
                        </span>
                      )}
                    </div>

                    {/* Variations */}
                    {vp.product.variations.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {vp.product.variations.map((v) => (
                          <span
                            key={v.id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {v.label}: {formatPrice(v.price)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Edit button */}
                    {editingId === vp.id ? (
                      <div className="mt-2 space-y-2 rounded-lg border bg-slate-50 p-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">Cost Price:</label>
                          <input
                            type="number"
                            value={editForm.costPrice}
                            onChange={(e) =>
                              setEditForm({ ...editForm, costPrice: Number(e.target.value) })
                            }
                            className="w-24 rounded border px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">Prep Time (min):</label>
                          <input
                            type="number"
                            value={editForm.preparationTime}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                preparationTime: Number(e.target.value),
                              })
                            }
                            className="w-24 rounded border px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">Daily Limit:</label>
                          <input
                            type="number"
                            value={editForm.dailyLimit ?? ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                dailyLimit: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="None"
                            className="w-24 rounded border px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(vp)}
                            className="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded bg-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(vp)}
                        className="mt-2 text-xs font-medium text-teal-600 hover:underline"
                      >
                        Edit pricing & limits
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
