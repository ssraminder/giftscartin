"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Check,
  Minus,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { ProductFormDrawer } from "@/components/admin/product-form-drawer"

interface ProductItem {
  id: string
  name: string
  slug: string
  productType: "SIMPLE" | "VARIABLE"
  basePrice: number
  isActive: boolean
  isSameDayEligible: boolean
  images: string[]
  category: { id: string; name: string; slug: string }
  _count: { vendorProducts: number; variations: number }
}

interface CategoryOption {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  // Filters
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [sameDayFilter, setSameDayFilter] = useState(false)
  const [statusFilter, setStatusFilter] = useState("")

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null)

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryFilter, sameDayFilter, statusFilter])

  // Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/admin/categories")
        const json = await res.json()
        if (json.success) setCategories(json.data ?? [])
      } catch {
        // ignore
      }
    }
    loadCategories()
  }, [])

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (categoryFilter) params.set("category", categoryFilter)
      if (sameDayFilter) params.set("isSameDayEligible", "true")
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/admin/products?${params}`)
      const json = await res.json()
      if (json.success) {
        setProducts(json.data?.items ?? [])
        setTotal(json.data?.total ?? 0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, categoryFilter, sameDayFilter, statusFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Inline toggle active
  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      const json = await res.json()
      if (json.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive } : p))
        )
      }
    } catch {
      // ignore
    }
  }

  // Delete product
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        if (json.data?.deleted) {
          // Hard delete — remove from list
          setProducts((prev) => prev.filter((p) => p.id !== id))
          showToast("success", "Product deleted.")
        } else {
          // Soft delete — mark inactive
          setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, isActive: false } : p))
          )
          showToast("success", json.data?.reason || "Product deactivated.")
        }
      }
    } catch {
      showToast("error", "Failed to delete product.")
    }
  }

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const openAddDrawer = () => {
    setEditingProduct(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = (product: ProductItem) => {
    setEditingProduct(product)
    setDrawerOpen(true)
  }

  const totalPages = Math.ceil(total / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Catalog</h1>
          <p className="text-sm text-slate-500">Manage your product catalog</p>
        </div>
        <Button
          onClick={openAddDrawer}
          className="gap-2 bg-[#E91E63] hover:bg-[#C2185B] text-white"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Toast */}
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-base"
        >
          <option value="">All Categories</option>
          {categories
            .filter((c) => !c.parentId)
            .map((parent) => {
              const children = categories.filter((c) => c.parentId === parent.id)
              return [
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>,
                ...children.map((child) => (
                  <option key={child.id} value={child.id}>
                    &nbsp;&nbsp;{child.name}
                  </option>
                )),
              ]
            })}
        </select>
        <button
          type="button"
          onClick={() => setSameDayFilter(!sameDayFilter)}
          className={`h-10 rounded-md border px-4 text-sm font-medium transition-colors whitespace-nowrap ${
            sameDayFilter
              ? "border-[#E91E63] bg-[#E91E63]/10 text-[#E91E63]"
              : "border-input bg-background text-slate-600 hover:bg-slate-50"
          }`}
        >
          Same Day Only
        </button>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-base"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Products table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border">
          <Package className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">No products yet</p>
          <p className="text-sm text-slate-400 mb-4">Add your first product</p>
          <Button
            onClick={openAddDrawer}
            className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Category</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Price</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Same Day</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Active</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Vendors</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-400">/{product.slug}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className="whitespace-nowrap">
                      {product.category?.name}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 font-medium whitespace-nowrap">
                    {formatPrice(product.basePrice)}
                  </td>
                  <td className="px-3 py-3">
                    {product.isSameDayEligible ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-slate-300" />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={product.isActive}
                      onClick={() => toggleActive(product.id, !product.isActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        product.isActive ? "bg-[#E91E63]" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          product.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 text-slate-600"
                    >
                      {product._count.vendorProducts} vendor{product._count.vendorProducts !== 1 ? "s" : ""}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(product)}
                        className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title={product.isActive ? "Deactivate" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {startItem}–{endItem} of {total} products
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Product Form Drawer */}
      <ProductFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        product={editingProduct}
        categories={categories}
        onSaved={fetchProducts}
      />
    </div>
  )
}
