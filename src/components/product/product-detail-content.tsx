"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Star, ShoppingCart, ArrowRight, X, Loader2, Zap, MapPin, Truck, Clock, Moon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useCurrency } from "@/hooks/use-currency"
import { useCity } from "@/hooks/use-city"
import { useCart } from "@/hooks/use-cart"
import { useLocation } from "@/hooks/use-location"
import { Breadcrumb } from "@/components/seo/breadcrumb"
import { ProductGallery } from "@/components/product/product-gallery"
import { AddonGroup } from "@/components/product/addon-group"
import { ProductCard } from "@/components/product/product-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  Product,
  ProductVariation,
  ProductAddonGroup,
  AddonGroupSelection,
  AddonSelectionRecord,
  UpsellProduct,
  Review,
} from "@/types"

// ==================== Types ====================

interface SlotGroupInfo {
  standard: { available: boolean; label: string; charge: number } | null
  fixed: { available: boolean } | null
  midnight: { available: boolean; label: string; charge: number } | null
}

interface ProductData extends Product {
  isSameDayEligible?: boolean
  isExpressEligible?: boolean
  minLeadTimeHours?: number
  leadTimeNote?: string | null
  instructions?: string | null
  deliveryInfo?: string | null
  productDetails?: Record<string, string> | null
}

interface ProductDetailContentProps {
  product: ProductData
  variations: ProductVariation[]
  addonGroups: ProductAddonGroup[]
  upsells: UpsellProduct[]
  reviews: Review[]
  category: { id: string; name: string; slug: string } | null
}

// ==================== Helpers ====================

function renderStars(rating: number) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)
    } else if (rating >= i - 0.5) {
      stars.push(
        <span key={i} className="relative inline-block h-4 w-4">
          <Star className="absolute h-4 w-4 text-gray-300" />
          <span className="absolute overflow-hidden" style={{ width: "50%" }}>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </span>
        </span>
      )
    } else {
      stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />)
    }
  }
  return stars
}

// ==================== Main Component ====================

