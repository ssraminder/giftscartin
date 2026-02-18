Here's the complete `CLAUDE.md`. Copy **everything** between the two `===COPY START===` and `===COPY END===` markers:

===COPY START===

```
# Gifts Cart India - Project Specification

## Overview
Gifts Cart India is an online gifting platform (similar to Winni.in/FNP) that connects customers with local vendors for fresh cakes, flowers, and gifts delivery across India. Starting with Chandigarh as pilot city.

**Brand:** Gifts Cart India
**Business Entity:** Cital Enterprises
**Domain:** giftscart.in
**FSSAI License No:** 12726011000025 (dummy)

## Tech Stack
- **Framework:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase PostgreSQL (accessed via Prisma ORM)
- **ORM:** Prisma (for type-safe queries, migrations)
- **Auth:** NextAuth.js v4 with custom credentials provider (phone + OTP)
- **OTP:** Brevo (email OTP via Brevo Transactional Email API)
- **Email:** Brevo (transactional emails)
- **Payments:** Razorpay (India) + Stripe Checkout (International) + PayPal REST API (International) + COD
- **Storage:** Supabase Storage (product images, vendor logos)
- **Real-time:** Supabase Realtime (order notifications to vendors)
- **Hosting:** Netlify
- **State Management:** Zustand (minimal, for cart and UI state)

## Architecture Decisions
- **Full-stack Next.js** — API routes handle backend logic, no separate server
- **Prisma connects directly to Supabase PostgreSQL** — we do NOT use Supabase Auth or Supabase client for data queries
- **Supabase client is ONLY used for:** real-time subscriptions, file storage
- **Auth is custom-built** using NextAuth.js credentials provider + email OTP via Brevo — NOT Supabase Auth
- **All env vars accessed via `process.env`** — never hardcode secrets

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=              # Supabase pooler connection (port 6543, ?pgbouncer=true)
DIRECT_URL=                # Supabase direct connection (port 5432, for migrations)
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@giftscart.in
BREVO_SENDER_NAME=Gifts Cart India
```

## Netlify Configuration
Uses @netlify/plugin-nextjs for Next.js support. Create netlify.toml at project root:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## Project Structure

