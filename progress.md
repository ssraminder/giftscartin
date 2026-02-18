# Gifts Cart India — Progress Tracker

**Last Updated:** 2026-02-18 (Phase 3 complete)

---

## Phase 1: Core Build — COMPLETED

All Phase 1 build steps have been completed:

| # | Step | Status |
|---|------|--------|
| 1 | Install dependencies | Done |
| 2 | Prisma schema + DB push | Done |
| 3 | Lib files (prisma, supabase, utils, auth-options, brevo, razorpay, validations) | Done |
| 4 | NextAuth + OTP send/verify routes | Done |
| 5 | UI components (button, input, card, badge, skeleton, dialog, sheet, select, label, separator, avatar, dropdown-menu) | Done |
| 6 | Layout (header, footer, mobile-nav, city-selector) | Done |
| 7 | Providers (session-provider, city-provider, cart-provider/Zustand) | Done |
| 8 | Homepage (hero-banner, category-grid, trending-products, occasion-nav) | Done |
| 9 | Product pages (category listing + filters, product detail + gallery + slot picker) | Done |
| 10 | Cart & checkout pages | Done |
| 11 | API routes (products, categories, serviceability, cart, orders, payments) | Done |
| 12 | Auth pages (login OTP flow, register) | Done |
| 13 | Middleware (route protection for /checkout, /orders, /vendor, /admin) | Done |
| 14 | Seed data (cities, categories, products, vendor, partner) | Done |
| 15 | Vendor & admin shells (layout + placeholder pages) | Done |
| 16 | netlify.toml | Done |

---

## Phase 2: Integration & Enhancements — COMPLETED

| Feature | Status | PR |
|---------|--------|-----|
| Connect frontend to real APIs + city page + TypeScript fixes | Done | #32 |
| Full checkout flow with order creation API | Done | #33 |
| Multi-gateway payments (Razorpay + Stripe + PayPal + COD) | Done | — |
| Admin-configurable currency system (multi-currency support) | Done | #34 |
| Daily exchange rate sync (ExchangeRate-API) | Done | — |
| Product weight/size variation system + expanded categories | Done | #35 |
| Exchange rate sync fixes (timeout, fallback API, error UI) | Done | #37, #38 |
| Currency preset dropdown + live rate fetch | Done | #38 |
| Admin pages for vendors, products, cities management | Done | latest |
| Product images from Supabase storage | Done | #41 |
| Image display fix (Next.js config) | Done | #42 |
| Cart price bug fix (Prisma Decimal) | Done | #44 |

---

## Phase 3: Vendor Dashboard & Admin Enhancements — COMPLETED

### Vendor Dashboard (Full Build)

| Feature | Status | Details |
|---------|--------|---------|
| Vendor API routes | Done | `/api/vendor/dashboard`, `/api/vendor/orders`, `/api/vendor/products`, `/api/vendor/earnings`, `/api/vendor/settings` |
| Vendor dashboard page | Done | Real-time metrics: today's orders, pending orders, week/month earnings, rating, online status, recent orders |
| Vendor orders page | Done | Full order list with status filters (all/pending/confirmed/preparing/etc.), pagination, delivery info |
| Vendor order detail page | Done | Order details, status progress bar, accept/reject/preparing/out-for-delivery/delivered actions with notes, customer info, gift message, status history |
| Vendor products page | Done | Product catalog with availability toggle, inline cost price/prep time/daily limit editing, variation display |
| Vendor earnings page | Done | Revenue/commission/net breakdown by period (week/month/all), order-level earnings table, payout history, pending payout calculation |
| Vendor settings page | Done | Full profile editor (business name, phone, email, address), online/offline toggle, auto-accept toggle, vacation mode, PAN/GST/FSSAI documents, bank details, working hours display, delivery pincodes display |
| Real-time order notifications | Done | Supabase Realtime subscription for new orders and status changes, bell icon with badge count, notification panel, audio beep on new notification |

### Admin Panel Enhancements

| Feature | Status | Details |
|---------|--------|---------|
| Vendor approval workflow | Done | Approve/reject/suspend/terminate vendors with confirmation dialogs, audit logging |
| Commission rate management | Done | Inline commission rate editing per vendor |
| Order vendor assignment | Done | Assign/reassign vendors to orders from admin order detail page |
| Admin vendor API | Done | `PATCH /api/admin/vendors/[id]` for status changes + `GET` for detail |
| Admin order assign API | Done | `POST /api/admin/orders/[id]/assign` for vendor assignment |

### New Files Created in Phase 3

```
src/app/api/vendor/
├── dashboard/route.ts          # Vendor metrics API
├── orders/
│   ├── route.ts                # Vendor orders list API
│   └── [id]/route.ts           # Vendor order detail + actions API
├── products/route.ts           # Vendor products list + update API
├── earnings/route.ts           # Vendor earnings + payouts API
└── settings/route.ts           # Vendor profile settings API

src/app/api/admin/
├── vendors/[id]/route.ts       # Admin vendor management API
└── orders/[id]/assign/route.ts # Admin order vendor assignment API

src/app/vendor/
├── page.tsx                    # Dashboard (replaced placeholder)
├── orders/
│   ├── page.tsx                # Orders list
│   └── [id]/page.tsx           # Order detail with actions
├── products/page.tsx           # Products management
├── earnings/page.tsx           # Earnings dashboard
└── settings/page.tsx           # Profile settings

src/components/vendor/
└── order-notifications.tsx     # Real-time notification bell component

src/hooks/
└── use-order-notifications.ts  # Supabase Realtime subscription hook
```

