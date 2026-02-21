# PROGRESS.md — Gifts Cart India Project Tracker

> **IMPORTANT:** This file MUST be read and updated at the start of every Claude Code session.

---

## 1A — Project Status Summary

|Field          |Value                                                                             |
|---------------|----------------------------------------------------------------------------------|
|Platform Name  |Gifts Cart India                                                                  |
|Business Entity|Cital Enterprises                                                                 |
|Domain         |giftscart.in (production, eventual)                                               |
|Live Staging   |https://giftscart.netlify.app                                                     |
|Supabase       |https://saeditdtacprxcnlgips.supabase.co                                          |
|Current Phase  |Phase A + B + C + D + E + F + Sprint 1 complete. Phase 3 ongoing.|
|Last Updated   |2026-02-20                                                                        |

### What's Done

- Full Prisma schema 31 models deployed to Supabase
- All 15 API routes with real Prisma queries
- Auth: email OTP via Brevo (intentional deviation from phone+MSG91 spec)
- Homepage, order history, order tracking — connected to real API
- Admin dashboard: orders, vendor management, delivery config (real data)
- Vendor dashboard: orders, products, earnings, settings (real data — Phase 3 PR #46)
- Multi-currency support with sync-exchange-rates scheduled function
- Guest checkout support
- Referral logo branding system (?ref=CODE)
- Platform rebrand: Gifts Cart India by Cital Enterprises
- Netlify auto-deploy from GitHub, build passing
- Phase A: Schema foundation — variations (JSONB), addon groups, upsells, SEO fields, category templates, seo_settings, vendor variation availability
- Phase B: SEO infrastructure — generateMetadata on product/category/home pages, JSON-LD structured data (Product, BreadcrumbList, Organization, LocalBusiness), sitemap.xml, robots.txt, breadcrumb component, admin SEO settings page
- Phase C: Admin product form — WooCommerce-style tabbed create/edit form (General, Pricing, Inventory, Images, Attributes, Variations, Add-ons, SEO, Advanced), product list with filters/pagination/bulk actions, admin product CRUD API routes, category addon template sync
- Phase D: Customer-facing variations & add-ons — attribute-based variation selector, addon group display (all 6 types), file upload addon with Supabase Storage, upsell products section, cart with variationId + addonSelections, variation-level vendor matching in order creation
- Phase E: AI content & image generation — Claude API for SEO content, GPT-image-1 for product images, AI generator panel in product form (Images + SEO tabs), reference image support, Supabase Storage upload
- Phase F: Category management & addon templates — Admin category CRUD API (tree structure), category form (Sheet with General/SEO/Addon Templates tabs), hierarchical category list page, bulk template propagation, per-product addon group re-sync API, detach/re-sync controls in product form
- Fixed products API 500 — updated stale `addons` includes to use `addonGroups` relation in products list, product detail, and cart API routes
- Product detail API: added `isVerified` filter to reviews query, verified all Prisma includes use `addonGroups` not `addons`
- Fixed AI image generation — corrected model name references from `GPT-image-1.5` to `gpt-image-1`, verified base64 response handling and Supabase Storage upload
- Sprint 1: City-First UX + Schema Integration — new tables (pincode_city_map, city_notifications, product_relations, image_generation_jobs, catalog_imports), city resolver API, CityProvider rewrite (stores full city+pincode+zone), city selection modal (site load blocker), CitySearch component, header city display, products/categories API citySlug filter, [city] page with coming-soon support
- Fixed city resolve API 500 error — Prisma field `pincodePrefixes` was auto-mapping to `pincode_prefixes` but DB column is `pincode_prefix` (singular); added `@map("pincode_prefix")` to schema. Rewrote resolve route to use `$queryRaw` for alias ILIKE search (Prisma array filters don't support ILIKE) and partial pincode matching. Added detailed error logging in catch block.
- **Fixed all Netlify API 500 errors** — Root cause: Netlify's `npx prisma generate` resolved to Prisma v7 (latest) instead of the project's v5.22.0. Prisma v7 dropped support for `url`/`directUrl` in datasource, breaking the generated client. Fix: pinned `prisma` and `@prisma/client` to exact `5.22.0` (removed `^` caret), changed build script to `npx prisma@5.22.0 generate && next build`. Also restored city/resolve route from diagnostic stub back to full implementation. All 24+ API routes should now work correctly on Netlify.
- **Mobile viewport zoom fix** — Added `viewport` export to layout.tsx with `maximumScale: 1, userScalable: false` to prevent iOS Safari zoom on input focus. Changed all input/select/textarea elements to `text-base` (16px minimum) to avoid iOS auto-zoom trigger. Updated `input.tsx`, `select.tsx`, login page, checkout textareas, and city-search notify input.
- **Skeleton loaders** — Created reusable `ProductCardSkeleton` and `ProductGridSkeleton` components. Added `TrendingSkeleton` and `CategoryGridSkeleton` for homepage sections. Wired skeletons into trending-products (loading state), category page (both initial load and product fetch), and updated existing inline skeletons to use shared components. Added shimmer CSS animation to globals.css. Updated base `Skeleton` component to use `bg-gray-200`.
- **City modal instant chips + API optimization** — City chips now use static hardcoded data from `src/lib/cities-data.ts` — zero API calls for chip selection. CitySearch does local-first filtering for popular cities before hitting the API. Search debounce increased to 400ms, partial pincodes (1-3 digits) skip API calls. Header dropdown shows popular city chips immediately when opened. API pre-warmed on page load to prevent cold start latency. City resolve responses cached at CDN edge (5 min s-maxage, 10 min stale-while-revalidate).

### What's NOT Done (Priority Order)

#### Customer-Facing Fixes (needed before launch)

- Checkout — connect to real order creation API + Razorpay payment integration
- ~~Connect category listing page to real API (currently hardcoded CATEGORIES object)~~ — **DONE** (client component fetches from /api/categories + /api/products)
- Connect trending products to real API (currently hardcoded array)

#### Product System (Phases A–F — COMPLETE)

- ~~Schema foundation (Phase A)~~ — **DONE**
- ~~SEO infrastructure (Phase B)~~ — **DONE**
- ~~Admin product form (Phase C)~~ — **DONE**
- ~~Customer-facing variations & addons (Phase D)~~ — **DONE**
- ~~AI content + image generation (Phase E)~~ — **DONE**
- ~~Category management & addon templates (Phase F)~~ — **DONE**

#### Management Features (Phase 3 continuation)

- Admin delivery configuration UI
- Vendor delivery config (pincodes, slots, capacity)
- Coupon management
- Partner/referral management
- Audit log viewer

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
| `src/app/page.tsx` | Yes (redirect) | N/A | ✅ Not needed — `(shop)/page.tsx` route group serves `/` |
| `src/app/globals.css` | Yes | Yes | ✅ Exists & Working |
| `src/app/(auth)/login/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(auth)/register/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(shop)/layout.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(shop)/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(shop)/[city]/page.tsx` | Yes | Yes | ✅ Exists & Working (dynamic city data from API) |
| `src/app/(shop)/category/[slug]/page.tsx` | Yes | Yes | ✅ Exists & Working (real API data) |
| `src/app/(shop)/product/[slug]/page.tsx` | Yes | Yes | ✅ Exists & Working (real API data: variations, addonGroups, reviews) |
| `src/app/(shop)/cart/page.tsx` | Yes | Yes | ✅ Exists & Working (Zustand) |
| `src/app/(shop)/checkout/page.tsx` | Yes | Yes | ✅ Exists & Working (multi-gateway checkout) |
| `src/app/(shop)/orders/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/(shop)/orders/[id]/page.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/vendor/layout.tsx` | Yes | Yes | ✅ Exists (Phase 3 shell) |
| `src/app/vendor/page.tsx` | Yes | Yes | ✅ Phase 3 placeholder (intentional) |
| `src/app/admin/layout.tsx` | Yes | Yes | ✅ Exists & Working |
| `src/app/admin/page.tsx` | Yes | Yes | ✅ Exists & Working (real API data) |
| `src/app/admin/orders/page.tsx` | Not in spec | Yes | ✅ Bonus — admin order list |
| `src/app/admin/orders/[id]/page.tsx` | Not in spec | Yes | ✅ Bonus — admin order detail |
| `src/app/admin/products/page.tsx` | Yes (Phase C) | Yes | ✅ Product list with filters/pagination |
| `src/app/admin/products/new/page.tsx` | Yes (Phase C) | Yes | ✅ Create product form |
| `src/app/admin/products/[id]/edit/page.tsx` | Yes (Phase C) | Yes | ✅ Edit product form |
| `src/app/admin/categories/page.tsx` | Yes (Phase F) | Yes | ✅ Category tree list page |
| `src/app/admin/seo/page.tsx` | Yes (Phase B) | Yes | ✅ Admin SEO settings form |
| `src/app/sitemap.ts` | Yes (Phase B) | Yes | ✅ Dynamic sitemap from DB |
| `src/app/robots.ts` | Yes (Phase B) | Yes | ✅ Configurable robots.txt |

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
| `src/components/product/variation-selector.tsx` | Yes (Phase D) | Yes | ✅ Attribute-based variation picker |
| `src/components/product/addon-selector.tsx` | Yes (legacy) | Yes | ✅ Legacy addon selector |
| `src/components/product/addon-group.tsx` | Yes (Phase D) | Yes | ✅ Renders all 6 addon types |
| `src/components/product/file-upload-addon.tsx` | Yes (Phase D) | Yes | ✅ FILE_UPLOAD addon widget |
| `src/components/product/upsell-products.tsx` | Yes (Phase D) | Yes | ✅ "Complete Your Gift" section |
| `src/components/product/review-list.tsx` | Yes | Yes | ✅ |
| `src/components/cart/cart-item.tsx` | Yes | Yes | ✅ |
| `src/components/cart/cart-summary.tsx` | Yes | Yes | ✅ |
| `src/components/cart/coupon-input.tsx` | Yes | Yes | ✅ |
| `src/components/providers/session-provider.tsx` | Yes | Yes | ✅ |
| `src/components/providers/city-provider.tsx` | Yes | Yes | ✅ |
| `src/components/providers/cart-provider.tsx` | Yes | Yes | ✅ |
| `src/components/providers/currency-provider.tsx` | No (added) | Yes | ✅ CurrencyProvider + useCurrency hook |
| `src/components/seo/json-ld.tsx` | Yes (Phase B) | Yes | ✅ JSON-LD script injector |
| `src/components/seo/breadcrumb.tsx` | Yes (Phase B) | Yes | ✅ Visual breadcrumb + BreadcrumbList schema |
| `src/components/location/city-search.tsx` | Yes (Sprint 1) | Yes | ✅ Reusable city search with debounce + dropdown |
| `src/components/location/city-modal.tsx` | Yes (Sprint 1) | Yes | ✅ City selection modal (site load blocker) |
| `src/components/location/city-gate.tsx` | Yes (Sprint 1) | Yes | ✅ Conditional modal renderer |

### Source — Lib Files

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `src/lib/prisma.ts` | Yes | Yes | ✅ Singleton pattern |
| `src/lib/supabase.ts` | Yes | Yes | ✅ Storage + realtime only |
| `src/lib/auth.ts` | Yes | Yes | ✅ NextAuth handler |
| `src/lib/auth-options.ts` | Yes | Yes | ⚠️ Uses email OTP (spec says phone+MSG91) |
| `src/lib/razorpay.ts` | Yes | Yes | ✅ createOrder + verifySignature |
| `src/lib/stripe.ts` | No (added) | Yes | ✅ Stripe Checkout Sessions, webhook verification |
| `src/lib/paypal.ts` | No (added) | Yes | ✅ PayPal REST API v2 (OAuth, create, capture) |
| `src/lib/geo.ts` | No (added) | Yes | ✅ IP-based geo-detection, country resolution |
| `src/lib/msg91.ts` | Yes | No | ❌ Missing (using Brevo email instead) |
| `src/lib/email.ts` | Yes | Yes | ✅ SendGrid integration |
| `src/lib/brevo.ts` | Not in spec | Yes | ✅ Brevo email OTP sender |
| `src/lib/utils.ts` | Yes | Yes | ✅ cn(), formatPrice(), generateOrderNumber() |
| `src/lib/validations.ts` | Yes | Yes | ✅ All Zod schemas implemented |
| `src/lib/seo.ts` | Yes (Phase B) | Yes | ✅ Metadata + JSON-LD utility functions |
| `src/lib/cities-data.ts` | Yes (Perf) | Yes | ✅ Static popular cities data for instant chip selection |

### Source — Other

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `src/middleware.ts` | Yes | Yes | ✅ Auth + role-based route protection |
| `src/hooks/use-city.ts` | Yes | Yes | ✅ |
| `src/hooks/use-cart.ts` | Yes | Yes | ✅ Zustand with persist |
| `src/hooks/use-currency.ts` | No (added) | Yes | ✅ Re-exports useCurrency from provider |
| `src/types/index.ts` | Yes | Yes | ✅ All types defined |
| `src/types/next-auth.d.ts` | Not in spec | Yes | ✅ Type augmentation |

### Public

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `public/logo.svg` | Yes | Yes | ✅ Brand logo with gift box icon |
| `public/placeholder-product.svg` | Yes | Yes | ✅ |
| `public/icons/` | Yes | Yes | ✅ Category icons (cakes, flowers, combos, plants, gifts) |

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
| ProductVariation | `product_variations` | /api/products, /api/products/[id] (nested) | variation-selector | ✅ 49 variations (JSONB attributes format) |
| ProductAttribute | `product_attributes` | /api/products/[id] (nested) | variation-selector | No |
| ProductAttributeOption | `product_attribute_options` | /api/products/[id] (nested) | variation-selector | No |
| ProductAddonGroup | `product_addon_groups` | /api/products/[id] (nested) | addon-group | Migrated from product_addons |
| ProductAddonOption | `product_addon_options` | /api/products/[id] (nested) | addon-group | Migrated from product_addons |
| ProductUpsell | `product_upsells` | /api/products/[id] (nested) | upsell-products | No |
| VendorProductVariation | `vendor_product_variations` | /api/orders (vendor matching) | — | No |
| CategoryAddonTemplate | `category_addon_templates` | — | — | ✅ Cakes: Name on Cake, Message Card |
| CategoryAddonTemplateOption | `category_addon_template_options` | — | — | ✅ 3 options (No Card, Printed, Premium) |
| SeoSettings | `seo_settings` | /api/admin/seo | admin/seo page | ✅ 1 row (singleton) |
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
| CurrencyConfig | `currency_configs` | /api/currencies/resolve, /api/admin/currencies | CurrencyProvider, admin settings | ✅ 5 currencies |
| AuditLog | `audit_logs` | — | — | No |
| PincodeCityMap | `pincode_city_map` | /api/city/resolve | city-search | No |
| CityNotification | `city_notifications` | /api/city/notify | city-search, [city] page | No (runtime) |
| ProductRelation | `product_relations` | — | — | No |
| ImageGenerationJob | `image_generation_jobs` | — | — | No |
| CatalogImport | `catalog_imports` | — | — | No |

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
| `/api/products/[id]` | ✅ | Yes | GET | Product with attributes, variations, addon groups, upsells, reviews |
| `/api/customer/upload-addon-file` | ✅ | Supabase Storage | POST | Addon file upload to order-uploads bucket |
| `/api/categories` | ✅ | Yes | GET | Active categories with hierarchy and product counts |
| `/api/serviceability` | ✅ | Yes | POST | Zone/pincode check, vendor count, available slots |
| `/api/cart` | ✅ | Yes | GET, POST, PUT, DELETE | Full CRUD with product includes |
| `/api/orders` | ✅ | Yes | GET, POST | List (paginated) + create from cart (transaction) |
| `/api/orders/[id]` | ✅ | Yes | GET | Order with items, address, payment, status history |
| `/api/payments/create-order` | ✅ | Yes + Multi-gateway | POST | Creates Razorpay/Stripe/PayPal/COD order |
| `/api/payments/verify` | ✅ | Yes + Multi-gateway | POST | Verifies payment across all gateways |
| `/api/payments/stripe/webhook` | ✅ | Yes + Stripe | POST | Stripe webhook handler (checkout.session.completed, payment_intent.payment_failed) |
| `/api/payments/paypal/capture` | ✅ | Yes + PayPal | GET | PayPal redirect capture handler |
| `/api/geo` | ✅ | No | GET | Returns region, country, currency, available gateways |
| `/api/currencies/resolve` | ✅ | Yes | GET | Resolves visitor country → currency config from DB |
| `/api/admin/currencies` | ✅ | Yes | GET, POST, PUT, DELETE | Full CRUD for currency configs |
| `/api/upload` | ✅ | Supabase Storage | POST | Generates signed upload URL |
| `/api/admin/dashboard` | ✅ | Yes | GET | Today's orders, revenue, HITL count, recent activity |
| `/api/admin/seo` | ✅ | Yes | GET, PUT | SEO settings CRUD (Phase B) |
| `/api/admin/products` | ✅ | Yes | GET, POST | Product list with filters + create (Phase C) |
| `/api/admin/products/[id]` | ✅ | Yes | GET, PUT, DELETE | Product detail, update, soft delete (Phase C) |
| `/api/admin/categories` | ✅ | Yes | GET, POST | Full CRUD: tree list + create with templates (Phase F) |
| `/api/admin/categories/[id]` | ✅ | Yes | GET, PUT, DELETE | Single category, update with propagation, soft delete (Phase F) |
| `/api/admin/categories/[id]/sync-templates` | ✅ | Yes | POST | Bulk template propagation to linked products (Phase F) |
| `/api/admin/products/[id]/sync-addon-group` | ✅ | Yes | POST | Re-sync one addon group to category template (Phase F) |
| `/api/admin/products/generate-content` | ✅ | Claude + OpenAI + Supabase Storage | POST | AI content generation + image generation (Phase E) |
| `/api/city/resolve` | ✅ | Yes | POST | City resolver: pincode + text search (Sprint 1) |
| `/api/city/notify` | ✅ | Yes | POST | City notification: email signup for coming-soon cities (Sprint 1) |

**All 24+ API routes are fully implemented with real database queries.**

---

## 1E — Frontend Pages Audit

| Page | Exists | Data Source | Status |
|------|--------|-------------|--------|
| `/(auth)/login` | ✅ | API (OTP send/verify + NextAuth) | ✅ Real — email OTP flow works |
| `/(auth)/register` | ✅ | API (register + auto-OTP) | ✅ Real |
| `/(shop)/page.tsx` (homepage) | ✅ | Child components | ✅ Real — server component |
| `/(shop)/category/[slug]` | ✅ | API (GET /api/products) | ✅ Real — connected to API |
| `/(shop)/product/[slug]` | ✅ | API (GET /api/products/[id]) | ✅ Real — addons + reviews from API |
| `/(shop)/cart` | ✅ | Zustand store (client-side) | ✅ Working (client-side cart) |
| `/(shop)/checkout` | ✅ | API (multi-gateway) | ✅ Real — full checkout with Razorpay/Stripe/PayPal/COD |
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
| `components/home/trending-products.tsx` | ✅ Now fetches from `/api/products` API |
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
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | checkout page | Yes | Razorpay public key for JS SDK |
| `STRIPE_SECRET_KEY` | stripe.ts | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | stripe.ts | Yes | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | checkout page | Yes | Stripe public key |
| `PAYPAL_CLIENT_ID` | paypal.ts | Yes | PayPal REST API client ID |
| `PAYPAL_CLIENT_SECRET` | paypal.ts | Yes | PayPal REST API secret |
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
| `src/app/(shop)/cart/page.tsx` | 22 | Coupon logic is placeholder |

### TODO/FIXME Items
| File | Line | Content |
|------|------|---------|
| `src/app/admin/orders/[id]/page.tsx` | 220 | `// TODO: Navigate to quote view` |
| `src/app/admin/orders/[id]/page.tsx` | 234 | `// TODO: Navigate to edit order` |
| `src/app/admin/orders/[id]/page.tsx` | 245 | `// TODO: Cancel order confirmation` |

### Auth System Deviation
The OtpVerification Prisma model has an `email` field (line 42-43 in schema) while the CLAUDE.md spec defines it with a `phone` field. The implementation currently uses **email-based OTP via Brevo** instead of **phone-based OTP via MSG91**. This is a deliberate implementation choice but diverges from the original spec.

### TypeScript Errors
**Status: CLEAN** — `npx tsc --noEmit` passes with 0 errors when `node_modules/` is installed. Previous errors were all caused by missing dependencies.

---

## 1I — What's Next (Priority Order)

### Completed Since Last Update
- ~~Add real product images~~ — Done (PR #41, 27 products with Supabase URLs)
- ~~Fix implicit-any TypeScript errors~~ — Done (0 TS errors with deps installed)
- ~~Create city landing page~~ — Done (`[city]/page.tsx` with dynamic API data)
- ~~Add coupon validation API~~ — Done (`/api/coupons/validate` with full server-side logic)
- ~~Implement admin order actions~~ — Done (PR #40)
- ~~Add public/logo.svg and public/icons/~~ — Done (brand logo + 5 category icons)
- ~~Fix cart price bug~~ — Done (PR #44, Prisma Decimal string concatenation)

### Remaining Work

1. ~~**Phase B: SEO Infrastructure**~~ — **COMPLETE.** generateMetadata on all pages, JSON-LD components, sitemap.xml, robots.txt, breadcrumbs, admin SEO settings page.

2. ~~**Phase C: Admin Product Form**~~ — **COMPLETE.** WooCommerce-style tabbed product form (create + edit), admin product CRUD API, product list with filters/pagination, category addon template sync.

3. ~~**Phase D: Customer-Facing Variations & Add-ons**~~ — **COMPLETE.** Attribute-based variation selector, addon group display (CHECKBOX, RADIO, SELECT, TEXT_INPUT, TEXTAREA, FILE_UPLOAD), file upload to Supabase Storage, upsell products section, cart with variationId + addonSelections, variation-level vendor matching.

4. ~~**Phase E: AI Content & Image Generation**~~ — **COMPLETE.** Claude API content generation, GPT-image-1 product image generation, AI generator panel in product form (Images + SEO tabs), reference image support, Supabase Storage upload.

5. ~~**Phase F: Category Management & Addon Templates**~~ — **COMPLETE.** Admin category CRUD API (tree structure, propagation), category form Sheet, hierarchical list page, bulk template sync, per-product addon group re-sync/detach.

6. **Run migration 002** — Execute `prisma/migrations/002_sync_schema.sql` in Supabase SQL Editor to add missing columns (order_items: variationId/variationLabel, payments: gateway + multi-gateway columns, cart_items: variationId) and create currency_configs table. **This blocks admin order creation (causes 500 error).**

3. **Run seed with currencies** — `npx prisma db seed` to populate INR, USD, GBP, AED, EUR currency configs.

4. **Phase 3: Vendor dashboard** — Full vendor management UI (currently placeholder).

5. **Phase 3: Partner/referral system** — Partner branding, subdomain routing, and earnings tracking.

6. **Decide on SMS vs Email OTP** — Either implement MSG91 for phone OTP or formally adopt email OTP approach.

7. **Add coupon admin CRUD** — Admin UI for creating/managing coupons (no admin page exists yet).

8. **Add review submission** — Allow customers to submit reviews on delivered orders.

9. **Supabase Realtime** — Wire up real-time order notifications for vendors.

---

## 1J — Multi-Gateway Payment System

### Architecture
- **Geo-detection**: IP-based via CF-IPCountry / x-vercel-ip-country / x-country headers
- **India visitors**: Razorpay (primary) + COD — prices in INR
- **International visitors**: Stripe Checkout + PayPal — prices converted from INR via CurrencyConfig

### Payment Flows
| Gateway | Flow | Webhook/Callback |
|---------|------|-----------------|
| Razorpay | Frontend SDK → verify signature → confirm | Sync (signature verification) |
| Stripe | Redirect to Checkout → webhook on completion | Async (POST /api/payments/stripe/webhook) |
| PayPal | Redirect to PayPal → capture on return | Redirect (GET /api/payments/paypal/capture) |
| COD | Direct order confirmation | N/A |

### Files
- `src/lib/stripe.ts` — Stripe Checkout Sessions, webhook verification
- `src/lib/paypal.ts` — PayPal REST API v2 (OAuth, create order, capture)
- `src/lib/geo.ts` — IP-based geo-detection, currency conversion helpers
- `src/app/api/payments/create-order/route.ts` — Unified gateway router
- `src/app/api/payments/verify/route.ts` — Multi-gateway verification
- `src/app/api/payments/stripe/webhook/route.ts` — Stripe webhook handler
- `src/app/api/payments/paypal/capture/route.ts` — PayPal capture handler

---

## 1K — Admin-Configurable Currency System

### How It Works
1. Admin configures currencies in `/admin/settings/currencies` (code, symbol, exchange rate, markup%, rounding rule, country mappings)
2. On page load, `CurrencyProvider` calls `GET /api/currencies/resolve` which detects visitor country from IP headers
3. The API matches the country against configured currency `countries` arrays
4. If no match, falls back to the default currency (INR)
5. `useCurrency().formatPrice(inrAmount)` converts and formats: `(INR × exchangeRate) × (1 + markup%) → round → format`

### Database Model: CurrencyConfig
| Field | Type | Description |
|-------|------|-------------|
| code | String (unique) | ISO currency code (USD, INR, GBP) |
| name | String | Display name |
| symbol | String | Currency symbol ($, ₹, £) |
| symbolPosition | String | "before" or "after" |
| exchangeRate | Decimal | Units of this currency per 1 INR |
| markup | Decimal | Percentage markup on converted price |
| rounding | String | "nearest", "up", "down", "none" |
| roundTo | Decimal | Round to nearest X (0.01, 1, etc.) |
| locale | String | Intl.NumberFormat locale |
| countries | String[] | ISO country codes mapped to this currency |
| isDefault | Boolean | True for base currency (INR) |
| isActive | Boolean | Whether this currency is available |

### Seeded Currencies
| Code | Rate (per 1 INR) | Markup | Countries |
|------|-------------------|--------|-----------|
| INR | 1 | 0% | IN |
| USD | 0.012 | 3% | US, CA, AU, NZ |
| GBP | 0.0095 | 3% | GB |
| AED | 0.044 | 2% | AE |
| EUR | 0.011 | 3% | DE, FR, IT, ES, NL, etc. |

---

## 1L — Product Variation System (Weight/Size)

### Research Summary

**Source: Sahni Bakery (sahnibakery.com)** — Oldest bakery since 1947, Patiala, Punjab
- Categories: Biscuits, Cakes (12+ subcategories), Pastries, Dry Cakes, Rusks, Namkeens, Flowers, Gifts, Sweets, Festive Packagings, Decoration Items
- Cake prices range from ₹499 to ₹6,499 depending on weight variant
- Weight variants displayed as selectable buttons on product page

**Source: WooCommerce Pattern**
- **Variations** = attributes that change base price (weight, size, color) — each gets its own price, SKU, weight
- **Addons** = optional extras layered on top (candles, message, greeting card) — don't create new product versions
- Industry best practice: Use variations for weight/size, addons for customizations

**Source: Indian Bakery Standards (Winni, FNP, IGP)**
- Standard weight tiers: 500g, 1 Kg, 1.5 Kg, 2 Kg, 3 Kg, 5 Kg
- Price displayed dynamically based on selected weight
- Weight selector = clickable buttons (not dropdown)
- Avg price per kg: ₹1,000-1,500 (standard), ₹1,500-3,500 (premium/designer)

### Implementation

**New Prisma Model: `ProductVariation`**
| Field | Type | Description |
|-------|------|-------------|
| id | String | cuid |
| productId | String | FK to Product |
| type | String | "weight", "size", "pack", "tier" |
| label | String | Display: "500g", "1 Kg", "2 Kg" |
| value | String | Sortable: "500", "1000", "2000" |
| price | Decimal | Absolute price for this variation |
| sku | String? | Optional SKU suffix |
| sortOrder | Int | Display order |
| isDefault | Boolean | Auto-selected on page load |
| isActive | Boolean | Whether variation is available |

**Unique constraint:** `(productId, type, value)` — prevents duplicate variations

### Files Changed
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `ProductVariation` model, `variationId`/`variationLabel` on OrderItem, `variationId` on CartItem |
| `src/types/index.ts` | Added `ProductVariation`, `VariationSelection` interfaces; updated `Product`, `OrderItem`, `CartItem` |
| `src/hooks/use-cart.ts` | Added `variation` to `CartItemState`, `updateVariation` method, variation-aware `getSubtotal` |
| `src/components/product/variation-selector.tsx` | **NEW** — Renders weight/size buttons grouped by type |
| `src/app/(shop)/product/[slug]/page.tsx` | Added `VariationSelector`, auto-select default, variation-aware pricing |
| `src/components/cart/cart-item.tsx` | Shows variation label, uses variation price for totals |
| `src/app/api/products/route.ts` | Added `variations` to Prisma include |
| `src/app/api/products/[id]/route.ts` | Added `variations` to Prisma include |
| `prisma/seed.ts` | Added 8 new top-level categories, 6 new cake subcategories, 20+ new products, weight variations for all cakes and sweets |
| `CLAUDE.md` | Added ProductVariation model to schema, variation system docs, expanded categories list |

### Seeded Variations
**Cake weight variations (6 products x 5 weights = 30 variations):**
| Weight | Multiplier | Example (Chocolate Truffle, base ₹599) |
|--------|------------|----------------------------------------|
| 500g (Half Kg) | 1x | ₹599 |
| 1 Kg | 1.85x | ₹1,108 |
| 1.5 Kg | 2.7x | ₹1,617 |
| 2 Kg | 3.5x | ₹2,097 |
| 3 Kg | 5x | ₹2,995 |

**Photo Cake variations (1 product x 4 weights = 4 variations, starts at 1 Kg):**
| Weight | Price |
|--------|-------|
| 1 Kg | ₹899 |
| 1.5 Kg | ₹1,349 |
| 2 Kg | ₹1,749 |
| 3 Kg | ₹2,499 |

**Sweet weight variations (5 products x 3 weights = 15 variations):**
| Weight | Multiplier | Example (Kaju Katli, base ₹599) |
|--------|------------|--------------------------------|
| 250g | 0.55x | ₹329 |
| 500g | 1x | ₹599 |
| 1 Kg | 1.9x | ₹1,138 |

### New Categories Added (Sahni Bakery inspired)
| Category | Type | Products |
|----------|------|----------|
| Pastries | Top-level | Chocolate Pastry, Black Forest Pastry, Red Velvet Pastry, Butterscotch Pastry, Pineapple Pastry |
| Sweets | Top-level | Milk Cake, Kalakand, Kaju Katli, Gulab Jamun, Rasmalai |
| Dry Cakes | Top-level | Fruit Dry Cake, Chocolate Dry Cake |
| Biscuits & Rusks | Top-level | Fruit Cake Rusk, Atta Biscuits |
| Namkeen & Snacks | Top-level | Mathri, Mix Namkeen |
| Decoration Items | Top-level | Sparkling Birthday Candle, Happy Birthday Banner |
| Festive Hampers | Top-level | Diwali Dry Fruit Hamper, Festive Sweet Box |
| Chocolates | Top-level | Assorted Chocolate Box, Dark Chocolate Truffles |
| Premium Cakes | Sub (Cakes) | — |
| Fondant Cakes | Sub (Cakes) | — |
| Wedding Cakes | Sub (Cakes) | — |
| Anniversary Cakes | Sub (Cakes) | — |
| Customized Cakes | Sub (Cakes) | — |
| Valentine's Cakes | Sub (Cakes) | — |

### Next Steps
1. Run `prisma db push` to deploy the `product_variations` table
2. Run `npx prisma db seed` to populate variations and new categories/products
3. Add admin CRUD for managing product variations
4. Add variation support to vendor product pricing (vendor-specific variation prices)

---

## 1J — Architectural Decisions Log

Record of key design decisions made during planning. Reference before building
any feature in these areas.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth method | Email OTP via Brevo | MSG91 signup issues; email works reliably |
| Egg preference | Variation (not addon) | Defines what product IS; determines vendor eligibility |
| Candles/Balloons | Upsell products (not addons) | Can be ordered independently; cleaner separation |
| Addon templates | Option B (linked copies) | Full per-product flexibility + auto-propagation via template_group_id |
| Template propagation | Explicit detach (is_overridden flag) | Prevents accidental detachment from implicit edits |
| Vendor availability | Variation level (vendor_product_variations) | Supports eggless-only vendors correctly |
| Photo upload | FILE_UPLOAD addon type on photo cake product | order-uploads bucket (private), signed URLs |
| URL structure | Flat (/product/slug, /category/slug) | City-prefixed URLs too complex, local SEO via content signals |
| Image generation | gpt-image-1 (not DALL-E 3) | Natively multimodal, accepts reference image, 4x faster |
| SEO content | Claude claude-opus-4-5 | Best copywriting quality for Indian gifting context |
| Storage buckets | products (public) + order-uploads (private) | Customer photos must never be publicly accessible |
| Product upsells | Separate product_upsells table | Clean cart line items, separate vendor assignment |
