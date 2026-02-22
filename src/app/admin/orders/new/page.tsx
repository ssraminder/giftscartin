"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  UserCheck,
} from "lucide-react"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { formatPrice } from "@/lib/utils"
import type { Product, ApiResponse, PaginatedData } from "@/types"

// ==================== TYPES ====================

interface OrderItemEntry {
  productId: string
  productName: string
  image: string
  quantity: number
  unitPrice: number
  originalPrice: number
  variationId?: string
  variationLabel?: string
  addons?: unknown
}

interface DeliveryAddress {
  name: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
}

interface VendorOption {
  id: string
  businessName: string
  ownerName: string
}

const STEPS = [
  "Customer",
  "Delivery",
  "Products",
  "Payment",
  "Review",
] as const

const DELIVERY_SLOTS = [
  { value: "standard", label: "Standard (9 AM - 9 PM)" },
  { value: "fixed-time", label: "Fixed Time (2-hour window)" },
  { value: "midnight", label: "Midnight (11 PM - 12 AM)" },
  { value: "early-morning", label: "Early Morning (6 AM - 8 AM)" },
  { value: "express", label: "Express (2-hour delivery)" },
]

// ==================== STEP 1: CUSTOMER ====================

function StepCustomer({
  phone,
  setPhone,
  name,
  setName,
  email,
  setEmail,
  existingCustomer,
  lookupLoading,
  onLookup,
}: {
  phone: string
  setPhone: (v: string) => void
  name: string
  setName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  existingCustomer: { id: string; name: string | null; email: string | null } | null
  lookupLoading: boolean
  onLookup: () => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Customer Details</h2>
      <div className="space-y-3">
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="phone"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
            />
            <Button
              variant="outline"
              onClick={onLookup}
              disabled={phone.length !== 10 || lookupLoading}
            >
              {lookupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-1.5">Look up</span>
            </Button>
          </div>
        </div>

        {existingCustomer !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 text-green-800 text-sm">
            <UserCheck className="h-4 w-4" />
            <span>Existing customer: {existingCustomer.name || existingCustomer.email || phone}</span>
          </div>
        )}
        {existingCustomer === null && phone.length === 10 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 text-blue-800 text-sm">
            <User className="h-4 w-4" />
            <span>New customer</span>
          </div>
        )}

        <div>
          <Label htmlFor="name">Customer Name</Label>
          <Input
            id="name"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}

// ==================== STEP 2: DELIVERY ====================