```
# Project: Gifts Cart India
├── CLAUDE.md
├── .env.local                      # Local env vars (never commit)
├── .env.example                    # Template for env vars
├── .gitignore
├── netlify.toml
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
│
├── prisma/
│   ├── schema.prisma               # Complete database schema
│   └── seed.ts                     # Seed data (cities, categories, sample data)
│
├── src/
│   ├── middleware.ts                # Route protection (auth + role-based)
│   │
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, providers, Toaster)
│   │   ├── page.tsx                # Redirect to /shop or landing
│   │   ├── globals.css             # Tailwind base + design tokens
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx      # Phone + OTP login
│   │   │   └── register/page.tsx   # Customer registration
│   │   │
│   │   ├── (shop)/
│   │   │   ├── layout.tsx          # Shop layout (header, footer, city context)
│   │   │   ├── page.tsx            # Homepage: hero, categories, trending
│   │   │   ├── [city]/
│   │   │   │   └── page.tsx        # City landing page
│   │   │   ├── category/
│   │   │   │   └── [slug]/page.tsx # Category listing with filters
│   │   │   ├── product/
│   │   │   │   └── [slug]/page.tsx # Product detail page
│   │   │   ├── cart/page.tsx       # Shopping cart
│   │   │   ├── checkout/page.tsx   # Checkout flow
│   │   │   └── orders/
│   │   │       ├── page.tsx        # Order history
│   │   │       └── [id]/page.tsx   # Order tracking
│   │   │
│   │   ├── vendor/                 # Vendor dashboard (Phase 3 — create shell/layout only)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── admin/                  # Admin panel (Phase 3 — create shell/layout only)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts   # NextAuth handler
│   │       │   ├── otp/
│   │       │   │   ├── send/route.ts        # POST: send OTP via Brevo email
│   │       │   │   └── verify/route.ts      # POST: verify OTP
│   │       │   └── register/route.ts        # POST: register new user
│   │       │
│   │       ├── products/
│   │       │   ├── route.ts                 # GET: list products (with filters)
│   │       │   └── [id]/route.ts            # GET: single product
│   │       │
│   │       ├── categories/route.ts          # GET: all categories
│   │       │
│   │       ├── serviceability/route.ts      # POST: check pincode availability
│   │       │
│   │       ├── cart/route.ts                # GET, POST, PUT, DELETE cart ops
│   │       │
│   │       ├── orders/
│   │       │   ├── route.ts                 # GET: list, POST: create order
│   │       │   └── [id]/route.ts            # GET: order details + tracking
│   │       │
│   │       ├── payments/
│   │       │   ├── create-order/route.ts    # POST: create Razorpay order
│   │       │   └── verify/route.ts          # POST: verify Razorpay payment
│   │       │
│   │       └── upload/route.ts              # POST: get Supabase storage upload URL
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui style base components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx           # For mobile slide-out nav
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── avatar.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── header.tsx          # Main header: logo, search, city selector, cart icon, login
│   │   │   ├── footer.tsx          # Footer: links, categories, contact, social
│   │   │   ├── mobile-nav.tsx      # Hamburger menu with Sheet component
│   │   │   └── city-selector.tsx   # Modal/dropdown for pincode & city selection
│   │   │
│   │   ├── home/
│   │   │   ├── hero-banner.tsx     # Hero carousel/banner
│   │   │   ├── category-grid.tsx   # Category showcase section
│   │   │   ├── trending-products.tsx
│   │   │   └── occasion-nav.tsx    # Birthday, Anniversary, etc. quick links
│   │   │
│   │   ├── product/
│   │   │   ├── product-card.tsx    # Card used in grids
│   │   │   ├── product-gallery.tsx # Image gallery on detail page
│   │   │   ├── delivery-slot-picker.tsx  # Date + slot selection
│   │   │   ├── variation-selector.tsx  # Weight/size variation buttons
│   │   │   ├── addon-selector.tsx  # Add-on items (flowers + chocolate etc.)
│   │   │   └── review-list.tsx     # Customer reviews
│   │   │
│   │   ├── cart/
│   │   │   ├── cart-item.tsx
│   │   │   ├── cart-summary.tsx
│   │   │   └── coupon-input.tsx
│   │   │
│   │   └── providers/
│   │       ├── session-provider.tsx  # NextAuth SessionProvider wrapper
│   │       ├── city-provider.tsx     # City/pincode context provider
│   │       └── cart-provider.tsx     # Zustand cart store provider
│   │
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton (important for serverless)
│   │   ├── supabase.ts             # Supabase client (storage + realtime only)
│   │   ├── auth.ts                 # NextAuth configuration
│   │   ├── auth-options.ts         # NextAuth options exported separately for API use
│   │   ├── razorpay.ts             # Razorpay instance + helper functions
│   │   ├── brevo.ts                # Send OTP email, verify OTP, transactional email functions
│   │   ├── utils.ts                # cn() for tailwind, formatPrice(), formatDate()
│   │   └── validations.ts          # Zod schemas for all API input validation
│   │
│   ├── hooks/
│   │   ├── use-city.ts             # Hook to get/set selected city
│   │   └── use-cart.ts             # Zustand cart store hook
│   │
│   └── types/
│       └── index.ts                # Shared TypeScript interfaces
│
└── public/
    ├── logo.svg                    # Placeholder logo
    ├── placeholder-product.svg     # Product image placeholder
    └── icons/                      # Category icons etc.
```

---

## Database Schema (Prisma)

Create this EXACT schema in `prisma/schema.prisma`. This covers all core tables needed for Phase 1-3.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ==================== USERS & AUTH ====================

model User {
  id            String    @id @default(cuid())
  phone         String    @unique
  email         String?   @unique
  name          String?
  passwordHash  String?
  role          UserRole  @default(CUSTOMER)
  walletBalance Decimal   @default(0) @db.Decimal(10, 2)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  addresses     Address[]
  orders        Order[]
  reviews       Review[]
  cartItems     CartItem[]

  @@map("users")
}

enum UserRole {
  CUSTOMER
  VENDOR
  ADMIN
  SUPER_ADMIN
}

model OtpVerification {
  id        String   @id @default(cuid())
  phone     String
  otp       String
  expiresAt DateTime
  verified  Boolean  @default(false)
  attempts  Int      @default(0)
  createdAt DateTime @default(now())

  @@index([phone, otp])
  @@map("otp_verifications")
}

model Address {
  id        String  @id @default(cuid())
  userId    String
  name      String
  phone     String
  address   String
  landmark  String?
  city      String
  state     String
  pincode   String
  lat       Decimal? @db.Decimal(10, 7)
  lng       Decimal? @db.Decimal(10, 7)
  isDefault Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders    Order[]

  @@map("addresses")
}

// ==================== LOCATION ====================

model City {
  id        String  @id @default(cuid())
  name      String
  slug      String  @unique
  state     String
  isActive  Boolean @default(true)
  lat       Decimal @db.Decimal(10, 7)
  lng       Decimal @db.Decimal(10, 7)
  baseDeliveryCharge Decimal @default(49) @db.Decimal(10, 2)
  freeDeliveryAbove  Decimal @default(499) @db.Decimal(10, 2)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  zones     CityZone[]
  vendors   Vendor[]
  deliveryConfig CityDeliveryConfig[]
  deliveryHolidays DeliveryHoliday[]

  @@map("cities")
}

