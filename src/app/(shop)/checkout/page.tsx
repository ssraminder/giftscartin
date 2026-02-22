"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Calendar as CalendarIcon } from "lucide-react"

import { useCart } from "@/hooks/use-cart"
import { useCity } from "@/hooks/use-city"
import { useCurrency } from "@/hooks/use-currency"
import { useReferral } from "@/components/providers/referral-provider"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  CalendarSection,
  toDateString,
  formatDateDisplay,
  type SlotOption,
  type SurchargeInfo,
  type AvailabilityResponse,
} from "@/components/product/delivery-slot-picker"

type StepNumber = 1 | 2 | 3

// ─── Step Definitions ───

const STEPS: { number: StepNumber; label: string; emoji: string }[] = [
  { number: 1, label: "Delivery Address", emoji: "\uD83D\uDCCD" },
  { number: 2, label: "Delivery Options", emoji: "\uD83D\uDCC5" },
  { number: 3, label: "Payment", emoji: "\uD83D\uDCB3" },
]

// ─── Hardcoded Coupons (placeholder) ───

const COUPONS: Record<string, { type: "percent" | "flat"; value: number }> = {
  WELCOME20: { type: "percent", value: 20 },
  CAKE50: { type: "flat", value: 50 },
}

// ─── Types ───

