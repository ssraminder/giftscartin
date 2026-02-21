"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  MapPin, Minus, Plus, ShoppingCart, Star, Truck, Clock, Calendar,
  Package, CheckCircle, ChevronDown, ChevronUp, Lock, Leaf, RotateCcw,
  MessageSquare,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductGallery } from "@/components/product/product-gallery"
import { DeliverySlotPicker, type DeliverySelection } from "@/components/product/delivery-slot-picker"
import { VariationSelector } from "@/components/product/variation-selector"
import { AddonGroup } from "@/components/product/addon-group"
import { UpsellProducts } from "@/components/product/upsell-products"
import { ReviewList } from "@/components/product/review-list"
import { ProductCard } from "@/components/product/product-card"
import { useCurrency } from "@/hooks/use-currency"
import { useCart } from "@/hooks/use-cart"
import { usePartner } from "@/hooks/use-partner"
import { useCity } from "@/hooks/use-city"
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
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-3">
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Skeleton className="aspect-square w-full rounded-lg" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
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

// -- Description Accordion Item -----------------------------------------------

function AccordionItem({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

// -- Weight variant helpers ---------------------------------------------------

interface WeightOption {
  label: string
  multiplier: number
}

const WEIGHT_MULTIPLIERS: Record<string, number> = {
  "500g": 1,
  "1kg": 1.5,
  "1.5kg": 2,
  "2kg": 2.5,
  "3kg": 3.5,
}

function parseWeightOptions(weight: string | null): WeightOption[] | null {
  if (!weight) return null
  const parts = weight.split(",").map((w) => w.trim()).filter(Boolean)
  if (parts.length <= 1) return null
  return parts.map((label) => ({
    label,
    multiplier: WEIGHT_MULTIPLIERS[label.toLowerCase()] ?? 1,
  }))
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
  }
  return total
}

// -- Component -----------------------------------------------------------------

export default function ProductDetailClient({ slug }: { slug: string }) {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const addItemAdvanced = useCart((s) => s.addItemAdvanced)
  const { partner } = usePartner()
  const { pincode: cityPincode, cityId } = useCity()
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
  const [deliverySelection, setDeliverySelection] = useState<DeliverySelection | null>(null)
  const [deliveryError, setDeliveryError] = useState(false)
  const [pincode, setPincode] = useState("")
  const [pincodeChecked, setPincodeChecked] = useState(false)
  const [pincodeAvailable, setPincodeAvailable] = useState(true)
  const [pincodeChecking, setPincodeChecking] = useState(false)
  const [selectedWeight, setSelectedWeight] = useState<string | null>(null)
  const [giftMessageOpen, setGiftMessageOpen] = useState(false)
  const [giftMessage, setGiftMessage] = useState("")

  // Pre-fill pincode from city context
  useEffect(() => {
    if (cityPincode && !pincode) {
      setPincode(cityPincode)
    }
  }, [cityPincode]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Initialize weight selection
  useEffect(() => {
    if (product?.weight) {
      const opts = parseWeightOptions(product.weight)
      if (opts && opts.length > 0) {
        setSelectedWeight(opts[0].label)
      }
    }
  }, [product?.weight])

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
  const weightOptions = useMemo(() => parseWeightOptions(product?.weight ?? null), [product?.weight])

  // Get min variation price for "From X" display
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

  // Weight-based price calculation
  const weightMultiplier = useMemo(() => {
    if (!selectedWeight || !weightOptions) return 1
    const opt = weightOptions.find((w) => w.label === selectedWeight)
    return opt?.multiplier ?? 1
  }, [selectedWeight, weightOptions])

  // Unit price (variation or base, with weight multiplier)
  const baseUnitPrice = isVariable
    ? (variationDisplayPrice ?? 0)
    : Number(product?.basePrice ?? 0)
  const unitPrice = baseUnitPrice * weightMultiplier

  const addonTotal = calculateAddonPrice(addonGroups, addonSelections)
  const totalPrice = (unitPrice + addonTotal) * quantity

  // MRP for discount display (when product has compareAtPrice or sale)
  const mrpPrice = useMemo(() => {
    if (isVariable && matchedVariation) {
      const now = new Date()
      const hasSale = matchedVariation.salePrice &&
        (!matchedVariation.saleFrom || new Date(matchedVariation.saleFrom) <= now) &&
        (!matchedVariation.saleTo || new Date(matchedVariation.saleTo) >= now)
      if (hasSale) return Number(matchedVariation.price) * weightMultiplier
    }
    return null
  }, [isVariable, matchedVariation, weightMultiplier])

  const discountPercent = useMemo(() => {
    if (!mrpPrice || mrpPrice <= unitPrice) return null
    return Math.round(((mrpPrice - unitPrice) / mrpPrice) * 100)
  }, [mrpPrice, unitPrice])

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

    // Validate: delivery selection required
    if (!deliverySelection) {
      setDeliveryError(true)
      return
    }
    setDeliveryError(false)

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
  }, [product, deliverySelection, isVariable, matchedVariation, addonGroups, addonSelections, addItemAdvanced, quantity, unitPrice, buildAddonRecords])

  const handleBuyNow = useCallback(() => {
    handleAddToCart()
    setTimeout(() => {
      if (!variationError && addonErrors.size === 0) {
        router.push("/cart")
      }
    }, 100)
  }, [handleAddToCart, router, variationError, addonErrors])

  const handleCheckPincode = async () => {
    if (pincode.length !== 6) return
    setPincodeChecking(true)
    try {
      const res = await fetch("/api/city/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: pincode }),
      })
      const json = await res.json()
      setPincodeAvailable(json.success && json.data?.cities?.length > 0)
      setPincodeChecked(true)
    } catch {
      setPincodeAvailable(false)
      setPincodeChecked(true)
    } finally {
      setPincodeChecking(false)
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

  // --- Shared sub-components rendered in different positions for mobile vs desktop ---

  const productInfoBlock = (
    <div>
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
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

      {/* Product Name */}
      <h1 className="font-bold text-xl text-gray-900 leading-tight mb-1">
        {product.name}
      </h1>

      {/* Rating Row */}
      {product.totalReviews > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <StarRating rating={Number(product.avgRating)} />
          <span className="text-sm text-gray-500">
            {Number(product.avgRating).toFixed(1)} ({product.totalReviews} {product.totalReviews === 1 ? "review" : "reviews"})
          </span>
        </div>
      )}

      {/* Price Display */}
      <div className="mb-4">
        {isVariable ? (
          matchedVariation ? (
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-3xl text-gray-900">
                {formatPrice(unitPrice)}
              </span>
              {mrpPrice && mrpPrice > unitPrice && (
                <>
                  <span className="text-gray-400 line-through text-lg">
                    {formatPrice(mrpPrice)}
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {discountPercent}% off
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-500">From</span>
              <span className="font-bold text-3xl text-gray-900">
                {minVariationPrice ? formatPrice(minVariationPrice) : ""}
              </span>
            </div>
          )
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-3xl text-gray-900">
              {formatPrice(unitPrice)}
            </span>
          </div>
        )}
        <p className="mt-0.5 text-xs text-gray-500">Inclusive of all taxes</p>
      </div>
    </div>
  )

  const weightSelectorBlock = weightOptions && weightOptions.length > 1 && (
    <div className="mb-4">
      <p className="font-medium text-sm text-gray-700 mb-2">Select Weight:</p>
      <div className="flex flex-wrap gap-2">
        {weightOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setSelectedWeight(opt.label)}
            className={`border rounded-lg px-4 py-2 text-sm cursor-pointer transition-all ${
              selectedWeight === opt.label
                ? "border-pink-600 bg-pink-50 text-pink-700 font-medium"
                : "border-gray-300 text-gray-600 hover:border-pink-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )

  const singleWeightDisplay = product.weight && !weightOptions && (
    <p className="text-sm text-gray-500 mb-4">Weight: {product.weight}</p>
  )

  const variationBlock = isVariable && attributes.length > 0 && (
    <div className="mb-4">
      {variationError && (
        <p className="text-sm text-red-500 font-medium mb-2">Please select all options</p>
      )}
      <VariationSelector
        attributes={attributes}
        variations={variations}
        selectedOptions={selectedOptions}
        onOptionChange={handleOptionChange}
        matchedVariation={matchedVariation}
      />
    </div>
  )

  const deliveryBlock = (
    <div className="mb-4">
      <p className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-1.5">
        <Calendar className="h-4 w-4" />
        Select Delivery Date &amp; Time
      </p>
      {deliveryError && !deliverySelection && (
        <p className="text-sm text-red-500 font-medium mb-2">Please select a delivery date and time slot</p>
      )}
      {product && cityId && (
        <DeliverySlotPicker
          productId={product.id}
          cityId={cityId}
          onSelect={(sel) => {
            setDeliverySelection(sel)
            setDeliveryError(false)
          }}
          initialSelection={deliverySelection ?? undefined}
        />
      )}
    </div>
  )

  const pincodeBlock = (
    <div className="mb-4">
      <p className="font-medium text-sm text-gray-700 mb-2">Deliver to:</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Enter 6-digit pincode"
            maxLength={6}
            value={pincode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPincode(e.target.value.replace(/\D/g, ""))
              setPincodeChecked(false)
            }}
            className="pl-10 h-10 text-base"
          />
        </div>
        <Button
          variant="outline"
          className="h-10 px-4 border-pink-600 text-pink-600 hover:bg-pink-50 hover:text-pink-600 font-semibold text-sm"
          onClick={handleCheckPincode}
          disabled={pincode.length !== 6 || pincodeChecking}
        >
          {pincodeChecking ? "..." : "Check"}
        </Button>
      </div>
      {pincodeChecked && (
        <p className={`mt-2 flex items-center gap-1.5 text-sm ${pincodeAvailable ? "text-green-600" : "text-red-500"}`}>
          {pincodeAvailable ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Delivery available to {pincode}
            </>
          ) : (
            <>
              <span>Not serviceable at {pincode}</span>
            </>
          )}
        </p>
      )}
    </div>
  )

  const giftMessageBlock = (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setGiftMessageOpen(!giftMessageOpen)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-pink-600 transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        Add a Gift Message
        {giftMessageOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {giftMessageOpen && (
        <div className="mt-2">
          <textarea
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value.slice(0, 150))}
            placeholder="Write your message here..."
            rows={3}
            maxLength={150}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none text-base"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{giftMessage.length}/150</p>
        </div>
      )}
    </div>
  )

  const addonBlock = addonGroups.length > 0 && (
    <div ref={addonSectionRef} className="mb-4">
      <p className="font-medium text-sm text-gray-700 mb-3">Make it more special:</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {addonGroups.map((group) => (
          <div key={group.id} className="min-w-[200px] flex-shrink-0 lg:min-w-0 lg:flex-shrink">
            <AddonGroup
              group={group}
              value={addonSelections.get(group.id) || getDefaultAddonSelection(group)}
              onChange={(val) => handleAddonChange(group.id, val)}
              hasError={addonErrors.has(group.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )

  const quantityBlock = (
    <div className="flex items-center gap-4 mb-4">
      <span className="text-sm font-medium text-gray-700">Quantity</span>
      <div className="flex items-center rounded-full border border-gray-200">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-l-full text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="flex h-9 w-10 items-center justify-center border-x border-gray-200 text-sm font-semibold text-gray-900">
          {quantity}
        </span>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-r-full text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30"
          onClick={() => setQuantity((q) => Math.min(10, q + 1))}
          disabled={quantity >= 10}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )

  const actionButtons = (
    <div className="space-y-2 mb-4">
      <button
        className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        style={partner?.primaryColor ? { background: partner.primaryColor } : {}}
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
              ? `ADD TO CART — ${formatPrice(totalPrice)}`
              : "ADD TO CART"}
          </>
        )}
      </button>
      <button
        className="w-full border-2 border-pink-600 text-pink-600 hover:bg-pink-50 py-3 rounded-xl font-semibold text-base transition-colors disabled:opacity-50"
        onClick={handleBuyNow}
        disabled={isVariable && matchedVariation?.stockQty === 0}
      >
        BUY NOW
      </button>
    </div>
  )

  const trustBadges = (
    <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
      <div className="flex items-center gap-1">
        <Lock className="h-3.5 w-3.5" />
        <span>Secure Payment</span>
      </div>
      <div className="flex items-center gap-1">
        <Leaf className="h-3.5 w-3.5" />
        <span>100% Fresh</span>
      </div>
      <div className="flex items-center gap-1">
        <Truck className="h-3.5 w-3.5" />
        <span>On-time</span>
      </div>
      <div className="flex items-center gap-1">
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Easy Returns</span>
      </div>
    </div>
  )

  const descriptionAccordion = (
    <div className="border-t border-gray-200">
      <AccordionItem title="Product Description" defaultOpen>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
          {product.weight && (
            <div className="flex items-center gap-6 rounded-lg bg-gray-50 p-3">
              <div>
                <p className="text-xs text-gray-400">Weight</p>
                <p className="text-sm font-medium text-gray-900">{product.weight}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <div className="flex items-center gap-1">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-sm border-2 ${product.isVeg ? "border-green-600" : "border-red-600"}`}>
                    <div className={`h-2 w-2 rounded-full ${product.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{product.isVeg ? "Veg" : "Non-Veg"}</p>
                </div>
              </div>
              {categoryName && (
                <div>
                  <p className="text-xs text-gray-400">Category</p>
                  <p className="text-sm font-medium text-gray-900">{categoryName}</p>
                </div>
              )}
            </div>
          )}
          {product.occasion.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Perfect for</p>
              <div className="flex flex-wrap gap-1.5">
                {product.occasion.map((occ) => (
                  <span
                    key={occ}
                    className="inline-flex items-center rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-700 capitalize"
                  >
                    {occ.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionItem>

      <AccordionItem title="Care Instructions">
        <div className="text-sm text-gray-600 space-y-2">
          <p>Store in a cool and dry place.</p>
          <p>Best consumed within 2-3 hours of delivery for fresh products.</p>
          <p>Keep refrigerated for cakes and perishable items.</p>
          <p>Handle fresh flowers with care, trim stems and change water daily.</p>
        </div>
      </AccordionItem>

      <AccordionItem title="Delivery Information">
        <div className="text-sm text-gray-600 space-y-3">
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 mt-0.5 text-pink-600 shrink-0" />
            <p>We deliver to Chandigarh, Mohali & Panchkula. Enter your pincode to check availability.</p>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-pink-600 shrink-0" />
            <p>Choose from Standard (free), Fixed Slot (+49), Midnight (+199), Early Morning (+149), or Express (+249).</p>
          </div>
          <ul className="list-disc list-inside text-gray-500 space-y-1 pl-1">
            <li>Orders before 4 PM qualify for same-day delivery</li>
            <li>Free delivery on orders above {formatPrice(499)}</li>
            <li>Actual product may slightly vary from images</li>
          </ul>
        </div>
      </AccordionItem>
    </div>
  )

  const reviewsSection = (
    <div className="pt-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Customer Reviews</h2>
      <ReviewList
        reviews={reviews}
        avgRating={Number(product.avgRating)}
        totalReviews={product.totalReviews}
      />
      <div className="mt-4">
        <Button
          variant="outline"
          className="border-pink-600 text-pink-600 hover:bg-pink-50"
          disabled
        >
          Write a Review
        </Button>
        <p className="text-xs text-gray-400 mt-1">Login required to write a review</p>
      </div>
    </div>
  )

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 text-xs text-gray-500 py-3">
          <Link href="/" className="hover:text-pink-600 transition-colors">Home</Link>
          <span className="mx-1">&gt;</span>
          {categoryName && (
            <>
              <Link href={`/category/${categorySlug}`} className="hover:text-pink-600 transition-colors">
                {categoryName}
              </Link>
              <span className="mx-1">&gt;</span>
            </>
          )}
          <span className="text-gray-800 font-medium truncate">{product.name}</span>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid gap-8 lg:grid-cols-12">

          {/* ============== LEFT COLUMN ============== */}
          <div className="lg:col-span-7">
            {/* Gallery */}
            <ProductGallery images={product.images} name={product.name} />

            {/* Mobile-only: product info + controls */}
            <div className="lg:hidden mt-6 space-y-0">
              {productInfoBlock}
              {weightSelectorBlock}
              {singleWeightDisplay}
              {variationBlock}
              {deliveryBlock}
              {pincodeBlock}
              {addonBlock}
              {giftMessageBlock}
              {quantityBlock}
              {actionButtons}
              {trustBadges}
            </div>

            {/* Description Accordion */}
            <div className="mt-8">
              {descriptionAccordion}
            </div>

            {/* Reviews */}
            {reviewsSection}
          </div>

          {/* ============== RIGHT COLUMN (Desktop Sticky Panel) ============== */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-24 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              {productInfoBlock}
              {weightSelectorBlock}
              {singleWeightDisplay}
              {variationBlock}

              <Separator className="my-4" />

              {deliveryBlock}
              {pincodeBlock}

              <Separator className="my-4" />

              {giftMessageBlock}
              {addonBlock}
              {quantityBlock}
              {actionButtons}
              {trustBadges}
            </div>
          </div>
        </div>
      </div>

      {/* Upsell Products */}
      {upsells.length > 0 && (
        <div className="container mx-auto px-4 py-6 border-t">
          <UpsellProducts upsells={upsells} />
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="bg-gray-50 border-t py-10">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {relatedProducts.map((rp) => (
                <ProductCard
                  key={rp.id}
                  id={rp.id}
                  name={rp.name}
                  slug={rp.slug}
                  basePrice={Number(rp.basePrice)}
                  images={rp.images}
                  avgRating={rp.avgRating}
                  totalReviews={rp.totalReviews}
                  weight={rp.weight ?? undefined}
                  tags={rp.tags}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