model CityZone {
  id            String   @id @default(cuid())
  cityId        String
  name          String
  pincodes      String[]
  extraCharge   Decimal  @default(0) @db.Decimal(10, 2)
  isActive      Boolean  @default(true)

  city          City     @relation(fields: [cityId], references: [id], onDelete: Cascade)
  vendorZones   VendorZone[]

  @@map("city_zones")
}

// ==================== DELIVERY CONFIGURATION ====================

model DeliverySlot {
  id          String  @id @default(cuid())
  name        String
  slug        String  @unique
  startTime   String
  endTime     String
  baseCharge  Decimal @default(0) @db.Decimal(10, 2)
  isActive    Boolean @default(true)

  cityConfigs CityDeliveryConfig[]
  vendorSlots VendorSlot[]

  @@map("delivery_slots")
}

model CityDeliveryConfig {
  id              String  @id @default(cuid())
  cityId          String
  slotId          String
  isAvailable     Boolean @default(true)
  chargeOverride  Decimal? @db.Decimal(10, 2)

  city            City         @relation(fields: [cityId], references: [id], onDelete: Cascade)
  slot            DeliverySlot @relation(fields: [slotId], references: [id], onDelete: Cascade)

  @@unique([cityId, slotId])
  @@map("city_delivery_configs")
}

model DeliveryHoliday {
  id           String   @id @default(cuid())
  date         DateTime @db.Date
  cityId       String?
  blockedSlots String[]
  reason       String

  city         City?    @relation(fields: [cityId], references: [id], onDelete: Cascade)

  @@map("delivery_holidays")
}

model DeliverySurcharge {
  id         String   @id @default(cuid())
  name       String
  startDate  DateTime @db.Date
  endDate    DateTime @db.Date
  amount     Decimal  @db.Decimal(10, 2)
  appliesTo  String
  isActive   Boolean  @default(true)

  @@map("delivery_surcharges")
}

// ==================== VENDORS ====================

model Vendor {
  id              String       @id @default(cuid())
  userId          String       @unique
  businessName    String
  ownerName       String
  phone           String
  email           String?
  cityId          String
  address         String
  lat             Decimal?     @db.Decimal(10, 7)
  lng             Decimal?     @db.Decimal(10, 7)
  categories      String[]
  status          VendorStatus @default(PENDING)
  commissionRate  Decimal      @default(12) @db.Decimal(5, 2)
  rating          Decimal      @default(0) @db.Decimal(3, 2)
  totalOrders     Int          @default(0)
  isOnline        Boolean      @default(false)
  autoAccept      Boolean      @default(false)
  vacationStart   DateTime?
  vacationEnd     DateTime?

  panNumber       String?
  gstNumber       String?
  fssaiNumber     String?
  bankAccountNo   String?
  bankIfsc        String?
  bankName        String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  city            City         @relation(fields: [cityId], references: [id])
  products        VendorProduct[]
  orders          Order[]
  workingHours    VendorWorkingHours[]
  slots           VendorSlot[]
  holidays        VendorHoliday[]
  pincodes        VendorPincode[]
  zones           VendorZone[]
  capacity        VendorCapacity[]
  payouts         VendorPayout[]

  @@map("vendors")
}

enum VendorStatus {
  PENDING
  APPROVED
  SUSPENDED
  TERMINATED
}

model VendorWorkingHours {
  id        String  @id @default(cuid())
  vendorId  String
  dayOfWeek Int
  openTime  String
  closeTime String
  isClosed  Boolean @default(false)

  vendor    Vendor  @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@unique([vendorId, dayOfWeek])
  @@map("vendor_working_hours")
}

model VendorSlot {
  id           String  @id @default(cuid())
  vendorId     String
  slotId       String
  isEnabled    Boolean @default(true)
  customCharge Decimal? @db.Decimal(10, 2)

  vendor       Vendor       @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  slot         DeliverySlot @relation(fields: [slotId], references: [id], onDelete: Cascade)

  @@unique([vendorId, slotId])
  @@map("vendor_slots")
}

model VendorHoliday {
  id           String   @id @default(cuid())
  vendorId     String
  date         DateTime @db.Date
  blockedSlots String[]
  reason       String?

  vendor       Vendor   @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@map("vendor_holidays")
}

model VendorPincode {
  id             String  @id @default(cuid())
  vendorId       String
  pincode        String
  deliveryCharge Decimal @default(0) @db.Decimal(10, 2)
  isActive       Boolean @default(true)

  vendor         Vendor  @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@unique([vendorId, pincode])
  @@map("vendor_pincodes")
}