---

## Database Status

All 33 required tables exist in Supabase PostgreSQL:

| Table | Status |
|-------|--------|
| users | Seeded |
| otp_verifications | Ready |
| addresses | Ready |
| cities | Seeded (Chandigarh, Mohali, Panchkula) |
| city_zones | Seeded (Core, Extended, Outskirts for Chandigarh) |
| delivery_slots | Seeded (Standard, Fixed, Midnight, Early Morning, Express) |
| city_delivery_configs | Seeded |
| delivery_holidays | Ready |
| delivery_surcharges | Ready |
| vendors | Seeded (Sweet Delights Bakery — APPROVED) |
| vendor_working_hours | Seeded |
| vendor_slots | Seeded |
| vendor_holidays | Ready |
| vendor_pincodes | Seeded |
| vendor_zones | Ready |
| vendor_capacity | Seeded |
| categories | Seeded (Cakes, Flowers, Combos, Plants, Gifts + subcategories) |
| products | Seeded (20 products across all categories) |
| **product_variations** | **Created manually via SQL (was missing from initial migration)** |
| product_addons | Ready |
| vendor_products | Seeded (8 products linked to Sweet Delights Bakery) |
| orders | Ready |
| order_items | Ready |
| order_status_history | Ready |
| payments | Ready |
| vendor_payouts | Ready |
| partners | Seeded (Sweet Celebrations) |
| partner_earnings | Ready |
| cart_items | Ready |
| coupons | Ready |
| reviews | Ready |
| currency_configs | Seeded (INR default) |
| audit_logs | Ready |

---

## Known Issues & Fixes Applied

### 1. Missing `product_variations` table (FIXED)

**Problem:** The `product_variations` table was not created during the initial `prisma db push`. The `/api/products` endpoint returned 500 errors because the Prisma query includes `variations` relation.

**Fix:** Created the table manually via SQL:

```sql
CREATE TABLE product_variations (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    sku TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT product_variations_pkey PRIMARY KEY (id),
    CONSTRAINT product_variations_productId_type_value_key UNIQUE ("productId", type, value),
    CONSTRAINT product_variations_productId_fkey FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE
);
```

**Seed data:** Weight variations seeded for 5 cake products (500g, 1 Kg, 2 Kg each).

### 2. Frontend not passing `city` parameter to product API

**Problem:** The `trending-products.tsx` and `category/[slug]/page.tsx` components fetch from `/api/products` without passing the `city` query parameter. The API uses city to filter products by vendor availability.

**Impact:** Without `city`, the vendor filter is skipped and all active products are returned (which works for now since all products are active). When city filtering is enforced, products may not display.

**Status:** Low priority — works currently because the `if (city)` check makes the filter optional.

---

## File Structure Summary

```
src/
├── app/
│   ├── (auth)/login, register
│   ├── (shop)/[city], category/[slug], product/[slug], cart, checkout, orders
│   ├── admin/ (layout, page, orders, orders/[id], settings/currencies, vendors, products, cities)
│   ├── vendor/ (layout, page, orders, orders/[id], products, earnings, settings)
│   └── api/ (auth, products, categories, cart, orders, payments, serviceability,
│             upload, currencies, cities, coupons, geo, admin/, vendor/)
├── components/
│   ├── ui/ (button, input, card, badge, skeleton, dialog, sheet, select, etc.)
│   ├── layout/ (header, footer, mobile-nav, city-selector)
│   ├── home/ (hero-banner, category-grid, trending-products, occasion-nav)
│   ├── product/ (product-card, product-gallery, delivery-slot-picker,
│   │            variation-selector, addon-selector, review-list)
│   ├── cart/ (cart-item, cart-summary, coupon-input)
│   ├── vendor/ (order-notifications)
│   └── providers/ (session-provider, city-provider, cart-provider, currency-provider)
├── hooks/ (use-city, use-cart, use-currency, use-order-notifications)
├── lib/ (prisma, supabase, utils, auth-options, auth, brevo, razorpay,
│         stripe, paypal, email, geo, validations)
└── types/index.ts
```

---

## Deployment

- **Platform:** Netlify with `@netlify/plugin-nextjs`
- **Config:** `netlify.toml` at project root
- **Build command:** `npm run build`
- **Publish directory:** `.next`

---

## What's Next (Potential Phase 4)

- Customer order tracking page with real-time status updates
- Vendor onboarding self-registration flow
- Review & rating system (post-delivery)
- Coupon management admin UI
- Push notifications (FCM/Web Push)
- SEO optimization (meta tags, structured data, sitemap)
- Analytics dashboard (admin)
- Partner/referral portal
- Delivery partner tracking integration
