# PROGRESS.md — Gifts Cart India Project Tracker

> **IMPORTANT:** This file MUST be read and updated at the start of every Claude Code session.

---

## 1A — Project Status Summary

| Field | Value |
|-------|-------|
| **Platform Name** | Gifts Cart India |
| **Business Entity** | Cital Enterprises |
| **Domain** | giftscart.in (production, eventual) |
| **Live Staging** | https://giftscart.netlify.app |
| **Supabase** | https://saeditdtacprxcnlgips.supabase.co |
| **Current Phase** | Phase 1 (core build) — ~85% complete |
| **Last Updated** | 2026-02-17 |

### What's Done
- Full Prisma schema with 31 models deployed to Supabase
- All 15 API routes implemented with real Prisma queries
- Auth system (email-based OTP via Brevo — deviates from phone+MSG91 spec)
- Homepage with hero banner, category grid, occasion nav, trending products, testimonials
- Cart (Zustand client-side), checkout form UI, order history pages
- Admin dashboard with order management (real API data)
- Middleware for route protection (auth + role-based)
- Seed data script with cities, categories, 25 products, vendor
- Netlify deployment configured and working
- Premium UI redesign completed

### What's NOT Done
- Category listing page uses hardcoded data (API exists but not connected)
- Product detail page uses hardcoded addons/reviews (API exists but not connected)
- Checkout page does not call order creation API (setTimeout placeholder)
- Razorpay payment flow not wired to checkout
- No MSG91 SMS integration (using Brevo email OTP instead)
- Vendor dashboard is Phase 3 placeholder
- No `[city]/page.tsx` city landing page
- No real product images (all use `/placeholder-product.svg`)
- `npm install` not run (node_modules missing — TS errors are all module-not-found)

---

## 1B — File Audit

### Root Files

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `CLAUDE.md` | Yes | Yes | ✅ Exists & Working |
| `.env.example` | Yes | Yes | ✅ Exists & Working |
| `.env.local` | Yes (local only) | No | ❌ Missing (expected, not committed) |
| `.gitignore` | Yes | Yes | ✅ Exists & Working |
| `netlify.toml` | Yes | Yes | ✅ Exists & Working |
| `package.json` | Yes | Yes | ✅ Exists & Working |
| `tsconfig.json` | Yes | Yes | ✅ Exists & Working |
| `tailwind.config.ts` | Yes | Yes | ✅ Exists & Working |
| `postcss.config.js` | Yes (spec) | `postcss.config.mjs` | ⚠️ Different extension (.mjs vs .js) |
| `next.config.js` | Yes (spec) | `next.config.mjs` | ⚠️ Different extension (.mjs vs .js) |

### Prisma

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `prisma/schema.prisma` | Yes | Yes | ✅ Exists & Working |
| `prisma/seed.ts` | Yes | Yes | ✅ Exists & Working |

### Source — App Pages

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `src/app/layout.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/page.tsx` | Yes (redirect) | No | ❌ Missing (shop page handles root) |
| `src/app/globals.css` | Yes | Yes | ✅ Exists & Working |
| `src/app/(auth)/login/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(auth)/register/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(shop)/layout.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(shop)/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(shop)/[city]/page.tsx` | Yes | No | ❌ Missing |
| `src/app/(shop)/category/[slug]/page.tsx` | Yes | Yes | ⚠️ Exists but uses hardcoded data |
| `src/app/(shop)/product/[slug]/page.tsx` | Yes | Yes | ⚠️ Exists but uses hardcoded addons/reviews |
| `src/app/(shop)/cart/page.tsx` | Yes | Yes | ✅ Exists & Working (Zustand) |
| `src/app/(shop)/checkout/page.tsx` | Yes | Yes | ⚠️ Exists but order creation is placeholder |
| `src/app/(shop)/orders/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(shop)/orders/[id]/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/vendor/layout.tsx` | Yes | Yes | ✅ Exists (Phase 3 shell) |
| `src/app/vendor/page.tsx` | Yes | Yes | ⚠️ Phase 3 placeholder |
| `src/app/admin/layout.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/admin/page.tsx` | Yes | Yes | ✅ Exists & Working (real API data) |
| `src/app/admin/orders/page.tsx` | Not in spec | Yes | ✅ Bonus — admin order list |
| `src/app/admin/orders/[id]/page.tsx` | Not in spec | Yes | ✅ Bonus — admin order detail |