model VendorZone {
  id             String   @id @default(cuid())
  vendorId       String
  zoneId         String
  deliveryCharge Decimal  @default(0) @db.Decimal(10, 2)
  minOrder       Decimal  @default(0) @db.Decimal(10, 2)

  vendor         Vendor   @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  zone           CityZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)

  @@unique([vendorId, zoneId])
  @@map("vendor_zones")
}

model VendorCapacity {
  id           String   @id @default(cuid())
  vendorId     String
  date         DateTime @db.Date
  slotId       String
  maxOrders    Int
  bookedOrders Int      @default(0)

  vendor       Vendor   @relation(fields: [vendorId], references: [id], onDelete: Cascade)

  @@unique([vendorId, date, slotId])
  @@map("vendor_capacity")
}

// ==================== PRODUCTS ====================

model Category {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  image       String?
  parentId    String?
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())

  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  products    Product[]

  @@map("categories")
}

model Product {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  description     String?
  shortDesc       String?
  categoryId      String
  basePrice       Decimal  @db.Decimal(10, 2)
  images          String[]
  tags            String[]
  occasion        String[]
  weight          String?
  isVeg           Boolean  @default(true)
  isActive        Boolean  @default(true)
  avgRating       Decimal  @default(0) @db.Decimal(3, 2)
  totalReviews    Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  category        Category       @relation(fields: [categoryId], references: [id])
  variations      ProductVariation[]
  vendorProducts  VendorProduct[]
  orderItems      OrderItem[]
  cartItems       CartItem[]
  reviews         Review[]
  addons          ProductAddon[]

  @@map("products")
}

model ProductVariation {
  id        String  @id @default(cuid())
  productId String
  type      String  // "weight", "size", "pack", "tier"
  label     String  // Display label: "500g", "1 Kg", "2 Kg"
  value     String  // Sortable value: "500", "1000", "2000" (grams for weight)
  price     Decimal @db.Decimal(10, 2) // Absolute price for this variation
  sku       String? // Optional SKU suffix
  sortOrder Int     @default(0)
  isDefault Boolean @default(false)
  isActive  Boolean @default(true)

  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, type, value])
  @@map("product_variations")
}

model ProductAddon {
  id        String  @id @default(cuid())
  productId String
  name      String
  price     Decimal @db.Decimal(10, 2)
  image     String?
  isActive  Boolean @default(true)

  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_addons")
}

model VendorProduct {
  id              String  @id @default(cuid())
  vendorId        String
  productId       String
  costPrice       Decimal @db.Decimal(10, 2)
  sellingPrice    Decimal? @db.Decimal(10, 2)
  isAvailable     Boolean @default(true)
  preparationTime Int     @default(120)
  dailyLimit      Int?

  vendor          Vendor  @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  product         Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([vendorId, productId])
  @@map("vendor_products")
}

// ==================== ORDERS ====================

model Order {
  id              String       @id @default(cuid())
  orderNumber     String       @unique
  userId          String
  vendorId        String?
  partnerId       String?
  addressId       String

  deliveryDate    DateTime     @db.Date
  deliverySlot    String
  deliveryCharge  Decimal      @default(0) @db.Decimal(10, 2)

  subtotal        Decimal      @db.Decimal(10, 2)
  discount        Decimal      @default(0) @db.Decimal(10, 2)
  surcharge       Decimal      @default(0) @db.Decimal(10, 2)
  total           Decimal      @db.Decimal(10, 2)

  status          OrderStatus  @default(PENDING)
  paymentStatus   PaymentStatus @default(PENDING)
  paymentMethod   String?

  giftMessage     String?
  specialInstructions String?
  couponCode      String?

  businessModel   BusinessModel @default(MODEL_A)
  vendorCost      Decimal?     @db.Decimal(10, 2)
  commissionAmount Decimal?    @db.Decimal(10, 2)

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  user            User         @relation(fields: [userId], references: [id])
  vendor          Vendor?      @relation(fields: [vendorId], references: [id])
  partner         Partner?     @relation(fields: [partnerId], references: [id])
  address         Address      @relation(fields: [addressId], references: [id])
  items           OrderItem[]
  payment         Payment?
  statusHistory   OrderStatusHistory[]

  @@index([userId])
  @@index([vendorId])
  @@index([orderNumber])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum BusinessModel {
  MODEL_A
  MODEL_B
}

model OrderItem {
  id             String  @id @default(cuid())
  orderId        String
  productId      String
  name           String
  quantity       Int
  price          Decimal @db.Decimal(10, 2)
  addons         Json?
  variationId    String? // ID of selected ProductVariation
  variationLabel String? // Snapshot: "1 Kg", "2 Kg" etc.

  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id])

  @@map("order_items")
}

