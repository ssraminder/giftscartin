"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MapPin, Minus, Plus, ShoppingCart, Star, Truck, Shield, Clock, Package, Info, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductGallery } from "@/components/product/product-gallery"
import { DeliverySlotPicker } from "@/components/product/delivery-slot-picker"
import { VariationSelector } from "@/components/product/variation-selector"
import { AddonGroup } from "@/components/product/addon-group"
import { UpsellProducts } from "@/components/product/upsell-products"
import { ReviewList } from "@/components/product/review-list"
import { ProductCard } from "@/components/product/product-card"
import { Breadcrumb } from "@/components/seo/breadcrumb"
import { useCurrency } from "@/hooks/use-currency"
import { useCart } from "@/hooks/use-cart"
import { usePartner } from "@/hooks/use-partner"
import type {
  Product,
  ProductAttribute,
  ProductVariation,
  ProductAddonGroup,
  UpsellProduct,
  Review,
  AddonGroupSelection,
  AddonSelectionRecord,
  ApiResponse,
  PaginatedData,
} from "@/types"

// -- Helper: render star rating ------------------------------------------------

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

// -- Loading Skeleton ----------------------------------------------------------

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

// -- Types for API response ---------------------------------------------------

interface ProductDetail extends Omit<Product, 'category'> {
  productType: "SIMPLE" | "VARIABLE"
  category?: { id: string; name: string; slug: string }
  attributes?: ProductAttribute[]
  variations?: ProductVariation[]
  addonGroups?: ProductAddonGroup[]
  upsells?: UpsellProduct[]
  reviews?: Review[]
}

// -- Default addon selection initializer --------------------------------------

function getDefaultAddonSelection(group: ProductAddonGroup): AddonGroupSelection {
  switch (group.type) {
    case "CHECKBOX": {
      const defaults = group.options.filter((o) => o.isDefault).map((o) => o.id)
      return { type: "CHECKBOX", selectedIds: defaults }
    }
    case "RADIO": {
      const def = group.options.find((o) => o.isDefault)
      return { type: "RADIO", selectedId: def?.id ?? null }
    }
    case "SELECT": {
      const def = group.options.find((o) => o.isDefault)
      return { type: "SELECT", selectedId: def?.id ?? null }
    }
    case "TEXT_INPUT":
      return { type: "TEXT_INPUT", text: "" }
    case "TEXTAREA":
      return { type: "TEXTAREA", text: "" }
    case "FILE_UPLOAD":
      return { type: "FILE_UPLOAD", fileUrl: null, fileName: null }
  }
}

// -- Calculate addon price from selections ------------------------------------

function calculateAddonPrice(
  groups: ProductAddonGroup[],
  selections: Map<string, AddonGroupSelection>
): number {
  let total = 0
  for (const group of groups) {
    const sel = selections.get(group.id)
    if (!sel) continue

    if (sel.type === "CHECKBOX") {
      for (const optId of sel.selectedIds) {
        const opt = group.options.find((o) => o.id === optId)
        if (opt) total += Number(opt.price)
      }
    } else if (sel.type === "RADIO" || sel.type === "SELECT") {
      if (sel.selectedId) {
        const opt = group.options.find((o) => o.id === sel.selectedId)
        if (opt) total += Number(opt.price)
      }
    }
    // TEXT, TEXTAREA, FILE_UPLOAD don't have prices
  }
  return total
}

// -- Component -----------------------------------------------------------------