### Source — API Routes

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `src/app/api/auth/[...nextauth]/route.ts` | Yes | Yes | ✅ Exists & Working |
| `src/app/api/auth/otp/send/route.ts` | Yes | Yes | ✅ Exists & Working (email OTP) |
| `src/app/api/auth/otp/verify/route.ts` | Yes | Yes | ✅ Exists & Working |
| `src/app/api/auth/register/route.ts` | Yes | Yes | ✅ Exists & Working |
| `src/app/api/products/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma) |
| `src/app/api/products/[id]/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma) |
| `src/app/api/categories/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma) |
| `src/app/api/serviceability/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma) |
| `src/app/api/cart/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma) |
| `src/app/api/orders/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma) |
| `src/app/api/orders/[id]/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma) |
| `src/app/api/payments/create-order/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma + Razorpay) |
| `src/app/api/payments/verify/route.ts` | Yes | Yes | ✅ Exists & Working (Prisma + Razorpay) |
| `src/app/api/upload/route.ts` | Yes | Yes | ✅ Exists & Working (Supabase Storage) |
| `src/app/api/admin/dashboard/route.ts` | Not in spec | Yes | ✅ Bonus — admin dashboard API |

### Source — Components

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `src/components/ui/button.tsx` | Yes | Yes | ✅ |
| `src/components/ui/input.tsx` | Yes | Yes | ✅ |
| `src/components/ui/label.tsx` | Yes | Yes | ✅ |
| `src/components/ui/card.tsx` | Yes | Yes | ✅ |
| `src/components/ui/badge.tsx` | Yes | Yes | ✅ |
| `src/components/ui/dialog.tsx` | Yes | Yes | ✅ |
| `src/components/ui/select.tsx` | Yes | Yes | ✅ |
| `src/components/ui/skeleton.tsx` | Yes | Yes | ✅ |
| `src/components/ui/separator.tsx` | Yes | Yes | ✅ |
| `src/components/ui/sheet.tsx` | Yes | Yes | ✅ |
| `src/components/ui/dropdown-menu.tsx` | Yes | Yes | ✅ |
| `src/components/ui/avatar.tsx` | Yes | Yes | ✅ |
| `src/components/layout/header.tsx` | Yes | Yes | ✅ |
| `src/components/layout/footer.tsx` | Yes | Yes | ✅ |
| `src/components/layout/mobile-nav.tsx` | Yes | Yes | ✅ |
| `src/components/layout/city-selector.tsx` | Yes | Yes | ✅ |
| `src/components/layout/bottom-nav.tsx` | Not in spec | Yes | ✅ Bonus — mobile bottom nav |
| `src/components/home/hero-banner.tsx` | Yes | Yes | ✅ |
| `src/components/home/category-grid.tsx` | Yes | Yes | ✅ |
| `src/components/home/trending-products.tsx` | Yes | Yes | ⚠️ Uses hardcoded product data |
| `src/components/home/occasion-nav.tsx` | Yes | Yes | ✅ |
| `src/components/home/city-banner.tsx` | Not in spec | Yes | ✅ Bonus |
| `src/components/home/testimonials.tsx` | Not in spec | Yes | ✅ Bonus |
| `src/components/product/product-card.tsx` | Yes | Yes | ✅ |
| `src/components/product/product-gallery.tsx` | Yes | Yes | ✅ |
| `src/components/product/delivery-slot-picker.tsx` | Yes | Yes | ✅ |
| `src/components/product/addon-selector.tsx` | Yes | Yes | ✅ |
| `src/components/product/review-list.tsx` | Yes | Yes | ✅ |
| `src/components/cart/cart-item.tsx` | Yes | Yes | ✅ |
| `src/components/cart/cart-summary.tsx` | Yes | Yes | ✅ |
| `src/components/cart/coupon-input.tsx` | Yes | Yes | ✅ |
| `src/components/providers/session-provider.tsx` | Yes | Yes | ✅ |
| `src/components/providers/city-provider.tsx` | Yes | Yes | ✅ |
| `src/components/providers/cart-provider.tsx` | Yes | Yes | ✅ |

### Source — Lib Files

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `src/lib/prisma.ts` | Yes | Yes | ✅ Singleton pattern |
| `src/lib/supabase.ts` | Yes | Yes | ✅ Storage + realtime only |
| `src/lib/auth.ts` | Yes | Yes | ✅ NextAuth handler |
| `src/lib/auth-options.ts` | Yes | Yes | ⚠️ Uses email OTP (spec says phone+MSG91) |
| `src/lib/razorpay.ts` | Yes | Yes | ✅ createOrder + verifySignature |
| `src/lib/msg91.ts` | Yes | No | ❌ Missing (using Brevo email instead) |
| `src/lib/email.ts` | Yes | Yes | ✅ SendGrid integration |
| `src/lib/brevo.ts` | Not in spec | Yes | ✅ Brevo email OTP sender |
| `src/lib/utils.ts` | Yes | Yes | ✅ cn(), formatPrice(), generateOrderNumber() |
| `src/lib/validations.ts` | Yes | Yes | ✅ All Zod schemas implemented |

