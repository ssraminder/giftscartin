import { z } from 'zod/v4'

// ==================== Common ====================

export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits)')

export const pincodeSchema = z.string().regex(/^\d{6}$/, 'Invalid pincode (6 digits)')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// ==================== Auth ====================

export const sendOtpSchema = z.object({
  phone: phoneSchema,
})

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export const registerSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.email('Invalid email address').optional(),
})

// ==================== Address ====================

export const createAddressSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  address: z.string().min(5).max(500),
  landmark: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: pincodeSchema,
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
})

export const updateAddressSchema = createAddressSchema.partial()

// ==================== Products ====================

export const productListSchema = paginationSchema.extend({
  categorySlug: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  isVeg: z.coerce.boolean().optional(),
  occasion: z.string().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'rating', 'newest']).default('newest'),
  search: z.string().max(200).optional(),
})

// ==================== Cart ====================

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
  addons: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
  })).optional(),
  deliveryDate: z.string().optional(),
  deliverySlot: z.string().optional(),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(10),
})

// ==================== Serviceability ====================

export const serviceabilitySchema = z.object({
  pincode: pincodeSchema,
  productId: z.string().optional(),
})

// ==================== Orders ====================

export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  deliverySlot: z.string().min(1, 'Delivery slot is required'),
  giftMessage: z.string().max(500).optional(),
  specialInstructions: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
})

// ==================== Payments ====================

export const createPaymentOrderSchema = z.object({
  orderId: z.string().min(1),
})

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})

// ==================== Coupons ====================

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
  orderTotal: z.number().min(0),
})

// ==================== Reviews ====================

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
})

// ==================== Vendor ====================

export const vendorRegistrationSchema = z.object({
  businessName: z.string().min(2).max(200),
  ownerName: z.string().min(2).max(100),
  phone: phoneSchema,
  email: z.email().optional(),
  cityId: z.string().min(1),
  address: z.string().min(5).max(500),
  categories: z.array(z.string()).min(1),
  panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN number').optional(),
  gstNumber: z.string().max(15).optional(),
  fssaiNumber: z.string().max(14).optional(),
  bankAccountNo: z.string().max(18).optional(),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').optional(),
  bankName: z.string().max(100).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  note: z.string().max(500).optional(),
})

// ==================== Upload ====================

export const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1),
  folder: z.enum(['products', 'vendors', 'reviews', 'avatars']).default('products'),
})

// ==================== Type exports ====================

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateAddressInput = z.infer<typeof createAddressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
export type ProductListInput = z.infer<typeof productListSchema>
export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type ServiceabilityInput = z.infer<typeof serviceabilitySchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>
export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type VendorRegistrationInput = z.infer<typeof vendorRegistrationSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type UploadInput = z.infer<typeof uploadSchema>
