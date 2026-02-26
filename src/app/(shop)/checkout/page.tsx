"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Check, ChevronDown, ChevronUp, Loader2, Pencil, Plus } from "lucide-react"

import { SenderDetailsStep } from "@/components/checkout/sender-details-step"
import type { SenderDetails } from "@/components/checkout/sender-details-step"
import { IndiaPhoneInput } from "@/components/ui/india-phone-input"
import { useCart } from "@/hooks/use-cart"
import { useCity } from "@/hooks/use-city"
import { useCurrency } from "@/hooks/use-currency"
import { useReferral } from "@/components/providers/referral-provider"
import { AreaSearchInput } from "@/components/layout/area-search-input"
// delivery-slot-picker import removed — delivery is now read-only from cart

// ─── Slot API Response Types ───

interface SurchargeItem {
  name: string
  amount: number
}

type StepNumber = 1 | 2 | 3

// ─── Step Definitions ───

const STEPS: { number: StepNumber; label: string; emoji: string }[] = [
  { number: 1, label: "Address & Details", emoji: "\uD83D\uDCCD" },
  { number: 2, label: "Delivery Review", emoji: "\uD83D\uDCC5" },
  { number: 3, label: "Payment", emoji: "\uD83D\uDCB3" },
]

// ─── Indian States & UTs ───

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
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

