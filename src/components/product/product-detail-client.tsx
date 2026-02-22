"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  MapPin, Minus, Plus, ShoppingCart, Star, Truck, Clock, Calendar,
  CheckCircle, ChevronDown, ChevronUp, Lock, Leaf, RotateCcw,
  MessageSquare, Info,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ProductGallery } from "@/components/product/product-gallery"
import { LocationSearch } from "@/components/location/location-search"
import type { ResolvedLocation } from "@/components/location/location-search"
const DeliveryDatePicker = dynamic(
  () => import("@/components/product/delivery-slot-picker").then(mod => ({ default: mod.DeliveryDatePicker })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-12 bg-gray-100 rounded-lg animate-pulse" />
    ),
  }
)
import { VariationSelector } from "@/components/product/variation-selector"
import { AddonGroup } from "@/components/product/addon-group"
import { UpsellProducts } from "@/components/product/upsell-products"
import { ReviewList } from "@/components/product/review-list"
import { ProductCard } from "@/components/product/product-card"
import { CartConfirmationBanner } from "@/components/product/cart-confirmation-banner"
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

// -- Types for product data (passed from server component) --------------------

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

interface ProductDetailClientProps {
  initialProduct: ProductDetail
  initialRelatedProducts: Product[]
}

export default function ProductDetailClient({
  initialProduct,
  initialRelatedProducts,
}: ProductDetailClientProps) {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const addItemAdvanced = useCart((s) => s.addItemAdvanced)
  const { partner } = usePartner()
  const { pincode: cityPincode, cityId, cityName, areaName: cityAreaName, isSelected, setCity, setArea } = useCity()
  const addonSectionRef = useRef<HTMLDivElement>(null)

  // Product data — initialized from server (no client-side fetch needed)
  const product = initialProduct
  const relatedProducts = initialRelatedProducts

  // UI state
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [addonSelections, setAddonSelections] = useState<Map<string, AddonGroupSelection>>(new Map())
  const [addonErrors, setAddonErrors] = useState<Set<string>>(new Set())
  const [variationError, setVariationError] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showCartBanner, setShowCartBanner] = useState(false)
  const [addedProduct, setAddedProduct] = useState<{ name: string; image: string; price: number } | null>(null)
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<Date | null>(null)
  const [deliveryError, setDeliveryError] = useState(false)
  const [comingSoon, setComingSoon] = useState(false)
  const [comingSoonMessage, setComingSoonMessage] = useState("")
  const [selectedWeight, setSelectedWeight] = useState<string | null>(null)
  const [giftMessageOpen, setGiftMessageOpen] = useState(false)
  const [giftMessage, setGiftMessage] = useState("")

  // Check serviceability when city context changes with a pincode
  useEffect(() => {
    if (cityPincode) {
      handleServiceabilityCheck(cityPincode)
    } else {
      setComingSoon(false)
      setComingSoonMessage("")
    }
  }, [cityPincode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize addon selections on mount
  useEffect(() => {
    if (product.addonGroups && product.addonGroups.length > 0) {
      const initial = new Map<string, AddonGroupSelection>()
      for (const group of product.addonGroups) {
        initial.set(group.id, getDefaultAddonSelection(group))
      }
      setAddonSelections(initial)
    }
    // Initialize weight selection
    if (product.weight) {
      const opts = parseWeightOptions(product.weight)
      if (opts && opts.length > 0) {
        setSelectedWeight(opts[0].label)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Match variation from selected options
  const matchedVariation = useMemo(() => {
    if (!product.variations || Object.keys(selectedOptions).length === 0) return null
    return product.variations.find((v) => {
      const attrs = v.attributes as Record<string, string>
      return Object.entries(selectedOptions).every(
        ([slug, value]) => attrs[slug] === value
      )
    }) ?? null
  }, [product.variations, selectedOptions])

  // Computed values
  const isVariable = product.productType === "VARIABLE"
  const attributes = product.attributes || []
  const variations = useMemo(() => product.variations || [], [product.variations])
  const addonGroups = useMemo(() => product.addonGroups || [], [product.addonGroups])
  const upsells = product.upsells || []
  const reviews = product.reviews || []
  const weightOptions = useMemo(() => parseWeightOptions(product.weight ?? null), [product.weight])

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
    : Number(product.basePrice ?? 0)
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
    if (!product) return // defensive guard

    // Validate: delivery date required
    if (!selectedDeliveryDate) {
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

    // Build ISO date string from selected date
    const dateStr = selectedDeliveryDate
      ? `${selectedDeliveryDate.getFullYear()}-${String(selectedDeliveryDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDeliveryDate.getDate()).padStart(2, '0')}`
      : null

    addItemAdvanced({
      product: product as Product,
      quantity,
      price: unitPrice,
      variationId: matchedVariation?.id ?? null,
      selectedAttributes: matchedVariation ? (matchedVariation.attributes as Record<string, string>) : null,
      addonSelections: buildAddonRecords(),
      deliveryDate: dateStr,
    })

    setAddedToCart(true)
    setAddedProduct({ name: product.name, image: product.images[0], price: unitPrice })
    setShowCartBanner(true)
  }, [product, selectedDeliveryDate, isVariable, matchedVariation, addonGroups, addonSelections, addItemAdvanced, quantity, unitPrice, buildAddonRecords])

  const handleBuyNow = useCallback(() => {
    handleAddToCart()
    setTimeout(() => {
      if (!variationError && addonErrors.size === 0 && !deliveryError) {
        router.push("/cart")
      }
    }, 100)
  }, [handleAddToCart, router, variationError, addonErrors, deliveryError])

  const handleServiceabilityCheck = async (pincode: string) => {
    if (pincode.length !== 6) return
    try {
      const res = await fetch("/api/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode, productId: product.id }),
      })
      const json = await res.json()
      const isComingSoon = json.success && json.data?.comingSoon === true
      setComingSoon(isComingSoon)
      setComingSoonMessage(isComingSoon ? (json.data?.message || "") : "")
    } catch {
      setComingSoon(false)
      setComingSoonMessage("")
    }
  }

  const handleLocationSelect = useCallback((location: ResolvedLocation) => {
    // Update city context — set full city if not yet selected, otherwise refine area
    if (location.cityId) {
      if (!isSelected) {
        setCity({
          cityId: location.cityId,
          cityName: location.cityName || '',
          citySlug: location.citySlug || (location.cityName || '').toLowerCase().replace(/\s+/g, '-'),
          pincode: location.pincode || undefined,
          areaName: location.areaName || undefined,
          lat: location.lat || undefined,
          lng: location.lng || undefined,
          source: location.type,
        })
      } else {
        setArea({
          name: location.areaName || '',
          pincode: location.pincode || '',
          isServiceable: location.isServiceable || false,
        })
      }
    }

    // Update local delivery state
    if (location.comingSoon) {
      setComingSoon(true)
      setComingSoonMessage("We're coming to your area soon! Place your order and our team will confirm delivery.")
    } else if (location.pincode) {
      handleServiceabilityCheck(location.pincode)
    } else {
      setComingSoon(false)
      setComingSoonMessage("")
    }
  }, [isSelected, setCity, setArea]) // eslint-disable-line react-hooks/exhaustive-deps


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
      <div className="mb-3">
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
    <div className="mb-3">
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
    <p className="text-sm text-gray-500 mb-3">Weight: {product.weight}</p>
  )

  const variationBlock = isVariable && attributes.length > 0 && (
    <div className="mb-3">
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
    <div className="mb-3">
      <p className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-1.5">
        <Calendar className="h-4 w-4" />
        Select Delivery Date
      </p>
      {locationNotSelected ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            Please select a delivery location above to see available dates
          </p>
        </div>
      ) : comingSoon ? (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">
            {comingSoonMessage || "We're coming to your area soon! Place your order and our team will confirm delivery."}
          </p>
        </div>
      ) : (
        <>
          {deliveryError && !selectedDeliveryDate && (
            <p className="text-sm text-red-500 font-medium mb-2">Please select a delivery date</p>
          )}
          {product && cityId && (
            <DeliveryDatePicker
              productId={product.id}
              cityId={cityId}
              onDateSelect={(date) => {
                setSelectedDeliveryDate(date)
                setDeliveryError(false)
              }}
              initialDate={selectedDeliveryDate ?? undefined}
            />
          )}
        </>
      )}
    </div>
  )

  const deliverToDefaultValue = cityPincode
    ? (cityAreaName ? `${cityAreaName}, ${cityName} \u2014 ${cityPincode}` : cityPincode)
    : ''

  const locationNotSelected = !isSelected

  // "Gift Receiver's Location" — prominent section (FNP style)
  const receiverLocationBlock = (
    <div className="mb-4">
      <div className="rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-4">
        <p className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#E91E63]" />
          Gift Receiver&apos;s Location
        </p>
        {locationNotSelected && (
          <p className="text-xs text-gray-500 mb-2">
            Enter receiver&apos;s location to check delivery availability
          </p>
        )}
        <LocationSearch
          onSelect={handleLocationSelect}
          productId={product.id}
          defaultValue={deliverToDefaultValue}
          placeholder="Enter receiver's pincode, location, area"
        />
      </div>
    </div>
  )

  const giftMessageBlock = (
    <div className="mb-3">
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
    <div ref={addonSectionRef} className="mb-3">
      <p className="font-medium text-sm text-gray-700 mb-3">Make it more special:</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        {addonGroups.map((group) => (
          <div key={group.id} className="w-36 min-w-[144px] flex-shrink-0 lg:min-w-0 lg:w-auto lg:flex-shrink">
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
    <div className="flex items-center gap-4 mb-3">
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
    <div className="space-y-2 mb-3">
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
            <div className="lg:hidden mt-3">
              {productInfoBlock}
              {weightSelectorBlock}
              {singleWeightDisplay}
              {variationBlock}
              {receiverLocationBlock}
              {deliveryBlock}
              {addonBlock}
              {giftMessageBlock}
              {quantityBlock}
              {actionButtons}
              {trustBadges}
            </div>

            {/* Description Accordion */}
            <div className="mt-4 lg:mt-8">
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

              {receiverLocationBlock}
              {deliveryBlock}

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

      {/* Cart Confirmation Banner */}
      {showCartBanner && addedProduct && (
        <CartConfirmationBanner
          product={addedProduct}
          onViewCart={() => router.push('/cart')}
          onContinueShopping={() => {
            setShowCartBanner(false)
            setAddedToCart(false)
            setAddedProduct(null)
          }}
        />
      )}
    </div>
  )
}