model OrderStatusHistory {
  id        String      @id @default(cuid())
  orderId   String
  status    OrderStatus
  note      String?
  changedBy String?
  createdAt DateTime    @default(now())

  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@map("order_status_history")
}

// ==================== PAYMENTS ====================

model Payment {
  id                String        @id @default(cuid())
  orderId           String        @unique
  amount            Decimal       @db.Decimal(10, 2)
  currency          String        @default("INR")
  razorpayOrderId   String?
  razorpayPaymentId String?
  razorpaySignature String?
  method            String?
  status            PaymentStatus @default(PENDING)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  order             Order         @relation(fields: [orderId], references: [id])

  @@map("payments")
}

model VendorPayout {
  id              String       @id @default(cuid())
  vendorId        String
  amount          Decimal      @db.Decimal(10, 2)
  period          String
  orderCount      Int
  deductions      Decimal      @default(0) @db.Decimal(10, 2)
  tdsAmount       Decimal      @default(0) @db.Decimal(10, 2)
  netAmount       Decimal      @db.Decimal(10, 2)
  status          PayoutStatus @default(PENDING)
  transactionRef  String?
  paidAt          DateTime?
  createdAt       DateTime     @default(now())

  vendor          Vendor       @relation(fields: [vendorId], references: [id])

  @@map("vendor_payouts")
}

enum PayoutStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
}

// ==================== PARTNERS (Referral Branding) ====================

model Partner {
  id                String   @id @default(cuid())
  name              String
  refCode           String   @unique
  subdomain         String?  @unique
  customDomain      String?  @unique
  logoUrl           String?
  primaryColor      String   @default("#E91E63")
  secondaryColor    String   @default("#9C27B0")
  showPoweredBy     Boolean  @default(true)  // Shows "Powered by Gifts Cart India"
  commissionPercent Decimal  @db.Decimal(5, 2)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  orders            Order[]
  earnings          PartnerEarning[]

  @@map("partners")
}

model PartnerEarning {
  id        String   @id @default(cuid())
  partnerId String
  orderId   String
  amount    Decimal  @db.Decimal(10, 2)
  status    String   @default("pending")
  createdAt DateTime @default(now())

  partner   Partner  @relation(fields: [partnerId], references: [id])

  @@map("partner_earnings")
}

// ==================== CART ====================

model CartItem {
  id           String   @id @default(cuid())
  userId       String
  productId    String
  quantity     Int      @default(1)
  addons       Json?
  variationId  String?  // ID of selected ProductVariation
  deliveryDate DateTime? @db.Date
  deliverySlot String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
  @@map("cart_items")
}

// ==================== COUPONS ====================

model Coupon {
  id              String    @id @default(cuid())
  code            String    @unique
  description     String?
  discountType    String
  discountValue   Decimal   @db.Decimal(10, 2)
  minOrderAmount  Decimal   @default(0) @db.Decimal(10, 2)
  maxDiscount     Decimal?  @db.Decimal(10, 2)
  usageLimit      Int?
  usedCount       Int       @default(0)
  perUserLimit    Int       @default(1)
  validFrom       DateTime
  validUntil      DateTime
  isActive        Boolean   @default(true)
  applicableOn    String[]
  createdAt       DateTime  @default(now())

  @@map("coupons")
}

// ==================== REVIEWS ====================

model Review {
  id        String   @id @default(cuid())
  userId    String
  productId String
  orderId   String?
  rating    Int
  comment   String?
  images    String[]
  isVerified Boolean @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
  product   Product  @relation(fields: [productId], references: [id])

  @@map("reviews")
}

// ==================== CURRENCY CONFIG ====================

model CurrencyConfig {
  id             String   @id @default(cuid())
  code           String   @unique          // "USD", "INR", "GBP", "AED"
  name           String                    // "US Dollar", "Indian Rupee"
  symbol         String                    // "$", "₹", "£"
  symbolPosition String   @default("before") // "before" or "after"
  exchangeRate   Decimal  @db.Decimal(12, 6) // How much of this currency = 1 INR
  markup         Decimal  @default(0) @db.Decimal(5, 2) // % markup on converted price
  rounding       String   @default("nearest") // "nearest", "up", "down", "none"
  roundTo        Decimal  @default(0.01) @db.Decimal(10, 2) // Round to nearest X
  locale         String   @default("en-US") // Intl locale for formatting
  countries      String[] // ISO country codes mapped to this currency
  isDefault      Boolean  @default(false)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("currency_configs")
}

// ==================== ADMIN AUDIT ====================

