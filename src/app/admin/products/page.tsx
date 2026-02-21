"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Package,
  Plus,
  Sparkles,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Zap,
  Users,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface ProductItem {
  id: string
  name: string
  slug: string
  productType: "SIMPLE" | "VARIABLE"
  basePrice: number
  isActive: boolean
  isSameDayEligible: boolean
  images: string[]
  category: { id: string; name: string }
  _count: { variations: number; vendorProducts: number }
}

interface CategoryOption {
  id: string
  name: string
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
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sameDayFilter, setSameDayFilter] = useState("")

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

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
  }, [debouncedSearch, categoryFilter, typeFilter, statusFilter, sameDayFilter])

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
      if (typeFilter) params.set("type", typeFilter)
      if (statusFilter) params.set("status", statusFilter)
      if (sameDayFilter) params.set("isSameDayEligible", sameDayFilter)

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
  }, [page, pageSize, debouncedSearch, categoryFilter, typeFilter, statusFilter, sameDayFilter])

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

  // Inline toggle same-day
  const toggleSameDay = async (id: string, isSameDayEligible: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSameDayEligible }),
      })
      const json = await res.json()
      if (json.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isSameDayEligible } : p))
        )
      }
    } catch {
      // ignore
    }
  }

  // Soft delete
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: false } : p))
        )
        showToast("success", "Product deactivated.")
      }
    } catch {
      showToast("error", "Failed to delete product.")
    }
  }

  // Bulk delete
  const bulkDelete = async () => {
    const ids = Array.from(selected)
    for (const id of ids) {
      await handleDelete(id)
    }
    setSelected(new Set())
  }

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map((p) => p.id)))
    }
  }

  const totalPages = Math.ceil(total / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products/new?ai=true">
            <Button variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Add with AI
            </Button>
          </Link>
          <Link href="/admin/products/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
                <option key={parent.id} value={parent.id}>{parent.name}</option>,
                ...children.map((child) => (
                  <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                )),
              ]
            })}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-base"
        >
          <option value="">All Types</option>
          <option value="SIMPLE">Simple</option>
          <option value="VARIABLE">Variable</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-base"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={sameDayFilter}
          onChange={(e) => setSameDayFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-base"
        >
          <option value="">Same Day: All</option>
          <option value="true">Same Day Only</option>
          <option value="false">Not Same Day</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3 text-sm">
          <span className="text-slate-600">{selected.size} selected</span>
          <Button variant="outline" size="sm" onClick={bulkDelete} className="text-red-600">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}

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
          <p className="text-lg font-medium text-slate-500">No products found</p>
          <p className="text-sm text-slate-400 mb-4">Try adjusting your filters</p>
          <Link href="/admin/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === products.length && products.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Product</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Category</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Price</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Same Day</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Vendors</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg border bg-slate-100 overflow-hidden">
                        {product.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images?.[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-4 w-4 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-slate-400">/{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{product.category?.name}</td>
                  <td className="px-3 py-3 font-medium">
                    {formatPrice(product.basePrice)}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSameDay(product.id, !product.isSameDayEligible)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                        product.isSameDayEligible
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                      {product.isSameDayEligible ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(product.id, !product.isActive)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                        product.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Users className="h-3.5 w-3.5" />
                      {product._count.vendorProducts}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
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
    </div>
  )
}
