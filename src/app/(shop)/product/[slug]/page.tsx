"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, MapPin, Minus, Plus, ShoppingCart, Star, Truck, Shield, Clock, Package, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ProductGallery } from "@/components/product/product-gallery"
import { DeliverySlotPicker } from "@/components/product/delivery-slot-picker"
import { AddonSelector } from "@/components/product/addon-selector"
import { ReviewList } from "@/components/product/review-list"
import { ProductCard } from "@/components/product/product-card"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/hooks/use-cart"
import type { Product, ProductAddon, Review, AddonSelection } from "@/types"

// ── Placeholder data ──────────────────────────────────────────────

const SAMPLE_ADDONS: ProductAddon[] = [
  { id: "a1", productId: "p1", name: "Chocolate Box", price: 299, image: "/placeholder-product.svg", isActive: true },
  { id: "a2", productId: "p1", name: "Greeting Card", price: 49, image: "/placeholder-product.svg", isActive: true },
  { id: "a3", productId: "p1", name: "Teddy Bear", price: 399, image: "/placeholder-product.svg", isActive: true },
  { id: "a4", productId: "p1", name: "Candle Set", price: 149, image: "/placeholder-product.svg", isActive: true },
  { id: "a5", productId: "p1", name: "Balloon Bunch", price: 199, image: "/placeholder-product.svg", isActive: true },
  { id: "a6", productId: "p1", name: "Rose Bouquet", price: 499, image: "/placeholder-product.svg", isActive: true },
]

const SAMPLE_REVIEWS: Review[] = [
  { id: "r1", userId: "u1", productId: "p1", orderId: "o1", rating: 5, comment: "Absolutely delicious! The cake was fresh and the delivery was on time. Loved it!", images: [], isVerified: true, createdAt: "2026-01-15T10:00:00Z", user: { id: "u1", name: "Priya S." } },
  { id: "r2", userId: "u2", productId: "p1", orderId: "o2", rating: 4, comment: "Good cake, nicely decorated. Slightly smaller than expected but taste was great.", images: [], isVerified: true, createdAt: "2026-01-10T14:30:00Z", user: { id: "u2", name: "Rahul M." } },
  { id: "r3", userId: "u3", productId: "p1", orderId: "o3", rating: 5, comment: "Ordered for my wife's birthday. She loved it! Will order again.", images: [], isVerified: true, createdAt: "2025-12-28T09:15:00Z", user: { id: "u3", name: "Amit K." } },
  { id: "r4", userId: "u4", productId: "p1", orderId: null, rating: 3, comment: "Decent cake. Packaging could be better.", images: [], isVerified: false, createdAt: "2025-12-20T16:45:00Z", user: { id: "u4", name: "Sneha R." } },
  { id: "r5", userId: "u5", productId: "p1", orderId: "o5", rating: 5, comment: "Best cake in Chandigarh! Perfect for celebrations.", images: [], isVerified: true, createdAt: "2025-12-15T11:00:00Z", user: { id: "u5", name: "Deepak T." } },
]

