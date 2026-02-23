// Shared TypeScript interfaces for Gifts Cart India
// These are frontend-friendly types (Decimal → number) derived from the Prisma schema

export type UserRole = "CUSTOMER" | "VENDOR" | "VENDOR_STAFF" | "ADMIN" | "SUPER_ADMIN" | "ACCOUNTANT" | "CITY_MANAGER" | "OPERATIONS"
export type VendorStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "TERMINATED"
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED"
export type BusinessModel = "MODEL_A" | "MODEL_B"

// ==================== USERS & AUTH ====================

export interface User {
  id: string
  phone: string
  email: string | null
  name: string | null
  role: UserRole
  walletBalance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Address {
  id: string
  userId: string
  name: string
  phone: string
  address: string
  landmark: string | null
  city: string
  state: string
  pincode: string
  lat: number | null
  lng: number | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ==================== LOCATION ====================

export interface City {
  id: string
  name: string
  slug: string
  state: string
  isActive: boolean
  lat: number
  lng: number
  baseDeliveryCharge: number
  freeDeliveryAbove: number
  createdAt: string
  updatedAt: string
}

export interface CityZone {
  id: string
  cityId: string
  name: string
  pincodes: string[]
  extraCharge: number
  isActive: boolean
}

// ==================== DELIVERY ====================

export interface DeliverySlot {
  id: string
  name: string
  slug: string
  startTime: string
  endTime: string
  baseCharge: number
  isActive: boolean
}

export interface CityDeliveryConfig {
  id: string
  cityId: string
  slotId: string
  isAvailable: boolean
  chargeOverride: number | null
  slot?: DeliverySlot
}

// ==================== VENDORS ====================

export interface Vendor {
  id: string
  userId: string
  businessName: string
  ownerName: string
  phone: string
  email: string | null
  cityId: string
  address: string
  lat: number | null
  lng: number | null
  categories: string[]
  status: VendorStatus
  commissionRate: number
  rating: number
  totalOrders: number
  isOnline: boolean
  autoAccept: boolean
  createdAt: string
  updatedAt: string
}

// ==================== PRODUCTS ====================

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  children?: Category[]
  parent?: Category
}

export type ProductType = "SIMPLE" | "VARIABLE"
export type AddonType = "CHECKBOX" | "RADIO" | "SELECT" | "TEXT_INPUT" | "TEXTAREA" | "FILE_UPLOAD"

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  shortDesc: string | null
  categoryId: string
  productType: ProductType
  basePrice: number
  images: string[]
  tags: string[]
  occasion: string[]
  weight: string | null
  isVeg: boolean
  isActive: boolean
  avgRating: number
  totalReviews: number
  createdAt: string
  updatedAt: string
  category?: { id: string; name: string; slug: string }
  attributes?: ProductAttribute[]
  variations?: ProductVariation[]
  addonGroups?: ProductAddonGroup[]
  upsells?: UpsellProduct[]
  reviews?: Review[]
}

export interface ProductAttribute {
  id: string
  name: string
  slug: string
  isVisible: boolean
  isForVariations: boolean
  sortOrder: number
  options: ProductAttributeOption[]
}

export interface ProductAttributeOption {
  id: string
  value: string
  sortOrder: number
}

export interface ProductVariation {
  id: string
  productId: string
  attributes: Record<string, string> // { "weight": "500g", "egg-preference": "Eggless" }
  price: number
  salePrice: number | null
  saleFrom: string | null
  saleTo: string | null
  image: string | null
  stockQty: number | null
  isActive: boolean
  sortOrder: number
}

export interface VariationSelection {
  variationId: string
  attributes: Record<string, string>
  price: number
  salePrice: number | null
}

export interface ProductAddonGroup {
  id: string
  name: string
  description: string | null
  type: AddonType
  required: boolean
  maxLength: number | null
  placeholder: string | null
  acceptedFileTypes: string[]
  maxFileSizeMb: number | null
  sortOrder: number
  options: ProductAddonOption[]
}

export interface ProductAddonOption {
  id: string
  label: string
  price: number
  image: string | null
  isDefault: boolean
  sortOrder: number
}

