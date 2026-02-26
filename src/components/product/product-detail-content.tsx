"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Star, ShoppingCart, ArrowRight, X, ChevronLeft, ChevronRight, Timer, Loader2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useCurrency } from "@/hooks/use-currency"
import { useCity } from "@/hooks/use-city"
import { useCart } from "@/hooks/use-cart"
import { useLocation } from "@/hooks/use-location"
import { Breadcrumb } from "@/components/seo/breadcrumb"
import { ProductGallery } from "@/components/product/product-gallery"
import { AddonGroup } from "@/components/product/addon-group"
import { DeliverySlotPicker, type DeliverySlotSelection } from "@/components/product/delivery-slot-picker"
import type { ExpressSlot } from "@/types"
import { ProductCard } from "@/components/product/product-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import type {
  Product,
  ProductVariation,
  ProductAddonGroup,
  AddonGroupSelection,
  AddonSelectionRecord,
  UpsellProduct,
  Review,
  SlotGroup,
  FixedSlotGroup,
  MidnightSlotGroup,
} from "@/types"

// ==================== Types ====================

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

function getISTDate(): Date {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcMs + 5.5 * 3600000)
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

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
  const [slotGroups, setSlotGroups] = useState<{
    standard: SlotGroup | null
    fixed: FixedSlotGroup | null
    midnight: MidnightSlotGroup | null
  } | null>(null)
  const [expressSlot, setExpressSlot] = useState<ExpressSlot | null>(null)

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
      if (d.slotGroups) setSlotGroups(d.slotGroups)
      if (d.expressSlot) setExpressSlot(d.expressSlot)
      // Save to city context — always update on successful serviceability check
      if (d.city) {
        setCity({
          cityId: d.city.id,
          cityName: d.city.name,
          citySlug: d.city.slug,
          pincode: pc,
          areaName: d.areaName || undefined,
        })
      } else if (!pincode) {
        // No city data from API, but at least persist the pincode
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
    setSlotGroups(null)
    setExpressSlot(null)
    setSelectedDate(null)
    setSlotSelection(null)
    serviceabilityFetched.current = false
  }

  // ---- Delivery date ----
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const ist = getISTDate()
    return { year: ist.getFullYear(), month: ist.getMonth() }
  })

  const ist = getISTDate()
  const minLead = product.minLeadTimeHours ?? 2

  // IST time in minutes from midnight (using UTC-based IST calculation)
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const istTotalMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes()

  // Helper: is today valid for a given slot end time and cutoff
  function isTodayValidForSlot(slotEndTime: string, cutoffHours: number, minLeadTimeHours: number): boolean {
    const [h, m] = slotEndTime.split(':').map(Number)
    const slotEndMinutes = h * 60 + (m || 0)
    const latestOrderMinutes = slotEndMinutes - (cutoffHours * 60) - (minLeadTimeHours * 60)
    return istTotalMinutes <= latestOrderMinutes
  }

  // TODAY VALID FOR STANDARD SLOTS?
  const isTodayValidStandard = useMemo(() => {
    if (!slotGroups) return false
    const { standard, fixed, midnight } = slotGroups
    const standardOk = standard?.available && isTodayValidForSlot("21:00", standard.cutoffHours, minLead)
    const fixedOk = fixed?.available && fixed.slots?.some(
      (slot) => isTodayValidForSlot(slot.endTime, slot.cutoffHours, minLead)
    )
    const midnightOk = midnight?.available && isTodayValidForSlot("23:59", midnight.cutoffHours, minLead)
    return !!(standardOk || fixedOk || midnightOk)
  }, [slotGroups, istTotalMinutes, minLead]) // eslint-disable-line react-hooks/exhaustive-deps

  // TODAY VALID FOR EXPRESS?
  const isTodayValidExpress = useMemo(() => {
    if (!product.isExpressEligible) return false
    if (!expressSlot?.available) return false
    return isTodayValidForSlot("23:59", expressSlot.cutoffHours, 0)
  }, [product.isExpressEligible, expressSlot, istTotalMinutes]) // eslint-disable-line react-hooks/exhaustive-deps

  const isTodayValid = isTodayValidStandard || isTodayValidExpress
  const isTodayExpressOnly = !isTodayValidStandard && isTodayValidExpress

  const tomorrow = useMemo(() => {
    const t = new Date(ist)
    t.setDate(t.getDate() + 1)
    return t
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select default date on mount/change: Today if valid, else Tomorrow
  useEffect(() => {
    if (!isServiceable || !pincode) return
    if (selectedDate) return // already selected
    if (isTodayValid) {
      setSelectedDate(toYMD(ist))
    } else {
      setSelectedDate(toYMD(tomorrow))
    }
  }, [isServiceable, pincode, isTodayValid]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr)
    // If selecting today and only express is valid, auto-select express slot
    const todayStr = toYMD(ist)
    if (dateStr === todayStr && !isTodayValidStandard && isTodayValidExpress && expressSlot) {
      setSlotSelection({
        slotGroup: 'express',
        slotSlug: 'express',
        slotName: 'Express Delivery',
        deliveryCharge: expressSlot.baseCharge,
      })
    } else {
      setSlotSelection(null)
    }
  }

  // ---- Slot selection ----
  const [slotSelection, setSlotSelection] = useState<DeliverySlotSelection | null>(null)

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

  const canAddToCart = isServiceable && selectedDate && slotSelection

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
        deliveryDate: selectedDate,
        deliverySlot: slotSelection?.slotSlug ?? null,
        deliveryWindow: slotSelection?.slotName ?? null,
        deliveryCharge: slotSelection?.deliveryCharge ?? 0,
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
        deliveryDate: selectedDate,
        deliverySlot: slotSelection?.slotSlug ?? null,
        deliveryWindow: slotSelection?.slotName ?? null,
        deliveryCharge: slotSelection?.deliveryCharge ?? 0,
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

  // ---- Countdown timer ----
  const [countdown, setCountdown] = useState("")
  useEffect(() => {
    if (!isTodayValid) return
    const tick = () => {
      const now = getISTDate()
      // Use 9 PM (21:00) as reference for standard delivery end
      const endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21 - minLead, 0, 0).getTime()
      const diff = endMs - now.getTime()
      if (diff <= 0) { setCountdown(""); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isTodayValid, minLead])

  // ---- Variation attribute key ----
  const variationAttrKey = useMemo(() => {
    if (!isVariable || activeVariations.length === 0) return null
    const keys = Object.keys(activeVariations[0].attributes)
    return keys[0] || null
  }, [isVariable, activeVariations])

  const variationLabel = variationAttrKey
    ? `Select ${variationAttrKey.charAt(0).toUpperCase() + variationAttrKey.slice(1)}:`
    : "Select Option:"

  // ---- Calendar helpers ----
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    return days
  }, [calendarMonth])

  const maxDate = useMemo(() => {
    const d = new Date(ist)
    d.setDate(d.getDate() + 30)
    return d
  }, [ist])

  const isDateDisabled = useCallback(
    (d: Date) => {
      const today = getISTDate()
      today.setHours(0, 0, 0, 0)
      if (d < today) return true
      if (isSameDay(d, today) && !isTodayValid) return true
      if (d > maxDate) return true
      return false
    },
    [isTodayValid, maxDate]
  )

  // ---- Reviews ----
  const [showAllReviews, setShowAllReviews] = useState(false)
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 5)

  // ---- Render ----
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-4 lg:py-8">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* LEFT COLUMN — Image Gallery */}
          <div className="lg:w-[55%] lg:shrink-0">
            <ProductGallery images={product.images} />
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:w-[45%] mt-6 lg:mt-0 space-y-5">
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
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {product.isVeg ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                    <span className="h-3 w-3 rounded-full bg-green-600 inline-block" />
                    Veg
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                    <span className="h-3 w-3 rounded-full bg-red-600 inline-block" />
                    Non-Veg
                  </span>
                )}
                {product.isSameDayEligible && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    ⚡ Same Day
                  </span>
                )}
              </div>
            </div>

            {/* 3. Rating */}
            <div>
              {product.totalReviews > 0 ? (
                <a href="#reviews" className="inline-flex items-center gap-1.5 hover:opacity-80">
                  <span className="flex items-center gap-0.5">{renderStars(Number(product.avgRating))}</span>
                  <span className="text-sm font-medium text-gray-700">{Number(product.avgRating).toFixed(1)}</span>
                  <span className="text-sm text-gray-500">· {product.totalReviews} Reviews</span>
                </a>
              ) : (
                <p className="text-sm text-gray-400">No reviews yet</p>
              )}
            </div>

            {/* 4. Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {originalPrice ? (
                  <span className="text-green-700">{formatPrice(displayPrice)}</span>
                ) : (
                  formatPrice(displayPrice)
                )}
              </span>
              {originalPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through ml-2">
                    {formatPrice(originalPrice)}
                  </span>
                  {discountPercent > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-sm font-medium px-2 py-0.5 rounded ml-2">
                      {discountPercent}% Off
                    </span>
                  )}
                </>
              )}
            </div>

            {/* 5. Variation Selector */}
            {isVariable && variationAttrKey && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{variationLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {variations.map((v) => {
                    const attrValue = v.attributes[variationAttrKey] || "—"
                    const isSelected = v.id === selectedVariationId
                    const isInactive = !v.isActive
                    return (
                      <button
                        key={v.id}
                        disabled={isInactive}
                        onClick={() => setSelectedVariationId(v.id)}
                        className={cn(
                          "border rounded-lg p-3 w-24 text-center transition-all",
                          isInactive && "opacity-40 cursor-not-allowed pointer-events-none",
                          isSelected
                            ? "border-green-500 bg-green-50 text-green-700 font-medium"
                            : "border-gray-200 hover:border-gray-300 cursor-pointer"
                        )}
                      >
                        <div className="text-sm font-medium">{attrValue}</div>
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
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Gift Receiver&apos;s Location</p>
              {pincode ? (
                <div className="border rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">🇮🇳 IND</span>
                  <span className="text-gray-300">|</span>
                  <span className="flex-1 text-sm text-gray-700">
                    {pincode}{areaName ? `, ${areaName}` : ""}{cityName ? `, ${cityName}` : ""}
                  </span>
                  <button
                    onClick={handleClearPincode}
                    className="text-gray-400 hover:text-gray-600"
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
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    onClick={handlePincodeCheck}
                    disabled={pincodeChecking}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {pincodeChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                  </button>
                </div>
              )}
              {pincodeError && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{pincodeError}</p>
              )}
              {comingSoonMsg && (
                <p className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">{comingSoonMsg}</p>
              )}
            </div>

            {/* 8. Select Delivery Date */}
            {isServiceable && pincode && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Select Delivery Date</p>
                <div className="flex gap-2">
                  {/* Today */}
                  <div className="flex-1 relative group">
                    <button
                      disabled={!isTodayValid}
                      onClick={() => handleDateSelect(toYMD(ist))}
                      className={cn(
                        "w-full border rounded-lg py-3 px-2 text-center transition-all",
                        !isTodayValid && "opacity-40 cursor-not-allowed bg-gray-50",
                        selectedDate === toYMD(ist)
                          ? "border-green-500 bg-green-50 text-green-700"
                          : isTodayValid && "border-gray-200 hover:border-gray-400 cursor-pointer"
                      )}
                    >
                      <div className="text-sm font-medium">Today</div>
                      <div className="text-xs text-gray-500">{formatDateShort(ist)}</div>
                    </button>
                    {!isTodayValid && (
                      <div className="hidden group-hover:block absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
                        Order window closed for today. Please select tomorrow or later.
                      </div>
                    )}
                  </div>

                  {/* Tomorrow */}
                  <button
                    onClick={() => handleDateSelect(toYMD(tomorrow))}
                    className={cn(
                      "flex-1 border rounded-lg py-3 px-2 text-center cursor-pointer transition-all",
                      selectedDate === toYMD(tomorrow)
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-400"
                    )}
                  >
                    <div className="text-sm font-medium">Tomorrow</div>
                    <div className="text-xs text-gray-500">{formatDateShort(tomorrow)}</div>
                  </button>

                  {/* Later */}
                  <button
                    onClick={() => setCalendarOpen(true)}
                    className={cn(
                      "flex-1 border rounded-lg py-3 px-2 text-center cursor-pointer transition-all",
                      selectedDate && selectedDate !== toYMD(ist) && selectedDate !== toYMD(tomorrow)
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-400"
                    )}
                  >
                    <div className="text-sm font-medium">
                      {selectedDate && selectedDate !== toYMD(ist) && selectedDate !== toYMD(tomorrow)
                        ? formatDateShort(new Date(selectedDate + "T00:00:00"))
                        : "Later"
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedDate && selectedDate !== toYMD(ist) && selectedDate !== toYMD(tomorrow)
                        ? ""
                        : "▼"
                      }
                    </div>
                  </button>
                </div>

                {/* Calendar Dialog */}
                <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <DialogContent className="max-w-sm">
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => {
                            const { year, month } = calendarMonth
                            if (month === 0) setCalendarMonth({ year: year - 1, month: 11 })
                            else setCalendarMonth({ year, month: month - 1 })
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="font-medium">
                          {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString("en-IN", {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          onClick={() => {
                            const { year, month } = calendarMonth
                            if (month === 11) setCalendarMonth({ year: year + 1, month: 0 })
                            else setCalendarMonth({ year, month: month + 1 })
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                      {/* Day headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-1">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                          <div key={i}>{d}</div>
                        ))}
                      </div>
                      {/* Day cells */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, i) => {
                          if (!day) return <div key={i} />
                          const ymd = toYMD(day)
                          const disabled = isDateDisabled(day)
                          const isSelected = selectedDate === ymd
                          return (
                            <button
                              key={i}
                              disabled={disabled}
                              onClick={() => {
                                handleDateSelect(ymd)
                                setCalendarOpen(false)
                              }}
                              className={cn(
                                "h-9 w-9 mx-auto rounded-full text-sm flex items-center justify-center transition-all",
                                disabled && "text-gray-300 cursor-not-allowed",
                                !disabled && !isSelected && "hover:bg-gray-100 cursor-pointer",
                                isSelected && "bg-green-600 text-white"
                              )}
                            >
                              {day.getDate()}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* 9. Delivery Slot Picker or Express Card */}
            {isServiceable && selectedDate && (() => {
              const todayStr = toYMD(ist)
              const isTodaySelected = selectedDate === todayStr
              const showExpressOnly = isTodaySelected && isTodayExpressOnly && expressSlot

              if (showExpressOnly) {
                // Express-only card — today selected but standard slots past cutoff
                const deliveryTime = new Date(Date.now() + 5.5 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)
                const deliveryTimeStr = deliveryTime.toLocaleTimeString('en-IN', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'UTC',
                })
                return (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Select Delivery Slot</p>
                    <div className="border-2 border-orange-400 bg-orange-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">&#x26A1;</span>
                          <span className="font-medium text-gray-900">Express Delivery</span>
                        </div>
                        <span className="font-semibold text-gray-700">&#x20B9;{expressSlot.baseCharge}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 ml-7">Delivered within 3 hours</p>
                      <p className="text-xs text-gray-500 mt-0.5 ml-7">
                        Order now, receive by {deliveryTimeStr}
                      </p>
                    </div>
                  </div>
                )
              }

              if (slotGroups) {
                return (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Select Delivery Slot</p>
                    <DeliverySlotPicker
                      productId={product.id}
                      slotGroups={slotGroups}
                      selectedDate={selectedDate}
                      onSelectionChange={setSlotSelection}
                    />
                  </div>
                )
              }
              return null
            })()}

            {/* 10. About the Product (Accordion) */}
            <Accordion type="single" collapsible>
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
                      {product.productDetails && typeof product.productDetails === "object" && (
                        <ul className="text-sm text-gray-600 space-y-1">
                          {Object.entries(product.productDetails).map(([key, val]) => (
                            <li key={key}>• {key}: {val}</li>
                          ))}
                        </ul>
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
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Explore more options</h2>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                  {upsells.map((up) => (
                    <div key={up.id} className="w-48 shrink-0">
                      <ProductCard
                        id={up.id}
                        name={up.name}
                        slug={up.slug}
                        basePrice={up.basePrice}
                        images={up.images}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 12. Reviews Section */}
            <div id="reviews">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Customer Reviews</h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="space-y-4">
                  {displayedReviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-0.5">
                          {renderStars(review.rating)}
                        </span>
                        {review.isVerified && (
                          <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                            Verified
                          </span>
                        )}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span>{review.user?.name?.split(" ")[0] || "Anonymous"}</span>
                        <span>·</span>
                        <span>{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  ))}
                  {reviews.length > 5 && !showAllReviews && (
                    <button
                      onClick={() => setShowAllReviews(true)}
                      className="text-sm text-green-600 font-medium hover:text-green-700"
                    >
                      Show more ({reviews.length - 5} more)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!canAddToCart || adding}
              title={!canAddToCart ? "Select delivery date and slot" : undefined}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all",
                canAddToCart && !adding
                  ? "bg-white border-2 border-green-600 text-green-700 hover:bg-green-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
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
              onClick={handleBuyNow}
              disabled={!canAddToCart || adding}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all",
                canAddToCart && !adding
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              Buy Now <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {/* Error toast */}
          {errorToast && (
            <p className="text-center text-sm text-red-600 bg-red-50 rounded-lg py-2 mt-2">{errorToast}</p>
          )}
          {/* Countdown timer */}
          {isTodayValid && countdown && (
            <p className="text-center text-sm text-gray-500 mt-2">
              <Timer className="inline h-3.5 w-3.5 mr-1" />
              Time left to get delivered today: {countdown}
            </p>
          )}
        </div>
      </div>

      {/* Spacer for sticky bar */}
      <div className="h-24" />
    </>
  )
}