function StepDelivery({
  deliveryDate,
  setDeliveryDate,
  deliverySlot,
  setDeliverySlot,
  addr,
  setAddr,
  giftMessage,
  setGiftMessage,
  specialInstructions,
  setSpecialInstructions,
}: {
  deliveryDate: string
  setDeliveryDate: (v: string) => void
  deliverySlot: string
  setDeliverySlot: (v: string) => void
  addr: DeliveryAddress
  setAddr: (v: DeliveryAddress) => void
  giftMessage: string
  setGiftMessage: (v: string) => void
  specialInstructions: string
  setSpecialInstructions: (v: string) => void
}) {
  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Delivery Details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="deliveryDate">Delivery Date</Label>
          <Input
            id="deliveryDate"
            type="date"
            min={today}
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="deliverySlot">Delivery Slot</Label>
          <Select value={deliverySlot} onValueChange={setDeliverySlot}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select slot" />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_SLOTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <h3 className="text-sm font-medium text-slate-700 pt-2">Delivery Address</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="recipientName">Recipient Name</Label>
          <Input
            id="recipientName"
            placeholder="Recipient name"
            value={addr.name}
            onChange={(e) => setAddr({ ...addr, name: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="recipientPhone">Recipient Phone</Label>
          <Input
            id="recipientPhone"
            placeholder="9876543210"
            value={addr.phone}
            onChange={(e) =>
              setAddr({ ...addr, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
            }
            maxLength={10}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="addressLine">Address</Label>
        <textarea
          id="addressLine"
          rows={2}
          placeholder="House/flat, street, area"
          value={addr.address}
          onChange={(e) => setAddr({ ...addr, address: e.target.value })}
          className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="City"
            value={addr.city}
            onChange={(e) => setAddr({ ...addr, city: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            placeholder="State"
            value={addr.state}
            onChange={(e) => setAddr({ ...addr, state: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="pincode">Pincode</Label>
          <Input
            id="pincode"
            placeholder="160001"
            value={addr.pincode}
            onChange={(e) =>
              setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
            }
            maxLength={6}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="giftMessage">Gift Message (optional)</Label>
        <textarea
          id="giftMessage"
          rows={2}
          placeholder="Happy Birthday!"
          value={giftMessage}
          onChange={(e) => setGiftMessage(e.target.value)}
          className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <Label htmlFor="specialInstructions">Special Instructions (optional)</Label>
        <textarea
          id="specialInstructions"
          rows={2}
          placeholder="Call before delivery, etc."
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  )
}

// ==================== STEP 3: PRODUCTS ====================

function StepProducts({
  items,
  setItems,
}: {
  items: OrderItemEntry[]
  setItems: (v: OrderItemEntry[]) => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [dialogQty, setDialogQty] = useState(1)
  const [dialogPrice, setDialogPrice] = useState(0)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&pageSize=10`)
      const json: ApiResponse<PaginatedData<Product>> = await res.json()
      if (json.success && json.data) {
        setSearchResults(json.data.items)
      }
    } catch {
      console.error("Product search failed")
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => searchProducts(value), 300)
  }

  const openAddDialog = (product: Product) => {
    setSelectedProduct(product)
    setDialogQty(1)
    setDialogPrice(Number(product.basePrice))
    setShowDialog(true)
    setSearchQuery("")
    setSearchResults([])
  }

  const addItem = () => {
    if (!selectedProduct) return
    const newItem: OrderItemEntry = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      image: selectedProduct.images?.[0] || "/placeholder-product.svg",
      quantity: dialogQty,
      unitPrice: dialogPrice,
      originalPrice: Number(selectedProduct.basePrice),
    }
    setItems([...items, newItem])
    setShowDialog(false)
    setSelectedProduct(null)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateQty = (index: number, qty: number) => {
    if (qty < 1) return
    const updated = [...items]
    updated[index] = { ...updated[index], quantity: qty }
    setItems(updated)
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Products</h2>

      {/* Search */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 z-10" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Search results dropdown */}
        {(searchResults.length > 0 || searchLoading) && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-md border bg-white shadow-lg">
            {searchLoading ? (
              <div className="p-3 text-center text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Searching...
              </div>
            ) : (
              searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => openAddDialog(product)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                >
                  <Image
                    src={product.images?.[0] || "/placeholder-product.svg"}
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded object-cover bg-slate-100"
                    unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.category?.name} &middot; {formatPrice(Number(product.basePrice))}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Order items table */}
      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">
          No products added yet. Search and add products above.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-3">
                <Image
                  src={item.image}
                  alt=""
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded object-cover bg-slate-100 shrink-0"
                  unoptimized
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      {formatPrice(item.unitPrice)} each
                    </span>
                    {item.unitPrice !== item.originalPrice && (
                      <Badge variant="secondary" className="text-[10px]">
                        Overridden
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQty(index, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQty(index, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-sm font-semibold w-16 text-right shrink-0">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700 shrink-0"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
          <div className="flex justify-end pt-2">
            <span className="text-sm font-semibold">
              Subtotal: {formatPrice(subtotal)}
            </span>
          </div>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src={selectedProduct.images?.[0] || "/placeholder-product.svg"}
                  alt=""
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded object-cover bg-slate-100"
                  unoptimized
                />
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-slate-500">
                    Base price: {formatPrice(Number(selectedProduct.basePrice))}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="dialogQty">Quantity</Label>
                <Input
                  id="dialogQty"
                  type="number"
                  min={1}
                  value={dialogQty}
                  onChange={(e) => setDialogQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="dialogPrice">
                  Unit Price (override)
                </Label>
                <Input
                  id="dialogPrice"
                  type="number"
                  min={0}
                  step={1}
                  value={dialogPrice}
                  onChange={(e) => setDialogPrice(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
                {dialogPrice !== Number(selectedProduct.basePrice) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Original price: {formatPrice(Number(selectedProduct.basePrice))}
                  </p>
                )}
              </div>

              <div className="text-sm font-medium text-right">
                Line total: {formatPrice(dialogPrice * dialogQty)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addItem}>Add to Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== STEP 4: PAYMENT ====================

function StepPayment({
  paymentMethod,
  setPaymentMethod,
  couponCode,
  setCouponCode,
  vendorAssignment,
  setVendorAssignment,
  vendorId,
  setVendorId,
  vendors,
  deliveryCharge,
  setDeliveryCharge,
  surcharge,
  setSurcharge,
  subtotal,
  discount,
}: {
  paymentMethod: string
  setPaymentMethod: (v: string) => void
  couponCode: string
  setCouponCode: (v: string) => void
  vendorAssignment: string
  setVendorAssignment: (v: string) => void
  vendorId: string
  setVendorId: (v: string) => void
  vendors: VendorOption[]
  deliveryCharge: number
  setDeliveryCharge: (v: number) => void
  surcharge: number
  setSurcharge: (v: number) => void
  subtotal: number
  discount: number
}) {
  const total = subtotal + deliveryCharge + surcharge - discount

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payment & Assignment</h2>

      <div>
        <Label>Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CASH">Cash on Delivery (COD)</SelectItem>
            <SelectItem value="PAID_ONLINE">Already Paid Online</SelectItem>
            <SelectItem value="PENDING">Payment Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="couponCode">Coupon Code (optional)</Label>
        <Input
          id="couponCode"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Vendor Assignment</Label>
        <Select value={vendorAssignment} onValueChange={setVendorAssignment}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-assign</SelectItem>
            <SelectItem value="manual">Manual assign</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {vendorAssignment === "manual" && (
        <div>
          <Label>Select Vendor</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.businessName} ({v.ownerName})
                </SelectItem>
              ))}
              {vendors.length === 0 && (
                <SelectItem value="none" disabled>
                  No approved vendors found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="deliveryCharge">Delivery Charge</Label>
          <Input
            id="deliveryCharge"
            type="number"
            min={0}
            step={1}
            value={deliveryCharge}
            onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="surcharge">Surcharge</Label>
          <Input
            id="surcharge"
            type="number"
            min={0}
            step={1}
            value={surcharge}
            onChange={(e) => setSurcharge(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Order total summary */}
      <Card className="p-4 bg-slate-50">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{formatPrice(deliveryCharge)}</span>
          </div>
          {surcharge > 0 && (
            <div className="flex justify-between">
              <span>Surcharge</span>
              <span>{formatPrice(surcharge)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-1.5 mt-1.5">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ==================== STEP 5: REVIEW ====================

function StepReview({
  phone,
  name,
  email,
  deliveryDate,
  deliverySlot,
  addr,
  giftMessage,
  specialInstructions,
  items,
  paymentMethod,
  couponCode,
  vendorAssignment,
  deliveryCharge,
  surcharge,
  discount,
}: {
  phone: string
  name: string
  email: string
  deliveryDate: string
  deliverySlot: string
  addr: DeliveryAddress
  giftMessage: string
  specialInstructions: string
  items: OrderItemEntry[]
  paymentMethod: string
  couponCode: string
  vendorAssignment: string
  deliveryCharge: number
  surcharge: number
  discount: number
}) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const total = subtotal + deliveryCharge + surcharge - discount
  const paymentLabels: Record<string, string> = {
    CASH: "Cash on Delivery",
    PAID_ONLINE: "Already Paid Online",
    PENDING: "Payment Pending",
  }
  const slotLabel = DELIVERY_SLOTS.find((s) => s.value === deliverySlot)?.label || deliverySlot

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Review Order</h2>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Customer</h3>
        <div className="text-sm text-slate-600">
          <p>{name} &middot; {phone}</p>
          {email && <p>{email}</p>}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Delivery</h3>
        <div className="text-sm text-slate-600">
          <p>{new Date(deliveryDate + 'T00:00:00').toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p>{slotLabel}</p>
          <p className="mt-1">
            {addr.name}, {addr.phone}<br />
            {addr.address}<br />
            {addr.city}, {addr.state} - {addr.pincode}
          </p>
          {giftMessage && <p className="mt-1 italic">&ldquo;{giftMessage}&rdquo;</p>}
          {specialInstructions && <p className="mt-1 text-xs">Note: {specialInstructions}</p>}
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Products</h3>
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>
              {item.productName} x{item.quantity}
            </span>
            <span>{formatPrice(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
        <div className="border-t pt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{formatPrice(deliveryCharge)}</span>
          </div>
          {surcharge > 0 && (
            <div className="flex justify-between">
              <span>Surcharge</span>
              <span>{formatPrice(surcharge)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-1.5">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Payment & Vendor</h3>
        <div className="text-sm text-slate-600">
          <p>Payment: {paymentLabels[paymentMethod] || paymentMethod}</p>
          {couponCode && <p>Coupon: {couponCode}</p>}
          <p>Vendor: {vendorAssignment === "auto" ? "Auto-assign" : "Manual"}</p>
        </div>
      </Card>
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function AdminNewOrderPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Customer
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [existingCustomer, setExistingCustomer] = useState<{
    id: string
    name: string | null
    email: string | null
  } | null | undefined>(undefined)
  const [lookupLoading, setLookupLoading] = useState(false)

  // Step 2: Delivery
  const [deliveryDate, setDeliveryDate] = useState("")
  const [deliverySlot, setDeliverySlot] = useState("")
  const [addr, setAddr] = useState<DeliveryAddress>({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })
  const [giftMessage, setGiftMessage] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")

  // Step 3: Products
  const [items, setItems] = useState<OrderItemEntry[]>([])

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [couponCode, setCouponCode] = useState("")
  const [vendorAssignment, setVendorAssignment] = useState("auto")
  const [vendorId, setVendorId] = useState("")
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [surcharge, setSurcharge] = useState(0)
  const [discount] = useState(0)

  // Fetch vendors for manual assignment
  useEffect(() => {
    async function fetchVendors() {
      try {
        const res = await fetch("/api/admin/vendors?status=APPROVED&pageSize=100")
        const json = await res.json()
        if (json.success && json.data) {
          const list = Array.isArray(json.data) ? json.data : json.data.items || []
          setVendors(
            list.map((v: { id: string; businessName: string; ownerName: string }) => ({
              id: v.id,
              businessName: v.businessName,
              ownerName: v.ownerName,
            }))
          )
        }
      } catch {
        // Vendor fetch is non-critical
      }
    }
    fetchVendors()
  }, [])

  const handleLookup = useCallback(async () => {
    if (phone.length !== 10) return
    setLookupLoading(true)
    try {
      const res = await fetch(`/api/admin/customers/lookup?phone=${phone}`)
      const json = await res.json()
      if (json.success) {
        if (json.data) {
          setExistingCustomer(json.data)
          if (json.data.name && !name) setName(json.data.name)
          if (json.data.email && !email) setEmail(json.data.email)
        } else {
          setExistingCustomer(null)
        }
      }
    } catch {
      console.error("Customer lookup failed")
    } finally {
      setLookupLoading(false)
    }
  }, [phone, name, email])

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  // Validation per step
  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return phone.length === 10 && name.length >= 2
      case 1:
        return (
          !!deliveryDate &&
          !!deliverySlot &&
          addr.name.length >= 2 &&
          /^[6-9]\d{9}$/.test(addr.phone) &&
          addr.address.length >= 5 &&
          addr.city.length >= 2 &&
          addr.state.length >= 2 &&
          /^\d{6}$/.test(addr.pincode)
        )
      case 2:
        return items.length > 0
      case 3:
        return (
          !!paymentMethod &&
          (vendorAssignment === "auto" || !!vendorId)
        )
      case 4:
        return true
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = {
        customerPhone: phone,
        customerName: name,
        customerEmail: email || undefined,
        deliveryDate,
        deliverySlot,
        deliveryAddress: addr,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          variationId: item.variationId,
          variationLabel: item.variationLabel,
          addons: item.addons,
        })),
        paymentMethod,
        vendorId: vendorAssignment === "manual" ? vendorId : undefined,
        giftMessage: giftMessage || undefined,
        specialInstructions: specialInstructions || undefined,
        couponCode: couponCode || undefined,
        deliveryCharge,
        surcharge,
      }

      const res = await fetch("/api/admin/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (json.success && json.data) {
        router.push(`/admin/orders/${json.data.id}`)
      } else {
        alert(json.error || "Failed to create order")
      }
    } catch {
      alert("Failed to create order. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Order</h1>
          <p className="text-sm text-slate-500">Create a manual order</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <button
              onClick={() => {
                if (i < step) setStep(i)
              }}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium shrink-0 ${
                i < step
                  ? "bg-green-600 text-white cursor-pointer"
                  : i === step
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span
              className={`ml-1.5 text-xs hidden sm:inline ${
                i === step ? "font-semibold text-slate-900" : "text-slate-500"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  i < step ? "bg-green-600" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div>
        {step === 0 && (
          <StepCustomer
            phone={phone}
            setPhone={setPhone}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            existingCustomer={existingCustomer === undefined ? null : existingCustomer}
            lookupLoading={lookupLoading}
            onLookup={handleLookup}
          />
        )}
        {step === 1 && (
          <StepDelivery
            deliveryDate={deliveryDate}
            setDeliveryDate={setDeliveryDate}
            deliverySlot={deliverySlot}
            setDeliverySlot={setDeliverySlot}
            addr={addr}
            setAddr={setAddr}
            giftMessage={giftMessage}
            setGiftMessage={setGiftMessage}
            specialInstructions={specialInstructions}
            setSpecialInstructions={setSpecialInstructions}
          />
        )}
        {step === 2 && <StepProducts items={items} setItems={setItems} />}
        {step === 3 && (
          <StepPayment
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            vendorAssignment={vendorAssignment}
            setVendorAssignment={setVendorAssignment}
            vendorId={vendorId}
            setVendorId={setVendorId}
            vendors={vendors}
            deliveryCharge={deliveryCharge}
            setDeliveryCharge={setDeliveryCharge}
            surcharge={surcharge}
            setSurcharge={setSurcharge}
            subtotal={subtotal}
            discount={discount}
          />
        )}
        {step === 4 && (
          <StepReview
            phone={phone}
            name={name}
            email={email}
            deliveryDate={deliveryDate}
            deliverySlot={deliverySlot}
            addr={addr}
            giftMessage={giftMessage}
            specialInstructions={specialInstructions}
            items={items}
            paymentMethod={paymentMethod}
            couponCode={couponCode}
            vendorAssignment={vendorAssignment}
            deliveryCharge={deliveryCharge}
            surcharge={surcharge}
            discount={discount}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Check className="h-4 w-4 mr-1.5" />
            )}
            Place Order
          </Button>
        )}
      </div>
    </div>
  )
}
