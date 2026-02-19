"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import Script from "next/script"
import { useSession } from "next-auth/react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Gift,
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/use-cart"
import { useCurrency } from "@/hooks/use-currency"

// ─── Types ───

interface AddressForm {
  name: string
  phone: string
  address: string
  landmark: string
  city: string
  state: string
  pincode: string
}

const EMPTY_ADDRESS: AddressForm = {
  name: "",
  phone: "",
  address: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
}

interface SlotInfo {
  id: string
  name: string
  slug: string
  startTime: string
  endTime: string
  charge: number
}

interface ServiceabilityResult {
  isServiceable: boolean
  message?: string
  vendorCount: number
  deliveryCharge: number
  freeDeliveryAbove: number
  availableSlots: SlotInfo[]
  city?: { id: string; name: string; slug: string }
  zone?: { id: string; name: string; extraCharge: number }
}

type PaymentRegion = "india" | "international"
type GatewayId = "razorpay" | "stripe" | "paypal" | "cod"

interface GeoInfo {
  region: PaymentRegion
  currency: string
  gateways: GatewayId[]
}

// Extend window for Razorpay SDK
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, handler: () => void) => void
    }
  }
}

// Step indicator data
const STEPS = [
  { label: "Address", number: 1 },
  { label: "Delivery", number: 2 },
  { label: "Review", number: 3 },
]

function generateDates(count: number): { date: Date; label: string; isToday: boolean }[] {
  const dates = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    dates.push({
      date: d,
      label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
      isToday: i === 0,
    })
  }
  return dates
}

// ─── Payment Gateway Display Config ───