const ALL_PRODUCTS: Record<string, Product & { categorySlug: string; categoryName: string }> = {
  "chocolate-truffle-cake": {
    id: "p1", name: "Chocolate Truffle Cake", slug: "chocolate-truffle-cake",
    description: "Indulge in the rich, velvety goodness of our Chocolate Truffle Cake. Made with premium Belgian chocolate and layered with smooth chocolate ganache, this cake is a true celebration of chocolate. Perfect for birthdays, anniversaries, or any occasion that calls for something special. Each cake is freshly baked by our expert bakers and delivered with care.",
    shortDesc: "Rich & decadent", categoryId: "cat-cakes", basePrice: 599,
    images: ["/placeholder-product.svg", "/placeholder-product.svg", "/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.5, totalReviews: 128, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "red-velvet-cake": {
    id: "p2", name: "Red Velvet Cake", slug: "red-velvet-cake",
    description: "Our signature Red Velvet Cake features moist, vibrant red layers with a luscious cream cheese frosting. A perfect blend of subtle cocoa and tangy buttermilk, topped with white chocolate shavings. This classic favorite is ideal for Valentine's Day, birthdays, and any celebration.",
    shortDesc: "Classic favorite", categoryId: "cat-cakes", basePrice: 699,
    images: ["/placeholder-product.svg", "/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "valentines-day"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.7, totalReviews: 95, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "black-forest-cake": {
    id: "p3", name: "Black Forest Cake", slug: "black-forest-cake",
    description: "A timeless classic that never goes out of style. Layers of chocolate sponge, whipped cream, and cherries come together in this indulgent Black Forest Cake. Topped with chocolate shavings and maraschino cherries for the perfect finish.",
    shortDesc: "Timeless classic", categoryId: "cat-cakes", basePrice: 549,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.3, totalReviews: 72, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "butterscotch-cake": {
    id: "p4", name: "Butterscotch Cake", slug: "butterscotch-cake",
    description: "Smooth, creamy butterscotch cake topped with caramel crunch and praline decorations. A sweet delight that melts in your mouth. Perfect for those who love a rich caramel flavor.",
    shortDesc: "Sweet & crunchy", categoryId: "cat-cakes", basePrice: 499,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.2, totalReviews: 56, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "photo-cake": {
    id: "p5", name: "Photo Cake", slug: "photo-cake",
    description: "Make your celebration extra personal with our customizable Photo Cake. Upload your favorite photo and we'll print it on a delicious vanilla or chocolate cake using food-grade edible ink. Available in multiple sizes.",
    shortDesc: "Personalized", categoryId: "cat-cakes", basePrice: 899,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary"], weight: "1kg", isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 43, createdAt: "", updatedAt: "",
    categorySlug: "cakes", categoryName: "Cakes",
  },
  "red-roses-bouquet": {
    id: "p9", name: "Red Roses Bouquet", slug: "red-roses-bouquet",
    description: "Express your love with our stunning bouquet of 12 premium red roses, elegantly wrapped in craft paper and finished with a satin ribbon. Each rose is hand-picked for freshness and size to create the perfect romantic gesture.",
    shortDesc: "Romantic & elegant", categoryId: "cat-flowers", basePrice: 699,
    images: ["/placeholder-product.svg", "/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["valentines-day", "anniversary"], weight: null, isVeg: true, isActive: true, avgRating: 4.8, totalReviews: 210, createdAt: "", updatedAt: "",
    categorySlug: "flowers", categoryName: "Flowers",
  },
  "mixed-flower-arrangement": {
    id: "p10", name: "Mixed Flower Arrangement", slug: "mixed-flower-arrangement",
    description: "A vibrant arrangement of seasonal mixed flowers including roses, carnations, lilies, and greens. Arranged in an elegant basket, this colorful bouquet is perfect for brightening someone's day.",
    shortDesc: "Colorful & bright", categoryId: "cat-flowers", basePrice: 899,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["birthday", "congratulations"], weight: null, isVeg: true, isActive: true, avgRating: 4.4, totalReviews: 67, createdAt: "", updatedAt: "",
    categorySlug: "flowers", categoryName: "Flowers",
  },
  "orchid-bunch": {
    id: "p11", name: "Orchid Bunch", slug: "orchid-bunch",
    description: "Premium orchid bunch featuring beautiful purple orchids in elegant packaging. A luxurious choice for special occasions and discerning recipients who appreciate the finer things in life.",
    shortDesc: "Premium blooms", categoryId: "cat-flowers", basePrice: 1299,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["anniversary", "thank-you"], weight: null, isVeg: true, isActive: true, avgRating: 4.6, totalReviews: 28, createdAt: "", updatedAt: "",
    categorySlug: "flowers", categoryName: "Flowers",
  },
  "cake-flowers-combo": {
    id: "p14", name: "Cake & Flowers Combo", slug: "cake-flowers-combo",
    description: "The perfect combination — a delicious chocolate truffle cake paired with a beautiful bouquet of red roses. Send love and sweetness together. Ideal for birthdays, anniversaries, and Valentine's Day.",
    shortDesc: "Perfect pair", categoryId: "cat-combos", basePrice: 1199,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "anniversary", "valentines-day"], weight: "500g + bouquet", isVeg: true, isActive: true, avgRating: 4.9, totalReviews: 156, createdAt: "", updatedAt: "",
    categorySlug: "combos", categoryName: "Combos",
  },
  "money-plant": {
    id: "p19", name: "Money Plant", slug: "money-plant",
    description: "The golden Money Plant is considered a symbol of good luck and prosperity. This low-maintenance plant comes in a beautiful ceramic pot, making it an ideal gift for housewarmings, new beginnings, or simply to add a touch of green to any space.",
    shortDesc: "Lucky charm", categoryId: "cat-plants", basePrice: 399,
    images: ["/placeholder-product.svg"],
    tags: [], occasion: ["housewarming", "congratulations"], weight: null, isVeg: true, isActive: true, avgRating: 4.1, totalReviews: 34, createdAt: "", updatedAt: "",
    categorySlug: "plants", categoryName: "Plants",
  },
  "chocolate-gift-box": {
    id: "p24", name: "Chocolate Gift Box", slug: "chocolate-gift-box",
    description: "A premium collection of assorted chocolates beautifully presented in an elegant gift box. Includes dark, milk, and white chocolate varieties with flavors like hazelnut, caramel, and orange. Perfect for any chocolate lover.",
    shortDesc: "Choco heaven", categoryId: "cat-gifts", basePrice: 799,
    images: ["/placeholder-product.svg"],
    tags: ["bestseller"], occasion: ["birthday", "thank-you"], weight: "500g", isVeg: true, isActive: true, avgRating: 4.4, totalReviews: 48, createdAt: "", updatedAt: "",
    categorySlug: "gifts", categoryName: "Gifts",
  },
}

// ── Helper: render star rating ────────────────────────────────────

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "h-5 w-5" : "h-4 w-4"
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : star - 0.5 <= rating
                ? "fill-amber-400/50 text-amber-400"
                : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const productData = ALL_PRODUCTS[slug]
  const addItem = useCart((s) => s.addItem)

  const [quantity, setQuantity] = useState(1)
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection[]>([])
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null)
  const [deliverySlot, setDeliverySlot] = useState<string | null>(null)
  const [pincode, setPincode] = useState("")
  const [pincodeChecked, setPincodeChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<"description" | "reviews" | "delivery">("description")

  if (!productData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF0F5]">
            <Package className="h-10 w-10 text-[#E91E63]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Product Not Found</h1>
          <p className="mt-2 text-muted-foreground max-w-md">
            We couldn&apos;t find the product you&apos;re looking for. It may have been removed or the link might be incorrect.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 btn-gradient px-6 py-3 rounded-lg text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const { categorySlug, categoryName, ...product } = productData

  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const totalPrice = (product.basePrice + addonTotal) * quantity

  const handleAddToCart = () => {
    addItem(product, quantity, selectedAddons)
  }

  const handleBuyNow = () => {
    addItem(product, quantity, selectedAddons)
    router.push("/cart")
  }

  const handleCheckPincode = () => {
    if (pincode.length === 6) {
      setPincodeChecked(true)
    }
  }

  // Get related products (same category, excluding current)
  const relatedProducts = Object.values(ALL_PRODUCTS)
    .filter((p) => p.categorySlug === categorySlug && p.slug !== slug)
    .slice(0, 4)

  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-[#E91E63] transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            <Link
              href={`/category/${categorySlug}`}
              className="hover:text-[#E91E63] transition-colors"
            >
              {categoryName}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            <span className="text-[#1A1A2E] font-medium line-clamp-1">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main product section */}
      <div className="container mx-auto px-4 py-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.67fr] lg:gap-12">

          {/* ── Left Column: Gallery (60%) ────────────────────── */}
          <div className="card-premium p-4 sm:p-6">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* ── Right Column: Product Details (40%) ───────────── */}
          <div className="space-y-6">

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {product.tags.includes("bestseller") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#E91E63] to-[#FF6B9D] px-3 py-1 text-xs font-semibold text-white">
                  Bestseller
                </span>
              )}
              {product.occasion.map((occ) => (
                <Badge key={occ} variant="outline" className="text-xs capitalize border-[#E91E63]/20 text-[#E91E63]/80 bg-[#FFF0F5]">
                  {occ.replace(/-/g, " ")}
                </Badge>
              ))}
            </div>

            {/* Product name */}
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl lg:text-[2rem] leading-tight">
                {product.name}
              </h1>
              {product.weight && (
                <p className="mt-1 text-sm text-muted-foreground">{product.weight}</p>
              )}
            </div>

            {/* Star rating with amber stars */}
            {product.totalReviews > 0 && (
              <div className="flex items-center gap-3">
                <StarRating rating={product.avgRating} size="md" />
                <span className="text-sm font-semibold text-[#1A1A2E]">
                  {product.avgRating.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({product.totalReviews} {product.totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}

            {/* Price */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#E91E63]">
                  {formatPrice(product.basePrice)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Inclusive of all taxes</p>
            </div>

            {/* Veg/Non-veg indicator (Indian standard green dot) */}
            <div className="flex items-center gap-2">
              <div className={`flex h-5 w-5 items-center justify-center rounded-sm border-2 ${product.isVeg ? "border-green-600" : "border-red-600"}`}>
                <div className={`h-2.5 w-2.5 rounded-full ${product.isVeg ? "bg-green-600" : "bg-red-600"}`} />
              </div>
              <span className="text-sm text-muted-foreground">
                {product.isVeg ? "Vegetarian" : "Non-Vegetarian"}
              </span>
            </div>

            {/* Short description */}
            {product.shortDesc && (
              <p className="text-sm text-[#1A1A2E]/70 leading-relaxed">
                {product.shortDesc} &mdash; {product.description?.split(".")[0]}.
              </p>
            )}

            <Separator />

            {/* ── Delivery section card ────────────────────────── */}
            <div className="card-premium border border-gray-100 overflow-hidden">
              <div className="bg-[#FFF9F5] px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#E91E63]" />
                  <h3 className="font-semibold text-[#1A1A2E]">Check Delivery Availability</h3>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Pincode input */}
                <div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Enter delivery pincode"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => {
                          setPincode(e.target.value.replace(/\D/g, ""))
                          setPincodeChecked(false)
                        }}
                        className="pl-10 h-11"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="h-11 px-5 border-[#E91E63] text-[#E91E63] hover:bg-[#FFF0F5] hover:text-[#E91E63] font-semibold"
                      onClick={handleCheckPincode}
                      disabled={pincode.length !== 6}
                    >
                      Check
                    </Button>
                  </div>
                  {pincodeChecked && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
                      <Shield className="h-4 w-4" />
                      Delivery available to {pincode}. Earliest delivery: Today
                    </p>
                  )}
                </div>

                {/* Delivery slot picker */}
                <DeliverySlotPicker
                  selectedDate={deliveryDate}
                  selectedSlot={deliverySlot}
                  onDateChange={setDeliveryDate}
                  onSlotChange={setDeliverySlot}
                />
              </div>
            </div>

            <Separator />

            {/* ── Add-ons ──────────────────────────────────────── */}
            <AddonSelector
              addons={SAMPLE_ADDONS}
              selected={selectedAddons}
              onChange={setSelectedAddons}
            />

            {selectedAddons.length > 0 && <Separator />}

            {/* ── Quantity selector ────────────────────────────── */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-[#1A1A2E]">Quantity</span>
              <div className="flex items-center rounded-full border-2 border-gray-200">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-l-full text-[#1A1A2E] hover:bg-gray-50 transition-colors disabled:opacity-30"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex h-10 w-12 items-center justify-center border-x-2 border-gray-200 text-sm font-bold text-[#1A1A2E]">
                  {quantity}
                </span>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-r-full text-[#1A1A2E] hover:bg-gray-50 transition-colors disabled:opacity-30"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Price summary if addons or qty > 1 */}
            {(selectedAddons.length > 0 || quantity > 1) && (
              <div className="rounded-xl bg-[#FFF9F5] border border-[#E91E63]/10 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#1A1A2E]/70">
                  <span>{product.name} x {quantity}</span>
                  <span className="font-medium">{formatPrice(product.basePrice * quantity)}</span>
                </div>
                {selectedAddons.map((addon) => (
                  <div key={addon.addonId} className="flex justify-between text-[#1A1A2E]/70">
                    <span>{addon.name} x {quantity}</span>
                    <span className="font-medium">{formatPrice(addon.price * quantity)}</span>
                  </div>
                ))}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-[#1A1A2E]">
                  <span>Total</span>
                  <span className="text-[#E91E63]">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            )}

            {/* ── Action buttons ───────────────────────────────── */}
            <div className="flex gap-3">
              <button
                className="flex-1 btn-gradient flex items-center justify-center gap-2 h-14 text-base rounded-xl shadow-lg"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart &mdash; {formatPrice(totalPrice)}
              </button>
              <button
                className="flex-1 h-14 rounded-xl border-2 border-[#E91E63] text-[#E91E63] font-semibold text-base hover:bg-[#FFF0F5] transition-all duration-200"
                onClick={handleBuyNow}
              >
                Buy Now
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-[#FFF9F5] p-3 text-center">
                <Truck className="h-5 w-5 text-[#E91E63]" />
                <span className="text-[11px] font-medium text-[#1A1A2E]/70">Same Day Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-[#FFF9F5] p-3 text-center">
                <Shield className="h-5 w-5 text-[#E91E63]" />
                <span className="text-[11px] font-medium text-[#1A1A2E]/70">100% Fresh</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-[#FFF9F5] p-3 text-center">
                <Clock className="h-5 w-5 text-[#E91E63]" />
                <span className="text-[11px] font-medium text-[#1A1A2E]/70">On-Time Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Below-fold: Tabs section ────────────────────────────── */}
      <div className="bg-white border-t mt-8">
        <div className="container mx-auto px-4">
          {/* Tab headers */}
          <div className="flex border-b">
            {(
              [
                { key: "description", label: "Description" },
                { key: "reviews", label: "Reviews" },
                { key: "delivery", label: "Delivery Info" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "text-[#E91E63]"
                    : "text-muted-foreground hover:text-[#1A1A2E]"
                }`}
              >
                {tab.label}
                {tab.key === "reviews" && product.totalReviews > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({product.totalReviews})</span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-gradient-to-r from-[#E91E63] to-[#FF6B9D]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="py-8">
            {/* Description tab */}
            {activeTab === "description" && (
              <div className="max-w-3xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A2E] mb-3">About this product</h3>
                  <p className="text-sm text-[#1A1A2E]/70 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
                {product.weight && (
                  <div className="flex items-center gap-8 rounded-xl bg-[#FFF9F5] p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Weight</p>
                      <p className="text-sm font-semibold text-[#1A1A2E]">{product.weight}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`flex h-4 w-4 items-center justify-center rounded-sm border-2 ${product.isVeg ? "border-green-600" : "border-red-600"}`}>
                          <div className={`h-2 w-2 rounded-full ${product.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                        </div>
                        <p className="text-sm font-semibold text-[#1A1A2E]">{product.isVeg ? "Vegetarian" : "Non-Vegetarian"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="text-sm font-semibold text-[#1A1A2E]">{categoryName}</p>
                    </div>
                  </div>
                )}
                {product.occasion.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[#1A1A2E] mb-2">Perfect for</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.occasion.map((occ) => (
                        <span
                          key={occ}
                          className="inline-flex items-center rounded-full bg-[#FFF0F5] px-3 py-1.5 text-xs font-medium text-[#E91E63] capitalize"
                        >
                          {occ.replace(/-/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reviews tab */}
            {activeTab === "reviews" && (
              <div className="max-w-3xl">
                <ReviewList
                  reviews={SAMPLE_REVIEWS}
                  avgRating={product.avgRating}
                  totalReviews={product.totalReviews}
                />
              </div>
            )}

            {/* Delivery info tab */}
            {activeTab === "delivery" && (
              <div className="max-w-3xl space-y-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F5]">
                    <Truck className="h-5 w-5 text-[#E91E63]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A2E]">Delivery Areas</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      We currently deliver to Chandigarh, Mohali &amp; Panchkula. Enter your pincode above to check availability for your area.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F5]">
                    <Clock className="h-5 w-5 text-[#E91E63]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A2E]">Delivery Slots</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose from Standard (9AM-9PM, Free), Fixed Slot (2-hour window, +49), Midnight (11PM-11:59PM, +199), Early Morning (6AM-8AM, +149), or Express (within 2-3 hours, +249).
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0F5]">
                    <Info className="h-5 w-5 text-[#E91E63]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A2E]">Important Notes</h4>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      <li>Orders placed before 4 PM qualify for same-day delivery</li>
                      <li>Free delivery on orders above {formatPrice(499)}</li>
                      <li>Actual product appearance may slightly vary from images</li>
                      <li>Contact us for bulk or corporate orders</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Related products section ─────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="bg-[#FFF9F5] border-t py-10 sm:py-14">
          <div className="container mx-auto px-4">
            <h2 className="section-title text-[#1A1A2E] mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6 mt-10">
              {relatedProducts.map((rp) => {
                const { categorySlug, categoryName, ...relProduct } = rp
                void categorySlug; void categoryName
                return (
                  <ProductCard key={relProduct.id} product={relProduct} />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