model AuditLog {
  id           String   @id @default(cuid())
  adminId      String
  adminRole    String
  actionType   String
  entityType   String
  entityId     String
  fieldChanged String?
  oldValue     Json?
  newValue     Json?
  reason       String
  ipAddress    String?
  createdAt    DateTime @default(now())

  @@index([entityType, entityId])
  @@index([adminId])
  @@map("audit_logs")
}
```

---

## Key Library Files

### src/lib/prisma.ts — Prisma Client Singleton
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### src/lib/supabase.ts — Supabase Client (Storage + Realtime ONLY)
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
// NOTE: We use this ONLY for storage uploads and realtime subscriptions
// All data queries go through Prisma
```

### src/lib/utils.ts
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function generateOrderNumber(cityCode: string): string {
  const random = Math.floor(10000 + Math.random() * 90000)
  return `GC-${cityCode}-${random}` // e.g., GC-CHD-54321
}
```

---

## Auth System (NextAuth + OTP)

### How it works:
1. User enters phone number or email → frontend calls POST /api/auth/otp/send
2. Backend generates 6-digit OTP → stores in otp_verifications table → sends via Brevo email
3. User enters OTP → frontend calls POST /api/auth/otp/verify
4. Backend verifies OTP → creates/finds user → returns session token via NextAuth
5. NextAuth credentials provider handles session management

### src/lib/auth-options.ts
```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Phone Login',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) return null

        const otpRecord = await prisma.otpVerification.findFirst({
          where: {
            phone: credentials.phone,
            otp: credentials.otp,
            verified: false,
            expiresAt: { gt: new Date() },
          },
        })

        if (!otpRecord) return null

        await prisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { verified: true },
        })

        let user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
        })

        if (!user) {
          user = await prisma.user.create({
            data: { phone: credentials.phone },
          })
        }

        return { id: user.id, phone: user.phone, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.phone = (user as any).phone
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        (session.user as any).role = token.role
        (session.user as any).phone = token.phone
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
}
```

---

## Design System

### Brand Colors
- Primary: #E91E63 (Pink — gifting/celebration feel)
- Primary Dark: #C2185B
- Secondary: #9C27B0 (Purple)
- Accent: #FF9800 (Orange — CTAs, highlights)
- Success: #4CAF50
- Warning: #FF9800
- Error: #F44336
- Background: #FAFAFA
- Surface: #FFFFFF
- Text Primary: #212121
- Text Secondary: #757575

### Typography
- Headings: Inter (bold)
- Body: Inter (regular)
- Prices: Inter (semibold)

### Component Patterns
- Cards with subtle shadow and rounded corners (rounded-xl)
- Pink primary buttons with hover state
- Input fields with standard labels above
- Mobile-first responsive design
- Bottom sheet for mobile modals

### Design References
- Look at winni.in for layout inspiration (hero, categories, product grid)
- Look at fnp.com for vendor shop and branding system inspiration
- Clean, modern, celebration-themed aesthetic
- Lots of whitespace, product images should be prominent

### Branding
- Brand Name: Gifts Cart India
- Business Entity: Cital Enterprises
- Tagline: "Send Love, Send Gifts — Anywhere in India"
- FSSAI Lic. No: 12726011000025
- Footer always shows: "(c) 2026 Cital Enterprises. All rights reserved."
- Partner pages show: "[Partner Name] managed by Cital Enterprises"

---

## Seed Data

Create prisma/seed.ts that seeds the following for development:

### Cities
- Chandigarh (primary pilot city, slug: chandigarh, state: Chandigarh, lat: 30.7333, lng: 76.7794)
- Mohali (slug: mohali, state: Punjab)
- Panchkula (slug: panchkula, state: Haryana)

### City Zones for Chandigarh
- Core (Sectors 15-25): pincodes 160015-160025, extra charge 0
- Extended (Sectors 1-14, 26-40): pincodes 160001-160014 and 160026-160040, extra charge 30
- Outskirts (Mohali, Panchkula): pincodes 140301-140320 and 134101-134120, extra charge 60

### Delivery Slots
- Standard: 9AM-9PM, free, slug: standard
- Fixed Slot: 2-hour window, ₹50, slug: fixed-slot
- Midnight: 11PM-11:59PM, ₹199, slug: midnight
- Early Morning: 6AM-8AM, ₹149, slug: early-morning
- Express: within 2-3 hours, ₹249, slug: express

### Categories
- Cakes (slug: cakes, with subcategories: chocolate-cakes, fruit-cakes, photo-cakes, eggless-cakes)
- Flowers (slug: flowers, with subcategories: roses, mixed-bouquets, premium-flowers)
- Combos (slug: combos)
- Plants (slug: plants)
- Gifts (slug: gifts)

### Sample Products (at least 5 per category)
- Chocolate Truffle Cake (₹599, category: cakes)
- Red Velvet Cake (₹699, category: cakes)
- Black Forest Cake (₹549, category: cakes)
- Butterscotch Cake (₹499, category: cakes)
- Photo Cake (₹899, category: cakes)
- Red Roses Bouquet (₹699, category: flowers)
- Mixed Flower Arrangement (₹899, category: flowers)
- Orchid Bunch (₹1299, category: flowers)
- Cake & Flowers Combo (₹1199, category: combos)
- Money Plant (₹399, category: plants)
Use placeholder image URLs for now (e.g., /placeholder-product.svg)

### Sample Vendor
- Business Name: Sweet Delights Bakery
- City: Chandigarh
- Categories: [cakes, combos]
- Status: APPROVED
- Commission Rate: 12%
- Create vendor_products linking to all cake products with cost prices (roughly 65-70% of MRP)
- Create vendor_pincodes for Chandigarh core zone pincodes
- Create vendor_working_hours (8AM-10PM, Monday off)
- Create vendor_capacity (50 orders/day, 10 per slot)

### Sample Partner
- Name: Sweet Celebrations
- refCode: sweetcelebrations
- Displayed as: "Sweet Celebrations managed by Cital Enterprises"

---

## API Response Format

All API routes must return consistent JSON:

```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: "Human readable error message" }