interface SavedAddress {
  id: string
  name: string
  phone: string
  address: string
  landmark: string | null
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

// ─── Slot Card Component ───

function SlotCard({
  slot,
  isSelected,
  selectedWindow,
  onSelect,
  onWindowSelect,
}: {
  slot: SlotOption
  isSelected: boolean
  selectedWindow: string | null
  onSelect: () => void
  onWindowSelect: (windowLabel: string) => void
}) {
  const disabled = !slot.isAvailable || slot.isFull

  return (
    <div
      className={`rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-pink-500 bg-pink-50'
          : disabled
            ? 'border-gray-100 bg-gray-50 opacity-60'
            : 'border-gray-200 bg-white hover:border-pink-300'
      }`}
    >
      <button
        onClick={() => !disabled && onSelect()}
        disabled={disabled}
        className={`flex w-full items-center justify-between p-4 text-left ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Radio indicator */}
          <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 ${
            isSelected ? 'border-pink-600' : 'border-gray-300'
          }`}>
            {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-pink-600" />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${isSelected ? 'text-pink-700' : 'text-gray-800'}`}>
              {slot.name}
            </p>
            <p className="text-xs text-gray-500">
              {slot.windows && slot.windows.length > 0 ? 'Choose your 2-hour window' : `${slot.startTime} \u2013 ${slot.endTime}`}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          {slot.isFull ? (
            <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
              FULL
            </span>
          ) : (
            <span className={`text-sm font-semibold ${
              slot.price === 0
                ? 'text-green-600'
                : isSelected ? 'text-pink-600' : 'text-gray-700'
            }`}>
              {slot.priceLabel}
            </span>
          )}
        </div>
      </button>

      {/* Fixed slot windows (only shown when selected) */}
      {isSelected && slot.windows && slot.windows.length > 0 && (
        <div className="border-t border-pink-200 px-4 py-3 space-y-2">
          {slot.windows.map((w) => {
            const wDisabled = !w.isAvailable || w.isFull
            const wSelected = selectedWindow === w.label
            return (
              <button
                key={w.label}
                onClick={() => !wDisabled && onWindowSelect(w.label)}
                disabled={wDisabled}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                  wSelected
                    ? 'bg-pink-100 text-pink-700 font-medium'
                    : wDisabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-pink-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    wSelected ? 'border-pink-600' : 'border-gray-300'
                  }`}>
                    {wSelected && <div className="h-2 w-2 rounded-full bg-pink-600" />}
                  </div>
                  <span>{w.label}</span>
                </div>
                {w.isFull && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                    FULL
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Unavailable reason tooltip */}
      {!slot.isAvailable && !slot.isFull && slot.reason && (
        <p className="px-4 pb-2 text-xs text-gray-400">{slot.reason}</p>
      )}
    </div>
  )
}

// ─── Mobile helper ───

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

// ─── Component ───

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { formatPrice } = useCurrency()
  const { cityName, cityId } = useCity()
  const { clearReferral } = useReferral()
  const isMobile = useIsMobile()

  const items = useCart((s) => s.items)
  const getSubtotal = useCart((s) => s.getSubtotal)
  const clearCart = useCart((s) => s.clearCart)
  const setDeliveryDateForAll = useCart((s) => s.setDeliveryDateForAll)

  const [currentStep, setCurrentStep] = useState<StepNumber>(1)

  // ─── Step 1 State ───

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)

  const [formData, setFormData] = useState({
    // Step 1
    selectedAddressId: null as string | null,
    recipientName: "",
    recipientPhone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    saveAddress: true,
    pincodeStatus: "idle" as "idle" | "checking" | "valid" | "invalid",
    showNewAddressForm: false,

    // Step 2
    deliveryDate: null as string | null,
    deliverySlot: null as string | null,
    deliverySlotName: null as string | null,
    deliverySlotSlug: null as string | null,
    deliveryWindow: null as string | null,
    slotCharge: 0,
    giftMessage: "",
    specialInstructions: "",

    // Step 3
    paymentMethod: null as "upi" | "card" | "netbanking" | "cod" | null,
    couponCode: "",
    couponDiscount: 0,
    couponApplied: false,
  })

  // Step 2 extra state — slots from API
  const [slotsData, setSlotsData] = useState<SlotOption[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [fullyBlocked, setFullyBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState<string | undefined>()
  const [surchargeInfo, setSurchargeInfo] = useState<SurchargeInfo | undefined>()

  // Step 2 — date change calendar state
  const [changeDateOpen, setChangeDateOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    return new Date(nowIST.getFullYear(), nowIST.getMonth(), 1)
  })
  const [availableDatesSet, setAvailableDatesSet] = useState<Set<string>>(new Set())
  const [loadingDates, setLoadingDates] = useState(false)

  // Step 3 extra state
  const [codFee, setCodFee] = useState(0)
  const [upiId, setUpiId] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [couponExpanded, setCouponExpanded] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState("")

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // ─── Initialize delivery date from cart ───

  useEffect(() => {
    if (items.length > 0 && items[0].deliveryDate && !formData.deliveryDate) {
      setFormData((prev) => ({ ...prev, deliveryDate: items[0].deliveryDate }))
    }
  }, [items, formData.deliveryDate])

  // ─── Fetch Saved Addresses ───

  useEffect(() => {
    if (!session?.user?.id) return

    setAddressesLoading(true)
    fetch("/api/addresses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setSavedAddresses(data.data)
          // Auto-select default address
          const defaultAddr = data.data.find((a: SavedAddress) => a.isDefault)
          if (defaultAddr) {
            setFormData((prev) => ({
              ...prev,
              selectedAddressId: defaultAddr.id,
              showNewAddressForm: false,
            }))
          }
        }
      })
      .catch(() => {})
      .finally(() => setAddressesLoading(false))
  }, [session?.user?.id])

  // ─── Pre-fill city from context ───

  useEffect(() => {
    if (cityName && !formData.city) {
      setFormData((prev) => ({ ...prev, city: cityName }))
    }
  }, [cityName, formData.city])

  // ─── Fetch slots when Step 2 is entered and date is set ───

  const fetchSlots = useCallback(async (dateStr: string) => {
    const firstProductId = items.length > 0 ? items[0].productId : null
    if (!firstProductId || !cityId || !dateStr) return

    setSlotsLoading(true)
    try {
      const params = new URLSearchParams({ productId: firstProductId, cityId, date: dateStr })
      const res = await fetch(`/api/delivery/availability?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const data: AvailabilityResponse = json.data
      setSlotsData(data.slots)
      setFullyBlocked(data.fullyBlocked)
      setBlockReason(data.reason)
      setSurchargeInfo(data.surcharge)
    } catch {
      setSlotsData([])
    } finally {
      setSlotsLoading(false)
    }
  }, [items, cityId])

  // Fetch available dates when "Change Date" is opened
  const fetchAvailableDates = useCallback(async () => {
    const firstProductId = items.length > 0 ? items[0].productId : null
    if (!firstProductId || !cityId) return

    setLoadingDates(true)
    try {
      const params = new URLSearchParams({ productId: firstProductId, cityId, months: '2' })
      const res = await fetch(`/api/delivery/available-dates?${params}`)
      const json = await res.json()
      if (json.success && json.data?.availableDates) {
        setAvailableDatesSet(new Set(json.data.availableDates as string[]))
      }
    } catch {
      setAvailableDatesSet(new Set())
    } finally {
      setLoadingDates(false)
    }
  }, [items, cityId])

  // Load slots when entering Step 2
  useEffect(() => {
    if (currentStep === 2 && formData.deliveryDate) {
      fetchSlots(formData.deliveryDate)
    }
  }, [currentStep, formData.deliveryDate, fetchSlots])

  // ─── Navigation Helpers ───

  const goToStep = useCallback(
    (n: number) => {
      if (n >= 1 && n <= 3) {
        setCurrentStep(n as StepNumber)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    },
    []
  )

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    } else {
      router.push("/cart")
    }
  }, [currentStep, goToStep, router])

  // ─── Pincode Check ───

  const checkPincode = useCallback(async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) return

    setFormData((prev) => ({ ...prev, pincodeStatus: "checking" }))

    try {
      const res = await fetch("/api/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      })
      const data = await res.json()

      if (data.success && data.data?.isServiceable) {
        setFormData((prev) => ({ ...prev, pincodeStatus: "valid" }))
        setFormErrors((prev) => {
          const next = { ...prev }
          delete next.pincode
          return next
        })
      } else {
        setFormData((prev) => ({ ...prev, pincodeStatus: "invalid" }))
      }
    } catch {
      setFormData((prev) => ({ ...prev, pincodeStatus: "invalid" }))
    }
  }, [])

  // ─── Form Helpers ───

  const updateField = useCallback(
    (field: string, value: string | boolean | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      // Clear error when user types
      if (typeof value === "string" && value.trim()) {
        setFormErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
    },
    []
  )

  const selectSavedAddress = useCallback((addressId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedAddressId: addressId,
      showNewAddressForm: false,
    }))
    setFormErrors({})
  }, [])