export default function ProductDetailClient({ slug }: { slug: string }) {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const addItemAdvanced = useCart((s) => s.addItemAdvanced)
  const { partner } = usePartner()
  const addonSectionRef = useRef<HTMLDivElement>(null)

  // State for fetched data
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // UI state
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [addonSelections, setAddonSelections] = useState<Map<string, AddonGroupSelection>>(new Map())
  const [addonErrors, setAddonErrors] = useState<Set<string>>(new Set())
  const [variationError, setVariationError] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0])
  const [deliverySlotId, setDeliverySlotId] = useState<string | null>(null)
  const [, setDeliverySlotName] = useState('')
  const [, setDeliverySlotCharge] = useState(0)
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
        const json: ApiResponse<ProductDetail> = await res.json()
        if (json.success && json.data) {
          setProduct(json.data)
          // Fetch related products from same category
          if (json.data.category?.slug) {
            const vendorParam = partner?.defaultVendorId ? `&vendorId=${partner.defaultVendorId}` : ""
            const relRes = await fetch(`/api/products?categorySlug=${json.data.category.slug}&pageSize=5&sortBy=rating${vendorParam}`)
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

  // Initialize addon selections when product loads
  useEffect(() => {
    if (product?.addonGroups && product.addonGroups.length > 0) {
      const initial = new Map<string, AddonGroupSelection>()
      for (const group of product.addonGroups) {
        initial.set(group.id, getDefaultAddonSelection(group))
      }
      setAddonSelections(initial)
    }
  }, [product])

  // Match variation from selected options
  const matchedVariation = useMemo(() => {
    if (!product?.variations || Object.keys(selectedOptions).length === 0) return null
    return product.variations.find((v) => {
      const attrs = v.attributes as Record<string, string>
      return Object.entries(selectedOptions).every(
        ([slug, value]) => attrs[slug] === value
      )
    }) ?? null
  }, [product?.variations, selectedOptions])

  // Computed values
  const isVariable = product?.productType === "VARIABLE"
  const attributes = product?.attributes || []
  const variations = useMemo(() => product?.variations || [], [product?.variations])
  const addonGroups = useMemo(() => product?.addonGroups || [], [product?.addonGroups])
  const upsells = product?.upsells || []
  const reviews = product?.reviews || []

  // Get min variation price for "From ₹X" display
  const minVariationPrice = useMemo(() => {
    if (variations.length === 0) return null
    return Math.min(...variations.map((v) => {
      const now = new Date()
      const hasSale = v.salePrice &&
        (!v.saleFrom || new Date(v.saleFrom) <= now) &&
        (!v.saleTo || new Date(v.saleTo) >= now)
      return Number(hasSale ? v.salePrice : v.price)
    }))
  }, [variations])

  // Active sale price for matched variation
  const variationDisplayPrice = useMemo(() => {
    if (!matchedVariation) return null
    const now = new Date()
    const hasSale = matchedVariation.salePrice &&
      (!matchedVariation.saleFrom || new Date(matchedVariation.saleFrom) <= now) &&
      (!matchedVariation.saleTo || new Date(matchedVariation.saleTo) >= now)
    return Number(hasSale ? matchedVariation.salePrice : matchedVariation.price)
  }, [matchedVariation])

  // Unit price (variation or base)
  const unitPrice = isVariable
    ? (variationDisplayPrice ?? 0)
    : Number(product?.basePrice ?? 0)

  const addonTotal = calculateAddonPrice(addonGroups, addonSelections)
  const totalPrice = (unitPrice + addonTotal) * quantity

  const handleOptionChange = useCallback((attributeSlug: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [attributeSlug]: value }))
    setVariationError(false)
  }, [])

  const handleAddonChange = useCallback((groupId: string, value: AddonGroupSelection) => {
    setAddonSelections((prev) => {
      const next = new Map(prev)
      next.set(groupId, value)
      return next
    })
    setAddonErrors((prev) => {
      if (prev.has(groupId)) {
        const next = new Set(prev)
        next.delete(groupId)
        return next
      }
      return prev
    })
  }, [])

  // Build AddonSelectionRecord[] for cart
  const buildAddonRecords = useCallback((): AddonSelectionRecord[] => {
    const records: AddonSelectionRecord[] = []
    for (const group of addonGroups) {
      const sel = addonSelections.get(group.id)
      if (!sel) continue

      const record: AddonSelectionRecord = {
        groupId: group.id,
        groupName: group.name,
        type: group.type,
      }

      if (sel.type === "CHECKBOX" && sel.selectedIds.length > 0) {
        record.selectedIds = sel.selectedIds
        record.selectedLabels = sel.selectedIds.map(
          (id) => group.options.find((o) => o.id === id)?.label ?? ""
        )
        record.totalAddonPrice = sel.selectedIds.reduce((sum, id) => {
          const opt = group.options.find((o) => o.id === id)
          return sum + (opt ? Number(opt.price) : 0)
        }, 0)
        records.push(record)
      } else if ((sel.type === "RADIO" || sel.type === "SELECT") && sel.selectedId) {
        const opt = group.options.find((o) => o.id === sel.selectedId)
        record.selectedId = sel.selectedId
        record.selectedLabel = opt?.label
        record.addonPrice = opt ? Number(opt.price) : 0
        records.push(record)
      } else if ((sel.type === "TEXT_INPUT" || sel.type === "TEXTAREA") && sel.text) {
        record.text = sel.text
        records.push(record)
      } else if (sel.type === "FILE_UPLOAD" && sel.fileUrl) {
        record.fileUrl = sel.fileUrl
        record.fileName = sel.fileName ?? undefined
        records.push(record)
      }
    }
    return records
  }, [addonGroups, addonSelections])

  const handleAddToCart = useCallback(() => {
    if (!product) return

    // Validate: VARIABLE product must have a variation selected
    if (isVariable && !matchedVariation) {
      setVariationError(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    // Validate required addon groups
    const errors = new Set<string>()
    for (const group of addonGroups) {
      if (!group.required) continue
      const sel = addonSelections.get(group.id)
      if (!sel) { errors.add(group.id); continue }

      let hasValue = false
      if (sel.type === "CHECKBOX") hasValue = sel.selectedIds.length > 0
      else if (sel.type === "RADIO" || sel.type === "SELECT") hasValue = !!sel.selectedId
      else if (sel.type === "TEXT_INPUT" || sel.type === "TEXTAREA") hasValue = sel.text.trim().length > 0
      else if (sel.type === "FILE_UPLOAD") hasValue = !!sel.fileUrl

      if (!hasValue) errors.add(group.id)
    }

    if (errors.size > 0) {
      setAddonErrors(errors)
      // Scroll to first error
      addonSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    addItemAdvanced({
      product: product as Product,
      quantity,
      price: unitPrice,
      variationId: matchedVariation?.id ?? null,
      selectedAttributes: matchedVariation ? (matchedVariation.attributes as Record<string, string>) : null,
      addonSelections: buildAddonRecords(),
    })

    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }, [product, isVariable, matchedVariation, addonGroups, addonSelections, addItemAdvanced, quantity, unitPrice, buildAddonRecords])

  const handleBuyNow = useCallback(() => {
    handleAddToCart()
    // Only navigate if validation passed (addedToCart will be set)
    setTimeout(() => {
      if (!variationError && addonErrors.size === 0) {
        router.push("/cart")
      }
    }, 100)
  }, [handleAddToCart, router, variationError, addonErrors])

  const handleCheckPincode = () => {
    if (pincode.length === 6) {
      setPincodeChecked(true)
    }
  }

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

  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <Breadcrumb items={[
            { label: categoryName, href: `/category/${categorySlug}` },
            { label: product.name },
          ]} />
        </div>
      </div>

      {/* Main product section */}
      <div className="container mx-auto px-4 py-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.67fr] lg:gap-12">

          {/* -- Left Column: Gallery (60%) -- */}
          <div className="card-premium p-4 sm:p-6">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* -- Right Column: Product Details (40%) -- */}
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

            {/* Star rating */}
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

            {/* Price display */}
            <div>
              {isVariable ? (
                matchedVariation ? (
                  // VariationSelector shows its own price, so just show "Inclusive of all taxes"
                  <div />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">From</span>
                    <span className="text-3xl font-bold text-[#E91E63]">
                      {minVariationPrice ? formatPrice(minVariationPrice) : ""}
                    </span>
                  </div>
                )
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#E91E63]">
                    {formatPrice(Number(product.basePrice))}
                  </span>
                </div>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">Inclusive of all taxes</p>
            </div>

            {/* Veg/Non-veg indicator */}
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
                {product.shortDesc}
              </p>
            )}

            {/* -- Variation selector (VARIABLE products) -- */}
            {isVariable && attributes.length > 0 && (
              <>
                {variationError && (
                  <p className="text-sm text-red-500 font-medium">Please select all options</p>
                )}
                <VariationSelector
                  attributes={attributes}
                  variations={variations}
                  selectedOptions={selectedOptions}
                  onOptionChange={handleOptionChange}
                  matchedVariation={matchedVariation}
                />
                <Separator />
              </>
            )}

            {/* -- Delivery section card -- */}
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
                  productIds={product ? [product.id] : []}
                  selectedDate={deliveryDate}
                  selectedSlot={deliverySlotId}
                  onDateChange={setDeliveryDate}
                  onSlotChange={(id, name, charge) => {
                    setDeliverySlotId(id)
                    setDeliverySlotName(name)
                    setDeliverySlotCharge(charge)
                  }}
                />
              </div>
            </div>

            <Separator />

            {/* -- Addon groups -- */}
            {addonGroups.length > 0 && (
              <div ref={addonSectionRef} className="space-y-4">
                <h3 className="text-sm font-semibold text-[#1A1A2E]">Customise Your Order</h3>
                {addonGroups.map((group) => (
                  <AddonGroup
                    key={group.id}
                    group={group}
                    value={addonSelections.get(group.id) || getDefaultAddonSelection(group)}
                    onChange={(val) => handleAddonChange(group.id, val)}
                    hasError={addonErrors.has(group.id)}
                  />
                ))}
                <Separator />
              </div>
            )}

            {/* -- Quantity selector -- */}
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

            {/* Price summary */}
            {(addonTotal > 0 || quantity > 1 || matchedVariation) && unitPrice > 0 && (
              <div className="rounded-xl bg-[#FFF9F5] border border-[#E91E63]/10 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#1A1A2E]/70">
                  <span>
                    {product.name}
                    {matchedVariation && ` (${Object.values(matchedVariation.attributes as Record<string, string>).join(", ")})`}
                    {" "}x {quantity}
                  </span>
                  <span className="font-medium">{formatPrice(unitPrice * quantity)}</span>
                </div>
                {addonGroups.map((group) => {
                  const sel = addonSelections.get(group.id)
                  if (!sel) return null
                  let price = 0
                  let label = ""
                  if (sel.type === "CHECKBOX" && sel.selectedIds.length > 0) {
                    const labels: string[] = []
                    for (const id of sel.selectedIds) {
                      const opt = group.options.find((o) => o.id === id)
                      if (opt) { price += Number(opt.price); labels.push(opt.label) }
                    }
                    label = labels.join(", ")
                  } else if ((sel.type === "RADIO" || sel.type === "SELECT") && sel.selectedId) {
                    const opt = group.options.find((o) => o.id === sel.selectedId)
                    if (opt) { price = Number(opt.price); label = opt.label }
                  }
                  if (price === 0 && !label) return null
                  return (
                    <div key={group.id} className="flex justify-between text-[#1A1A2E]/70">
                      <span>{label} x {quantity}</span>
                      <span className="font-medium">{price > 0 ? formatPrice(price * quantity) : "Free"}</span>
                    </div>
                  )
                })}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-[#1A1A2E]">
                  <span>Total</span>
                  <span className="text-[#E91E63]">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            )}

            {/* -- Action buttons -- */}
            <div className="flex gap-3">
              <button
                className="flex-1 btn-gradient flex items-center justify-center gap-2 h-14 text-base rounded-xl shadow-lg disabled:opacity-50"
                style={partner?.primaryColor ? { background: partner.primaryColor, borderColor: partner.primaryColor } : {}}
                onClick={handleAddToCart}
                disabled={isVariable && matchedVariation?.stockQty === 0}
              >
                {addedToCart ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    {unitPrice > 0
                      ? `Add to Cart — ${formatPrice(totalPrice)}`
                      : "Add to Cart"}
                  </>
                )}
              </button>
              <button
                className="flex-1 h-14 rounded-xl border-2 border-[#E91E63] text-[#E91E63] font-semibold text-base hover:bg-[#FFF0F5] transition-all duration-200 disabled:opacity-50"
                onClick={handleBuyNow}
                disabled={isVariable && matchedVariation?.stockQty === 0}
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

      {/* -- Upsell products section -- */}
      {upsells.length > 0 && (
        <div className="container mx-auto px-4 py-6">
          <UpsellProducts upsells={upsells} />
        </div>
      )}

      {/* -- Below-fold: Tabs section -- */}
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

      {/* -- Related products section -- */}
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