// List with pagination
{ success: true, data: { items: [...], total: 100, page: 1, pageSize: 20 } }
```

---

## Phase 1 Build Order

Execute in this order:

1. Install dependencies from package.json
2. Set up Prisma — create schema.prisma, run npx prisma db push
3. Create lib files — prisma.ts, supabase.ts, utils.ts, auth-options.ts, brevo.ts, razorpay.ts, validations.ts
4. Set up NextAuth — api/auth/[...nextauth]/route.ts + OTP send/verify routes
5. Create UI components — button, input, card, badge, skeleton, dialog, sheet, select, label, separator, avatar, dropdown-menu
6. Build layout — header, footer, mobile-nav, city-selector
7. Build providers — session-provider, city-provider, cart store (Zustand)
8. Create homepage — hero banner, category grid, trending products, occasion nav
9. Create product pages — category listing with filters, product detail with gallery and slot picker
10. Create cart and checkout — cart page, checkout flow
11. Create API routes — products, categories, serviceability, cart, orders, payments
12. Create auth pages — login page (OTP flow), register page
13. Set up middleware — protect /checkout, /orders, /vendor, /admin routes
14. Create seed data — run prisma/seed.ts
15. Create vendor and admin shells — layout only, placeholder pages with "Coming in Phase 3" message
16. Configure netlify.toml
17. Test and deploy

---

## Important Rules

1. NEVER use Supabase Auth — all auth goes through NextAuth + custom OTP
2. NEVER use Supabase client for data queries — always use Prisma
3. All API inputs must be validated with Zod schemas
4. All prices stored as Decimal in database, converted to number only for display
5. All API routes return consistent format: { success: boolean, data?: any, error?: string }
6. Use server components by default, client components only when needed (interactivity)
7. Mobile-first design — design for mobile, enhance for desktop
8. **Currency-aware pricing** — All product prices stored in INR in the database. Frontend uses `useCurrency().formatPrice(inrAmount)` for display. Currency is resolved via `/api/currencies/resolve` based on visitor IP. Admin configures currencies at `/admin/settings/currencies`.
9. Use "use client" directive only in components that need browser APIs or interactivity
10. Always handle loading and error states in UI
11. Product images use next/image with proper width/height for performance
12. All forms use controlled inputs with Zod validation before submission
13. Brand name is "Gifts Cart India", business entity is "Cital Enterprises". Never use "GiftIndia" in any user-facing text.
14. Partner/referral pages show "[Partner Name] managed by Cital Enterprises" — never hide the Cital Enterprises attribution.
15. FSSAI license number 12726011000025 must be displayed on the website footer (food delivery compliance).
16. **Product variations** — Products like cakes and sweets support weight variations (500g, 1kg, 2kg etc.) via the `ProductVariation` model. The `basePrice` on Product is the starting/default price. When variations exist, the `VariationSelector` component renders clickable weight buttons and the selected variation's price is used throughout cart/checkout. Addons are applied on top of the variation price.

---

## Product Variation System

### How Weight/Size Variations Work

Inspired by WooCommerce product addons + Indian bakery standards (Winni, FNP, Sahni Bakery):

1. **Variations** = Product attributes that change the base price (weight, size, tier, pack)
2. **Addons** = Optional extras that add to the price (candles, greeting card, topper)
3. Each `ProductVariation` has an **absolute price** (not a multiplier)
4. One variation per type can be marked `isDefault: true` — this is auto-selected on page load
5. The `Product.basePrice` = price of the default variation (or lowest price, for "Starting from" display)

### Variation Types
| Type | Example Values | Used By |
|------|---------------|---------|
| `weight` | 500g, 1 Kg, 1.5 Kg, 2 Kg, 3 Kg, 5 Kg | Cakes, Sweets, Dry Cakes, Namkeen |
| `size` | Small, Medium, Large | Flower bouquets, Gift baskets |
| `pack` | 6 pcs, 12 pcs, 24 pcs | Pastries, Chocolates, Biscuits |
| `tier` | 1 Tier, 2 Tier, 3 Tier | Wedding cakes |

### Standard Cake Weight Tiers (India)
| Weight | Serves | Typical Price Multiplier |
|--------|--------|------------------------|
| 500g (Half Kg) | 4-6 | 1x (base) |
| 1 Kg | 10-12 | ~1.85x |
| 1.5 Kg | 15-18 | ~2.7x |
| 2 Kg | 20-25 | ~3.5x |
| 3 Kg | 30-35 | ~5x |
| 5 Kg | 50+ | ~8x |

### Data Flow
- **Product page**: `VariationSelector` component → user picks weight → `selectedVariation` state updates → price recalculates
- **Add to cart**: `addItem(product, qty, addons, variation)` → stored in Zustand `CartItemState.variation`
- **Cart display**: Shows `variation.label` (e.g., "1 Kg") and uses `variation.price` for calculations
- **Order creation**: `OrderItem.variationId` + `OrderItem.variationLabel` snapshot the selection
- **API**: Both `/api/products` and `/api/products/[id]` include `variations` in their response

### Key Components
- `src/components/product/variation-selector.tsx` — Renders variation buttons grouped by type
- `src/hooks/use-cart.ts` — `CartItemState.variation: VariationSelection | null`
- `src/types/index.ts` — `ProductVariation`, `VariationSelection` interfaces

### Categories (Sahni Bakery inspired)

**Top-level categories:**
Cakes, Flowers, Combos, Plants, Gifts, Pastries, Sweets, Dry Cakes, Biscuits & Rusks, Namkeen & Snacks, Decoration Items, Festive Hampers, Chocolates

**Cake subcategories:**
Chocolate Cakes, Fruit Cakes, Photo Cakes, Eggless Cakes, Premium Cakes, Fondant Cakes, Wedding Cakes, Anniversary Cakes, Customized Cakes, Valentine's Cakes

**Flower subcategories:**
Roses, Mixed Bouquets, Premium Flowers

---

## Known Issues & Database Notes

### product_variations table was missing from initial migration
The `product_variations` table was not created during the initial `prisma db push`. It was created manually via SQL. If re-running migrations or setting up a fresh database, verify this table exists. The `/api/products` endpoint will return 500 if it's missing because the Prisma query includes `include: { variations: true }`.

### Frontend city parameter not passed to product API
The `trending-products.tsx` and `category/[slug]/page.tsx` components do not pass the `city` query parameter to `/api/products`. The API's vendor-availability filter (`where.vendorProducts.some`) is gated behind `if (city)`, so it currently returns all active products. If city-based filtering is enforced in the future, these components must use the `useCity()` hook to pass the selected city slug.

### Zod import path
All Zod schemas in `src/lib/validations.ts` import from `zod/v4` (not `zod`). Ensure the installed zod version supports this import path.

### Additional lib files beyond spec
The following lib files were added beyond the original Phase 1 spec:
- `src/lib/stripe.ts` — Stripe checkout integration
- `src/lib/paypal.ts` — PayPal REST API integration
- `src/lib/email.ts` — Transactional email helpers
- `src/lib/geo.ts` — IP-based geolocation for currency resolution

### Additional providers beyond spec
- `src/components/providers/currency-provider.tsx` — Multi-currency context (resolves via `/api/currencies/resolve`)
- `src/hooks/use-currency.ts` — Hook for currency formatting

### Admin panel (partially built)
Admin pages exist for: dashboard, orders, settings/currencies, vendors, products, cities. These are functional shells with real API connections, not just placeholder "Coming in Phase 3" pages.
```

===COPY END===

---

## How to Use This

1. Create `CLAUDE.md` in your project root
2. Paste everything above into it
3. Open Terminal, go to your project folder, and run:

```bash
claude
```

4. Tell Claude Code:

> Read CLAUDE.md and build Phase 1. Start with step 1 — install all dependencies. Then set up the Prisma schema and push it to the database. Then create all the lib files. Work through the build order step by step.

Claude Code will read the CLAUDE.md automatically and follow the spec. Let me know when you've started and if you run into any issues!
