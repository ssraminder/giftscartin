"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ProductForm } from "@/components/admin/product-form"
import type { ProductFormData, ProductWithRelations, CategoryOption } from "@/components/admin/product-form"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"

export default function AdminProductEditPage() {
  const params = useParams()
  const id = params.id as string
  const [product, setProduct] = useState<ProductWithRelations | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/products/${id}`),
          fetch("/api/admin/categories"),
        ])

        const productJson = await productRes.json()
        const categoriesJson = await categoriesRes.json()

        if (productJson.success) {
          setProduct(productJson.data)
        } else {
          setError(productJson.error || "Product not found")
        }
        if (categoriesJson.success) {
          setCategories(categoriesJson.data)
        }
      } catch {
        setError("Failed to load product")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSave = async (data: ProductFormData) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error || "Failed to save product")
    }
    setProduct(json.data)
    setLastSaved(new Date())
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800">{error || "Product not found"}</p>
        </div>
      </div>
    )
  }

  function formatTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
    const hours = Math.floor(minutes / 60)
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="rounded-lg border p-2 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
            <p className="text-sm text-slate-500">{product.name}</p>
          </div>
        </div>
        {lastSaved && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Last saved: {formatTimeSince(lastSaved)}
          </div>
        )}
      </div>

      <ProductForm
        mode="edit"
        initialData={product}
        categories={categories}
        onSave={handleSave}
      />
    </div>
  )
}
