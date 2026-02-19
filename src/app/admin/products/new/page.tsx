"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProductForm } from "@/components/admin/product-form"
import type { ProductFormData, CategoryOption } from "@/components/admin/product-form"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AdminProductNewPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/admin/categories")
        const json = await res.json()
        if (json.success) setCategories(json.data)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    loadCategories()
  }, [])

  const handleSave = async (data: ProductFormData) => {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error || "Failed to create product")
    }
    // Redirect to edit page
    router.push(`/admin/products/${json.data.id}/edit`)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="rounded-lg border p-2 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Product</h1>
          <p className="text-sm text-slate-500">Create a new product in your catalog</p>
        </div>
      </div>

      <ProductForm
        mode="create"
        categories={categories}
        onSave={handleSave}
      />
    </div>
  )
}
