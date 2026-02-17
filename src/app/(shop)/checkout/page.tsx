"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Gift,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Wallet,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CartSummary } from "@/components/cart/cart-summary"
import { useCart } from "@/hooks/use-cart"
import { formatPrice } from "@/lib/utils"

const BASE_DELIVERY_CHARGE = 49
const FREE_DELIVERY_ABOVE = 499

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

// Step indicator data
const STEPS = [
  { label: "Address", number: 1 },
  { label: "Payment", number: 2 },
  { label: "Confirmation", number: 3 },
]

export default function CheckoutPage() {
  const router = useRouter()
  const items = useCart((s) => s.items)
  const getSubtotal = useCart((s) => s.getSubtotal)
  const clearCart = useCart((s) => s.clearCart)

  const [mounted, setMounted] = useState(false)
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS)
  const [giftMessage, setGiftMessage] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("razorpay")
  const [placing, setPlacing] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({})
  const [giftExpanded, setGiftExpanded] = useState(false)
  const [instructionsExpanded, setInstructionsExpanded] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
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
  const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : BASE_DELIVERY_CHARGE

  const updateField = (field: keyof AddressForm, value: string) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = (): boolean => {
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
    return Object.keys(newErrors).length === 0
  }

  const handlePlaceOrder = () => {
    if (!validate()) return

    setPlacing(true)
    // Placeholder: simulate order creation
    setTimeout(() => {
      clearCart()
      setPlacing(false)
      router.push("/orders")
    }, 1500)
  }

  // Determine current step for indicator (1 = Address phase)
  const currentStep = 1

  return (
    <div className="bg-[#FFF9F5] min-h-screen">
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
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="card-premium px-4 py-5 sm:px-8">
            <div className="flex items-center justify-between max-w-lg mx-auto">
              {STEPS.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1 last:flex-none">
                  {/* Step circle + label */}
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

                  {/* Connector line */}
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
            {/* Delivery Address */}
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
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
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
                      onChange={(e) =>
                        updateField("phone", e.target.value.replace(/\D/g, ""))
                      }
                      className="rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone}</p>
                    )}
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
                    {errors.address && (
                      <p className="text-xs text-destructive">{errors.address}</p>
                    )}
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
                    {errors.city && (
                      <p className="text-xs text-destructive">{errors.city}</p>
                    )}
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
                    {errors.state && (
                      <p className="text-xs text-destructive">{errors.state}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pincode" className="text-xs font-medium text-gray-600">
                      Pincode <span className="text-pink-500">*</span>
                    </Label>
                    <Input
                      id="pincode"
                      placeholder="6-digit pincode"
                      maxLength={6}
                      value={addressForm.pincode}
                      onChange={(e) =>
                        updateField("pincode", e.target.value.replace(/\D/g, ""))
                      }
                      className="rounded-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                    />
                    {errors.pincode && (
                      <p className="text-xs text-destructive">{errors.pincode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

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
                {giftExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
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
                  <p className="mt-1.5 text-right text-xs text-muted-foreground">
                    {giftMessage.length}/500
                  </p>
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
                {instructionsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
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
                  <p className="mt-1.5 text-right text-xs text-muted-foreground">
                    {specialInstructions.length}/500
                  </p>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="card-premium overflow-hidden">
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">Payment Method</h2>
                  <p className="text-xs text-muted-foreground">Choose how you want to pay</p>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className={`group flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                      paymentMethod === "razorpay"
                        ? "border-pink-400 bg-pink-50/50 shadow-sm shadow-pink-100"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                    onClick={() => setPaymentMethod("razorpay")}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                        paymentMethod === "razorpay"
                          ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Pay Online</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        UPI, Cards, Net Banking, Wallets
                      </p>
                    </div>
                    {paymentMethod === "razorpay" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>

                  <button
                    className={`group flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                      paymentMethod === "cod"
                        ? "border-pink-400 bg-pink-50/50 shadow-sm shadow-pink-100"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                    onClick={() => setPaymentMethod("cod")}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                        paymentMethod === "cod"
                          ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pay when your order arrives
                      </p>
                    </div>
                    {paymentMethod === "cod" && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
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
                    const addonTotal = item.addons.reduce(
                      (s, a) => s + a.price,
                      0
                    )
                    return (
                      <div key={item.productId} className="flex gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50 border border-gray-100">
                          <Image
                            src={
                              item.product.images[0] ||
                              "/placeholder-product.svg"
                            }
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                        <div className="flex flex-1 justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight line-clamp-1 text-gray-800">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Qty: {item.quantity}
                              {addonTotal > 0 &&
                                ` + Add-ons ${formatPrice(addonTotal)}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold shrink-0 text-gray-800">
                            {formatPrice(
                              (item.product.basePrice + addonTotal) *
                                item.quantity
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Summary + Place Order */}
              <CartSummary
                subtotal={subtotal}
                deliveryCharge={deliveryCharge}
                discount={0}
                isCheckout
                onPlaceOrder={handlePlaceOrder}
                placing={placing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