const GATEWAY_CONFIG: Record<GatewayId, {
  label: string
  description: string
  icon: typeof CreditCard
}> = {
  razorpay: {
    label: "Pay Online",
    description: "UPI, Cards, Net Banking, Wallets",
    icon: CreditCard,
  },
  stripe: {
    label: "Pay with Card",
    description: "Visa, Mastercard, Amex (USD)",
    icon: CreditCard,
  },
  paypal: {
    label: "PayPal",
    description: "Pay securely with PayPal (USD)",
    icon: Globe,
  },
  cod: {
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
    icon: Wallet,
  },
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const { formatPrice } = useCurrency()
  const items = useCart((s) => s.items)
  const getSubtotal = useCart((s) => s.getSubtotal)
  const clearCart = useCart((s) => s.clearCart)
  const couponCode = useCart((s) => s.couponCode)
  const couponDiscount = useCart((s) => s.couponDiscount)

  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({})

  // Serviceability state
  const [checkingPincode, setCheckingPincode] = useState(false)
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null)
  const [pincodeError, setPincodeError] = useState<string | null>(null)

  // Delivery state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null)
  const availableDates = generateDates(30)

  // Gift / instructions
  const [giftMessage, setGiftMessage] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [giftExpanded, setGiftExpanded] = useState(false)
  const [instructionsExpanded, setInstructionsExpanded] = useState(false)

  // Payment / Geo
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<GatewayId>("razorpay")
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)

  // Order placement
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  // Detect payment region on mount
  useEffect(() => {
    async function detectRegion() {
      try {
        const res = await fetch("/api/geo")
        const json = await res.json()
        if (json.success && json.data) {
          const data = json.data as GeoInfo
          setGeoInfo(data)
          // Auto-select first available gateway
          if (data.gateways.length > 0) {
            setPaymentMethod(data.gateways[0])
          }
        }
      } catch {
        // Fallback to India defaults
        setGeoInfo({ region: "india", currency: "INR", gateways: ["razorpay", "cod"] })
      }
    }
    detectRegion()
  }, [])

  // Check serviceability when pincode reaches 6 digits
  const checkServiceability = useCallback(async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) return
    setCheckingPincode(true)
    setPincodeError(null)
    setServiceability(null)
    try {
      const res = await fetch("/api/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        const data = json.data as ServiceabilityResult
        setServiceability(data)
        if (!data.isServiceable) {
          setPincodeError(data.message || "Not serviceable")
        }
      } else {
        setPincodeError(json.error || "Unable to check serviceability")
      }
    } catch {
      setPincodeError("Network error. Please try again.")
    } finally {
      setCheckingPincode(false)
    }
  }, [])

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-50">
            <ShoppingBag className="h-10 w-10 text-pink-400" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-gray-800">Please sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to be logged in to checkout.
          </p>
          <Link
            href="/login"
            className="btn-gradient mt-6 inline-flex items-center justify-center px-8 py-3 text-sm"
          >
            Login to Continue
          </Link>
        </div>
      </div>
    )
  }

  if (authStatus === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  // Redirect to cart if empty
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-50">
            <ShoppingBag className="h-10 w-10 text-pink-400" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-gray-800">No items to checkout</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your cart is empty. Add some items first.
          </p>
          <Link
            href="/"
            className="btn-gradient mt-6 inline-flex items-center justify-center px-8 py-3 text-sm"
          >
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = getSubtotal()
  const deliveryCharge =
    serviceability?.isServiceable
      ? subtotal >= serviceability.freeDeliveryAbove
        ? 0
        : serviceability.deliveryCharge + (selectedSlot?.charge ?? 0)
      : 0
  const discount = couponDiscount
  const total = subtotal + deliveryCharge - discount

  const updateField = (field: keyof AddressForm, value: string) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    // Auto-check serviceability when pincode is complete
    if (field === "pincode" && /^\d{6}$/.test(value)) {
      checkServiceability(value)
    }
  }

  const validateAddress = (): boolean => {
    const newErrors: Partial<Record<keyof AddressForm, string>> = {}

    if (!addressForm.name.trim()) newErrors.name = "Name is required"
    if (!/^[6-9]\d{9}$/.test(addressForm.phone))
      newErrors.phone = "Valid 10-digit phone required"
    if (!addressForm.address.trim() || addressForm.address.trim().length < 5)
      newErrors.address = "Full address is required"
    if (!addressForm.city.trim()) newErrors.city = "City is required"
    if (!addressForm.state.trim()) newErrors.state = "State is required"
    if (!/^\d{6}$/.test(addressForm.pincode))
      newErrors.pincode = "Valid 6-digit pincode required"

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return false

    if (!serviceability?.isServiceable) {
      setPincodeError("Please enter a serviceable pincode")
      return false
    }

    return true
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateAddress()) return
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!selectedDate || !selectedSlot) return
      setCurrentStep(3)
    }
  }

  // ─── PLACE ORDER + INITIATE PAYMENT ───
  const handlePlaceOrder = async () => {
    if (!session?.user?.id) return

    setPlacing(true)
    setOrderError(null)

    try {
      // Step 1: Create the order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variationId: item.variationId || undefined,
            addons: item.addonSelections.length > 0 ? item.addonSelections : undefined,
          })),
          deliveryDate: selectedDate!.toISOString().split("T")[0],
          deliverySlot: selectedSlot!.slug,
          addressId: "inline",
          address: addressForm,
          giftMessage: giftMessage || undefined,
          specialInstructions: specialInstructions || undefined,
          couponCode: couponCode || undefined,
        }),
      })

      const orderJson = await orderRes.json()
      if (!orderJson.success || !orderJson.data) {
        setOrderError(orderJson.error || "Failed to place order")
        setPlacing(false)
        return
      }

      const orderId = orderJson.data.id
      const orderNumber = orderJson.data.orderNumber

      // Step 2: Create payment based on selected gateway
      const paymentRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, gateway: paymentMethod }),
      })

      const paymentJson = await paymentRes.json()
      if (!paymentJson.success || !paymentJson.data) {
        // Order created but payment initiation failed — redirect to order page
        clearCart()
        router.push(`/orders/${orderId}?payment=error`)
        return
      }

      const paymentData = paymentJson.data

      // Step 3: Handle gateway-specific flow
      if (paymentData.gateway === "cod") {
        // COD — order is confirmed, redirect directly
        clearCart()
        router.push(`/orders/${orderId}?new=true`)
        return
      }

      if (paymentData.gateway === "razorpay") {
        // Open Razorpay checkout modal
        if (!window.Razorpay) {
          setOrderError("Payment gateway is loading. Please try again.")
          setPlacing(false)
          return
        }

        const options = {
          key: paymentData.keyId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          name: "Gifts Cart India",
          description: `Order ${orderNumber}`,
          order_id: paymentData.razorpayOrderId,
          handler: async (response: {
            razorpay_order_id: string
            razorpay_payment_id: string
            razorpay_signature: string
          }) => {
            // Verify payment on server
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId,
                  gateway: "razorpay",
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              })
              const verifyJson = await verifyRes.json()
              clearCart()
              if (verifyJson.success) {
                router.push(`/orders/${orderId}?payment=success&gateway=razorpay`)
              } else {
                router.push(`/orders/${orderId}?payment=failed`)
              }
            } catch {
              clearCart()
              router.push(`/orders/${orderId}?payment=error`)
            }
          },
          prefill: {
            email: (session.user as { email?: string }).email || "",
            contact: addressForm.phone,
          },
          theme: {
            color: "#E91E63",
          },
          modal: {
            ondismiss: () => {
              setPlacing(false)
              // Order exists but payment cancelled — go to order page
              clearCart()
              router.push(`/orders/${orderId}?payment=cancelled`)
            },
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
        return // Don't setPlacing(false) — Razorpay modal handles it
      }

      if (paymentData.gateway === "stripe") {
        // Redirect to Stripe Checkout
        clearCart()
        window.location.href = paymentData.url
        return
      }

      if (paymentData.gateway === "paypal") {
        // Redirect to PayPal approval URL
        clearCart()
        window.location.href = paymentData.approvalUrl
        return
      }
    } catch {
      setOrderError("Network error. Please try again.")
    } finally {
      if (paymentMethod !== "razorpay") {
        setPlacing(false)
      }
    }
  }

  const availableGateways = geoInfo?.gateways || ["razorpay", "cod"]

  return (
    <div className="bg-[#FFF9F5] min-h-screen">
      {/* Load Razorpay SDK if in India */}
      {availableGateways.includes("razorpay") && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => setRazorpayLoaded(true)}
        />
      )}

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/cart"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold sm:text-2xl text-gray-800">Checkout</h1>
          {geoInfo && geoInfo.region === "international" && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-100">
              <Globe className="h-3 w-3" />
              International (USD)
            </span>
          )}
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="card-premium px-4 py-5 sm:px-8">
            <div className="flex items-center justify-between max-w-lg mx-auto">
              {STEPS.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                        step.number < currentStep
                          ? "bg-green-500 text-white"
                          : step.number === currentStep
                          ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {step.number < currentStep ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        step.number === currentStep
                          ? "text-pink-600"
                          : step.number < currentStep
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div className="flex-1 mx-3 mb-6">
                      <div
                        className={`h-0.5 w-full rounded-full ${
                          step.number < currentStep
                            ? "bg-green-400"
                            : "bg-gray-200"
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column -- Forms */}
          <div className="space-y-5 lg:col-span-2">
            {/* ======================== STEP 1: ADDRESS ======================== */}
            {currentStep === 1 && (
              <div className="card-premium overflow-hidden">
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-50">
                    <MapPin className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">Delivery Address</h2>
                    <p className="text-xs text-muted-foreground">Where should we deliver your order?</p>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-gray-600">
                        Recipient Name <span className="text-pink-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Full name"
                        value={addressForm.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className="rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                      />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-medium text-gray-600">
                        Phone Number <span className="text-pink-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        value={addressForm.phone}
                        onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
                        className="rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                      />
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="address" className="text-xs font-medium text-gray-600">
                        Address <span className="text-pink-500">*</span>
                      </Label>
                      <Input
                        id="address"
                        placeholder="House/Flat no., Street, Area"
                        value={addressForm.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        className="rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                      />
                      {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="landmark" className="text-xs font-medium text-gray-600">
                        Landmark <span className="text-gray-400">(optional)</span>
                      </Label>
                      <Input
                        id="landmark"
                        placeholder="Near temple, opposite mall, etc."
                        value={addressForm.landmark}
                        onChange={(e) => updateField("landmark", e.target.value)}
                        className="rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pincode" className="text-xs font-medium text-gray-600">
                        Pincode <span className="text-pink-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="pincode"
                          placeholder="6-digit pincode"
                          maxLength={6}
                          value={addressForm.pincode}
                          onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, ""))}
                          className={`rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200 pr-10 ${
                            serviceability?.isServiceable ? "border-green-300" : ""
                          } ${pincodeError ? "border-red-300" : ""}`}
                        />
                        {checkingPincode && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {serviceability?.isServiceable && !checkingPincode && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                      </div>
                      {errors.pincode && <p className="text-xs text-destructive">{errors.pincode}</p>}

                      {/* Serviceability result */}
                      {pincodeError && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {pincodeError}
                        </div>
                      )}
                      {serviceability?.isServiceable && (
                        <div className="mt-2 rounded-lg bg-green-50 border border-green-100 p-3 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                            <Truck className="h-3.5 w-3.5" />
                            Delivery available
                            {serviceability.city && ` in ${serviceability.city.name}`}
                          </div>
                          <p className="text-xs text-green-600">
                            Base delivery: {formatPrice(serviceability.deliveryCharge)}
                            {serviceability.freeDeliveryAbove > 0 && (
                              <> (Free above {formatPrice(serviceability.freeDeliveryAbove)})</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs font-medium text-gray-600">
                        City <span className="text-pink-500">*</span>
                      </Label>
                      <Input
                        id="city"
                        placeholder="City"
                        value={addressForm.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        className="rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                      />
                      {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="state" className="text-xs font-medium text-gray-600">
                        State <span className="text-pink-500">*</span>
                      </Label>
                      <Input
                        id="state"
                        placeholder="State"
                        value={addressForm.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        className="rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                      />
                      {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleNextStep}
                      className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8"
                      disabled={!serviceability?.isServiceable}
                    >
                      Continue to Delivery
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================== STEP 2: DELIVERY SLOT ======================== */}
            {currentStep === 2 && (
              <div className="space-y-5">
                {/* Date Selection */}
                <div className="card-premium overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-amber-50">
                      <Calendar className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-800">Select Delivery Date</h2>
                      <p className="text-xs text-muted-foreground">Choose when you want the delivery</p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                      {availableDates.slice(0, 14).map((d) => {
                        const isSelected =
                          selectedDate?.toDateString() === d.date.toDateString()
                        return (
                          <button
                            key={d.date.toISOString()}
                            onClick={() => setSelectedDate(d.date)}
                            className={`flex flex-col items-center px-4 py-3 rounded-xl border-2 min-w-[80px] transition-all ${
                              isSelected
                                ? "border-pink-400 bg-pink-50/50 shadow-sm"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">
                              {d.isToday ? "Today" : d.date.toLocaleDateString("en-IN", { weekday: "short" })}
                            </span>
                            <span className={`text-lg font-bold mt-0.5 ${isSelected ? "text-pink-600" : "text-gray-800"}`}>
                              {d.date.getDate()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {d.date.toLocaleDateString("en-IN", { month: "short" })}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Slot Selection */}
                {selectedDate && (
                  <div className="card-premium overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50">
                        <Clock className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-800">Select Delivery Slot</h2>
                        <p className="text-xs text-muted-foreground">
                          Available slots for {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      {serviceability?.availableSlots && serviceability.availableSlots.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {serviceability.availableSlots.map((slot) => {
                            const isSelected = selectedSlot?.id === slot.id
                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                                  isSelected
                                    ? "border-pink-400 bg-pink-50/50 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                              >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                                  isSelected ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white" : "bg-gray-100 text-gray-500"
                                }`}>
                                  <Clock className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-800">{slot.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {slot.startTime} - {slot.endTime}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {slot.charge > 0 ? (
                                    <span className="text-sm font-medium text-gray-700">
                                      +{formatPrice(slot.charge)}
                                    </span>
                                  ) : (
                                    <span className="text-sm font-medium text-green-600">FREE</span>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No delivery slots available for this date.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Gift Message - Expandable */}
                <div className="card-premium overflow-hidden">
                  <button
                    onClick={() => setGiftExpanded(!giftExpanded)}
                    className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-50 to-pink-50">
                        <Gift className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Gift Message</p>
                        <p className="text-xs text-muted-foreground">Add a personal touch to your gift</p>
                      </div>
                    </div>
                    {giftExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {giftExpanded && (
                    <div className="border-t border-gray-100 p-4 sm:p-5">
                      <textarea
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:border-pink-300 min-h-[100px] resize-y"
                        placeholder="Write a heartfelt message for the recipient..."
                        maxLength={500}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                      />
                      <p className="mt-1.5 text-right text-xs text-muted-foreground">{giftMessage.length}/500</p>
                    </div>
                  )}
                </div>

                {/* Special Instructions - Expandable */}
                <div className="card-premium overflow-hidden">
                  <button
                    onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                    className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Special Instructions</p>
                        <p className="text-xs text-muted-foreground">Any special delivery requests?</p>
                      </div>
                    </div>
                    {instructionsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {instructionsExpanded && (
                    <div className="border-t border-gray-100 p-4 sm:p-5">
                      <textarea
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:border-pink-300 min-h-[100px] resize-y"
                        placeholder="E.g., call before delivery, don't ring the bell..."
                        maxLength={500}
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                      />
                      <p className="mt-1.5 text-right text-xs text-muted-foreground">{specialInstructions.length}/500</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="px-6"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8"
                    disabled={!selectedDate || !selectedSlot}
                  >
                    Review Order
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ======================== STEP 3: REVIEW & PLACE ORDER ======================== */}
            {currentStep === 3 && (
              <div className="space-y-5">
                {/* Address Summary */}
                <div className="card-premium overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-50">
                        <MapPin className="h-5 w-5 text-pink-500" />
                      </div>
                      <h2 className="font-semibold text-gray-800">Delivery Address</h2>
                    </div>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-medium text-pink-500 hover:text-pink-600"
                    >
                      Change
                    </button>
                  </div>
                  <div className="p-5 sm:p-6 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">{addressForm.name}</p>
                    <p>{addressForm.address}</p>
                    {addressForm.landmark && <p>{addressForm.landmark}</p>}
                    <p>{addressForm.city}, {addressForm.state} - {addressForm.pincode}</p>
                    <p className="mt-1 text-muted-foreground">Phone: {addressForm.phone}</p>
                  </div>
                </div>

                {/* Delivery Summary */}
                <div className="card-premium overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-amber-50">
                        <Calendar className="h-5 w-5 text-orange-500" />
                      </div>
                      <h2 className="font-semibold text-gray-800">Delivery Schedule</h2>
                    </div>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-medium text-pink-500 hover:text-pink-600"
                    >
                      Change
                    </button>
                  </div>
                  <div className="p-5 sm:p-6 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">
                      {selectedDate?.toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-1">
                      {selectedSlot?.name} ({selectedSlot?.startTime} - {selectedSlot?.endTime})
                      {selectedSlot && selectedSlot.charge > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          (+{formatPrice(selectedSlot.charge)})
                        </span>
                      )}
                    </p>
                    {giftMessage && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Gift Message:</p>
                        <p className="text-xs text-gray-600 italic">&ldquo;{giftMessage}&rdquo;</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method — Dynamic based on Geo */}
                <div className="card-premium overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50">
                      <CreditCard className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-800">Payment Method</h2>
                      <p className="text-xs text-muted-foreground">
                        {geoInfo?.region === "international"
                          ? "International payment options (USD)"
                          : "Choose how you want to pay"}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableGateways.map((gatewayId) => {
                        const config = GATEWAY_CONFIG[gatewayId]
                        if (!config) return null
                        const isSelected = paymentMethod === gatewayId
                        const IconComponent = config.icon

                        return (
                          <button
                            key={gatewayId}
                            className={`group flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                              isSelected
                                ? "border-pink-400 bg-pink-50/50 shadow-sm shadow-pink-100"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                            }`}
                            onClick={() => setPaymentMethod(gatewayId)}
                          >
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                              isSelected
                                ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{config.label}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
                            </div>
                            {isSelected && (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Error display */}
                {orderError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">{orderError}</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="px-6"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column -- Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Mini cart items */}
              <div className="card-premium p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">
                    Order Items ({items.length})
                  </h3>
                  <Link
                    href="/cart"
                    className="text-xs font-medium text-pink-500 hover:text-pink-600 transition-colors"
                  >
                    Edit Cart
                  </Link>
                </div>

                <div className="space-y-3">
                  {items.map((item) => {
                    const unitPrice = Number(item.price)
                    const addonTotal = item.addonSelections.reduce((s, a) => s + (a.totalAddonPrice ?? a.addonPrice ?? 0), 0)
                    return (
                      <div key={item.id || item.productId} className="flex gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50 border border-gray-100">
                          <Image
                            src={item.image || item.product?.images?.[0] || "/placeholder-product.svg"}
                            alt={item.productName || item.product?.name || "Product"}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                        <div className="flex flex-1 justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight line-clamp-1 text-gray-800">
                              {item.productName || item.product?.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Qty: {item.quantity}
                              {addonTotal > 0 && ` + Add-ons ${formatPrice(addonTotal)}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold shrink-0 text-gray-800">
                            {formatPrice((unitPrice + addonTotal) * item.quantity)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="card-premium p-4 sm:p-5 space-y-3">
                <h3 className="font-semibold text-gray-800">Order Summary</h3>
                <div className="h-px bg-gray-100" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    {deliveryCharge === 0 ? (
                      <span className="text-green-600 font-medium">FREE</span>
                    ) : (
                      <span>{formatPrice(deliveryCharge)}</span>
                    )}
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                {currentStep === 3 && (
                  <Button
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={placing || (paymentMethod === "razorpay" && !razorpayLoaded)}
                  >
                    {placing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : paymentMethod === "cod" ? (
                      <>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Place Order - {formatPrice(total)}
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay {formatPrice(total)}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