export default function ProductDetailContent({
  product,
  variations,
  addonGroups,
  upsells,
  reviews,
  category,
}: ProductDetailContentProps) {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { pincode, areaName, cityName, cityId, setCity } = useCity()
  const clearPincode = useLocation((s) => s.clearPincode)
  const addItemAdvanced = useCart((s) => s.addItemAdvanced)

  // ---- Variation state ----
  const activeVariations = useMemo(
    () => variations.filter((v) => v.isActive),
    [variations]
  )
  const isVariable = product.productType === "VARIABLE" && activeVariations.length > 0
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null)

  useEffect(() => {
    if (isVariable && activeVariations.length > 0 && !selectedVariationId) {
      setSelectedVariationId(activeVariations[0].id)
    }
  }, [isVariable, activeVariations, selectedVariationId])

  const selectedVariation = useMemo(
    () => activeVariations.find((v) => v.id === selectedVariationId) ?? null,
    [activeVariations, selectedVariationId]
  )

  // ---- Price computation ----
  const displayPrice = useMemo(() => {
    if (selectedVariation) {
      return selectedVariation.salePrice ?? selectedVariation.price
    }
    return product.basePrice
  }, [selectedVariation, product.basePrice])

  const originalPrice = useMemo(() => {
    if (selectedVariation?.salePrice) return selectedVariation.price
    return null
  }, [selectedVariation])

  const discountPercent = useMemo(() => {
    if (originalPrice && selectedVariation?.salePrice) {
      return Math.round((originalPrice - selectedVariation.salePrice) / originalPrice * 100)
    }
    return 0
  }, [originalPrice, selectedVariation])

  // ---- Addon state ----
  const [addonSelections, setAddonSelections] = useState<Record<string, AddonGroupSelection>>({})
  const [addonErrors, setAddonErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const initial: Record<string, AddonGroupSelection> = {}
    for (const g of addonGroups) {
      switch (g.type) {
        case "CHECKBOX":
          initial[g.id] = { type: "CHECKBOX", selectedIds: g.options.filter((o) => o.isDefault).map((o) => o.id) }
          break
        case "RADIO":
          initial[g.id] = { type: "RADIO", selectedId: g.options.find((o) => o.isDefault)?.id ?? null }
          break
        case "SELECT":
          initial[g.id] = { type: "SELECT", selectedId: g.options.find((o) => o.isDefault)?.id ?? null }
          break
        case "TEXT_INPUT":
          initial[g.id] = { type: "TEXT_INPUT", text: "" }
          break
        case "TEXTAREA":
          initial[g.id] = { type: "TEXTAREA", text: "" }
          break
        case "FILE_UPLOAD":
          initial[g.id] = { type: "FILE_UPLOAD", fileUrl: null, fileName: null }
          break
      }
    }
    setAddonSelections(initial)
  }, [addonGroups])

  // ---- Pincode / serviceability ----
  const [pincodeInput, setPincodeInput] = useState("")
  const [pincodeChecking, setPincodeChecking] = useState(false)
  const [pincodeError, setPincodeError] = useState<string | null>(null)
  const [comingSoonMsg, setComingSoonMsg] = useState<string | null>(null)
  const [isServiceable, setIsServiceable] = useState<boolean | null>(pincode ? true : null)
  const [deliveryInfo, setDeliveryInfo] = useState<SlotGroupInfo | null>(null)
  const [hasExpress, setHasExpress] = useState(false)

  // Check serviceability when pincode already set from context
  const serviceabilityFetched = useRef(false)
  useEffect(() => {
    if (pincode && !serviceabilityFetched.current) {
      serviceabilityFetched.current = true
      fetchServiceability(pincode)
    }
  }, [pincode]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchServiceability = async (pc: string) => {
    setPincodeChecking(true)
    setPincodeError(null)
    setComingSoonMsg(null)
    try {
      const res = await fetch("/api/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: pc, productId: product.id }),
      })
      const json = await res.json()
      if (!json.success) {
        setPincodeError(json.error || "Failed to check serviceability")
        setIsServiceable(false)
        return
      }
      const d = json.data
      if (d.comingSoon) {
        setComingSoonMsg(`We're coming to ${d.areaName || pc} soon! Leave your email to get notified.`)
        setIsServiceable(false)
        return
      }
      if (!d.serviceable && !d.isServiceable) {
        setPincodeError(`Sorry, we don't deliver to ${pc} yet.`)
        setIsServiceable(false)
        return
      }
      // Serviceable!
      setIsServiceable(true)
      // Extract delivery info for capsules (read-only display)
      if (d.slotGroups) {
        const sg = d.slotGroups
        setDeliveryInfo({
          standard: sg.standard?.available ? { available: true, label: sg.standard.label || "Standard Delivery", charge: sg.standard.baseCharge ?? 0 } : null,
          fixed: sg.fixed?.available ? { available: true } : null,
          midnight: sg.midnight?.available ? { available: true, label: sg.midnight.label || "Midnight Delivery", charge: sg.midnight.baseCharge ?? 0 } : null,
        })
      }
      if (d.expressSlot?.available) setHasExpress(true)
      // Save to city context
      if (d.city) {
        setCity({
          cityId: d.city.id,
          cityName: d.city.name,
          citySlug: d.city.slug,
          pincode: pc,
          areaName: d.areaName || undefined,
        })
      } else if (!pincode) {
        if (cityId) {
          setCity({ cityId, cityName: cityName || "", citySlug: "", pincode: pc })
        }
      }
    } catch {
      setPincodeError("Network error. Please try again.")
      setIsServiceable(false)
    } finally {
      setPincodeChecking(false)
    }
  }

  const handlePincodeCheck = () => {
    if (pincodeInput.length !== 6 || !/^\d{6}$/.test(pincodeInput)) {
      setPincodeError("Enter a valid 6-digit pincode")
      return
    }
    fetchServiceability(pincodeInput)
  }

  const handleClearPincode = () => {
    clearPincode()
    setIsServiceable(null)
    setDeliveryInfo(null)
    setHasExpress(false)
    serviceabilityFetched.current = false
  }

  // ---- Cart ----
  const [adding, setAdding] = useState(false)
  const [addedToast, setAddedToast] = useState(false)

  function buildAddonRecords(): AddonSelectionRecord[] {
    const records: AddonSelectionRecord[] = []
    for (const g of addonGroups) {
      const sel = addonSelections[g.id]
      if (!sel) continue
      const rec: AddonSelectionRecord = { groupId: g.id, groupName: g.name, type: g.type }
      switch (sel.type) {
        case "CHECKBOX":
          rec.selectedIds = sel.selectedIds
          rec.selectedLabels = sel.selectedIds.map((id) => g.options.find((o) => o.id === id)?.label ?? "")
          rec.totalAddonPrice = sel.selectedIds.reduce((sum, id) => {
            const o = g.options.find((opt) => opt.id === id)
            return sum + (o ? Number(o.price) : 0)
          }, 0)
          break
        case "RADIO":
        case "SELECT": {
          const optId = sel.type === "RADIO" ? sel.selectedId : sel.selectedId
          rec.selectedId = optId ?? undefined
          const opt = g.options.find((o) => o.id === optId)
          rec.selectedLabel = opt?.label
          rec.addonPrice = opt ? Number(opt.price) : 0
          break
        }
        case "TEXT_INPUT":
        case "TEXTAREA":
          rec.text = sel.text
          break
        case "FILE_UPLOAD":
          rec.fileUrl = sel.fileUrl ?? undefined
          rec.fileName = sel.fileName ?? undefined
          break
      }
      records.push(rec)
    }
    return records
  }

  function validateAddons(): boolean {
    const errors: Record<string, boolean> = {}
    let valid = true
    for (const g of addonGroups) {
      if (!g.required) continue
      const sel = addonSelections[g.id]
      if (!sel) { errors[g.id] = true; valid = false; continue }
      switch (sel.type) {
        case "CHECKBOX":
          if (sel.selectedIds.length === 0) { errors[g.id] = true; valid = false }
          break
        case "RADIO":
        case "SELECT":
          if (!("selectedId" in sel) || !sel.selectedId) { errors[g.id] = true; valid = false }
          break
        case "TEXT_INPUT":
        case "TEXTAREA":
          if (!sel.text.trim()) { errors[g.id] = true; valid = false }
          break
        case "FILE_UPLOAD":
          if (!sel.fileUrl) { errors[g.id] = true; valid = false }
          break
      }
    }
    setAddonErrors(errors)
    return valid
  }

  const canAddToCart = !!isServiceable

  // ---- Error toast state ----
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const handleAddToCart = async () => {
    if (!canAddToCart) return
    if (!validateAddons()) return
    setAdding(true)
    try {
      const result = addItemAdvanced({
        product: product as Product,
        quantity: 1,
        price: displayPrice,
        variationId: selectedVariationId,
        selectedAttributes: selectedVariation?.attributes ?? null,
        addonSelections: buildAddonRecords(),
      })
      if (result && !result.success) {
        setErrorToast(result.message ?? 'Cannot add item to cart')
        setTimeout(() => setErrorToast(null), 4000)
      } else {
        setAddedToast(true)
        setTimeout(() => setAddedToast(false), 3000)
      }
    } finally {
      setAdding(false)
    }
  }

  const handleBuyNow = async () => {
    if (!canAddToCart) return
    if (!validateAddons()) return
    setAdding(true)
    try {
      const result = addItemAdvanced({
        product: product as Product,
        quantity: 1,
        price: displayPrice,
        variationId: selectedVariationId,
        selectedAttributes: selectedVariation?.attributes ?? null,
        addonSelections: buildAddonRecords(),
      })
      if (result && !result.success) {
        setErrorToast(result.message ?? 'Cannot add item to cart')
        setTimeout(() => setErrorToast(null), 4000)
      } else {
        router.push("/cart")
      }
    } finally {
      setAdding(false)
    }
  }

  // ---- Variation attribute key ----
  const variationAttrKey = useMemo(() => {
    if (!isVariable || activeVariations.length === 0) return null
    const keys = Object.keys(activeVariations[0].attributes)
    return keys[0] || null
  }, [isVariable, activeVariations])

  const variationLabel = variationAttrKey
    ? `Select ${variationAttrKey.charAt(0).toUpperCase() + variationAttrKey.slice(1)}:`
    : "Select Option:"

  // ---- Reviews ----
  const [showAllReviews, setShowAllReviews] = useState(false)
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 5)

  // ---- Render ----
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-4 lg:py-8">
        <div className="flex flex-col lg:flex-row lg:gap-10">
          {/* LEFT COLUMN — Image Gallery */}
          <div className="lg:w-[55%] lg:shrink-0">
            <ProductGallery images={product.images || []} />
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:w-[45%] mt-6 lg:mt-0 space-y-6">
            {/* 1. Breadcrumb */}
            <Breadcrumb
              items={[
                ...(category
                  ? [{ label: category.name, href: `/category/${category.slug}` }]
                  : []),
                { label: product.name },
              ]}
            />

            {/* 2. Title + Veg Badge */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-2.5 mt-2">
                {product.isVeg ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                    <span className="h-2.5 w-2.5 rounded-sm border-2 border-green-600 inline-block" />
                    Veg
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                    <span className="h-2.5 w-2.5 rounded-sm border-2 border-red-600 inline-block" />
                    Non-Veg
                  </span>
                )}
                {product.isSameDayEligible && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Zap className="h-3 w-3" />
                    Same Day
                  </span>
                )}
              </div>
            </div>

            {/* 3. Rating */}
            <div>
              {product.totalReviews > 0 ? (
                <a href="#reviews" className="inline-flex items-center gap-2 hover:opacity-80 cursor-pointer transition-opacity duration-200">
                  <span className="flex items-center gap-0.5">{renderStars(Number(product.avgRating))}</span>
                  <span className="text-sm font-semibold text-gray-800">{Number(product.avgRating).toFixed(1)}</span>
                  <span className="text-sm text-gray-400">|</span>
                  <span className="text-sm text-gray-500">{product.totalReviews} Reviews</span>
                </a>
              ) : (
                <p className="text-sm text-gray-400">No reviews yet</p>
              )}
            </div>

            {/* 4. Price */}
            <div className="flex items-baseline gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-3xl font-bold">
                {originalPrice ? (
                  <span className="text-green-700">{formatPrice(displayPrice)}</span>
                ) : (
                  <span className="text-gray-900">{formatPrice(displayPrice)}</span>
                )}
              </span>
              {originalPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(originalPrice)}
                  </span>
                  {discountPercent > 0 && (
                    <span className="bg-green-100 text-green-700 text-sm font-semibold px-2.5 py-1 rounded-lg">
                      {discountPercent}% Off
                    </span>
                  )}
                </>
              )}
            </div>

            {/* 5. Variation Selector — sorted by sortOrder then price */}
            {isVariable && variationAttrKey && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">{variationLabel}</p>
                <div className="flex flex-wrap gap-2.5">
                  {[...activeVariations]
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.price - b.price)
                    .map((v) => {
                      const attrValue = v.attributes[variationAttrKey] || "—"
                      const isSelected = v.id === selectedVariationId
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariationId(v.id)}
                          className={cn(
                            "border-2 rounded-xl p-3 w-24 text-center cursor-pointer transition-all duration-200",
                            isSelected
                              ? "border-pink-500 bg-pink-50 text-pink-700 shadow-sm"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <div className="text-sm font-semibold">{attrValue}</div>
                          <div className="text-xs mt-0.5 text-gray-600">
                            {formatPrice(v.salePrice ?? v.price)}
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            )}

            {/* 6. Addon Groups */}
            {addonGroups.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-800 mb-3">Customise Your Order</p>
                {addonGroups.map((g) => (
                  <AddonGroup
                    key={g.id}
                    group={g}
                    value={addonSelections[g.id] || { type: g.type, selectedIds: [] } as AddonGroupSelection}
                    onChange={(val) =>
                      setAddonSelections((prev) => ({ ...prev, [g.id]: val }))
                    }
                    hasError={!!addonErrors[g.id]}
                  />
                ))}
              </div>
            )}

            {/* 7. Gift Receiver's Location */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-pink-600" />
                Gift Receiver&apos;s Location
              </p>
              {pincode ? (
                <div className="border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 bg-gray-50">
                  <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">IND</span>
                  <span className="flex-1 text-sm text-gray-800 font-medium">
                    {pincode}{areaName ? `, ${areaName}` : ""}{cityName ? `, ${cityName}` : ""}
                  </span>
                  <button
                    onClick={handleClearPincode}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors duration-200 p-1 rounded-lg hover:bg-gray-200"
                    aria-label="Clear pincode"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "")
                      setPincodeInput(v)
                      setPincodeError(null)
                      setComingSoonMsg(null)
                    }}
                    placeholder="Enter delivery pincode"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                  />
                  <button
                    onClick={handlePincodeCheck}
                    disabled={pincodeChecking}
                    className="px-5 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-xl hover:bg-pink-700 disabled:opacity-50 cursor-pointer transition-colors duration-200 shadow-sm"
                  >
                    {pincodeChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                  </button>
                </div>
              )}
              {pincodeError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{pincodeError}</p>
              )}
              {comingSoonMsg && (
                <p className="mt-3 text-sm text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">{comingSoonMsg}</p>
              )}
            </div>

            {/* 8. Delivery Options (info capsules — selection happens at checkout) */}
            {isServiceable && pincode && (deliveryInfo || hasExpress || product.isSameDayEligible) && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-pink-600" />
                  Delivery Options
                </p>
                <div className="flex flex-wrap gap-2">
                  {deliveryInfo?.standard && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-100">
                      <Truck className="h-3.5 w-3.5" />
                      {deliveryInfo.standard.charge === 0 ? "Free Standard Delivery" : `Standard \u20B9${deliveryInfo.standard.charge}`}
                    </span>
                  )}
                  {product.isSameDayEligible && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-700 px-3 py-2 rounded-lg border border-amber-100">
                      <Zap className="h-3.5 w-3.5" />
                      Same Day Available
                    </span>
                  )}
                  {deliveryInfo?.fixed && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-100">
                      <Clock className="h-3.5 w-3.5" />
                      Fixed Time Slots
                    </span>
                  )}
                  {deliveryInfo?.midnight && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-100">
                      <Moon className="h-3.5 w-3.5" />
                      Midnight Delivery
                    </span>
                  )}
                  {hasExpress && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-orange-50 text-orange-700 px-3 py-2 rounded-lg border border-orange-100">
                      <Zap className="h-3.5 w-3.5" />
                      Express (3 hrs)
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2.5">Delivery date &amp; time slot selected at checkout</p>
              </div>
            )}

            {/* 9. Add to Cart / Buy Now */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  if (!canAddToCart) {
                    setErrorToast("Please enter your delivery pincode first")
                    setTimeout(() => setErrorToast(null), 4000)
                    return
                  }
                  handleAddToCart()
                }}
                disabled={adding}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200",
                  canAddToCart && !adding
                    ? "bg-white border-2 border-pink-600 text-pink-700 hover:bg-pink-50 cursor-pointer"
                    : adding
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-100"
                      : "bg-white border-2 border-pink-300 text-pink-400 cursor-pointer"
                )}
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {addedToast ? "Added!" : "Add to Cart"}
              </button>
              <button
                onClick={() => {
                  if (!canAddToCart) {
                    setErrorToast("Please enter your delivery pincode first")
                    setTimeout(() => setErrorToast(null), 4000)
                    return
                  }
                  handleBuyNow()
                }}
                disabled={adding}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200",
                  canAddToCart && !adding
                    ? "bg-pink-600 text-white hover:bg-pink-700 cursor-pointer shadow-md shadow-pink-600/20"
                    : adding
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-pink-300 text-white cursor-pointer"
                )}
              >
                {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                Buy Now <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {errorToast && (
              <p className="text-center text-sm text-red-600 bg-red-50 rounded-xl py-2.5 px-4 border border-red-100">{errorToast}</p>
            )}

            {/* 10. About the Product (Accordion — collapsed by default) */}
            <Accordion type="single" collapsible defaultValue={undefined}>
              <AccordionItem value="about">
                <AccordionTrigger className="text-base font-semibold">
                  About the Product
                </AccordionTrigger>
                <AccordionContent>
                  <Tabs defaultValue="description">
                    <TabsList className="w-full">
                      <TabsTrigger value="description" className="flex-1">Description</TabsTrigger>
                      <TabsTrigger value="instructions" className="flex-1">Instructions</TabsTrigger>
                      <TabsTrigger value="delivery" className="flex-1">Delivery Info</TabsTrigger>
                    </TabsList>
                    <TabsContent value="description" className="mt-3 space-y-3">
                      {product.description && (
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                          {product.description}
                        </p>
                      )}
                      {product.productDetails && typeof product.productDetails === "object" && Object.keys(product.productDetails).length > 0 && (
                        <>
                          <hr className="my-3" />
                          <p className="text-sm font-semibold text-gray-700 mb-2">Product Details</p>
                          <ul className="space-y-1">
                            {Object.entries(product.productDetails).map(([key, val]) => (
                              <li key={key} className="flex gap-2 text-sm text-gray-600">
                                <span className="text-gray-400">&bull;</span>
                                <span><span className="font-medium text-gray-700">{key}:</span> {String(val)}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </TabsContent>
                    <TabsContent value="instructions" className="mt-3">
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {product.instructions || "No special instructions."}
                      </p>
                    </TabsContent>
                    <TabsContent value="delivery" className="mt-3">
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {product.deliveryInfo || "Standard delivery terms apply."}
                      </p>
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 11. Upsell Section */}
            {upsells.length > 0 && (
              <div className="pt-2">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Explore More Options</h2>
                <div className="flex flex-row gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {upsells.map((up) => (
                    <div key={up.id} className="w-48 shrink-0">
                      <ProductCard
                        id={up.id}
                        name={up.name}
                        slug={up.slug}
                        basePrice={up.basePrice}
                        images={up.images || []}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 12. Reviews Section */}
            <section id="reviews" className="mt-8 pt-8 border-t border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                Customer Reviews
                {product.totalReviews > 0 && (
                  <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {product.totalReviews}
                  </span>
                )}
              </h2>
              {reviews.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-2xl">
                  <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    No reviews yet. Be the first to share your experience!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedReviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(review.user?.name?.charAt(0) || "C").toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-800">
                              {review.user?.name?.split(" ")[0] || "Customer"}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                        {review.isVerified && (
                          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 mb-2">
                        {renderStars(review.rating)}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                  {reviews.length > 5 && !showAllReviews && (
                    <button
                      onClick={() => setShowAllReviews(true)}
                      className="w-full text-sm text-pink-600 font-semibold hover:text-pink-700 cursor-pointer transition-colors duration-200 py-3 rounded-xl border border-pink-200 hover:bg-pink-50"
                    >
                      Show all {reviews.length} reviews
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 px-4 py-4 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!canAddToCart) {
                  setErrorToast("Please enter your delivery pincode first")
                  setTimeout(() => setErrorToast(null), 4000)
                  return
                }
                handleAddToCart()
              }}
              disabled={adding}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200",
                canAddToCart && !adding
                  ? "bg-white border-2 border-pink-600 text-pink-700 hover:bg-pink-50 cursor-pointer"
                  : adding
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-100"
                    : "bg-white border-2 border-pink-300 text-pink-400 cursor-pointer"
              )}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {addedToast ? "Added!" : "Add to Cart"}
            </button>
            <button
              onClick={() => {
                if (!canAddToCart) {
                  setErrorToast("Please enter your delivery pincode first")
                  setTimeout(() => setErrorToast(null), 4000)
                  return
                }
                handleBuyNow()
              }}
              disabled={adding}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200",
                canAddToCart && !adding
                  ? "bg-pink-600 text-white hover:bg-pink-700 cursor-pointer shadow-md shadow-pink-600/20"
                  : adding
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-pink-300 text-white cursor-pointer"
              )}
            >
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              Buy Now <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {errorToast && (
            <p className="text-center text-sm text-red-600 bg-red-50 rounded-xl py-2 mt-2 border border-red-100">{errorToast}</p>
          )}
        </div>
      </div>

      {/* Spacer for sticky bar */}
      <div className="h-24" />
    </>
  )
}