// ─── Radio Indicator ───

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 ${
      selected ? 'border-pink-600' : 'border-gray-300'
    }`}>
      {selected && <div className="h-2.5 w-2.5 rounded-full bg-pink-600" />}
    </div>
  )
}

// ─── Component ───

export default function CheckoutPage() {
  const router = useRouter()
  const { user, status } = useAuth()
  const { formatPrice } = useCurrency()
  const { cityName, pincode: contextPincode, areaName } = useCity()
  const { clearReferral } = useReferral()
  const items = useCart((s) => s.items)
  const getSubtotal = useCart((s) => s.getSubtotal)
  const clearCart = useCart((s) => s.clearCart)


  const [currentStep, setCurrentStep] = useState<StepNumber>(1)
  const [guestConfirmed, setGuestConfirmed] = useState(false)

  // Track whether pincode field is in locked (pre-filled) or edit mode
  const [pincodeEditMode, setPincodeEditMode] = useState(!contextPincode)

  // ─── Step 1 State ───

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)

  const [formData, setFormData] = useState({
    // Step 1 — Sender details
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    occasion: "",

    // Step 1 — Recipient / address
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
    extraDeliveryCharge: 0,   // vendor-pincode area surcharge
    surchargeAmount: 0,       // date-based festival surcharge
    surchargeItems: [] as SurchargeItem[],  // individual platform surcharges for breakdown display
    giftMessage: "",
    specialInstructions: "",

    // Step 3
    paymentMethod: null as "upi" | "card" | "netbanking" | "cod" | null,
    couponCode: "",
    couponDiscount: 0,
    couponApplied: false,
  })

  // (Step 2 is now read-only delivery summary — no slot picker state needed)

  // Step 3 extra state
  const [codFee, setCodFee] = useState(0)
  const [couponExpanded, setCouponExpanded] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [placingOrder, setPlacingOrder] = useState(false)
  const [paymentStep, setPaymentStep] = useState<string | null>(null)
  const [orderError, setOrderError] = useState("")

  // Order created in step 2→3 transition (stored for step 3 payment)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null)
  const [creatingOrder, setCreatingOrder] = useState(false)

  // Geo-based payment gateway
  const [gateway, setGateway] = useState<'razorpay' | 'stripe' | null>(null)
  const [usdRate, setUsdRate] = useState(84)

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // ─── Load Razorpay Checkout Script ───

  useEffect(() => {
    if (typeof window === "undefined") return
    if (document.getElementById("razorpay-checkout-js")) {
      setRazorpayLoaded(true)
      return
    }
    const script = document.createElement("script")
    script.id = "razorpay-checkout-js"
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => setRazorpayLoaded(true)
    document.body.appendChild(script)
  }, [])

  // ─── Detect payment gateway based on geo-location ───

  useEffect(() => {
    fetch('/api/location/country')
      .then((res) => res.json())
      .then((data) => {
        setGateway(data.gateway === 'razorpay' ? 'razorpay' : 'stripe')
        if (data.usdRate) setUsdRate(data.usdRate)
      })
      .catch(() => {
        // Default to razorpay (India) on error
        setGateway('razorpay')
      })
  }, [])

  // ─── Initialize delivery date from cart ───

  useEffect(() => {
    if (items.length > 0 && items[0].deliveryDate && !formData.deliveryDate) {
      setFormData((prev) => ({ ...prev, deliveryDate: items[0].deliveryDate }))
    }
  }, [items, formData.deliveryDate])

  // ─── Fetch Saved Addresses ───

  useEffect(() => {
    if (!user?.id) return

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
            // Fetch area surcharge for default address pincode
            if (defaultAddr.pincode) {
              checkPincode(defaultAddr.pincode)
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setAddressesLoading(false))
  }, [user?.id])

  // ─── Pre-fill city + pincode + area from context ───

  useEffect(() => {
    setFormData((prev) => {
      // Don't overwrite if user already has a saved address selected
      if (prev.selectedAddressId) return prev
      return {
        ...prev,
        city: cityName ?? prev.city,
        pincode: contextPincode ?? prev.pincode,
        landmark: (areaName && !prev.landmark) ? areaName : prev.landmark,
      }
    })
  }, [cityName, contextPincode, areaName])

  // ─── Run serviceability check on mount if pincode available ───

  useEffect(() => {
    if (contextPincode && contextPincode.length === 6) {
      checkPincode(contextPincode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally only on mount

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
        const extra = Number(data.data.extraDeliveryCharge) || 0
        setFormData((prev) => ({ ...prev, pincodeStatus: "valid", extraDeliveryCharge: extra }))
        setFormErrors((prev) => {
          const next = { ...prev }
          delete next.pincode
          return next
        })
      } else {
        setFormData((prev) => ({ ...prev, pincodeStatus: "invalid", extraDeliveryCharge: 0 }))
      }
    } catch {
      setFormData((prev) => ({ ...prev, pincodeStatus: "invalid" }))
    }
  }, [])

  // ─── Edit Pincode (switch from locked to editable) ───

  function handleEditPincode() {
    setPincodeEditMode(true)
    setFormData((prev) => ({ ...prev, pincodeStatus: "idle", pincode: "", extraDeliveryCharge: 0 }))
  }

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
    // Fetch area surcharge for the saved address pincode
    const addr = savedAddresses.find((a) => a.id === addressId)
    if (addr?.pincode) {
      checkPincode(addr.pincode)
    }
  }, [savedAddresses, checkPincode])

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
    const errors: Record<string, string> = {}

    // Sender validation (always required)
    if (!formData.senderName.trim()) {
      errors.senderName = "Please enter your name"
    }
    if (!formData.senderPhone || formData.senderPhone === '+91') {
      errors.senderPhone = "Please enter your phone number"
    } else if (!/^\+[1-9]\d{6,14}$/.test(formData.senderPhone)) {
      errors.senderPhone = "Enter a valid phone number with country code"
    }
    if (!formData.senderEmail.trim()) {
      errors.senderEmail = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.senderEmail)) {
      errors.senderEmail = "Enter a valid email address"
    }

    // If a saved address is selected, skip address field validation
    if (formData.selectedAddressId) {
      setFormErrors(errors)
      return Object.keys(errors).length === 0
    }

    if (!formData.recipientName.trim()) {
      errors.recipientName = "Recipient name is required"
    }
    if (!formData.recipientPhone.trim() || formData.recipientPhone === '+91') {
      errors.recipientPhone = "Mobile number is required"
    } else if (!/^\+91[6-9]\d{9}$/.test(formData.recipientPhone.trim())) {
      errors.recipientPhone = "Enter a valid 10-digit Indian mobile number"
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

  const handleContinueStep2 = useCallback(async () => {
    // Validate that all cart items have delivery info
    if (items.some(i => !i.deliveryDate || !i.deliverySlot)) return

    // Use first item's delivery date for order-level delivery date
    const deliveryDateForOrder = items[0]?.deliveryDate ?? formData.deliveryDate
    const deliverySlotForOrder = items[0]?.deliverySlot ?? formData.deliverySlot

    // If order was already created (user went back and returned), skip creation
    if (createdOrderId) {
      goToStep(3)
      return
    }

    setCreatingOrder(true)
    setOrderError("")

    try {
      const t0 = Date.now()

      const isNewAddress = !formData.selectedAddressId
      const isGuestCheckout = !user

      const orderBody: Record<string, unknown> = {
        items: items.map((item) => ({
          productId: item.productId,
          variationId: item.variationId || undefined,
          quantity: item.quantity,
          addons: item.addonSelections?.length > 0 ? item.addonSelections : undefined,
        })),
        addressId: isNewAddress ? "__CREATE__" : formData.selectedAddressId,
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
        deliveryDate: deliveryDateForOrder,
        deliverySlot: deliverySlotForOrder || formData.deliverySlotSlug || formData.deliverySlot,
        senderName: formData.senderName || undefined,
        senderPhone: formData.senderPhone || undefined,
        senderEmail: formData.senderEmail || undefined,
        occasion: formData.occasion || undefined,
        giftMessage: formData.giftMessage || undefined,
        specialInstructions: formData.specialInstructions || undefined,
        couponCode: formData.couponApplied ? formData.couponCode.trim().toUpperCase() : undefined,
        guestEmail: isGuestCheckout && formData.senderEmail ? formData.senderEmail : undefined,
        guestPhone: isGuestCheckout && formData.senderPhone ? formData.senderPhone : undefined,
      }

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
      })

      const orderData = await orderRes.json()
      console.log(`[checkout] step2_to_step3_order_create: ${Date.now() - t0}ms`)

      if (!orderData.success || !orderData.data?.id) {
        setOrderError(orderData.error || "Failed to create order. Please try again.")
        setCreatingOrder(false)
        return
      }

      setCreatedOrderId(orderData.data.id)
      setCreatedOrderNumber(orderData.data.orderNumber)
      setCreatingOrder(false)
      goToStep(3)
    } catch {
      setOrderError("Something went wrong creating your order. Please try again.")
      setCreatingOrder(false)
    }
  }, [formData, items, createdOrderId, goToStep, user])

  // Formatted date for display - use first cart item's delivery date
  const effectiveDeliveryDate = items[0]?.deliveryDate ?? formData.deliveryDate

  const getFormattedDate = useCallback(() => {
    if (!effectiveDeliveryDate) return ""
    const d = new Date(effectiveDeliveryDate + "T00:00:00")
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
  }, [effectiveDeliveryDate])

  // ─── Step 3 Helpers ───

  const handlePaymentMethodChange = useCallback((method: "upi" | "card" | "netbanking" | "cod") => {
    setFormData((prev) => ({ ...prev, paymentMethod: method }))
    setCodFee(method === "cod" ? 50 : 0)
  }, [])

  // ─── Open Razorpay Checkout Popup ───

  const openRazorpayCheckout = useCallback((
    razorpayOrderId: string,
    amountPaise: number,
    currency: string,
    keyId: string,
    orderId: string,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Razorpay = (window as any).Razorpay
    if (!Razorpay) {
      setOrderError("Payment gateway failed to load. Please refresh and try again.")
      setPlacingOrder(false)
      return
    }

    if (!keyId) {
      setOrderError("Payment gateway is not configured. Please contact support.")
      setPlacingOrder(false)
      return
    }

    const options = {
      key: keyId,
      amount: amountPaise,
      currency,
      name: "Gifts Cart India",
      description: `Order Payment`.substring(0, 255),
      order_id: razorpayOrderId,
      prefill: {
        name: String(formData.senderName || formData.recipientName || ""),
        email: String(formData.senderEmail || ""),
        contact: String(formData.senderPhone || formData.recipientPhone || ""),
      },
      notes: {
        order_id: String(orderId),
      },
      theme: { color: "#ec4899" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async (response: any) => {
        // Payment succeeded on Razorpay's end — verify on our server
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
          const verifyData = await verifyRes.json()

          if (verifyData.success) {
            clearReferral()
            clearCart()
            router.push(`/orders/${orderId}/confirmation`)
          } else {
            setOrderError(verifyData.error || "Payment verification failed. Contact support if amount was debited.")
          }
        } catch {
          setOrderError("Payment verification failed. If your amount was debited, please contact support.")
        } finally {
          setPlacingOrder(false)
        }
      },
      modal: {
        ondismiss: () => {
          setPlacingOrder(false)
          setOrderError("Payment was cancelled. Your order has been saved — you can retry payment.")
        },
      },
    }

    const rzp = new Razorpay(options)
    rzp.on("payment.failed", () => {
      setPlacingOrder(false)
      setOrderError("Payment failed. Please try again or choose a different payment method.")
    })
    rzp.open()
  }, [formData, clearReferral, clearCart, router])

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
    // Order must already exist from step 2→3 transition
    if (!createdOrderId) {
      setOrderError("Order not found. Please go back and try again.")
      return
    }

    // Validate payment method selection
    if (!formData.paymentMethod) {
      setOrderError("Please select a payment method")
      return
    }
    if (formData.paymentMethod !== "cod" && gateway === 'razorpay' && !razorpayLoaded) {
      setOrderError("Payment gateway is still loading. Please wait a moment and try again.")
      return
    }

    setPlacingOrder(true)
    setOrderError("")
    setPaymentStep("Initializing payment...")

    try {
      const t0 = Date.now()
      const paymentGateway = formData.paymentMethod === "cod" ? "cod" : (gateway || "razorpay")

      const paymentRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: createdOrderId, gateway: paymentGateway }),
      })

      const paymentData = await paymentRes.json()
      console.log(`[checkout] payment_create: ${Date.now() - t0}ms`)
      console.log(`[checkout] total_before_popup: ${Date.now() - t0}ms`)

      if (!paymentData.success) {
        setOrderError(paymentData.error || "Failed to initiate payment. Please try again.")
        setPlacingOrder(false)
        setPaymentStep(null)
        return
      }

      setPaymentStep(null)

      // Handle COD
      if (paymentGateway === "cod") {
        clearReferral()
        clearCart()
        router.push(`/orders/${createdOrderId}/confirmation`)
        return
      }

      // Handle Razorpay
      if (paymentGateway === "razorpay") {
        const { razorpayOrderId, amount, currency, keyId } = paymentData.data
        openRazorpayCheckout(razorpayOrderId, amount, currency, keyId, createdOrderId)
        return
      }

      // Handle Stripe (placeholder — redirect)
      if (paymentGateway === "stripe" && paymentData.data?.url) {
        window.location.href = paymentData.data.url
        return
      }

      setOrderError("Unsupported payment gateway.")
      setPlacingOrder(false)
      setPaymentStep(null)
    } catch {
      setOrderError("Something went wrong. Please try again.")
      setPlacingOrder(false)
      setPaymentStep(null)
    }
  }, [createdOrderId, formData.paymentMethod, gateway, razorpayLoaded, clearReferral, clearCart, router, openRazorpayCheckout])

  // ─── Derived Values ───

  const subtotal = getSubtotal()
  // Delivery charge = sum of per-item delivery charges from cart
  const deliveryCharge = items.reduce((sum, item) => sum + (item.deliveryCharge || 0), 0) || formData.slotCharge
  const areaSurcharge = formData.extraDeliveryCharge
  const festivalSurcharge = formData.surchargeAmount
  const total = subtotal + deliveryCharge + areaSurcharge + festivalSurcharge + codFee - formData.couponDiscount

  const isNewAddressFormVisible =
    formData.showNewAddressForm || savedAddresses.length === 0

  const isSenderIncomplete =
    !formData.senderName.trim() ||
    !formData.senderPhone.trim() ||
    formData.senderPhone === '+91' ||
    !formData.senderEmail.trim()

  const isAddressIncomplete =
    !formData.selectedAddressId &&
    (!formData.recipientName.trim() ||
      !formData.recipientPhone.trim() ||
      formData.recipientPhone === '+91' ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim() ||
      formData.pincodeStatus === "invalid" ||
      formData.pincodeStatus === "checking")

  const isContinueDisabled = isSenderIncomplete || isAddressIncomplete

  // ─── Auth Gate ───

  const cartItems = items
  const cartTotal = subtotal

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
      </div>
    )
  }

  if (status === 'unauthenticated' && !guestConfirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">

          {/* Cart summary — show what they're buying */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h1 className="text-lg font-semibold text-gray-900 mb-1">
              Ready to checkout?
            </h1>
            <p className="text-sm text-gray-500">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} · ₹{cartTotal}
            </p>
          </div>

          {/* Login option */}
          <div className="space-y-3">
            <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-1">
                Sign in or create account
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Track orders, save addresses, faster checkout next time
              </p>
              <button
                onClick={() => router.push(
                  `/login?callbackUrl=${encodeURIComponent('/checkout')}`
                )}
                className="w-full py-2.5 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
              >
                Sign in with Email OTP
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Guest option */}
            <button
              onClick={() => setGuestConfirmed(true)}
              className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Continue as Guest
            </button>
            <p className="text-center text-xs text-gray-400">
              No account needed — enter your details at checkout
            </p>
          </div>

        </div>
      </div>
    )
  }

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
                {/* ── Sender Details ── */}
                <div className="mb-6">
                  <SenderDetailsStep
                    value={{
                      senderName: formData.senderName,
                      senderPhone: formData.senderPhone,
                      senderEmail: formData.senderEmail,
                      occasion: formData.occasion,
                      giftMessage: formData.giftMessage,
                    }}
                    onChange={(details: SenderDetails) =>
                      setFormData((prev) => ({
                        ...prev,
                        senderName: details.senderName,
                        senderPhone: details.senderPhone,
                        senderEmail: details.senderEmail,
                        occasion: details.occasion,
                        giftMessage: details.giftMessage,
                      }))
                    }
                    onContinue={() => {}}
                    onBack={() => router.push("/cart")}
                    hideButtons
                  />
                </div>

                <h2 className="text-lg font-semibold mb-4">
                  Recipient Details
                </h2>

                {/* ── Saved Addresses Section ── */}
                {user && (
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
                        <IndiaPhoneInput
                          label="Recipient's Mobile Number"
                          value={formData.recipientPhone}
                          onChange={(v) => updateField("recipientPhone", v)}
                          required
                          error={formErrors.recipientPhone}
                        />
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
                        <select
                          value={formData.state}
                          onChange={(e) =>
                            updateField("state", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none bg-white"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {formErrors.state && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.state}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Area / Landmark — Google Places autocomplete */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Area / Landmark
                      </label>
                      <AreaSearchInput
                        cityName={cityName || 'India'}
                        onAreaSelect={(area) => {
                          setFormData(prev => ({
                            ...prev,
                            pincode: area.pincode ?? prev.pincode,
                            landmark: area.displayName,
                          }))
                          // Auto-check serviceability when pincode is filled
                          if (area.pincode && /^\d{6}$/.test(area.pincode)) {
                            checkPincode(area.pincode)
                          }
                        }}
                        placeholder="Search area or landmark"
                        defaultValue={formData.landmark}
                      />
                    </div>

                    {/* Row 3: Pincode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {!pincodeEditMode && contextPincode ? (
                        /* Locked confirmed state — pre-filled from city context */
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">
                            Pincode <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center justify-between px-3 py-2.5 border border-green-300 bg-green-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {contextPincode}
                              </p>
                              <p className="text-xs text-green-600 mt-0.5">
                                {areaName ?? cityName}
                                {formData.pincodeStatus === 'valid' ? ' \u00B7 Delivery available' : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleEditPincode}
                              className="p-1.5 hover:bg-green-100 rounded-md transition-colors"
                              aria-label="Edit pincode"
                            >
                              <Pencil className="h-3.5 w-3.5 text-green-600" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Editable input — normal pincode field */
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
                      )}
                    </div>

                    {/* Save address checkbox */}
                    {user && (
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

            {/* ═══════════════════════ STEP 2 — DELIVERY REVIEW (READ-ONLY) ═══════════════════════ */}
            {currentStep === 2 && (
              <div>
                {/* Back link */}
                <button
                  onClick={goBack}
                  className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
                >
                  &larr; Back
                </button>

                <h1 className="text-xl font-semibold mb-6">Delivery Review</h1>

                {/* Express order banner */}
                {items.length > 0 && items.every(i => i.deliverySlot === 'express') && (
                  <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 mb-6 flex items-center gap-3">
                    <span className="text-lg">&#x26A1;</span>
                    <span className="text-sm font-semibold text-gray-800">Express Order &mdash; Delivered within 3 hours</span>
                  </div>
                )}

                {/* Delivery summary per cart item */}
                <div className="space-y-3 mb-6">
                  {items.map((item) => {
                    const hasMissingDelivery = !item.deliveryDate || !item.deliverySlot

                    if (hasMissingDelivery) {
                      return (
                        <div key={item.id} className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4">
                          <p className="text-sm font-medium text-yellow-800">
                            &#x26A0;&#xFE0F; Delivery details missing for {item.productName}
                          </p>
                          <Link
                            href={`/product/${item.productSlug}`}
                            className="text-sm text-pink-600 hover:text-pink-700 font-medium mt-1 inline-block"
                          >
                            &larr; Go back and select delivery date
                          </Link>
                        </div>
                      )
                    }

                    const deliveryDate = new Date(item.deliveryDate + 'T00:00:00')
                    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
                    const todayStr = `${nowIST.getUTCFullYear()}-${String(nowIST.getUTCMonth() + 1).padStart(2, '0')}-${String(nowIST.getUTCDate()).padStart(2, '0')}`
                    const tomorrowDate = new Date(nowIST)
                    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
                    const tomorrowStr = `${tomorrowDate.getUTCFullYear()}-${String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getUTCDate()).padStart(2, '0')}`

                    let dateLabel: string
                    if (item.deliveryDate === todayStr) {
                      dateLabel = `Today, ${deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                    } else if (item.deliveryDate === tomorrowStr) {
                      dateLabel = `Tomorrow, ${deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                    } else {
                      dateLabel = deliveryDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
                    }

                    const slotName = item.deliveryWindow || item.deliverySlot || ''
                    const chargeLabel = item.deliveryCharge === 0 ? 'FREE' : `+\u20B9${item.deliveryCharge}`

                    return (
                      <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              &#x1F4E6; {item.productName}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {dateLabel} &middot; {slotName} &middot; <span className={item.deliveryCharge === 0 ? 'text-green-600 font-medium' : 'text-gray-600'}>{chargeLabel}</span>
                            </p>
                          </div>
                          <Link
                            href={`/product/${item.productSlug}`}
                            className="text-sm text-pink-600 hover:text-pink-700 font-medium shrink-0 ml-3"
                          >
                            Change &rarr;
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Gift Message */}
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

                {/* Special Instructions */}
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

                {/* Order creation error */}
                {orderError && !creatingOrder && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-800">{orderError}</p>
                  </div>
                )}

                {/* Continue Button — disabled if any item is missing delivery info */}
                <button
                  onClick={handleContinueStep2}
                  disabled={items.some(i => !i.deliveryDate || !i.deliverySlot) || creatingOrder}
                  className="w-full mt-6 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl text-base font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {creatingOrder ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Preparing your order...
                    </>
                  ) : (
                    "Continue to Payment \u2192"
                  )}
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
                  {/* Order number */}
                  {createdOrderNumber && (
                    <p className="text-xs text-gray-500 mb-2">
                      Order #{createdOrderNumber}
                    </p>
                  )}
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
                  {/* Date/slot row — from cart items */}
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-gray-700">
                      {"\uD83D\uDCC5"} {getFormattedDate()} | {items[0]?.deliveryWindow || items[0]?.deliverySlot || formData.deliverySlotName || formData.deliverySlot}
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

                {/* 2. Payment Method — geo-aware */}
                <h2 className="font-semibold mb-3">Choose Payment Method</h2>

                {gateway === null ? (
                  /* Loading gateway detection */
                  <div className="space-y-2">
                    <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                    <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                  </div>
                ) : gateway === 'razorpay' ? (
                  /* India — Razorpay + COD */
                  <div className="space-y-2">
                    {/* Online Payment (Razorpay) */}
                    <div
                      onClick={() => handlePaymentMethodChange("upi")}
                      className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        formData.paymentMethod && formData.paymentMethod !== "cod"
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioDot selected={!!(formData.paymentMethod && formData.paymentMethod !== "cod")} />
                        <div>
                          <p className="font-medium">Pay Online</p>
                          <span className="text-xs text-gray-500">UPI, Credit/Debit Card, Net Banking, Wallets</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                        Secure
                      </div>
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
                          <RadioDot selected={formData.paymentMethod === "cod"} />
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Cash on Delivery</p>
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
                ) : (
                  /* International — Stripe placeholder */
                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-gray-200 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <RadioDot selected={true} />
                        <div>
                          <p className="font-medium">Pay with Card</p>
                          <span className="text-xs text-gray-500">
                            {formatPrice(total)} (~${Math.round(total / usdRate)} USD)
                          </span>
                        </div>
                      </div>
                      <button
                        disabled
                        className="w-full py-3 bg-gray-300 text-gray-500 rounded-xl text-sm font-semibold cursor-not-allowed"
                      >
                        Pay ${Math.round(total / usdRate)} USD with Card
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        International payments coming soon. Please contact us at{" "}
                        <a href="mailto:support@giftscart.in" className="text-pink-500 underline">
                          support@giftscart.in
                        </a>{" "}
                        to place your order.
                      </p>
                    </div>
                  </div>
                )}

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
                    <span className="text-gray-600">
                      Delivery
                      {formData.deliverySlotName && <span className="text-xs text-gray-400 ml-1">({formData.deliverySlotName})</span>}
                    </span>
                    <span>{deliveryCharge === 0 ? <span className="text-green-600">Free</span> : formatPrice(deliveryCharge)}</span>
                  </div>
                  {areaSurcharge > 0 && (
                    <div className="flex justify-between text-sm text-amber-700">
                      <span>Area Surcharge</span>
                      <span>+{formatPrice(areaSurcharge)}</span>
                    </div>
                  )}
                  {formData.surchargeItems.length > 1 ? (
                    formData.surchargeItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-amber-700">
                        <span>{item.name}</span>
                        <span>+{formatPrice(item.amount)}</span>
                      </div>
                    ))
                  ) : festivalSurcharge > 0 ? (
                    <div className="flex justify-between text-sm text-amber-700">
                      <span>Festival/Area Surcharge</span>
                      <span>+{formatPrice(festivalSurcharge)}</span>
                    </div>
                  ) : null}
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
                    <span>
                      {formatPrice(total)}
                      {gateway === 'stripe' && (
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          (~${Math.round(total / usdRate)} USD)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Order error */}
                {orderError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-800">{orderError}</p>
                  </div>
                )}

                {/* 5. Place Order */}
                {gateway === 'stripe' ? (
                  /* International — disabled placeholder */
                  null
                ) : (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!formData.paymentMethod || placingOrder || gateway === null}
                    className="w-full mt-6 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl text-base font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {placingOrder ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {formData.paymentMethod === "cod" ? "Placing Order..." : "Processing Payment..."}
                      </>
                    ) : formData.paymentMethod === "cod" ? (
                      `Place Order (COD) \u2192`
                    ) : formData.paymentMethod ? (
                      `Pay ${formatPrice(total)} \u2192`
                    ) : (
                      "Place Order \u2192"
                    )}
                  </button>
                )}

                {/* Payment progress step message */}
                {paymentStep && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                    <span>{paymentStep}</span>
                  </div>
                )}
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
                  <span className="text-gray-600">
                    Delivery
                    {formData.deliverySlotName && currentStep >= 2 && (
                      <span className="text-xs text-gray-400 ml-1">({formData.deliverySlotName})</span>
                    )}
                  </span>
                  {currentStep < 2 ? (
                    <span className="text-gray-400 text-xs">Calculated in next step</span>
                  ) : deliveryCharge === 0 ? (
                    <span className="text-green-600 font-medium">Free</span>
                  ) : (
                    <span className="text-gray-800">{formatPrice(deliveryCharge)}</span>
                  )}
                </div>

                {/* Area delivery surcharge */}
                {areaSurcharge > 0 && (
                  <div className="flex justify-between text-sm mt-1.5 text-amber-700">
                    <span>Area Surcharge</span>
                    <span>+{formatPrice(areaSurcharge)}</span>
                  </div>
                )}

                {/* Platform surcharges — show each named item separately */}
                {formData.surchargeItems.length > 1 ? (
                  formData.surchargeItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm mt-1.5 text-amber-700">
                      <span>{item.name}</span>
                      <span>+{formatPrice(item.amount)}</span>
                    </div>
                  ))
                ) : festivalSurcharge > 0 ? (
                  <div className="flex justify-between text-sm mt-1.5 text-amber-700">
                    <span>Festival/Area Surcharge</span>
                    <span>+{formatPrice(festivalSurcharge)}</span>
                  </div>
                ) : null}

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
