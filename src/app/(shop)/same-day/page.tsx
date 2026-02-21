'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Clock, Package } from 'lucide-react'

import { useCity } from '@/hooks/use-city'
import { ProductCard } from '@/components/product/product-card'
import { ProductGridSkeleton } from '@/components/product/product-card-skeleton'

interface SameDayProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  images: string[]
  avgRating: number
  totalReviews: number
  weight: string | null
  tags: string[]
  category: { id: string; name: string; slug: string } | null
  cutoffTime: string
}

const CATEGORY_TABS = [
  { label: 'All', slug: '' },
  { label: 'Cakes', slug: 'cakes' },
  { label: 'Flowers', slug: 'flowers' },
  { label: 'Combos', slug: 'combos' },
  { label: 'Plants', slug: 'plants' },
  { label: 'Gifts', slug: 'gifts' },
]

export default function SameDayPage() {
  const { cityId, cityName } = useCity()
  const [products, setProducts] = useState<SameDayProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [earliestCutoff, setEarliestCutoff] = useState<string | null>(null)

  // Fetch same-day products
  useEffect(() => {
    if (!cityId) return
    setLoading(true)

    async function fetchProducts() {
      try {
        const params = new URLSearchParams({ cityId: cityId! })
        const res = await fetch(`/api/products/same-day?${params}`)
        const json = await res.json()
        if (json.success && json.data) {
          setProducts(json.data.products)
          if (json.data.products.length > 0) {
            setEarliestCutoff(json.data.products[0].cutoffTime)
          }
        }
      } catch {
        // Silently fail - empty state handles this
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [cityId])

  // Filter products by active tab
  const filteredProducts = useMemo(() => {
    if (!activeTab) return products
    return products.filter(p =>
      p.category?.slug?.toLowerCase().includes(activeTab.toLowerCase())
    )
  }, [products, activeTab])

  const allCutoffsPassed = !loading && products.length === 0

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-pink-500 via-pink-600 to-rose-600 text-white">
        <div className="container mx-auto px-4 py-10 md:py-14 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="h-6 w-6" />
            <h1 className="text-2xl md:text-3xl font-bold">Same Day Delivery</h1>
          </div>
          {allCutoffsPassed ? (
            <p className="text-pink-100 text-sm md:text-base max-w-lg mx-auto">
              Same-day ordering is closed for today. Browse products available from tomorrow.
            </p>
          ) : (
            <p className="text-pink-100 text-sm md:text-base max-w-lg mx-auto">
              {earliestCutoff
                ? `Order before ${earliestCutoff} for delivery today in ${cityName || 'your city'}`
                : `Get your gifts delivered today in ${cityName || 'your city'}`
              }
            </p>
          )}
        </div>
      </section>

      {/* Category Tabs */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab.slug}
                onClick={() => setActiveTab(tab.slug)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  activeTab === tab.slug
                    ? 'bg-pink-600 text-white'
                    : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <ProductGridSkeleton count={6} />
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="relative">
                <ProductCard
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  basePrice={product.basePrice}
                  images={product.images}
                  avgRating={product.avgRating}
                  totalReviews={product.totalReviews}
                  weight={product.weight ?? undefined}
                  tags={product.tags}
                  deliveryBadge="same-day"
                />
                {/* Urgency badge below card */}
                <div className="mt-1.5 flex items-center gap-1 justify-center">
                  <Clock className="h-3 w-3 text-pink-600" />
                  <span className="text-xs font-medium text-pink-600">
                    Order by {product.cutoffTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50">
              <Package className="h-8 w-8 text-pink-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              No same-day products available
            </h2>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              {cityName
                ? `No same-day products available in ${cityName} right now`
                : 'No same-day products available right now'
              }
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-pink-700"
            >
              Browse all products &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