### Source — Other

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `src/middleware.ts` | Yes | Yes | ✅ Auth + role-based route protection |
| `src/hooks/use-city.ts` | Yes | Yes | ✅ |
| `src/hooks/use-cart.ts` | Yes | Yes | ✅ Zustand with persist |
| `src/types/index.ts` | Yes | Yes | ✅ All types defined |
| `src/types/next-auth.d.ts` | Not in spec | Yes | ✅ Type augmentation |

### Public

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `public/logo.svg` | Yes | No | ❌ Missing |
| `public/placeholder-product.svg` | Yes | Yes | ✅ |
| `public/icons/` | Yes | No | ❌ Missing directory |

---

## 1C — Database Audit (Prisma Models)

| Model | Table Name | API Routes | Frontend Pages/Components | Seed Data |
|-------|-----------|------------|--------------------------|-----------|
| User | `users` | auth/*, register | login, register | No (created via OTP flow) |
| OtpVerification | `otp_verifications` | auth/otp/send, auth/otp/verify | login page | No |
| Address | `addresses` | orders (nested) | checkout page | No |
| City | `cities` | serviceability | city-selector, city-provider | ✅ 3 cities |
| CityZone | `city_zones` | serviceability | — | ✅ 3 zones |
| DeliverySlot | `delivery_slots` | serviceability | delivery-slot-picker | ✅ 5 slots |
| CityDeliveryConfig | `city_delivery_configs` | — | — | No |
| DeliveryHoliday | `delivery_holidays` | — | — | No |
| DeliverySurcharge | `delivery_surcharges` | — | — | No |
| Vendor | `vendors` | orders (vendor lookup) | vendor page (placeholder) | ✅ 1 vendor |
| VendorWorkingHours | `vendor_working_hours` | — | — | ✅ 7 days |
| VendorSlot | `vendor_slots` | — | — | ✅ 5 slots |
| VendorHoliday | `vendor_holidays` | — | — | No |
| VendorPincode | `vendor_pincodes` | serviceability | — | ✅ Core pincodes |
| VendorZone | `vendor_zones` | — | — | No |
| VendorCapacity | `vendor_capacity` | — | — | ✅ 7 days x 5 slots |
| Category | `categories` | /api/categories | category page, category-grid | ✅ 5 + 8 sub |
| Product | `products` | /api/products, /api/products/[id] | product page, product-card | ✅ 25 products |
| ProductAddon | `product_addons` | /api/products/[id] (nested) | addon-selector | ✅ 4 per cake |
| VendorProduct | `vendor_products` | /api/products (city filter) | — | ✅ 8 items |
| Order | `orders` | /api/orders, /api/orders/[id] | orders pages, admin orders | No (runtime) |
| OrderItem | `order_items` | /api/orders (nested) | order detail page | No (runtime) |
| OrderStatusHistory | `order_status_history` | /api/orders/[id] (nested) | order detail timeline | No (runtime) |
| Payment | `payments` | /api/payments/* | checkout (not wired) | No (runtime) |
| VendorPayout | `vendor_payouts` | — | — | No |
| Partner | `partners` | — | — | No |
| PartnerEarning | `partner_earnings` | — | — | No |
| CartItem | `cart_items` | /api/cart | cart page (uses Zustand) | No (runtime) |
| Coupon | `coupons` | /api/orders (coupon apply) | coupon-input | No |
| Review | `reviews` | /api/products/[id] (nested) | review-list (hardcoded) | No |
| AuditLog | `audit_logs` | — | — | No |

### Key Gaps:
- **DeliveryHoliday, DeliverySurcharge, CityDeliveryConfig**: No API routes or UI
- **VendorPayout, Partner, PartnerEarning**: No API routes (Phase 3)
- **AuditLog**: No API routes or admin UI
- **Coupon**: Referenced in order creation API but no admin CRUD

---

## 1D — API Routes Audit

| Route | Exists | Uses Prisma | HTTP Methods | Notes |
|-------|--------|-------------|-------------|-------|
| `/api/auth/[...nextauth]` | ✅ | Via lib | GET, POST | NextAuth handler |
| `/api/auth/otp/send` | ✅ | Yes | POST | Creates OTP record, sends via Brevo email |
| `/api/auth/otp/verify` | ✅ | Yes | POST | Verifies OTP, creates/finds user |
| `/api/auth/register` | ✅ | Yes | POST | Registers new user after OTP |
| `/api/products` | ✅ | Yes | GET | Full filtering: category, price, veg, occasion, search, city |
| `/api/products/[id]` | ✅ | Yes | GET | Product with category, addons, reviews, vendor products |
| `/api/categories` | ✅ | Yes | GET | Active categories with hierarchy and product counts |
| `/api/serviceability` | ✅ | Yes | POST | Zone/pincode check, vendor count, available slots |
| `/api/cart` | ✅ | Yes | GET, POST, PUT, DELETE | Full CRUD with product includes |
| `/api/orders` | ✅ | Yes | GET, POST | List (paginated) + create from cart (transaction) |
| `/api/orders/[id]` | ✅ | Yes | GET | Order with items, address, payment, status history |
| `/api/payments/create-order` | ✅ | Yes + Razorpay | POST | Creates Razorpay order, upserts payment |
| `/api/payments/verify` | ✅ | Yes + Razorpay | POST | Verifies signature, updates payment & order status |
| `/api/upload` | ✅ | Supabase Storage | POST | Generates signed upload URL |
| `/api/admin/dashboard` | ✅ | Yes | GET | Today's orders, revenue, HITL count, recent activity |

**All 15 API routes are fully implemented with real database queries.**

---

## 1E — Frontend Pages Audit

| Page | Exists | Data Source | Status |
|------|--------|-------------|--------|
| `/(auth)/login` | ✅ | API (OTP send/verify + NextAuth) | ✅ Real — email OTP flow works |
| `/(auth)/register` | ✅ | API (register + auto-OTP) | ✅ Real |
| `/(shop)/page.tsx` (homepage) | ✅ | Child components | ✅ Real — server component |
| `/(shop)/category/[slug]` | ✅ | **Hardcoded CATEGORIES object** | ⚠️ Not connected to API |
| `/(shop)/product/[slug]` | ✅ | **Hardcoded addons/reviews** | ⚠️ Not connected to API |
| `/(shop)/cart` | ✅ | Zustand store (client-side) | ⚠️ Not synced to server cart API |
| `/(shop)/checkout` | ✅ | **setTimeout placeholder** | ⚠️ No real order creation |
| `/(shop)/orders` | ✅ | API (GET /api/orders) | ✅ Real |
| `/(shop)/orders/[id]` | ✅ | API (GET /api/orders/[id]) | ✅ Real |
| `/admin/page.tsx` | ✅ | API (GET /api/admin/dashboard) | ✅ Real |
| `/admin/orders` | ✅ | API (GET /api/orders?admin=true) | ✅ Real |
| `/admin/orders/[id]` | ✅ | API (GET /api/orders/[id]) | ✅ Real (buttons are UI-only) |
| `/vendor/page.tsx` | ✅ | None | ⚠️ Phase 3 placeholder |

---

## 1F — Components Audit

All 32 components exist. Flagged items:

| Component | Issue |
|-----------|-------|
| `components/home/trending-products.tsx` | Uses hardcoded product array with `/placeholder-product.svg` images |
| `components/cart/coupon-input.tsx` | Coupon validation is client-side only |
| `components/product/product-card.tsx` | Falls back to `/placeholder-product.svg` |
| `components/product/addon-selector.tsx` | Falls back to `/placeholder-product.svg` |
| `components/product/product-gallery.tsx` | Falls back to `/placeholder-product.svg` |

No components contain "TODO", "coming soon", or "Phase 3" text.

---

## 1G — Environment Variables

### Referenced in Code

| Variable | Used In | Set in .env.example | Notes |
|----------|---------|-------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.ts | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase.ts | Yes | Supabase anon key |
| `DATABASE_URL` | prisma/schema.prisma | Yes | Pooler connection (port 6543) |
| `DIRECT_URL` | prisma/schema.prisma | Yes | Direct connection (port 5432) |
| `NEXTAUTH_SECRET` | — (NextAuth internal) | Yes | Session encryption |
| `NEXTAUTH_URL` | — (NextAuth internal) | Yes | Base URL |
| `RAZORPAY_KEY_ID` | razorpay.ts | Yes | Razorpay key |
| `RAZORPAY_KEY_SECRET` | razorpay.ts | Yes | Razorpay secret |
| `BREVO_API_KEY` | brevo.ts | Yes | Brevo email API key |
| `BREVO_SENDER_EMAIL` | brevo.ts | Yes | Sender email address |
| `BREVO_SENDER_NAME` | brevo.ts | Yes | Sender display name |
| `SENDGRID_API_KEY` | email.ts | No | SendGrid API key (legacy?) |
| `SENDGRID_FROM_EMAIL` | email.ts | No | SendGrid sender (legacy?) |
| `NODE_ENV` | prisma.ts, brevo.ts | Auto | Node environment |

### Spec vs Actual
- **MSG91_AUTH_KEY** — In spec, NOT in code (MSG91 not implemented)
- **MSG91_TEMPLATE_ID** — In spec, NOT in code
- **SENDGRID_API_KEY** — In code but NOT in .env.example (replaced by Brevo?)
- **SENDGRID_FROM_EMAIL** — In code but NOT in .env.example

---

## 1H — Known Issues & Tech Debt

### Hardcoded Data Files
| File | Line(s) | Issue |
|------|---------|-------|
| `src/app/(shop)/category/[slug]/page.tsx` | 39-126 | Entire CATEGORIES object with ~28 hardcoded products |
| `src/app/(shop)/product/[slug]/page.tsx` | 24-29 | SAMPLE_ADDONS hardcoded array |
| `src/app/(shop)/product/[slug]/page.tsx` | 30-125 | SAMPLE_REVIEWS/products hardcoded |
| `src/components/home/trending-products.tsx` | 15-78 | 10 hardcoded trending products |
| `src/app/(shop)/cart/page.tsx` | 22 | Coupon logic is placeholder |
| `src/app/(shop)/checkout/page.tsx` | ~537 | `/placeholder-product.svg` fallback |

### TODO/FIXME Items
| File | Line | Content |
|------|------|---------|
| `src/app/admin/orders/[id]/page.tsx` | 220 | `// TODO: Navigate to quote view` |
| `src/app/admin/orders/[id]/page.tsx` | 234 | `// TODO: Navigate to edit order` |
| `src/app/admin/orders/[id]/page.tsx` | 245 | `// TODO: Cancel order confirmation` |

### Auth System Deviation
The OtpVerification Prisma model has an `email` field (line 42-43 in schema) while the CLAUDE.md spec defines it with a `phone` field. The implementation currently uses **email-based OTP via Brevo** instead of **phone-based OTP via MSG91**. This is a deliberate implementation choice but diverges from the original spec.

### TypeScript Errors
All TypeScript errors are caused by missing `node_modules/` (dependencies not installed in this environment). When `npm install` is run, these resolve. Error categories:
- `Cannot find module 'react'` — missing dependency
- `Cannot find module '@prisma/client'` — missing dependency
- `Cannot find module 'zustand'` — missing dependency
- Implicit `any` types in some UI components (select.tsx, sheet.tsx, use-cart.ts)

**Total TS errors:** ~100 (all module-resolution; would reduce to ~20 implicit-any after npm install)

---

## 1I — What's Next (Priority Order)

1. **Connect category listing to API** — Replace hardcoded CATEGORIES with `fetch('/api/products?categorySlug=...')`. API already exists and supports full filtering.

2. **Connect product detail to API** — Replace hardcoded addons/reviews with `fetch('/api/products/[id]')`. API returns addons and reviews.

3. **Wire checkout to order creation API** — Replace setTimeout placeholder with `POST /api/orders` call, then initiate Razorpay payment flow via `POST /api/payments/create-order`.

4. **Connect trending products to API** — Replace hardcoded array with a fetch to `/api/products?sortBy=rating&pageSize=10`.

5. **Add real product images** — Upload product images to Supabase Storage, update seed data with real URLs.

6. **Fix implicit-any TypeScript errors** — Add proper type annotations to select.tsx, sheet.tsx, use-cart.ts (~20 errors).

7. **Create city landing page** — `src/app/(shop)/[city]/page.tsx` for city-specific browsing.

8. **Add coupon validation API** — Server-side coupon validation endpoint.

9. **Implement admin order actions** — Wire up quote view, edit order, cancel order buttons in admin order detail.

10. **Add public/logo.svg and public/icons/** — Brand assets.

11. **Phase 3: Vendor dashboard** — Full vendor management UI.

12. **Phase 3: Partner/referral system** — Partner branding and earnings.

13. **Decide on SMS vs Email OTP** — Either implement MSG91 for phone OTP or formally adopt email OTP approach.
