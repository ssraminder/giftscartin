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
import { RefreshCw, Package, Star } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface Product {
  id: string
  name: string
  slug: string
  basePrice: number
  isActive: boolean
  isVeg: boolean
  avgRating: number
  totalReviews: number
  images: string[]
  category: { name: string }
  _count?: { vendorProducts: number }
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?pageSize=100")
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setProducts(json.data.items || json.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchProducts()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">
            View and manage product catalog
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
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-500">
              No products found
            </p>
            <p className="text-sm text-slate-400">
              Products will appear here once added
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">
                    {product.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      product.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">
                      {formatPrice(Number(product.basePrice))}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {product.category?.name || "Uncategorized"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      {Number(product.avgRating).toFixed(1)} ({product.totalReviews})
                    </span>
                    {product.isVeg && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 text-emerald-600 text-xs"
                      >
                        Veg
                      </Badge>
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
