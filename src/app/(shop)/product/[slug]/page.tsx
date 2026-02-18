"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, MapPin, Minus, Plus, ShoppingCart, Star, Truck, Shield, Clock, Package, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductGallery } from "@/components/product/product-gallery"
import { DeliverySlotPicker } from "@/components/product/delivery-slot-picker"
import { AddonSelector } from "@/components/product/addon-selector"
import { VariationSelector } from "@/components/product/variation-selector"
import { ReviewList } from "@/components/product/review-list"
import { ProductCard } from "@/components/product/product-card"
import { useCurrency } from "@/hooks/use-currency"
import { useCart } from "@/hooks/use-cart"
import type { Product, ProductAddon, ProductVariation, Review, AddonSelection, VariationSelection, ApiResponse, PaginatedData } from "@/types"

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

// ── Loading Skeleton ──────────────────────────────────────────────

function ProductDetailSkeleton() {
  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.67fr] lg:gap-12">
          <div className="card-premium p-4 sm:p-6">
            <Skeleton className="aspect-square w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────

interface ProductWithDetails extends Omit<Product, 'category' | 'addons' | 'variations'> {
  category?: { id: string; name: string; slug: string }
  variations?: ProductVariation[]
  addons?: ProductAddon[]
  reviews?: Review[]
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const slug = params.slug as string

  const addItem = useCart((s) => s.addItem)

  // State for fetched data
  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // UI state
  const [quantity, setQuantity] = useState(1)
  const [selectedVariation, setSelectedVariation] = useState<VariationSelection | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection[]>([])
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null)
  const [deliverySlot, setDeliverySlot] = useState<string | null>(null)
  const [pincode, setPincode] = useState("")
  const [pincodeChecked, setPincodeChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<"description" | "reviews" | "delivery">("description")

  // Fetch product by slug
  useEffect(() => {
    async function fetchProduct() {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`)
        const json: ApiResponse<ProductWithDetails> = await res.json()
        if (json.success && json.data) {
          setProduct(json.data)
          // Fetch related products from same category
          if (json.data.category?.slug) {
            const relRes = await fetch(`/api/products?categorySlug=${json.data.category.slug}&pageSize=5&sortBy=rating`)
            const relJson: ApiResponse<PaginatedData<Product>> = await relRes.json()
            if (relJson.success && relJson.data) {
              setRelatedProducts(relJson.data.items.filter((p) => p.id !== json.data!.id).slice(0, 4))
            }
          }
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [slug])

  // Auto-select default variation when product loads
  useEffect(() => {
    if (product?.variations && product.variations.length > 0 && !selectedVariation) {
      const defaultVar = product.variations.find((v) => v.isDefault) || product.variations[0]
      if (defaultVar) {
        setSelectedVariation({
          variationId: defaultVar.id,
          type: defaultVar.type,
          label: defaultVar.label,
          price: Number(defaultVar.price),
        })
      }
    }
  }, [product, selectedVariation])

  if (loading) {
    return <ProductDetailSkeleton />
  }

  if (notFound || !product) {
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

  const categorySlug = product.category?.slug || ""
  const categoryName = product.category?.name || ""
  const variations = product.variations || []
  const addons = product.addons || []
  const reviews = product.reviews || []
  const hasVariations = variations.length > 0

  const unitPrice = selectedVariation ? selectedVariation.price : Number(product.basePrice)
  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const totalPrice = (unitPrice + addonTotal) * quantity

  const handleAddToCart = () => {
    addItem(product as Product, quantity, selectedAddons, selectedVariation)
  }

  const handleBuyNow = () => {
    addItem(product as Product, quantity, selectedAddons, selectedVariation)
    router.push("/cart")
  }

  const handleCheckPincode = () => {
    if (pincode.length === 6) {
      setPincodeChecked(true)
    }
  }

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
                <StarRating rating={Number(product.avgRating)} size="md" />
                <span className="text-sm font-semibold text-[#1A1A2E]">
                  {Number(product.avgRating).toFixed(1)}
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
                  {formatPrice(unitPrice)}
                </span>
                {hasVariations && selectedVariation && (
                  <span className="text-sm text-muted-foreground">
                    for {selectedVariation.label}
                  </span>
                )}
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

            {/* ── Weight / Size variations ────────────────────── */}
            {hasVariations && (
              <>
                <VariationSelector
                  variations={variations}
                  selected={selectedVariation}
                  onChange={setSelectedVariation}
                />
                <Separator />
              </>
            )}

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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
            {addons.length > 0 && (
              <>
                <AddonSelector
                  addons={addons}
                  selected={selectedAddons}
                  onChange={setSelectedAddons}
                />
                {selectedAddons.length > 0 && <Separator />}
              </>
            )}

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

            {/* Price summary if addons or qty > 1 or variation selected */}
            {(selectedAddons.length > 0 || quantity > 1 || selectedVariation) && (
              <div className="rounded-xl bg-[#FFF9F5] border border-[#E91E63]/10 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#1A1A2E]/70">
                  <span>
                    {product.name}
                    {selectedVariation && ` (${selectedVariation.label})`}
                    {" "}x {quantity}
                  </span>
                  <span className="font-medium">{formatPrice(unitPrice * quantity)}</span>
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
                  reviews={reviews}
                  avgRating={Number(product.avgRating)}
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
              {relatedProducts.map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
