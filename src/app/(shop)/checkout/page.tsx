"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Check, Loader2, Plus } from "lucide-react"

import { useCart } from "@/hooks/use-cart"
import { useCity } from "@/hooks/use-city"
import { useCurrency } from "@/hooks/use-currency"

type StepNumber = 1 | 2 | 3

// ─── Step Definitions ───

const STEPS: { number: StepNumber; label: string; emoji: string }[] = [
  { number: 1, label: "Delivery Address", emoji: "\uD83D\uDCCD" },
  { number: 2, label: "Date & Time", emoji: "\uD83D\uDCC5" },
  { number: 3, label: "Payment", emoji: "\uD83D\uDCB3" },
]

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

// ─── Component ───

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { formatPrice } = useCurrency()
  const { cityName } = useCity()

  const items = useCart((s) => s.items)
  const getSubtotal = useCart((s) => s.getSubtotal)
  const couponDiscount = useCart((s) => s.couponDiscount)

  const [currentStep, setCurrentStep] = useState<StepNumber>(1)

  // ─── Step 1 State ───

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)

  const [formData, setFormData] = useState({
    selectedAddressId: null as string | null,
    recipientName: "",
    recipientPhone: "",
    address: "",
    city: "",
    pincode: "",
    landmark: "",
    saveAddress: true,
    pincodeStatus: "idle" as "idle" | "checking" | "valid" | "invalid",
    showNewAddressForm: false,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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

  // Expose helpers for step components (will be passed as props)
  void goBack

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
    (field: string, value: string | boolean) => {
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

  // ─── Derived Values ───

  const subtotal = getSubtotal()
  const deliveryCharge = 0 // Calculated once slot is selected in step 2
  const total = subtotal + deliveryCharge - couponDiscount

  const isNewAddressFormVisible =
    formData.showNewAddressForm || savedAddresses.length === 0

  const isContinueDisabled =
    !formData.selectedAddressId &&
    (!formData.recipientName.trim() ||
      !formData.recipientPhone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
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

                    {/* Row 2: City + Pincode */}
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
                  Continue to Date &amp; Time &rarr;
                </button>
              </div>
            )}

            {currentStep !== 1 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                Step {currentStep} content goes here
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
                  <span className="text-gray-400 text-xs">Calculated in next step</span>
                </div>

                {/* Coupon discount */}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm mt-1.5 text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(couponDiscount)}</span>
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