export interface UpsellProduct {
  id: string
  name: string
  slug: string
  images: string[]
  basePrice: number
  category: { name: string }
}

// Addon selection value for a single addon group (used in product detail page state)
export type AddonGroupSelection =
  | { type: "CHECKBOX"; selectedIds: string[] }
  | { type: "RADIO"; selectedId: string | null }
  | { type: "SELECT"; selectedId: string | null }
  | { type: "TEXT_INPUT"; text: string }
  | { type: "TEXTAREA"; text: string }
  | { type: "FILE_UPLOAD"; fileUrl: string | null; fileName: string | null }

// Flattened addon selection record stored in cart
export interface AddonSelectionRecord {
  groupId: string
  groupName: string
  type: AddonType
  // CHECKBOX
  selectedIds?: string[]
  selectedLabels?: string[]
  totalAddonPrice?: number
  // RADIO / SELECT
  selectedId?: string
  selectedLabel?: string
  addonPrice?: number
  // TEXT_INPUT / TEXTAREA
  text?: string
  // FILE_UPLOAD
  fileUrl?: string
  fileName?: string
}

export interface VendorProduct {
  id: string
  vendorId: string
  productId: string
  costPrice: number
  sellingPrice: number | null
  isAvailable: boolean
  preparationTime: number
  dailyLimit: number | null
  product?: Product
  vendor?: Vendor
}

// ==================== ORDERS ====================

export interface Order {
  id: string
  orderNumber: string
  userId: string
  vendorId: string | null
  partnerId: string | null
  addressId: string
  deliveryDate: string
  deliverySlot: string
  deliveryCharge: number
  subtotal: number
  discount: number
  surcharge: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: string | null
  giftMessage: string | null
  specialInstructions: string | null
  couponCode: string | null
  senderName: string | null
  senderPhone: string | null
  senderEmail: string | null
  occasion: string | null
  businessModel: BusinessModel
  createdAt: string
  updatedAt: string
  items?: OrderItem[]
  address?: Address
  payment?: Payment
  statusHistory?: OrderStatusHistory[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  name: string
  quantity: number
  price: number
  addons: AddonSelectionRecord[] | null
  variationId: string | null
  variationLabel: string | null
  product?: Product
}

export interface OrderStatusHistory {
  id: string
  orderId: string
  status: OrderStatus
  note: string | null
  changedBy: string | null
  createdAt: string
}

// ==================== PAYMENTS ====================

export type PaymentGateway = "RAZORPAY" | "STRIPE" | "PAYPAL" | "COD"

export interface Payment {
  id: string
  orderId: string
  amount: number
  currency: string
  gateway: PaymentGateway
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  razorpaySignature: string | null
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  paypalOrderId: string | null
  paypalCaptureId: string | null
  method: string | null
  status: PaymentStatus
  createdAt: string
  updatedAt: string
}

// ==================== CART ====================

export interface CartItem {
  id: string
  productId: string
  productName: string
  productSlug: string
  image: string
  quantity: number
  price: number
  variationId: string | null
  selectedAttributes: Record<string, string> | null
  addonSelections: AddonSelectionRecord[]
  deliveryDate: string | null
  deliverySlot: string | null
  product?: Product
}

// ==================== COUPONS ====================

export interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  minOrderAmount: number
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  perUserLimit: number
  validFrom: string
  validUntil: string
  isActive: boolean
  applicableOn: string[]
}

// ==================== REVIEWS ====================

export interface Review {
  id: string
  userId: string
  productId: string
  orderId: string | null
  rating: number
  comment: string | null
  images: string[]
  isVerified: boolean
  createdAt: string
  user?: Pick<User, "id" | "name">
}

// ==================== LOCATION SEARCH ====================

export interface LocationResult {
  type: 'area' | 'city'
  label: string
  cityId: string | null
  cityName: string | null
  citySlug: string | null
  pincode: string | null
  areaName: string | null
  lat: number | null
  lng: number | null
  isActive: boolean
  isComingSoon: boolean
}

// ==================== API RESPONSE ====================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
