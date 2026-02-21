"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductCard } from "@/components/product/product-card"
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton"
import { useCity } from "@/hooks/use-city"
import { usePartner } from "@/hooks/use-partner"
import type { Product } from "@/types"

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: "rating", label: "Popular" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]["value"]

const OCCASIONS = [
  "birthday",
  "anniversary",
  "valentines-day",
  "wedding",
  "diwali",
  "congratulations",
  "housewarming",
  "thank-you",
  "rakhi",
] as const

const PRICE_RANGES = [
  { label: "Under \u20B9500", min: 0, max: 500 },
  { label: "\u20B9500 \u2013 \u20B91,000", min: 500, max: 1000 },
  { label: "\u20B91,000 \u2013 \u20B92,000", min: 1000, max: 2000 },
  { label: "Above \u20B92,000", min: 2000, max: 0 },
] as const

const WEIGHTS = ["500g", "1kg", "1.5kg", "2kg"] as const

// ── Types ────────────────────────────────────────────────────────────────────

interface Filters {
  sortBy: SortValue
  minPrice: number
  maxPrice: number
  isVeg: boolean
  occasions: string[]
  weights: string[]
}

interface SubcategoryItem {
  id: string
  name: string
  slug: string
}

interface CategoryProductGridProps {
  categorySlug: string
  categoryName: string
  parentSlug?: string
  parentName?: string
  subcategories: SubcategoryItem[]
  isSubCategory: boolean
}

