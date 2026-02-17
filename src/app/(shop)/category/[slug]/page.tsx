"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, SlidersHorizontal, X, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductCard } from "@/components/product/product-card"
import type { Product, Category, ApiResponse, PaginatedData } from "@/types"

const OCCASIONS = ["birthday", "anniversary", "valentines-day", "congratulations", "housewarming", "thank-you", "diwali"]

const PAGE_SIZE = 20

type SortOption = "popularity" | "price-low" | "price-high" | "newest"

function sortOptionToApi(sort: SortOption): string {
  switch (sort) {
    case "popularity": return "rating"
    case "price-low": return "price_asc"
    case "price-high": return "price_desc"
    case "newest": return "newest"
  }
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  // State for category info
  const [categoryData, setCategoryData] = useState<(Category & { children?: Category[] }) | null>(null)
  const [parentCategory, setParentCategory] = useState<(Category & { children?: Category[] }) | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(true)

  // State for products
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [productsLoading, setProductsLoading] = useState(true)

  // Filters from URL search params
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get("sortBy") as SortOption) || "popularity")
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = searchParams.get("minPrice")
    const max = searchParams.get("maxPrice")
    return [min ? Number(min) : 0, max ? Number(max) : 5000]
  })
  const [vegOnly, setVegOnly] = useState(searchParams.get("isVeg") === "true")
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(searchParams.get("occasion"))
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch categories to find current category info
  useEffect(() => {
    async function fetchCategories() {
      setCategoryLoading(true)
      try {
        const res = await fetch("/api/categories")
        const json: ApiResponse<(Category & { children?: Category[] })[]> = await res.json()
        if (json.success && json.data) {
          const allCategories = json.data
          // Check if slug matches a parent category
          const found = allCategories.find((c) => c.slug === slug)
          if (found) {
            setCategoryData(found)
            setParentCategory(null)
          } else {
            // Check subcategories
            for (const parent of allCategories) {
              const child = parent.children?.find((c) => c.slug === slug)
              if (child) {
                setCategoryData(child)
                setParentCategory(parent)
                break
              }
            }
          }
        }
      } catch {
        // Category fetch failed
      } finally {
        setCategoryLoading(false)
      }
    }
    fetchCategories()
  }, [slug])

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("categorySlug", slug)
      params.set("page", String(currentPage))
      params.set("pageSize", String(PAGE_SIZE))
      params.set("sortBy", sortOptionToApi(sortBy))

      if (priceRange[0] > 0) params.set("minPrice", String(priceRange[0]))
      if (priceRange[1] < 5000) params.set("maxPrice", String(priceRange[1]))
      if (vegOnly) params.set("isVeg", "true")
      if (selectedOccasion) params.set("occasion", selectedOccasion)

      const res = await fetch(`/api/products?${params.toString()}`)
      const json: ApiResponse<PaginatedData<Product>> = await res.json()
      if (json.success && json.data) {
        setProducts(json.data.items)
        setTotal(json.data.total)
      }
    } catch {
      // Product fetch failed
    } finally {
      setProductsLoading(false)
    }
  }, [slug, currentPage, sortBy, priceRange, vegOnly, selectedOccasion])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Update URL search params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (sortBy !== "popularity") params.set("sortBy", sortBy)
    if (priceRange[0] > 0) params.set("minPrice", String(priceRange[0]))
    if (priceRange[1] < 5000) params.set("maxPrice", String(priceRange[1]))
    if (vegOnly) params.set("isVeg", "true")
    if (selectedOccasion) params.set("occasion", selectedOccasion)
    if (currentPage > 1) params.set("page", String(currentPage))

    const search = params.toString()
    const newPath = `/category/${slug}${search ? `?${search}` : ""}`
    router.replace(newPath, { scroll: false })
  }, [sortBy, priceRange, vegOnly, selectedOccasion, currentPage, slug, router])

  // Determine if this is a subcategory
  const isSubCategory = !!parentCategory
  const displayCategory = categoryData
  const parentSlug = parentCategory?.slug || slug
  const parentName = parentCategory?.name || categoryData?.name || ""
  const childrenCategories = parentCategory?.children || categoryData?.children || []

  // Loading skeleton
  if (categoryLoading) {
    return (
      <div className="min-h-screen">
        <div className="bg-gradient-to-r from-[#E91E63]/10 via-pink-50 to-[#9C27B0]/10">
          <div className="container mx-auto px-4 py-8 sm:py-12">
            <Skeleton className="h-4 w-48 mb-4" />
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Category not found
  if (!displayCategory) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Category Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find the category you&apos;re looking for.
        </p>
        <Link href="/" className="mt-4 inline-block text-[#E91E63] hover:underline font-medium">
          Go back to home
        </Link>
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const activeFilterCount =
    (vegOnly ? 1 : 0) +
    (selectedOccasion ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 5000 ? 1 : 0)

  const clearFilters = () => {
    setPriceRange([0, 5000])
    setVegOnly(false)
    setSelectedOccasion(null)
    setCurrentPage(1)
  }

  /* ── Shared filter panel content ── */
  const filterPanelContent = (
    <div className="space-y-5">
      {/* Price range */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/60 mb-2 block">
          Price Range
        </label>
        <Select
          value={`${priceRange[0]}-${priceRange[1]}`}
          onValueChange={(v: string) => {
            const [min, max] = v.split("-").map(Number)
            setPriceRange([min, max])
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="h-10 text-sm rounded-lg border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0-5000">All Prices</SelectItem>
            <SelectItem value="0-500">Under &#8377;500</SelectItem>
            <SelectItem value="500-1000">&#8377;500 &ndash; &#8377;1,000</SelectItem>
            <SelectItem value="1000-2000">&#8377;1,000 &ndash; &#8377;2,000</SelectItem>
            <SelectItem value="2000-5000">Above &#8377;2,000</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type: Veg / All */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/60 mb-2 block">
          Type
        </label>
        <Select
          value={vegOnly ? "veg" : "all"}
          onValueChange={(v: string) => { setVegOnly(v === "veg"); setCurrentPage(1) }}
        >
          <SelectTrigger className="h-10 text-sm rounded-lg border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="veg">Veg Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Occasion */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/60 mb-2 block">
          Occasion
        </label>
        <Select
          value={selectedOccasion || "all"}
          onValueChange={(v: string) => { setSelectedOccasion(v === "all" ? null : v); setCurrentPage(1) }}
        >
          <SelectTrigger className="h-10 text-sm rounded-lg border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Occasions</SelectItem>
            {OCCASIONS.map((occ) => (
              <SelectItem key={occ} value={occ} className="capitalize">
                {occ.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Apply button */}
      <button
        onClick={() => setShowFilters(false)}
        className="btn-gradient w-full py-2.5 px-4 text-sm rounded-lg"
      >
        Apply Filters
      </button>

      {/* Clear all */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full text-center text-xs font-medium text-[#E91E63] hover:text-[#C2185B] transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* ── Category Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#E91E63]/10 via-pink-50 to-[#9C27B0]/10">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E91E63' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="container mx-auto px-4 py-8 sm:py-12 relative">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm mb-4">
            <Link href="/" className="text-[#1A1A2E]/50 hover:text-[#E91E63] transition-colors font-medium">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#1A1A2E]/30" />
            {isSubCategory ? (
              <>
                <Link
                  href={`/category/${parentSlug}`}
                  className="text-[#1A1A2E]/50 hover:text-[#E91E63] transition-colors font-medium"
                >
                  {parentName}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#1A1A2E]/30" />
                <span className="text-[#1A1A2E] font-semibold">{displayCategory.name}</span>
              </>
            ) : (
              <span className="text-[#1A1A2E] font-semibold">{displayCategory.name}</span>
            )}
          </nav>

          {/* Title & description */}
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm">
              <Sparkles className="h-6 w-6 text-[#E91E63]" />
            </div>
            <div>
              <h1 className="section-title text-[#1A1A2E]">{displayCategory.name}</h1>
              {displayCategory.description && (
                <p className="mt-3 text-sm sm:text-base text-[#1A1A2E]/60 max-w-xl">
                  {displayCategory.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* ── Sub-category pills ── */}
        {childrenCategories.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Link href={`/category/${parentSlug}`}>
              <span
                className={`inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  !isSubCategory
                    ? "bg-[#E91E63] text-white shadow-md shadow-pink-200"
                    : "bg-white text-[#1A1A2E]/70 border border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63]"
                }`}
              >
                All {parentName}
              </span>
            </Link>
            {childrenCategories.map((sub) => (
              <Link key={sub.id} href={`/category/${sub.slug}`}>
                <span
                  className={`inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    slug === sub.slug
                      ? "bg-[#E91E63] text-white shadow-md shadow-pink-200"
                      : "bg-white text-[#1A1A2E]/70 border border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63]"
                  }`}
                >
                  {sub.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Toolbar: product count, active filter badges, sort + filter toggle ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-medium text-[#1A1A2E]/60">
              <span className="text-[#1A1A2E] font-semibold">{total}</span>{" "}
              {total === 1 ? "product" : "products"} found
            </p>

            {/* Active filter badges */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {vegOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E91E63]/10 text-[#E91E63] px-3 py-1 text-xs font-medium">
                    Veg Only
                    <button onClick={() => setVegOnly(false)} className="hover:bg-[#E91E63]/20 rounded-full p-0.5 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedOccasion && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E91E63]/10 text-[#E91E63] px-3 py-1 text-xs font-medium capitalize">
                    {selectedOccasion.replace(/-/g, " ")}
                    <button onClick={() => setSelectedOccasion(null)} className="hover:bg-[#E91E63]/20 rounded-full p-0.5 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {(priceRange[0] > 0 || priceRange[1] < 5000) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E91E63]/10 text-[#E91E63] px-3 py-1 text-xs font-medium">
                    &#8377;{priceRange[0]}&ndash;&#8377;{priceRange[1]}
                    <button onClick={() => setPriceRange([0, 5000])} className="hover:bg-[#E91E63]/20 rounded-full p-0.5 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile filter toggle */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 lg:hidden rounded-full border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63]"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-[10px] text-white font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={(v: string) => { setSortBy(v as SortOption); setCurrentPage(1) }}>
              <SelectTrigger className="w-[170px] h-9 text-sm rounded-full border-gray-200 bg-white hover:border-[#E91E63]/30 transition-colors">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Mobile Collapsible Filter Panel ── */}
        {showFilters && (
          <div className="mb-6 lg:hidden card-premium p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#1A1A2E] uppercase tracking-wider">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-[#1A1A2E]/50" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Price range */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/60 mb-2 block">
                  Price Range
                </label>
                <Select
                  value={`${priceRange[0]}-${priceRange[1]}`}
                  onValueChange={(v: string) => {
                    const [min, max] = v.split("-").map(Number)
                    setPriceRange([min, max])
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-10 text-sm rounded-lg border-gray-200 bg-gray-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-5000">All Prices</SelectItem>
                    <SelectItem value="0-500">Under &#8377;500</SelectItem>
                    <SelectItem value="500-1000">&#8377;500 &ndash; &#8377;1,000</SelectItem>
                    <SelectItem value="1000-2000">&#8377;1,000 &ndash; &#8377;2,000</SelectItem>
                    <SelectItem value="2000-5000">Above &#8377;2,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/60 mb-2 block">
                  Type
                </label>
                <Select
                  value={vegOnly ? "veg" : "all"}
                  onValueChange={(v: string) => { setVegOnly(v === "veg"); setCurrentPage(1) }}
                >
                  <SelectTrigger className="h-10 text-sm rounded-lg border-gray-200 bg-gray-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="veg">Veg Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Occasion */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/60 mb-2 block">
                  Occasion
                </label>
                <Select
                  value={selectedOccasion || "all"}
                  onValueChange={(v: string) => { setSelectedOccasion(v === "all" ? null : v); setCurrentPage(1) }}
                >
                  <SelectTrigger className="h-10 text-sm rounded-lg border-gray-200 bg-gray-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Occasions</SelectItem>
                    {OCCASIONS.map((occ) => (
                      <SelectItem key={occ} value={occ} className="capitalize">
                        {occ.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowFilters(false)}
                className="btn-gradient flex-1 py-2.5 px-4 text-sm rounded-lg"
              >
                Apply Filters
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-sm font-medium text-[#E91E63] border border-[#E91E63]/20 rounded-lg hover:bg-[#E91E63]/5 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Main layout: sidebar + product grid ── */}
        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-[260px] flex-shrink-0">
            <div className="sticky top-24 card-premium p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
                <SlidersHorizontal className="h-4 w-4 text-[#E91E63]" />
                <h3 className="text-sm font-bold text-[#1A1A2E] uppercase tracking-wider">Filters</h3>
                {activeFilterCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-[10px] text-white font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {filterPanelContent}
            </div>
          </aside>

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {/* Loading state */}
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-white overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:gap-5">
                {products.map((product) => (
                  <div key={product.id} className="hover-lift">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-premium py-20 text-center border border-gray-100">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-[#E91E63]/10 mb-4">
                  <Sparkles className="h-8 w-8 text-[#E91E63]" />
                </div>
                <p className="text-lg font-semibold text-[#1A1A2E]">No products found</p>
                <p className="mt-1 text-sm text-[#1A1A2E]/50">
                  Try adjusting your filters to discover more items.
                </p>
                <button
                  onClick={clearFilters}
                  className="btn-gradient mt-5 py-2 px-6 text-sm rounded-lg"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-full border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63] disabled:opacity-40"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`h-9 w-9 rounded-full text-sm font-medium transition-all duration-200 ${
                      page === currentPage
                        ? "bg-[#E91E63] text-white shadow-md shadow-pink-200"
                        : "text-[#1A1A2E]/60 hover:bg-[#E91E63]/10 hover:text-[#E91E63]"
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-full border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63] disabled:opacity-40"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
