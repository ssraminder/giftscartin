"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductCard } from "@/components/product/product-card"
import type { Product, Category } from "@/types"

// ── Placeholder data ──────────────────────────────────────────────

const CATEGORIES: Record<string, Category & { products: Product[] }> = {
  cakes: {
    id: "cat-cakes",
    name: "Cakes",
    slug: "cakes",
    description: "Freshly baked cakes delivered to your doorstep",
    image: null,
    parentId: null,
    sortOrder: 1,
    isActive: true,
    createdAt: "",
    children: [
      { id: "sub-1", name: "Chocolate Cakes", slug: "chocolate-cakes", description: null, image: null, parentId: "cat-cakes", sortOrder: 1, isActive: true, createdAt: "" },
      { id: "sub-2", name: "Fruit Cakes", slug: "fruit-cakes", description: null, image: null, parentId: "cat-cakes", sortOrder: 2, isActive: true, createdAt: "" },
      { id: "sub-3", name: "Photo Cakes", slug: "photo-cakes", description: null, image: null, parentId: "cat-cakes", sortOrder: 3, isActive: true, createdAt: "" },
      { id: "sub-4", name: "Eggless Cakes", slug: "eggless-cakes", description: null, image: null, parentId: "cat-cakes", sortOrder: 4, isActive: true, createdAt: "" },
    ],
    products: [
      { id: "p1", name: "Chocolate Truffle Cake", slug: "chocolate-truffle-cake", description: "Rich chocolate truffle cake with ganache frosting", shortDesc: "Rich & decadent", categoryId: "cat-cakes", basePrice: 599, images: ["/placeholder-product.svg"], tags: ["bestseller"], occasion: ["birthday", "anniversary"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.5, totalReviews: 128, createdAt: "", updatedAt: "" },
      { id: "p2", name: "Red Velvet Cake", slug: "red-velvet-cake", description: "Classic red velvet with cream cheese frosting", shortDesc: "Classic favorite", categoryId: "cat-cakes", basePrice: 699, images: ["/placeholder-product.svg"], tags: ["bestseller"], occasion: ["birthday", "valentines-day"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.7, totalReviews: 95, createdAt: "", updatedAt: "" },
      { id: "p3", name: "Black Forest Cake", slug: "black-forest-cake", description: "Classic black forest with cherries and cream", shortDesc: "Timeless classic", categoryId: "cat-cakes", basePrice: 549, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.3, totalReviews: 72, createdAt: "", updatedAt: "" },
      { id: "p4", name: "Butterscotch Cake", slug: "butterscotch-cake", description: "Smooth butterscotch cake with caramel crunch", shortDesc: "Sweet & crunchy", categoryId: "cat-cakes", basePrice: 499, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.2, totalReviews: 56, createdAt: "", updatedAt: "" },
      { id: "p5", name: "Photo Cake", slug: "photo-cake", description: "Customizable photo cake with edible print", shortDesc: "Personalized", categoryId: "cat-cakes", basePrice: 899, images: ["/placeholder-product.svg"], tags: ["bestseller"], occasion: ["birthday", "anniversary"], weight: "1kg", isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 43, createdAt: "", updatedAt: "" },
      { id: "p6", name: "Pineapple Cake", slug: "pineapple-cake", description: "Fresh pineapple cake with whipped cream", shortDesc: "Tropical delight", categoryId: "cat-cakes", basePrice: 549, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.1, totalReviews: 38, createdAt: "", updatedAt: "" },
      { id: "p7", name: "Vanilla Sponge Cake", slug: "vanilla-sponge-cake", description: "Light and fluffy vanilla sponge", shortDesc: "Simple & elegant", categoryId: "cat-cakes", basePrice: 449, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.0, totalReviews: 22, createdAt: "", updatedAt: "" },
      { id: "p8", name: "Mango Mousse Cake", slug: "mango-mousse-cake", description: "Tropical mango mousse on vanilla sponge base", shortDesc: "Seasonal special", categoryId: "cat-cakes", basePrice: 799, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday", "congratulations"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.4, totalReviews: 15, createdAt: "", updatedAt: "" },
    ],
  },
  flowers: {
    id: "cat-flowers",
    name: "Flowers",
    slug: "flowers",
    description: "Beautiful fresh flower arrangements delivered with love",
    image: null,
    parentId: null,
    sortOrder: 2,
    isActive: true,
    createdAt: "",
    children: [
      { id: "sub-5", name: "Roses", slug: "roses", description: null, image: null, parentId: "cat-flowers", sortOrder: 1, isActive: true, createdAt: "" },
      { id: "sub-6", name: "Mixed Bouquets", slug: "mixed-bouquets", description: null, image: null, parentId: "cat-flowers", sortOrder: 2, isActive: true, createdAt: "" },
      { id: "sub-7", name: "Premium Flowers", slug: "premium-flowers", description: null, image: null, parentId: "cat-flowers", sortOrder: 3, isActive: true, createdAt: "" },
    ],
    products: [
      { id: "p9", name: "Red Roses Bouquet", slug: "red-roses-bouquet", description: "12 premium red roses with elegant wrapping", shortDesc: "Romantic & elegant", categoryId: "cat-flowers", basePrice: 699, images: ["/placeholder-product.svg"], tags: ["bestseller"], occasion: ["valentines-day", "anniversary"], weight: null, isVeg: true, isActive: true, avgRating: 4.8, totalReviews: 210, createdAt: "", updatedAt: "" },
      { id: "p10", name: "Mixed Flower Arrangement", slug: "mixed-flower-arrangement", description: "Beautiful arrangement of seasonal mixed flowers", shortDesc: "Colorful & bright", categoryId: "cat-flowers", basePrice: 899, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday", "congratulations"], weight: null, isVeg: true, isActive: true, avgRating: 4.4, totalReviews: 67, createdAt: "", updatedAt: "" },
      { id: "p11", name: "Orchid Bunch", slug: "orchid-bunch", description: "Premium orchid bunch in elegant packaging", shortDesc: "Premium blooms", categoryId: "cat-flowers", basePrice: 1299, images: ["/placeholder-product.svg"], tags: [], occasion: ["anniversary", "thank-you"], weight: null, isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 28, createdAt: "", updatedAt: "" },
      { id: "p12", name: "Sunflower Bouquet", slug: "sunflower-bouquet", description: "Bright sunflowers to light up any room", shortDesc: "Cheerful vibes", categoryId: "cat-flowers", basePrice: 599, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday", "housewarming"], weight: null, isVeg: true, isActive: true, avgRating: 4.3, totalReviews: 19, createdAt: "", updatedAt: "" },
      { id: "p13", name: "White Lily Bunch", slug: "white-lily-bunch", description: "Elegant white lilies for special occasions", shortDesc: "Pure elegance", categoryId: "cat-flowers", basePrice: 999, images: ["/placeholder-product.svg"], tags: [], occasion: ["anniversary", "sympathy"], weight: null, isVeg: true, isActive: true, avgRating: 4.5, totalReviews: 14, createdAt: "", updatedAt: "" },
    ],
  },
  combos: {
    id: "cat-combos",
    name: "Combos",
    slug: "combos",
    description: "Perfect gift combos for every occasion",
    image: null,
    parentId: null,
    sortOrder: 3,
    isActive: true,
    createdAt: "",
    children: [],
    products: [
      { id: "p14", name: "Cake & Flowers Combo", slug: "cake-flowers-combo", description: "Chocolate cake with a bouquet of red roses", shortDesc: "Perfect pair", categoryId: "cat-combos", basePrice: 1199, images: ["/placeholder-product.svg"], tags: ["bestseller"], occasion: ["birthday", "anniversary", "valentines-day"], weight: "500g + bouquet", isVeg: true, isActive: true, avgRating: 4.9, totalReviews: 156, createdAt: "", updatedAt: "" },
      { id: "p15", name: "Celebration Box", slug: "celebration-box", description: "Cake, flowers, and chocolates in a premium box", shortDesc: "Complete celebration", categoryId: "cat-combos", basePrice: 1599, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday", "anniversary"], weight: "1kg combo", isVeg: true, isActive: true, avgRating: 4.7, totalReviews: 42, createdAt: "", updatedAt: "" },
      { id: "p16", name: "Romance Hamper", slug: "romance-hamper", description: "Red roses, red velvet cake, and teddy bear", shortDesc: "Love bundle", categoryId: "cat-combos", basePrice: 1999, images: ["/placeholder-product.svg"], tags: [], occasion: ["valentines-day", "anniversary"], weight: null, isVeg: true, isActive: true, avgRating: 4.8, totalReviews: 31, createdAt: "", updatedAt: "" },
      { id: "p17", name: "Sweet Surprise", slug: "sweet-surprise", description: "Assorted chocolates with a flower bunch", shortDesc: "Sweet treat", categoryId: "cat-combos", basePrice: 899, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday", "thank-you"], weight: null, isVeg: true, isActive: true, avgRating: 4.3, totalReviews: 18, createdAt: "", updatedAt: "" },
      { id: "p18", name: "Plant & Cake Duo", slug: "plant-cake-duo", description: "Money plant with a butterscotch cake", shortDesc: "Green gift", categoryId: "cat-combos", basePrice: 999, images: ["/placeholder-product.svg"], tags: [], occasion: ["housewarming", "congratulations"], weight: null, isVeg: true, isActive: true, avgRating: 4.2, totalReviews: 11, createdAt: "", updatedAt: "" },
    ],
  },
  plants: {
    id: "cat-plants",
    name: "Plants",
    slug: "plants",
    description: "Green gifts that keep on giving",
    image: null,
    parentId: null,
    sortOrder: 4,
    isActive: true,
    createdAt: "",
    children: [],
    products: [
      { id: "p19", name: "Money Plant", slug: "money-plant", description: "Golden money plant in ceramic pot", shortDesc: "Lucky charm", categoryId: "cat-plants", basePrice: 399, images: ["/placeholder-product.svg"], tags: [], occasion: ["housewarming", "congratulations"], weight: null, isVeg: true, isActive: true, avgRating: 4.1, totalReviews: 34, createdAt: "", updatedAt: "" },
      { id: "p20", name: "Snake Plant", slug: "snake-plant", description: "Low-maintenance snake plant in decorative pot", shortDesc: "Air purifier", categoryId: "cat-plants", basePrice: 499, images: ["/placeholder-product.svg"], tags: [], occasion: ["housewarming"], weight: null, isVeg: true, isActive: true, avgRating: 4.3, totalReviews: 21, createdAt: "", updatedAt: "" },
      { id: "p21", name: "Peace Lily", slug: "peace-lily", description: "Beautiful peace lily with white blooms", shortDesc: "Elegant & serene", categoryId: "cat-plants", basePrice: 599, images: ["/placeholder-product.svg"], tags: [], occasion: ["housewarming", "sympathy"], weight: null, isVeg: true, isActive: true, avgRating: 4.5, totalReviews: 16, createdAt: "", updatedAt: "" },
      { id: "p22", name: "Jade Plant", slug: "jade-plant", description: "Lucky jade plant in premium ceramic pot", shortDesc: "Prosperity symbol", categoryId: "cat-plants", basePrice: 449, images: ["/placeholder-product.svg"], tags: [], occasion: ["housewarming", "congratulations"], weight: null, isVeg: true, isActive: true, avgRating: 4.0, totalReviews: 9, createdAt: "", updatedAt: "" },
      { id: "p23", name: "Bonsai Tree", slug: "bonsai-tree", description: "Miniature bonsai tree in decorative tray", shortDesc: "Living art", categoryId: "cat-plants", basePrice: 899, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday", "housewarming"], weight: null, isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 12, createdAt: "", updatedAt: "" },
    ],
  },
  gifts: {
    id: "cat-gifts",
    name: "Gifts",
    slug: "gifts",
    description: "Thoughtful gifts for every occasion",
    image: null,
    parentId: null,
    sortOrder: 5,
    isActive: true,
    createdAt: "",
    children: [],
    products: [
      { id: "p24", name: "Chocolate Gift Box", slug: "chocolate-gift-box", description: "Premium assorted chocolates in gift box", shortDesc: "Choco heaven", categoryId: "cat-gifts", basePrice: 799, images: ["/placeholder-product.svg"], tags: ["bestseller"], occasion: ["birthday", "thank-you"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.4, totalReviews: 48, createdAt: "", updatedAt: "" },
      { id: "p25", name: "Teddy Bear", slug: "teddy-bear", description: "Soft plush teddy bear - 12 inches", shortDesc: "Cuddly friend", categoryId: "cat-gifts", basePrice: 499, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday", "valentines-day"], weight: null, isVeg: true, isActive: true, avgRating: 4.2, totalReviews: 23, createdAt: "", updatedAt: "" },
      { id: "p26", name: "Scented Candle Set", slug: "scented-candle-set", description: "Set of 3 premium scented candles", shortDesc: "Aromatic bliss", categoryId: "cat-gifts", basePrice: 599, images: ["/placeholder-product.svg"], tags: [], occasion: ["housewarming", "thank-you"], weight: null, isVeg: true, isActive: true, avgRating: 4.3, totalReviews: 15, createdAt: "", updatedAt: "" },
      { id: "p27", name: "Photo Frame", slug: "photo-frame", description: "Personalized wooden photo frame", shortDesc: "Memories preserved", categoryId: "cat-gifts", basePrice: 699, images: ["/placeholder-product.svg"], tags: [], occasion: ["birthday", "anniversary"], weight: null, isVeg: true, isActive: true, avgRating: 4.1, totalReviews: 8, createdAt: "", updatedAt: "" },
      { id: "p28", name: "Gift Hamper Premium", slug: "gift-hamper-premium", description: "Premium dry fruits, chocolates, and scented candle", shortDesc: "Luxury hamper", categoryId: "cat-gifts", basePrice: 1499, images: ["/placeholder-product.svg"], tags: [], occasion: ["diwali", "congratulations", "thank-you"], weight: null, isVeg: true, isActive: true, avgRating: 4.7, totalReviews: 27, createdAt: "", updatedAt: "" },
    ],
  },
}

// Also map sub-category slugs to parent
const SUB_CATEGORY_MAP: Record<string, string> = {
  "chocolate-cakes": "cakes",
  "fruit-cakes": "cakes",
  "photo-cakes": "cakes",
  "eggless-cakes": "cakes",
  "roses": "flowers",
  "mixed-bouquets": "flowers",
  "premium-flowers": "flowers",
}

const OCCASIONS = ["birthday", "anniversary", "valentines-day", "congratulations", "housewarming", "thank-you", "diwali"]

const PAGE_SIZE = 8

// ── Component ─────────────────────────────────────────────────────

type SortOption = "popularity" | "price-low" | "price-high" | "newest"

export default function CategoryPage() {
  const params = useParams()
  const slug = params.slug as string

  // Resolve sub-categories to parent
  const parentSlug = SUB_CATEGORY_MAP[slug] || slug
  const categoryData = CATEGORIES[parentSlug]

  const [sortBy, setSortBy] = useState<SortOption>("popularity")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000])
  const [vegOnly, setVegOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const activeSubSlug = SUB_CATEGORY_MAP[slug] ? slug : null

  // Filter & sort — must be called unconditionally (hooks rules)
  const filtered = useMemo(() => {
    if (!categoryData) return []
    let products = [...categoryData.products]

    // Price filter
    products = products.filter(
      (p) => p.basePrice >= priceRange[0] && p.basePrice <= priceRange[1]
    )

    // Veg filter
    if (vegOnly) {
      products = products.filter((p) => p.isVeg)
    }

    // Rating filter
    if (minRating > 0) {
      products = products.filter((p) => p.avgRating >= minRating)
    }

    // Occasion filter
    if (selectedOccasion) {
      products = products.filter((p) => p.occasion.includes(selectedOccasion))
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        products.sort((a, b) => a.basePrice - b.basePrice)
        break
      case "price-high":
        products.sort((a, b) => b.basePrice - a.basePrice)
        break
      case "newest":
        products.reverse()
        break
      case "popularity":
      default:
        products.sort((a, b) => b.totalReviews - a.totalReviews)
        break
    }

    return products
  }, [categoryData, priceRange, vegOnly, minRating, selectedOccasion, sortBy])

  if (!categoryData) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Category Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find the category you&apos;re looking for.
        </p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          Go back to home
        </Link>
      </div>
    )
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const activeFilterCount =
    (vegOnly ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (selectedOccasion ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 5000 ? 1 : 0)

  const clearFilters = () => {
    setPriceRange([0, 5000])
    setVegOnly(false)
    setMinRating(0)
    setSelectedOccasion(null)
    setCurrentPage(1)
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        {activeSubSlug ? (
          <>
            <Link href={`/category/${parentSlug}`} className="hover:text-primary transition-colors">
              {categoryData.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium capitalize">
              {activeSubSlug.replace(/-/g, " ")}
            </span>
          </>
        ) : (
          <span className="text-foreground font-medium">{categoryData.name}</span>
        )}
      </nav>

      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold sm:text-3xl">{categoryData.name}</h1>
        {categoryData.description && (
          <p className="mt-1 text-sm text-muted-foreground">{categoryData.description}</p>
        )}
      </div>

      {/* Sub-category chips */}
      {categoryData.children && categoryData.children.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <Link href={`/category/${parentSlug}`}>
            <Badge
              variant={!activeSubSlug ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
            >
              All {categoryData.name}
            </Badge>
          </Link>
          {categoryData.children.map((sub) => (
            <Link key={sub.id} href={`/category/${sub.slug}`}>
              <Badge
                variant={activeSubSlug === sub.slug ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
              >
                {sub.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Toolbar: sort + filter toggle */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setCurrentPage(1) }}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
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

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6 rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Price range */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price Range</label>
              <Select
                value={`${priceRange[0]}-${priceRange[1]}`}
                onValueChange={(v) => {
                  const [min, max] = v.split("-").map(Number)
                  setPriceRange([min, max])
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-5000">All Prices</SelectItem>
                  <SelectItem value="0-500">Under ₹500</SelectItem>
                  <SelectItem value="500-1000">₹500 – ₹1,000</SelectItem>
                  <SelectItem value="1000-2000">₹1,000 – ₹2,000</SelectItem>
                  <SelectItem value="2000-5000">Above ₹2,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Veg / Non-veg */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
              <Select
                value={vegOnly ? "veg" : "all"}
                onValueChange={(v) => { setVegOnly(v === "veg"); setCurrentPage(1) }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="veg">Veg Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rating */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rating</label>
              <Select
                value={minRating.toString()}
                onValueChange={(v) => { setMinRating(Number(v)); setCurrentPage(1) }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Rating</SelectItem>
                  <SelectItem value="4">4★ & above</SelectItem>
                  <SelectItem value="3">3★ & above</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Occasion */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Occasion</label>
              <Select
                value={selectedOccasion || "all"}
                onValueChange={(v) => { setSelectedOccasion(v === "all" ? null : v); setCurrentPage(1) }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Occasions</SelectItem>
                  {OCCASIONS.map((occ) => (
                    <SelectItem key={occ} value={occ} className="capitalize">
                      {occ.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {vegOnly && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Veg Only
                  <button onClick={() => setVegOnly(false)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {minRating > 0 && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  {minRating}★+
                  <button onClick={() => setMinRating(0)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {selectedOccasion && (
                <Badge variant="secondary" className="gap-1 pr-1 capitalize">
                  {selectedOccasion.replace(/-/g, " ")}
                  <button onClick={() => setSelectedOccasion(null)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {(priceRange[0] > 0 || priceRange[1] < 5000) && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  ₹{priceRange[0]}–₹{priceRange[1]}
                  <button onClick={() => setPriceRange([0, 5000])}><X className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Product grid */}
      {paginated.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-4">
          {paginated.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-lg font-medium">No products found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