  const showNewForm = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      selectedAddressId: null,
      showNewAddressForm: true,
    }))
    setFormErrors({})
  }, [])

  // ─── Step 1 Validation ───

  const validateStep1 = useCallback((): boolean => {
    // If a saved address is selected, we're good
    if (formData.selectedAddressId) return true

    const errors: Record<string, string> = {}

    if (!formData.recipientName.trim()) {
      errors.recipientName = "Recipient name is required"
    }
    if (!formData.recipientPhone.trim()) {
      errors.recipientPhone = "Mobile number is required"
    } else if (!/^\d{10}$/.test(formData.recipientPhone.trim())) {
      errors.recipientPhone = "Enter a valid 10-digit mobile number"
    }
    if (!formData.address.trim()) {
      errors.address = "Address is required"
    }
    if (!formData.city.trim()) {
      errors.city = "City is required"
    }
    if (!formData.state.trim()) {
      errors.state = "State is required"
    }
    if (!formData.pincode.trim()) {
      errors.pincode = "Pincode is required"
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = "Enter a valid 6-digit pincode"
    } else if (formData.pincodeStatus === "invalid") {
      errors.pincode = "We don't deliver to this pincode yet"
    } else if (formData.pincodeStatus !== "valid") {
      errors.pincode = "Please verify your pincode"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  const handleContinueStep1 = useCallback(() => {
    if (validateStep1()) {
      goToStep(2)
    }
  }, [validateStep1, goToStep])

  // ─── Step 2 Helpers ───

  const handleSlotSelect = useCallback((slotId: string) => {
    const slot = slotsData.find(s => s.id === slotId)
    if (!slot || !slot.isAvailable || slot.isFull) return

    setFormData((prev) => ({
      ...prev,
      deliverySlot: slot.id,
      deliverySlotName: slot.name,
      deliverySlotSlug: slot.slug,
      deliveryWindow: null,
      slotCharge: slot.price,
    }))
  }, [slotsData])

  const handleWindowSelect = useCallback((windowLabel: string) => {
    setFormData((prev) => ({
      ...prev,
      deliveryWindow: windowLabel,
    }))
  }, [])

  const handleChangeDate = useCallback((date: Date) => {
    const dateStr = toDateString(date)
    setFormData((prev) => ({
      ...prev,
      deliveryDate: dateStr,
      deliverySlot: null,
      deliverySlotName: null,
      deliverySlotSlug: null,
      deliveryWindow: null,
      slotCharge: 0,
    }))
    // Update cart items with new date
    setDeliveryDateForAll(dateStr)
    setChangeDateOpen(false)
    // Fetch slots for the new date
    fetchSlots(dateStr)
  }, [setDeliveryDateForAll, fetchSlots])

  // Check if slot selection is complete
  const isSlotComplete = useMemo(() => {
    if (!formData.deliverySlot) return false
    const slot = slotsData.find(s => s.id === formData.deliverySlot)
    if (!slot) return false
    // Fixed slot requires window selection
    if (slot.windows && slot.windows.length > 0 && !formData.deliveryWindow) return false
    return true
  }, [formData.deliverySlot, formData.deliveryWindow, slotsData])

  const handleContinueStep2 = useCallback(() => {
    if (formData.deliveryDate && isSlotComplete) {
      goToStep(3)
    }
  }, [formData.deliveryDate, isSlotComplete, goToStep])

  // Formatted date for display
  const deliveryDateDisplay = useMemo(() => {
    if (!formData.deliveryDate) return ""
    const d = new Date(formData.deliveryDate + "T00:00:00")
    return formatDateDisplay(d)
  }, [formData.deliveryDate])

  const getFormattedDate = useCallback(() => {
    if (!formData.deliveryDate) return ""
    const d = new Date(formData.deliveryDate + "T00:00:00")
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
  }, [formData.deliveryDate])

  // ─── Step 3 Helpers ───

  const handlePaymentMethodChange = useCallback((method: "upi" | "card" | "netbanking" | "cod") => {
    setFormData((prev) => ({ ...prev, paymentMethod: method }))
    setCodFee(method === "cod" ? 50 : 0)
  }, [])

  const handleApplyCoupon = useCallback(() => {
    const code = formData.couponCode.trim().toUpperCase()
    if (!code) return

    const coupon = COUPONS[code]
    if (!coupon) {
      setCouponError("Invalid or expired coupon")
      setFormData((prev) => ({ ...prev, couponDiscount: 0, couponApplied: false }))
      return
    }

    const sub = getSubtotal()
    const discount = coupon.type === "percent" ? Math.round(sub * coupon.value / 100) : coupon.value
    setFormData((prev) => ({ ...prev, couponDiscount: discount, couponApplied: true }))
    setCouponError("")
  }, [formData.couponCode, getSubtotal])

  // ─── Address display helpers ───

  const getAddressDisplay = useCallback(() => {
    if (formData.selectedAddressId) {
      const addr = savedAddresses.find((a) => a.id === formData.selectedAddressId)
      if (addr) return { name: addr.name, address: `${addr.address}, ${addr.pincode}`, pincode: addr.pincode }
    }
    return {
      name: formData.recipientName,
      address: `${formData.address}, ${formData.pincode}`,
      pincode: formData.pincode,
    }
  }, [formData.selectedAddressId, formData.recipientName, formData.address, formData.pincode, savedAddresses])

  // ─── Place Order ───

  const handlePlaceOrder = useCallback(async () => {
    // Validate required fields before submission
    if (!formData.paymentMethod) {
      setOrderError("Please select a payment method")
      return
    }
    if (!formData.deliveryDate) {
      setOrderError("Please select a delivery date")
      return
    }
    if (!formData.deliverySlot) {
      setOrderError("Please select a delivery time slot")
      return
    }
    if (!formData.selectedAddressId && !formData.recipientName.trim()) {
      setOrderError("Please provide a delivery address")
      return
    }

    setPlacingOrder(true)
    setOrderError("")

    try {
      // Determine if using a saved address or creating a new one
      const isNewAddress = !formData.selectedAddressId

      const body: Record<string, unknown> = {
        items: items.map((item) => ({
          productId: item.productId,
          variationId: item.variationId || undefined,
          quantity: item.quantity,
          addons: item.addonSelections?.length > 0 ? item.addonSelections : undefined,
        })),
        // API requires addressId as a non-empty string; use '__CREATE__' for inline address creation
        addressId: isNewAddress ? "__CREATE__" : formData.selectedAddressId,
        // Send inline address data when creating a new address (field must be 'address', not 'newAddress')
        ...(isNewAddress && {
          address: {
            name: formData.recipientName.trim(),
            phone: formData.recipientPhone.trim(),
            address: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
            landmark: formData.landmark.trim() || undefined,
          },
        }),
        deliveryDate: formData.deliveryDate,
        deliverySlot: formData.deliverySlotSlug || formData.deliverySlot,
        giftMessage: formData.giftMessage || undefined,
        specialInstructions: formData.specialInstructions || undefined,
        couponCode: formData.couponApplied ? formData.couponCode.trim().toUpperCase() : undefined,
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success && data.data?.id) {
        clearReferral()
        clearCart()
        router.push(`/orders/${data.data.id}/confirmation`)
      } else {
        setOrderError(data.error || "Failed to place order. Please try again.")
      }
    } catch {
      setOrderError("Something went wrong. Please try again.")
    } finally {
      setPlacingOrder(false)
    }
  }, [formData, items, clearReferral, clearCart, router])

  // ─── Derived Values ───

  const subtotal = getSubtotal()
  const deliveryCharge = 0 // From city config — placeholder
  const total = subtotal + deliveryCharge + formData.slotCharge + codFee - formData.couponDiscount

  const isNewAddressFormVisible =
    formData.showNewAddressForm || savedAddresses.length === 0

  const isContinueDisabled =
    !formData.selectedAddressId &&
    (!formData.recipientName.trim() ||
      !formData.recipientPhone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim() ||
      formData.pincodeStatus === "invalid" ||
      formData.pincodeStatus === "checking")

  // ─── Render ───

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Bar — sticky below header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto py-4 px-4">
          <div className="relative flex items-center justify-between">
            {/* Connecting line — background (gray) */}
            <div className="absolute top-[18px] left-[36px] right-[36px] h-0.5 bg-gray-200" />
            {/* Connecting line — progress (pink) */}
            <div
              className="absolute top-[18px] left-[36px] h-0.5 bg-pink-500 transition-all duration-500"
              style={{
                width:
                  currentStep === 1
                    ? "0%"
                    : currentStep === 2
                    ? "calc(50% - 18px)"
                    : "calc(100% - 72px)",
              }}
            />

            {STEPS.map((step) => {
              const isCompleted = step.number < currentStep
              const isCurrent = step.number === currentStep
              const isFuture = step.number > currentStep

              return (
                <div
                  key={step.number}
                  className="relative z-10 flex flex-col items-center"
                >
                  {/* Circle */}
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                      isCompleted
                        ? "bg-pink-500 text-white"
                        : isCurrent
                        ? "border-2 border-pink-500 bg-white text-pink-500"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      step.number
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                      isFuture ? "text-gray-400" : "text-pink-600"
                    }`}
                  >
                    {step.emoji} {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Page Layout */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="lg:flex gap-8">
          {/* Left Column — Step Content */}
          <div className="lg:w-[65%]">

            {/* ═══════════════════════ STEP 1 ═══════════════════════ */}
            {currentStep === 1 && (
              <div>
                <h1 className="text-xl font-semibold mb-6">
                  Where should we deliver?
                </h1>

                {/* ── Saved Addresses Section ── */}
                {session?.user && (
                  <div className="mb-6">
                    {addressesLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="rounded-xl border-2 border-gray-200 p-4 animate-pulse"
                          >
                            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                            <div className="h-3 bg-gray-200 rounded w-full" />
                          </div>
                        ))}
                      </div>
                    ) : savedAddresses.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {savedAddresses.map((addr) => {
                          const isSelected =
                            formData.selectedAddressId === addr.id

                          return (
                            <div
                              key={addr.id}
                              onClick={() => selectSavedAddress(addr.id)}
                              className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-pink-500 bg-pink-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-pink-500 flex items-center justify-center">
                                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                              <p className="font-medium">{addr.name}</p>
                              <p className="text-sm text-gray-600">
                                {addr.phone}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {addr.address}, {addr.city} - {addr.pincode}
                              </p>
                            </div>
                          )
                        })}

                        {/* Add New Address card */}
                        <div
                          onClick={showNewForm}
                          className="rounded-xl border-2 border-dashed border-gray-300 p-4 cursor-pointer text-center flex flex-col items-center justify-center hover:border-gray-400 transition-colors text-gray-500"
                        >
                          <Plus className="h-6 w-6 mb-1" />
                          <span className="text-sm font-medium">
                            Add New Address
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* ── New Address Form ── */}
                {isNewAddressFormVisible && (
                  <div className="rounded-xl border p-6 bg-gray-50">
                    {/* Row 1: Name + Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Recipient&apos;s Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.recipientName}
                          onChange={(e) =>
                            updateField("recipientName", e.target.value)
                          }
                          placeholder="Full name"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        {formErrors.recipientName && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.recipientName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Recipient&apos;s Mobile <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={formData.recipientPhone}
                          onChange={(e) =>
                            updateField(
                              "recipientPhone",
                              e.target.value.replace(/\D/g, "").slice(0, 10)
                            )
                          }
                          placeholder="10-digit mobile number"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        {formErrors.recipientPhone && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.recipientPhone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Full Address */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={formData.address}
                        onChange={(e) =>
                          updateField("address", e.target.value)
                        }
                        placeholder="Door No., Street, Area, Locality"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none resize-none"
                      />
                      {formErrors.address && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors.address}
                        </p>
                      )}
                    </div>

                    {/* Row 2: City + State */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) =>
                            updateField("city", e.target.value)
                          }
                          placeholder="City"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        {formErrors.city && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.city}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) =>
                            updateField("state", e.target.value)
                          }
                          placeholder="State"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        {formErrors.state && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.state}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Pincode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pincode <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={6}
                            value={formData.pincode}
                            onChange={(e) => {
                              const val = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6)
                              updateField("pincode", val)
                              if (val.length < 6) {
                                setFormData((prev) => ({
                                  ...prev,
                                  pincodeStatus: "idle",
                                }))
                              }
                            }}
                            onBlur={() => {
                              if (/^\d{6}$/.test(formData.pincode)) {
                                checkPincode(formData.pincode)
                              }
                            }}
                            placeholder="6-digit pincode"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                          />
                          {formData.pincodeStatus === "checking" && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                          )}
                        </div>
                        {formErrors.pincode && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.pincode}
                          </p>
                        )}
                        {formData.pincodeStatus === "valid" && (
                          <p className="text-green-600 text-xs mt-1">
                            Delivery available
                          </p>
                        )}
                        {formData.pincodeStatus === "invalid" && (
                          <p className="text-red-500 text-xs mt-1">
                            Sorry, we don&apos;t deliver here yet
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Landmark */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Landmark
                      </label>
                      <input
                        type="text"
                        value={formData.landmark}
                        onChange={(e) =>
                          updateField("landmark", e.target.value)
                        }
                        placeholder="Nearby landmark (optional)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                      />
                    </div>

                    {/* Save address checkbox */}
                    {session?.user && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.saveAddress}
                          onChange={(e) =>
                            updateField("saveAddress", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700">
                          Save this address for future orders
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* ── Continue Button ── */}
                <button
                  onClick={handleContinueStep1}
                  disabled={isContinueDisabled}
                  className="w-full mt-6 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl text-base font-semibold transition-colors"
                >
                  Continue to Delivery Options &rarr;
                </button>
              </div>
            )}

            {/* ═══════════════════════ STEP 2 — DELIVERY OPTIONS ═══════════════════════ */}
            {currentStep === 2 && (
              <div>
                {/* Back link */}
                <button
                  onClick={goBack}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
                >
                  &larr; Back
                </button>

                <h1 className="text-xl font-semibold mb-6">Delivery Options</h1>

                {/* 1. Delivery Date Display */}
                <div className="flex items-center justify-between rounded-xl border-2 border-pink-200 bg-pink-50 p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-pink-600" />
                    <div>
                      <p className="text-xs text-gray-500">Delivering on</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {deliveryDateDisplay || "No date selected"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setChangeDateOpen(true)
                      fetchAvailableDates()
                    }}
                    className="text-sm text-pink-600 hover:text-pink-700 font-semibold"
                  >
                    Change Date
                  </button>
                </div>

                {/* Change Date Calendar Sheet/Modal */}
                {isMobile ? (
                  <Sheet open={changeDateOpen} onOpenChange={setChangeDateOpen}>
                    <SheetContent side="bottom" className="h-[70vh] overflow-y-auto rounded-t-2xl px-4 pb-0">
                      <SheetHeader className="pb-2">
                        <SheetTitle className="text-left">Change Delivery Date</SheetTitle>
                      </SheetHeader>
                      <div className="pb-24">
                        <CalendarSection
                          selectedDate={formData.deliveryDate ? new Date(formData.deliveryDate + "T00:00:00") : null}
                          selectedMonth={calendarMonth}
                          availableDates={availableDatesSet}
                          loadingDates={loadingDates}
                          onDateSelect={handleChangeDate}
                          onMonthChange={setCalendarMonth}
                        />
                      </div>
                      <SheetFooter className="fixed bottom-0 left-0 right-0 border-t bg-white p-4">
                        <Button
                          onClick={() => setChangeDateOpen(false)}
                          variant="outline"
                          className="w-full py-3 rounded-xl font-semibold"
                        >
                          Cancel
                        </Button>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                ) : (
                  changeDateOpen && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-900">Select a new date</p>
                        <button
                          onClick={() => setChangeDateOpen(false)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                      <CalendarSection
                        selectedDate={formData.deliveryDate ? new Date(formData.deliveryDate + "T00:00:00") : null}
                        selectedMonth={calendarMonth}
                        availableDates={availableDatesSet}
                        loadingDates={loadingDates}
                        onDateSelect={handleChangeDate}
                        onMonthChange={setCalendarMonth}
                      />
                    </div>
                  )
                )}

                {/* 2. Select Time Slot */}
                <h2 className="font-semibold mb-3">
                  Select Time Slot <span className="text-red-500">*</span>
                </h2>

                {/* Surcharge banner */}
                {surchargeInfo?.surchargeActive && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 mb-3 text-sm text-amber-800">
                    <span>&#x1F389;</span>
                    <span>
                      {surchargeInfo.surchargeName}: &#x20B9;{surchargeInfo.surchargeAmount} surcharge applies to {surchargeInfo.surchargeAppliesTo} on this date
                    </span>
                  </div>
                )}

                {slotsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : fullyBlocked ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
                    Delivery not available on this date.{blockReason ? ` ${blockReason}.` : ''} Please select another date.
                  </div>
                ) : slotsData.length > 0 ? (
                  <div className="space-y-2">
                    {slotsData.map(slot => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        isSelected={formData.deliverySlot === slot.id}
                        selectedWindow={formData.deliverySlot === slot.id ? formData.deliveryWindow : null}
                        onSelect={() => handleSlotSelect(slot.id)}
                        onWindowSelect={handleWindowSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No delivery slots available for this date. Please choose another date.
                  </p>
                )}

                {/* 3. Gift Message */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add a Personal Message (optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={formData.giftMessage}
                    onChange={(e) => updateField("giftMessage", e.target.value)}
                    placeholder="Write your heartfelt message here..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right mt-0.5">
                    {formData.giftMessage.length}/200 characters
                  </p>
                </div>

                {/* 4. Special Instructions */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Instructions (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.specialInstructions}
                    onChange={(e) => updateField("specialInstructions", e.target.value)}
                    placeholder="Any instructions? (e.g., Call before delivery)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                  />
                </div>

                {/* 5. Continue Button */}
                <button
                  onClick={handleContinueStep2}
                  disabled={!formData.deliveryDate || !isSlotComplete}
                  className="w-full mt-6 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl text-base font-semibold transition-colors"
                >
                  Continue to Payment &rarr;
                </button>
              </div>
            )}

            {/* ═══════════════════════ STEP 3 ═══════════════════════ */}
            {currentStep === 3 && (
              <div>
                {/* Back link */}
                <button
                  onClick={goBack}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
                >
                  &larr; Back
                </button>

                {/* 1. Order Review */}
                <div className="rounded-xl bg-gray-50 p-4 mb-6">
                  {/* Address row */}
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-gray-700">
                      {"\uD83D\uDCCD"} {getAddressDisplay().name}, {getAddressDisplay().address}
                    </p>
                    <button
                      onClick={() => goToStep(1)}
                      className="text-xs text-pink-500 hover:text-pink-600 font-medium shrink-0 ml-2"
                    >
                      Edit
                    </button>
                  </div>
                  {/* Date/slot row */}
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-gray-700">
                      {"\uD83D\uDCC5"} {getFormattedDate()} | {formData.deliverySlotName || formData.deliverySlot}
                      {formData.deliveryWindow ? ` (${formData.deliveryWindow})` : ""}
                    </p>
                    <button
                      onClick={() => goToStep(2)}
                      className="text-xs text-pink-500 hover:text-pink-600 font-medium shrink-0 ml-2"
                    >
                      Edit
                    </button>
                  </div>
                  {/* Gift message row */}
                  {formData.giftMessage && (
                    <p className="text-sm text-gray-500">
                      {"\uD83D\uDC8C"} {formData.giftMessage.length > 50
                        ? formData.giftMessage.slice(0, 50) + "..."
                        : formData.giftMessage}
                    </p>
                  )}
                </div>

                {/* 2. Payment Method */}
                <h2 className="font-semibold mb-3">Choose Payment Method</h2>
                <div className="space-y-2">
                  {/* UPI */}
                  <div>
                    <div
                      onClick={() => handlePaymentMethodChange("upi")}
                      className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        formData.paymentMethod === "upi"
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            formData.paymentMethod === "upi" ? "border-pink-500" : "border-gray-300"
                          }`}
                        >
                          {formData.paymentMethod === "upi" && (
                            <div className="h-2 w-2 rounded-full bg-pink-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{"\u26A1"} UPI</p>
                          <span className="text-xs text-green-600 font-medium">Instant &middot; Most Preferred</span>
                        </div>
                      </div>
                    </div>
                    {formData.paymentMethod === "upi" && (
                      <div className="mt-2 ml-7 mr-4">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@upi"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        <p className="text-sm text-gray-500 mt-1">Enter your UPI ID to pay</p>
                      </div>
                    )}
                  </div>

                  {/* Card */}
                  <div>
                    <div
                      onClick={() => handlePaymentMethodChange("card")}
                      className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        formData.paymentMethod === "card"
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            formData.paymentMethod === "card" ? "border-pink-500" : "border-gray-300"
                          }`}
                        >
                          {formData.paymentMethod === "card" && (
                            <div className="h-2 w-2 rounded-full bg-pink-500" />
                          )}
                        </div>
                        <p className="font-medium">{"\uD83D\uDCB3"} Credit or Debit Card</p>
                      </div>
                    </div>
                    {formData.paymentMethod === "card" && (
                      <div className="mt-2 ml-7 mr-4 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                          placeholder="Card Number"
                          maxLength={16}
                          className="col-span-3 sm:col-span-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/[^\d/]/g, "")
                            if (val.length === 2 && !val.includes("/") && cardExpiry.length < val.length) {
                              val = val + "/"
                            }
                            setCardExpiry(val.slice(0, 5))
                          }}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                          placeholder="CVV"
                          maxLength={3}
                          className="rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Net Banking */}
                  <div>
                    <div
                      onClick={() => handlePaymentMethodChange("netbanking")}
                      className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        formData.paymentMethod === "netbanking"
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            formData.paymentMethod === "netbanking" ? "border-pink-500" : "border-gray-300"
                          }`}
                        >
                          {formData.paymentMethod === "netbanking" && (
                            <div className="h-2 w-2 rounded-full bg-pink-500" />
                          )}
                        </div>
                        <p className="font-medium">{"\uD83C\uDFE6"} Net Banking</p>
                      </div>
                    </div>
                    {formData.paymentMethod === "netbanking" && (
                      <div className="mt-2 ml-7 mr-4">
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none bg-white"
                        >
                          <option value="">Select your bank</option>
                          <option value="sbi">SBI</option>
                          <option value="hdfc">HDFC</option>
                          <option value="icici">ICICI</option>
                          <option value="axis">Axis</option>
                          <option value="kotak">Kotak</option>
                          <option value="pnb">Punjab National Bank</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* COD */}
                  <div>
                    <div
                      onClick={() => handlePaymentMethodChange("cod")}
                      className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        formData.paymentMethod === "cod"
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            formData.paymentMethod === "cod" ? "border-pink-500" : "border-gray-300"
                          }`}
                        >
                          {formData.paymentMethod === "cod" && (
                            <div className="h-2 w-2 rounded-full bg-pink-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{"\uD83E\uDD1D"} Cash on Delivery</p>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{"\u20B9"}50 COD fee</span>
                        </div>
                      </div>
                    </div>
                    {formData.paymentMethod === "cod" && (
                      <p className="text-sm text-gray-500 mt-2 ml-7 mr-4">
                        Please keep exact change ready. COD fee of {"\u20B9"}50 is non-refundable.
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Coupon Code */}
                {!formData.couponApplied && (
                  <div className="mt-6">
                    <button
                      onClick={() => setCouponExpanded(!couponExpanded)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      {"\uD83C\uDFF7\uFE0F"} Have a promo code?
                      {couponExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {couponExpanded && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={formData.couponCode}
                          onChange={(e) => {
                            updateField("couponCode", e.target.value)
                            setCouponError("")
                          }}
                          placeholder="Enter coupon code"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-sm text-red-500 mt-1">{"\u274C"} {couponError}</p>
                    )}
                  </div>
                )}

                {formData.couponApplied && (
                  <p className="text-sm text-green-600 mt-4">
                    {"\u2705"} Coupon applied! You saved {formatPrice(formData.couponDiscount)}
                  </p>
                )}

                {/* 4. Price Breakdown */}
                <div className="border-t pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery charge</span>
                    <span>{deliveryCharge === 0 ? <span className="text-green-600">Free</span> : formatPrice(deliveryCharge)}</span>
                  </div>
                  {formData.slotCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Slot charge</span>
                      <span>{formatPrice(formData.slotCharge)}</span>
                    </div>
                  )}
                  {formData.couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Coupon</span>
                      <span>-{formatPrice(formData.couponDiscount)}</span>
                    </div>
                  )}
                  {codFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">COD fee</span>
                      <span>+{formatPrice(codFee)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-xl">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Order error */}
                {orderError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-800">{orderError}</p>
                  </div>
                )}

                {/* 5. Place Order */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={!formData.paymentMethod || placingOrder}
                  className="w-full mt-6 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl text-base font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {placingOrder ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    "Place Order \u2192"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column — Sticky Order Summary */}
          <div className="lg:w-[35%] mt-8 lg:mt-0">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

                {/* Cart items list */}
                {items.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">Your cart is empty</p>
                    <Link
                      href="/"
                      className="text-sm text-pink-500 hover:text-pink-600 font-medium"
                    >
                      Browse Products
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const unitPrice = Number(item.price)
                      const addonTotal = item.addonSelections.reduce(
                        (s, a) => s + (a.totalAddonPrice ?? a.addonPrice ?? 0),
                        0
                      )
                      const lineTotal = (unitPrice + addonTotal) * item.quantity

                      return (
                        <div key={item.id || item.productId} className="flex items-center gap-3">
                          {/* Image */}
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                            <Image
                              src={
                                item.image ||
                                item.product?.images?.[0] ||
                                "/placeholder-product.svg"
                              }
                              alt={item.productName || item.product?.name || "Product"}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>

                          {/* Name + Qty */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {item.productName || item.product?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              &times; {item.quantity}
                            </p>
                          </div>

                          {/* Price */}
                          <span className="text-sm font-semibold text-gray-800 ml-auto shrink-0">
                            {formatPrice(lineTotal)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 my-3" />

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-800">{formatPrice(subtotal)}</span>
                </div>

                {/* Delivery */}
                <div className="flex justify-between text-sm mt-1.5">
                  <span className="text-gray-600">Delivery</span>
                  {deliveryCharge === 0 ? (
                    <span className="text-gray-400 text-xs">
                      {currentStep >= 2 ? "Free" : "Calculated in next step"}
                    </span>
                  ) : (
                    <span className="text-gray-800">{formatPrice(deliveryCharge)}</span>
                  )}
                </div>

                {/* Slot charge */}
                {formData.slotCharge > 0 && (
                  <div className="flex justify-between text-sm mt-1.5">
                    <span className="text-gray-600">Slot charge</span>
                    <span className="text-gray-800">{formatPrice(formData.slotCharge)}</span>
                  </div>
                )}

                {/* Coupon discount */}
                {formData.couponDiscount > 0 && (
                  <div className="flex justify-between text-sm mt-1.5 text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(formData.couponDiscount)}</span>
                  </div>
                )}

                {/* COD fee */}
                {codFee > 0 && (
                  <div className="flex justify-between text-sm mt-1.5">
                    <span className="text-gray-600">COD fee</span>
                    <span className="text-gray-800">+{formatPrice(codFee)}</span>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 my-3" />

                {/* Total */}
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                {/* Secure checkout badge */}
                <p className="text-xs text-gray-500 text-center mt-3">
                  {"\uD83D\uDD12"} Safe &amp; Secure Checkout
                </p>

                {/* Payment logos */}
                <p className="text-xs text-gray-400 text-center mt-1.5">
                  UPI &middot; Cards &middot; NetBanking &middot; COD
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
