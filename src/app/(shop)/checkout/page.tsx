"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Gift,
  LogIn,
  Mail,
  MapPin,
  MessageSquare,
  User,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

interface GuestInfo {
  name: string
  email: string
  phone: string
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

const EMPTY_GUEST: GuestInfo = {
  name: "",
  email: "",
  phone: "",
}

interface OrderConfirmation {
  orderNumber: string
  total: number
  guestEmail?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const items = useCart((s) => s.items)
  const getSubtotal = useCart((s) => s.getSubtotal)
  const clearCart = useCart((s) => s.clearCart)

  const [mounted, setMounted] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState<"choose" | "guest" | "authenticated">("choose")
  const [guestInfo, setGuestInfo] = useState<GuestInfo>(EMPTY_GUEST)
  const [guestErrors, setGuestErrors] = useState<Partial<Record<keyof GuestInfo, string>>>({})
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS)
  const [giftMessage, setGiftMessage] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("razorpay")
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState("")
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({})
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null)

  const isLoggedIn = sessionStatus === "authenticated" && !!session?.user

  useEffect(() => setMounted(true), [])

  // Auto-set checkout mode based on auth status
  useEffect(() => {
    if (sessionStatus === "loading") return
    if (isLoggedIn) {
      setCheckoutMode("authenticated")
    }
  }, [sessionStatus, isLoggedIn])

  if (!mounted || sessionStatus === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  // Show order confirmation
  if (orderConfirmation) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Order Placed Successfully!</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Order Number: <span className="font-semibold text-foreground">{orderConfirmation.orderNumber}</span>
        </p>
        <p className="mt-1 text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatPrice(orderConfirmation.total)}</span>
        </p>

        {isLoggedIn ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              You can track your order from your account.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link href={`/orders`}>View My Orders</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Continue Shopping</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              <Mail className="h-4 w-4 shrink-0" />
              <span>
                We&apos;ve sent order details to <span className="font-medium">{orderConfirmation.guestEmail}</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Create an account to track your orders and get faster checkout next time.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link href="/register">Create Account</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Continue Shopping</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Redirect to cart if empty
  if (items.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">No items to checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your cart is empty. Add some items first.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Browse Products</Link>
        </Button>
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

  const updateGuestField = (field: keyof GuestInfo, value: string) => {
    setGuestInfo((prev) => ({ ...prev, [field]: value }))
    if (guestErrors[field]) {
      setGuestErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validateGuest = (): boolean => {
    const newErrors: Partial<Record<keyof GuestInfo, string>> = {}
    if (!guestInfo.name.trim() || guestInfo.name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email))
      newErrors.email = "Valid email address required"
    if (!/^[6-9]\d{9}$/.test(guestInfo.phone))
      newErrors.phone = "Valid 10-digit phone required"
    setGuestErrors(newErrors)
    return Object.keys(newErrors).length === 0
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

  const handlePlaceOrder = async () => {
    if (!validate()) return
    if (checkoutMode === "guest" && !validateGuest()) return

    setPlacing(true)
    setOrderError("")

    try {
      const isGuest = checkoutMode === "guest"

      const orderPayload: Record<string, unknown> = {
        deliveryDate: new Date().toISOString().split("T")[0],
        deliverySlot: "standard",
        giftMessage: giftMessage || undefined,
        specialInstructions: specialInstructions || undefined,
        paymentMethod,
      }

      if (isGuest) {
        orderPayload.guestName = guestInfo.name
        orderPayload.guestEmail = guestInfo.email
        orderPayload.guestPhone = guestInfo.phone
        orderPayload.deliveryAddress = {
          name: addressForm.name,
          phone: addressForm.phone,
          address: addressForm.address,
          landmark: addressForm.landmark || undefined,
          city: addressForm.city,
          state: addressForm.state,
          pincode: addressForm.pincode,
        }
        orderPayload.cartItems = items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          addons: item.addons.length > 0 ? item.addons : undefined,
        }))
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setOrderError(data.error || "Failed to place order. Please try again.")
        setPlacing(false)
        return
      }

      clearCart()
      setOrderConfirmation({
        orderNumber: data.data.orderNumber,
        total: Number(data.data.total),
        guestEmail: isGuest ? guestInfo.email : undefined,
      })
    } catch {
      setOrderError("Something went wrong. Please try again.")
      setPlacing(false)
    }
  }

  // Guest/Login choice screen (only for unauthenticated users)
  if (!isLoggedIn && checkoutMode === "choose") {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/cart">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold sm:text-xl">Checkout</h1>
        </div>

        <div className="mx-auto max-w-md space-y-4">
          <p className="text-center text-muted-foreground">
            How would you like to checkout?
          </p>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <button
                className="flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                onClick={() => router.push("/login?redirect=/checkout")}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <LogIn className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Login to your account</p>
                  <p className="text-sm text-muted-foreground">
                    Track orders, save addresses, and faster checkout
                  </p>
                </div>
              </button>

              <div className="my-4 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
              </div>

              <button
                className="flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                onClick={() => setCheckoutMode("guest")}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Continue as Guest</p>
                  <p className="text-sm text-muted-foreground">
                    No account needed — just provide your details
                  </p>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (!isLoggedIn && checkoutMode === "guest") {
              setCheckoutMode("choose")
            } else {
              router.push("/cart")
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold sm:text-xl">Checkout</h1>
        {checkoutMode === "guest" && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            Guest
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column — Forms */}
        <div className="space-y-6 lg:col-span-2">
          {/* Guest Info (only for guest checkout) */}
          {checkoutMode === "guest" && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Your Information</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-name">Full Name *</Label>
                    <Input
                      id="guest-name"
                      placeholder="Your full name"
                      value={guestInfo.name}
                      onChange={(e) => updateGuestField("name", e.target.value)}
                    />
                    {guestErrors.name && (
                      <p className="text-xs text-destructive">{guestErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guest-email">Email Address *</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      placeholder="your@email.com"
                      value={guestInfo.email}
                      onChange={(e) => updateGuestField("email", e.target.value)}
                    />
                    {guestErrors.email && (
                      <p className="text-xs text-destructive">{guestErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guest-phone">Phone Number *</Label>
                    <Input
                      id="guest-phone"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      value={guestInfo.phone}
                      onChange={(e) =>
                        updateGuestField("phone", e.target.value.replace(/\D/g, ""))
                      }
                    />
                    {guestErrors.phone && (
                      <p className="text-xs text-destructive">{guestErrors.phone}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Delivery Address</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Recipient Name *</Label>
                  <Input
                    id="name"
                    placeholder="Full name"
                    value={addressForm.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={addressForm.phone}
                    onChange={(e) =>
                      updateField("phone", e.target.value.replace(/\D/g, ""))
                    }
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    placeholder="House/Flat no., Street, Area"
                    value={addressForm.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive">{errors.address}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="landmark">Landmark (optional)</Label>
                  <Input
                    id="landmark"
                    placeholder="Near temple, opposite mall, etc."
                    value={addressForm.landmark}
                    onChange={(e) => updateField("landmark", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={addressForm.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive">{errors.city}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={addressForm.state}
                    onChange={(e) => updateField("state", e.target.value)}
                  />
                  {errors.state && (
                    <p className="text-xs text-destructive">{errors.state}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    placeholder="6-digit pincode"
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) =>
                      updateField("pincode", e.target.value.replace(/\D/g, ""))
                    }
                  />
                  {errors.pincode && (
                    <p className="text-xs text-destructive">{errors.pincode}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gift Message */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Gift Message (optional)</h2>
              </div>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
                placeholder="Write a message for the recipient..."
                maxLength={500}
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {giftMessage.length}/500
              </p>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">
                  Special Instructions (optional)
                </h2>
              </div>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
                placeholder="E.g., call before delivery, don't ring the bell..."
                maxLength={500}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {specialInstructions.length}/500
              </p>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Payment Method</h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    paymentMethod === "razorpay"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setPaymentMethod("razorpay")}
                >
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Pay Online</p>
                    <p className="text-xs text-muted-foreground">
                      UPI, Cards, Net Banking, Wallets
                    </p>
                  </div>
                </button>

                <button
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setPaymentMethod("cod")}
                >
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cash on Delivery</p>
                    <p className="text-xs text-muted-foreground">
                      Pay when your order arrives
                    </p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Order error */}
          {orderError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {orderError}
            </div>
          )}
        </div>

        {/* Right Column — Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            {/* Mini cart items */}
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-3 font-semibold">
                  Order Items ({items.length})
                </h3>
                <div className="space-y-3">
                  {items.map((item) => {
                    const addonTotal = item.addons.reduce(
                      (s, a) => s + a.price,
                      0
                    )
                    return (
                      <div key={item.productId} className="flex gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={
                              item.product.images[0] ||
                              "/placeholder-product.svg"
                            }
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="flex flex-1 justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm leading-tight line-clamp-1">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                              {addonTotal > 0 &&
                                ` + Add-ons ${formatPrice(addonTotal)}`}
                            </p>
                          </div>
                          <span className="text-sm font-medium shrink-0">
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

                <Separator className="my-3" />

                <Button variant="link" asChild className="h-auto p-0 text-xs">
                  <Link href="/cart">Edit Cart</Link>
                </Button>
              </CardContent>
            </Card>

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
  )
}