const DEFAULT_FILTERS: Filters = {
  sortBy: "rating",
  minPrice: 0,
  maxPrice: 0,
  isVeg: false,
  occasions: [],
  weights: [],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatOccasion(occ: string) {
  return occ
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

// ── Component ────────────────────────────────────────────────────────────────

export function CategoryProductGrid({
  categorySlug,
  categoryName,
  parentSlug,
  parentName,
  subcategories,
  isSubCategory,
}: CategoryProductGridProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { citySlug } = useCity()
  const { partner } = usePartner()

  // ── State ──────────────────────────────────────────────────────────────

  const [filters, setFilters] = useState<Filters>(() => {
    const occ = searchParams.get("occasion")
    return {
      sortBy: (searchParams.get("sortBy") as SortValue) || "rating",
      minPrice: Number(searchParams.get("minPrice")) || 0,
      maxPrice: Number(searchParams.get("maxPrice")) || 0,
      isVeg: searchParams.get("isVeg") === "true",
      occasions: occ ? occ.split(",") : [],
      weights: [],
    }
  })
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
  const [showAllOccasions, setShowAllOccasions] = useState(false)

  // ── Build API URL ──────────────────────────────────────────────────────

  const buildApiUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams()
      params.set("categorySlug", categorySlug)
      params.set("page", String(pageNum))
      params.set("pageSize", String(PAGE_SIZE))
      params.set("sortBy", filters.sortBy)

      if (citySlug) params.set("citySlug", citySlug)
      if (partner?.defaultVendorId)
        params.set("vendorId", partner.defaultVendorId)
      if (filters.minPrice > 0) params.set("minPrice", String(filters.minPrice))
      if (filters.maxPrice > 0) params.set("maxPrice", String(filters.maxPrice))
      if (filters.isVeg) params.set("isVeg", "true")
      if (filters.occasions.length > 0)
        params.set("occasion", filters.occasions[0])

      return `/api/products?${params.toString()}`
    },
    [categorySlug, filters, citySlug, partner?.defaultVendorId]
  )

  // ── Fetch products ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPage(1)

    fetch(buildApiUrl(1))
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.success) {
          setProducts(data.data.items || [])
          setTotal(data.data.total || 0)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [buildApiUrl])

  // ── URL sync ───────────────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.sortBy !== "rating") params.set("sortBy", filters.sortBy)
    if (filters.minPrice > 0) params.set("minPrice", String(filters.minPrice))
    if (filters.maxPrice > 0) params.set("maxPrice", String(filters.maxPrice))
    if (filters.isVeg) params.set("isVeg", "true")
    if (filters.occasions.length > 0)
      params.set("occasion", filters.occasions.join(","))

    const search = params.toString()
    const newPath = `/category/${categorySlug}${search ? `?${search}` : ""}`
    router.replace(newPath, { scroll: false })
  }, [filters, categorySlug, router])

  // ── Load more ──────────────────────────────────────────────────────────

  const hasMore = products.length < total

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)

    fetch(buildApiUrl(nextPage))
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProducts((prev) => [...prev, ...(data.data.items || [])])
          setPage(nextPage)
        }
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }, [page, loadingMore, hasMore, buildApiUrl])

  // ── Filter helpers ─────────────────────────────────────────────────────

  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const toggleOccasion = useCallback((occ: string) => {
    setFilters((prev) => {
      const has = prev.occasions.includes(occ)
      return {
        ...prev,
        occasions: has
          ? prev.occasions.filter((o) => o !== occ)
          : [...prev.occasions, occ],
      }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // ── Active filter tracking ─────────────────────────────────────────────

  const activeFilters = useMemo(() => {
    const chips: { label: string; onClear: () => void }[] = []

    if (filters.isVeg) {
      chips.push({
        label: "Veg",
        onClear: () => updateFilter("isVeg", false),
      })
    }
    if (filters.minPrice > 0 || filters.maxPrice > 0) {
      const label =
        filters.maxPrice > 0
          ? `\u20B9${filters.minPrice}\u2013\u20B9${filters.maxPrice}`
          : `Above \u20B9${filters.minPrice}`
      chips.push({
        label,
        onClear: () => {
          updateFilter("minPrice", 0)
          updateFilter("maxPrice", 0)
        },
      })
    }
    filters.occasions.forEach((occ) => {
      chips.push({
        label: formatOccasion(occ),
        onClear: () => toggleOccasion(occ),
      })
    })

    return chips
  }, [filters, updateFilter, toggleOccasion])

  // ── Price range checkbox helpers ───────────────────────────────────────

  const isPriceRangeActive = (min: number, max: number) =>
    filters.minPrice === min && filters.maxPrice === max

  const togglePriceRange = (min: number, max: number) => {
    if (isPriceRangeActive(min, max)) {
      updateFilter("minPrice", 0)
      updateFilter("maxPrice", 0)
    } else {
      setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }))
    }
  }

  // ── Display occasions list ─────────────────────────────────────────────

  const visibleOccasions = showAllOccasions ? OCCASIONS : OCCASIONS.slice(0, 6)

  // ── Shared filter sidebar content ──────────────────────────────────────

  const filterContent = (
    <div className="space-y-6">
      {/* Sort By */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E]/60 mb-3">
          Sort By
        </h4>
        <div className="space-y-2">
          {SORT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="radio"
                name="sortBy"
                checked={filters.sortBy === opt.value}
                onChange={() => updateFilter("sortBy", opt.value)}
                className="h-4 w-4 text-[#E91E63] accent-[#E91E63] cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-[#E91E63] transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E]/60 mb-3">
          Price Range
        </h4>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => (
            <label
              key={range.label}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={isPriceRangeActive(range.min, range.max)}
                onChange={() => togglePriceRange(range.min, range.max)}
                className="h-4 w-4 rounded text-[#E91E63] accent-[#E91E63] cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-[#E91E63] transition-colors">
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Product Type */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E]/60 mb-3">
          Product Type
        </h4>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.isVeg}
            onChange={() => updateFilter("isVeg", !filters.isVeg)}
            className="h-4 w-4 rounded text-[#E91E63] accent-[#E91E63] cursor-pointer"
          />
          <span className="text-sm text-gray-700 group-hover:text-[#E91E63] transition-colors">
            Veg Only
          </span>
        </label>
      </div>

      {/* Occasion */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E]/60 mb-3">
          Occasion
        </h4>
        <div className="space-y-2">
          {visibleOccasions.map((occ) => (
            <label
              key={occ}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filters.occasions.includes(occ)}
                onChange={() => toggleOccasion(occ)}
                className="h-4 w-4 rounded text-[#E91E63] accent-[#E91E63] cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-[#E91E63] transition-colors">
                {formatOccasion(occ)}
              </span>
            </label>
          ))}
        </div>
        {OCCASIONS.length > 6 && (
          <button
            onClick={() => setShowAllOccasions(!showAllOccasions)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-[#E91E63] hover:text-[#C2185B] transition-colors"
          >
            {showAllOccasions ? "Show less" : `+${OCCASIONS.length - 6} more`}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showAllOccasions ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Weight (always show for potential relevance) */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E]/60 mb-3">
          Weight
        </h4>
        <div className="space-y-2">
          {WEIGHTS.map((w) => (
            <label
              key={w}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filters.weights.includes(w)}
                onChange={() =>
                  setFilters((prev) => ({
                    ...prev,
                    weights: prev.weights.includes(w)
                      ? prev.weights.filter((x) => x !== w)
                      : [...prev.weights, w],
                  }))
                }
                className="h-4 w-4 rounded text-[#E91E63] accent-[#E91E63] cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-[#E91E63] transition-colors">
                {w}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear all */}
      {activeFilters.length > 0 && (
        <button
          onClick={clearFilters}
          className="w-full text-center text-xs font-medium text-[#E91E63] hover:text-[#C2185B] transition-colors pt-2 border-t border-gray-100"
        >
          Clear all filters
        </button>
      )}
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Sub-category pills */}
      {subcategories.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link href={`/category/${parentSlug || categorySlug}`}>
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                !isSubCategory
                  ? "bg-[#E91E63] text-white shadow-md shadow-pink-200"
                  : "bg-white text-[#1A1A2E]/70 border border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63]"
              }`}
            >
              All {parentName || categoryName}
            </span>
          </Link>
          {subcategories.map((sub) => (
            <Link key={sub.id} href={`/category/${sub.slug}`}>
              <span
                className={`inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  categorySlug === sub.slug
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

      {/* Mobile toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 lg:hidden">
        <p className="text-sm font-medium text-[#1A1A2E]/60">
          {loading ? (
            <Skeleton className="h-4 w-32 inline-block" />
          ) : (
            <>
              Showing{" "}
              <span className="text-[#1A1A2E] font-semibold">{total}</span>{" "}
              {total === 1 ? "product" : "products"}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          {/* Filter bottom sheet */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
                {activeFilters.length > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-[10px] text-white font-bold">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader className="pb-4 border-b border-gray-100">
                <SheetTitle className="text-left">Filters</SheetTitle>
              </SheetHeader>
              <div className="py-4">{filterContent}</div>
              <div className="sticky bottom-0 bg-white pt-3 pb-2 border-t border-gray-100">
                <button
                  onClick={() => setFilterSheetOpen(false)}
                  className="btn-gradient w-full py-3 px-4 text-sm rounded-lg font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort bottom sheet */}
          <Sheet open={sortSheetOpen} onOpenChange={setSortSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63]"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader className="pb-4 border-b border-gray-100">
                <SheetTitle className="text-left">Sort By</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      updateFilter("sortBy", opt.value)
                      setSortSheetOpen(false)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                      filters.sortBy === opt.value
                        ? "bg-[#E91E63]/10 text-[#E91E63] font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {activeFilters.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 rounded-full bg-[#E91E63]/10 text-[#E91E63] px-3 py-1.5 text-xs font-medium"
            >
              {chip.label}
              <button
                onClick={chip.onClear}
                className="hover:bg-[#E91E63]/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-gray-500 hover:text-[#E91E63] transition-colors ml-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main layout: sidebar + grid */}
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[240px] flex-shrink-0">
          <div className="sticky top-24 card-premium p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
              <SlidersHorizontal className="h-4 w-4 text-[#E91E63]" />
              <h3 className="text-sm font-bold text-[#1A1A2E] uppercase tracking-wider">
                Filters
              </h3>
              {activeFilters.length > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-[10px] text-white font-bold">
                  {activeFilters.length}
                </span>
              )}
            </div>
            {filterContent}
          </div>
        </aside>

        {/* Products area */}
        <div className="flex-1 min-w-0">
          {/* Desktop header with product count + sort */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <p className="text-sm font-medium text-[#1A1A2E]/60">
              {loading ? (
                <Skeleton className="h-4 w-40 inline-block" />
              ) : (
                <>
                  <span className="text-[#1A1A2E] font-semibold">{total}</span>{" "}
                  {total === 1 ? "product" : "products"} found
                </>
              )}
            </p>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 xl:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Product grid */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 xl:gap-4">
                {products.map((product) => (
                  <div key={product.id} className="hover-lift">
                    <ProductCard
                      id={product.id}
                      name={product.name}
                      slug={product.slug}
                      basePrice={Number(product.basePrice)}
                      images={product.images}
                      avgRating={product.avgRating}
                      totalReviews={product.totalReviews}
                      weight={product.weight ?? undefined}
                      tags={product.tags}
                    />
                  </div>
                ))}
              </div>

              {/* Load More button */}
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full border-gray-200 hover:border-[#E91E63]/30 hover:text-[#E91E63] px-10 gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="card-premium py-20 text-center border border-gray-100">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-[#E91E63]/10 mb-4">
                <Sparkles className="h-8 w-8 text-[#E91E63]" />
              </div>
              <p className="text-lg font-semibold text-[#1A1A2E]">
                No products found
              </p>
              <p className="mt-1 text-sm text-[#1A1A2E]/50">
                Try adjusting your filters to discover more items.
              </p>
              {activeFilters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="btn-gradient mt-5 py-2 px-6 text-sm rounded-lg"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
