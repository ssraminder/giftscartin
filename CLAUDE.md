# Gifts Cart India — Project Specification
**Business Entity:** Cital Enterprises
**Live Staging:** https://giftscart.netlify.app
**Supabase:** https://saeditdtacprxcnlgips.supabase.co
**Last Updated:** 2026-02-23

---

## Overview
Gifts Cart India is an online gifting platform (similar to Winni.in/FNP) connecting
customers with local vendors for fresh cakes, flowers, and gifts delivery across India.
Starting with Chandigarh as pilot city. Branding shows "Gifts Cart India by Cital Enterprises"
or "[Partner Name] managed by Cital Enterprises" for referral partners.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 (App Router) + TypeScript | SSR, SEO-friendly |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first |
| Database | Supabase PostgreSQL via Supabase JS client | Service role key for server-side (bypasses RLS) |
| Auth | Custom JWT (jose) + Email OTP | httpOnly cookie, edge-compatible — NOT NextAuth |
| Email/OTP | Brevo API | Transactional email + OTP delivery |
| Email (legacy) | SendGrid | src/lib/email.ts — not primary |
| Payments | Razorpay | INR only, always |
| Storage | Supabase Storage | Two buckets: products (public), order-uploads (private) |
| AI — Content | Anthropic Claude API (claude-opus-4-5) | SEO copy generation |
| AI — Images | OpenAI gpt-image-1 | Product image generation |
| Hosting | Netlify | Auto-deploy from GitHub main |
| State | Zustand | Cart + UI state only |
| Scheduled Jobs | Netlify Functions | sync-exchange-rates runs daily 00:30 UTC |

---

## Architecture Decisions

### Core Rules — Never Violate
1. NEVER use Supabase Auth — all auth goes through custom JWT + Brevo email OTP
2. All DB queries use Supabase JS client (getSupabaseAdmin from src/lib/supabase.ts)
3. Supabase service role key is used server-side (bypasses RLS) — NEVER expose to client
4. All API inputs validated with Zod schemas (src/lib/validations.ts)
5. All API routes return: `{ success: boolean, data?: any, error?: string }`
6. Prices stored as Decimal in DB, converted to number only for display
7. INR is always the base/settlement currency — Razorpay charges in INR only
8. NEVER delete or modify netlify/functions/sync-exchange-rates.ts
9. Guest checkout is supported — do not add auth guards to order creation flow
10. Mobile-first design — design for mobile, enhance for desktop
11. Indian locale — prices in ₹, phone numbers 10 digits, pincodes 6 digits
12. NEVER use Prisma or NextAuth — they have been removed from the project

### Database Connection
- Supabase JS client connects via NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
- No direct PostgreSQL connection needed for queries
- For schema migrations: write explicit SQL in Supabase SQL Editor (no Prisma)
- Column names in DB are camelCase (matching old Prisma field names) unless @map was used

### Auth Flow
Email → POST /api/auth/otp/send (creates OTP record, sends via Brevo)
→ POST /api/auth/otp/verify (verifies, creates/finds user, signs JWT)
→ JWT set as httpOnly cookie (giftscart_session), 30-day expiry
→ GET /api/auth/me returns current user from JWT
→ POST /api/auth/logout clears session cookie

### Storage Buckets
- `products` — Public read. Product images, AI-generated images, category images.
  Path pattern: products/ai-generated/{timestamp}-{slug}.png
- `order-uploads` — Private. Customer-uploaded files (e.g. photo cake photos).
  Path pattern: pending/{sessionId}/{addonGroupId}/{timestamp}-{filename}
  Moved to: orders/{orderId}/{addonGroupId}/{filename} on order creation.
  Always accessed via signed URLs (60 min expiry) — never expose raw paths.

### City-First UX
- CityProvider stores full selection: cityId, cityName, citySlug, pincode, areaName, zoneId, zoneName
- Persisted to localStorage key "giftscart_city_v2" + cookie "gci_city_slug" (for SSR)
- City selection modal blocks site until user picks a city (no X/dismiss)
- Pincode → city resolution via POST /api/city/resolve
- Coming soon cities show notify form → POST /api/city/notify
- Products and categories API accept ?citySlug= to filter by vendor city

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Supabase dashboard → Settings → API → service_role

# Custom JWT Auth
JWT_SECRET=                  # generate: openssl rand -hex 32

# Site URL
NEXT_PUBLIC_SITE_URL=https://giftscart.netlify.app

# Email/OTP
BREVO_API_KEY=
BREVO_SENDER_EMAIL=        # e.g. noreply@cethos.com
BREVO_SENDER_NAME=         # Gifts Cart India

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# AI
ANTHROPIC_API_KEY=         # Claude API — product content generation
OPENAI_API_KEY=            # GPT-image-1 — product image generation
```

-----

## Business Model

### Model A — Platform Sales

Platform buys from vendor at cost price, sells at MRP. ~28% margin.

### Model B — Vendor Shops

Vendor sells through their branded shop. Platform charges 12% commission.

### Referral Partners

Partners earn 3-12% commission. URL parameter ?ref=CODE triggers branded storefront:
"[Partner Name] managed by Cital Enterprises" with partner logo in header.

-----

## Product System Architecture

### Product Types

- **SIMPLE** — single price, no variations (e.g. standard flower bouquet)
- **VARIABLE** — has variations with individual pricing (e.g. cakes by weight + egg preference)

### Variations System

Variations define what the product IS — different combinations of attributes with
their own pricing, images, and vendor availability.

Example — Chocolate Truffle Cake:

```
Attribute: Weight → [500g, 1kg, 1.5kg, 2kg]
Attribute: Egg Preference → [Eggless, With Egg]

Variations (cartesian product):
  Eggless / 500g  → ₹599
  Eggless / 1kg   → ₹899
  With Egg / 500g → ₹549
  With Egg / 1kg  → ₹799
  ... etc
```

**Egg Preference is always a VARIATION, never an addon** — it defines what the
product is and determines vendor eligibility.

### Vendor Availability at Variation Level

`vendor_products` — parent record (vendor offers this product)
`vendor_product_variations` — per-variation pricing and availability

A vendor who only makes eggless cakes marks all "With Egg" variations as
is_available = false. Order assignment matches at variation level, not product level.

### Addon Groups System (WooCommerce Product Add-ons style)

Addons define what's ADDED TO the product — customisations only meaningful
with the main product. Never use addons for things that can stand alone as products.

**Addon Types:**

|Type       |Use Case                                           |
|-----------|---------------------------------------------------|
|CHECKBOX   |Multiple selectable options (e.g. message card)    |
|RADIO      |Pick one from options (e.g. card type)             |
|SELECT     |Dropdown pick one (compact)                        |
|TEXT_INPUT |Short text (e.g. name on cake, max 20 chars)       |
|TEXTAREA   |Long text (e.g. message on card, max 100 chars)    |
|FILE_UPLOAD|Customer uploads a file (e.g. photo for photo cake)|

**FILE_UPLOAD addon specifics:**

- Uploaded to order-uploads bucket (private)
- Accessed via signed URLs in vendor order view
- Config: accepted_file_types[], max_file_size_mb
- Required for photo cake products

**Candles, Balloons, Teddy Bears = Upsell Products, NOT addons**
These are standalone products assigned as upsells via product_upsells table.
Shown in "Complete Your Gift" section on product detail page.
Each adds as a separate cart/order line item.

### Category Addon Templates (Option B — Linked Copies)

Templates defined at category level. Applied to products on creation.
After application, product owns its own copy linked back to template via
template_group_id.

Propagation: When template changes, all linked product_addon_groups where
is_overridden = false are automatically updated.

is_overridden is set EXPLICITLY by admin clicking "Detach from template"
in the product form — NOT triggered automatically by editing.

Admin can also "Re-sync" to reconnect a detached group to its template.

**Default template for Cakes category:**

- Name on Cake — TEXT_INPUT, optional, max 20 chars
- Message Card — CHECKBOX, optional
  Options: [No Card ₹0 (default), Printed Card ₹49, Premium Card ₹99]

**Photo Cakes add at product level:**

- Upload Your Photo — FILE_UPLOAD, required
  accepted: image/jpeg, image/png, max 5MB

### SEO Architecture

Every product and category has individual SEO fields.
`generateMetadata()` used on all pages (Next.js 14 Metadata API).
JSON-LD structured data on product pages (Product, BreadcrumbList schemas).
Dynamic sitemap.xml auto-generated from products + categories.

URL strategy: flat structure (not city-prefixed).
/category/[slug], /product/[slug], /[city] for city landing pages.

-----

## Completed Development History

### Phase 1 — Foundation (Complete as of Feb 17, 2026)

- Prisma schema 31 models deployed to Supabase
- 15 API routes with real Prisma queries
- NextAuth email OTP via Brevo
- Homepage, category pages (hardcoded data), product pages (hardcoded addons/reviews)
- Cart (Zustand), checkout UI (setTimeout placeholder), order history
- Admin dashboard + order management (real API data)
- Vendor dashboard shell (placeholder)
- Seed: 3 cities, 5 delivery slots, 12 categories, 27 products, 1 vendor
- Netlify auto-deploy from GitHub

### Phase 1.5 — Enhancements (Complete as of Feb 18, 2026 — PR #46)

- Platform rebrand: GiftIndia → Gifts Cart India by Cital Enterprises
- Guest checkout (orders without login, tracked by email)
- Product weight variations (groundwork)
- Multi-currency support (admin-managed rates, INR settlement)
- sync-exchange-rates Netlify scheduled function (daily 00:30 UTC)
- Referral logo branding (?ref=CODE → partner logo in header)
- Vendor dashboard: orders, products, earnings, settings (real data)
- Admin: vendor management, delivery config, order management (real data)

### Phase 3 — Currently in Progress

See PROGRESS.md section 1I for current task list.

### Phase A — Schema Foundation (Complete as of Feb 19, 2026)

- New tables: product_attributes, product_attribute_options, product_variations, product_addon_groups, product_addon_options, product_upsells, vendor_product_variations, category_addon_templates, category_addon_template_options, seo_settings
- New enums: ProductType, AddonType
- ProductVariation migrated to JSONB attributes
- Cakes category addon templates seeded

### Phase B — SEO Infrastructure (Complete as of Feb 19, 2026)

- generateMetadata on all pages, JSON-LD components, sitemap.xml, robots.txt, breadcrumbs, admin SEO settings

### Phase C — Product Form Admin (Complete as of Feb 19, 2026)

- WooCommerce-style tabbed product form (create + edit), admin product CRUD API, product list with filters/pagination, category addon template sync

### Phase D — Customer-Facing Variations & Add-ons (Complete as of Feb 19, 2026)

- Variation selector, addon group display (all 6 types), file upload addon, upsell products, cart with variationId + addonSelections, variation-level vendor matching

### Phase E — AI Content & Image Generation (Complete as of Feb 19, 2026)

- Claude API content generation, GPT-image-1 product images, AI generator panel in product form

### Phase F — Category Management & Addon Templates (Complete as of Feb 19, 2026)

- Admin category CRUD API with tree structure (GET list, POST create, PUT update with propagation, DELETE with guard)
- Category form component (Sheet) with General, SEO, and Addon Templates tabs
- Hierarchical category tree list page with expand/collapse, product counts, template badges
- Bulk template propagation endpoint (sync all linked non-overridden product addon groups)
- Per-product addon group re-sync API (POST /api/admin/products/[id]/sync-addon-group)
- Detach/re-sync controls in product form Add-ons tab

-----

## All Planned Product System Phases Complete
Phases A–F (schema, SEO, product form, customer variations, AI generation,
category management) are all complete as of 2026-02-19.

### Sprint 1 — City-First UX + Schema Integration (Complete as of Feb 20, 2026)
- New tables: pincode_city_map, city_notifications, product_relations, image_generation_jobs, catalog_imports
- Cities table: added aliases[], displayName, isComingSoon, notifyCount, pincodePrefixes[]
- City resolver API: POST /api/city/resolve (pincode + text search), POST /api/city/notify
- CityProvider rewritten: stores cityId, cityName, citySlug, pincode, areaName, zoneId, zoneName
- City selection modal: full-screen blocker until city is selected, popular city chips
- CitySearch reusable component: debounced search, coming-soon notify, pincode resolution
- Header: city display with inline dropdown change, pulsing "Select City" when unselected
- Products/Categories APIs: accept ?citySlug= to filter by vendor city
- [city]/page.tsx: coming-soon page with notify form, active city with hero + categories + trending

Next focus: complete Phase 3 items (checkout flow, Razorpay integration).

### Edge Migration (Complete as of Feb 23, 2026)

- Removed Prisma ORM — all DB queries now use Supabase JS client (getSupabaseAdmin)
- Removed NextAuth.js — replaced with custom JWT auth (jose library)
- Auth: JWT in httpOnly cookie (giftscart_session), 30-day expiry, HS256
- New auth routes: /api/auth/me (GET session), /api/auth/logout (POST clear)
- New client hook: useAuth() replaces useSession() from next-auth
- Middleware: custom JWT verification, role-based access control
- Environment: removed DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
- Environment: added JWT_SECRET, NEXT_PUBLIC_SITE_URL, SUPABASE_SERVICE_ROLE_KEY
- All 90+ API routes converted from Prisma to Supabase JS client
- Edge runtime added to auth routes

-----

## Key File Reference

|File                                    |Purpose                                            |
|----------------------------------------|---------------------------------------------------|
|CLAUDE.md                               |This file — complete project spec                  |
|PROGRESS.md                             |Current build status, file audit, what's next      |
|SQL_REFERENCE.md                        |All table DDL, admin queries, schema change process|
|prisma/schema.prisma                    |Prisma schema (source of truth for types)          |
|src/lib/supabase.ts                     |Supabase client (getSupabaseAdmin for server-side) |
|src/lib/brevo.ts                        |Email OTP via Brevo                                |
|src/lib/auth.ts                         |Custom JWT auth (signToken, verifyToken, getSession)|
|src/hooks/use-auth.ts                   |Client-side auth hook (useAuth)                    |
|src/lib/razorpay.ts                     |Razorpay helpers                                   |
|src/lib/utils.ts                        |cn(), formatPrice(), generateOrderNumber()         |
|src/lib/validations.ts                  |All Zod schemas                                    |
|src/middleware.ts                       |Route protection (auth + role-based)               |
|src/hooks/use-cart.ts                   |Zustand cart store (variation + addon support)      |
|src/components/product/variation-selector.tsx|Attribute-based variation picker              |
|src/components/product/addon-group.tsx  |Renders addon group by type (6 types)              |
|src/components/product/file-upload-addon.tsx|File upload widget for FILE_UPLOAD addons       |
|src/components/product/upsell-products.tsx|"Complete Your Gift" upsell section              |
|src/app/api/admin/products/generate-content/route.ts|AI content + image generation API     |
|src/components/admin/ai-generator-panel.tsx|AI generator slide-out panel for product form|
|src/app/api/customer/upload-addon-file/route.ts|Addon file upload to order-uploads bucket  |
|src/app/api/admin/categories/route.ts   |Category CRUD: GET list (tree), POST create        |
|src/app/api/admin/categories/[id]/route.ts|Category GET, PUT (with propagation), DELETE      |
|src/app/api/admin/categories/[id]/sync-templates/route.ts|Bulk template propagation       |
|src/app/api/admin/products/[id]/sync-addon-group/route.ts|Re-sync one addon group to template|
|src/components/admin/category-form.tsx  |Category create/edit form (Sheet)                  |
|src/app/admin/categories/page.tsx       |Admin category tree list page                      |
|src/app/api/city/resolve/route.ts      |City resolver: pincode + text search               |
|src/app/api/city/notify/route.ts       |City notification: coming-soon email signup         |
|src/components/providers/city-provider.tsx|CityProvider: city + pincode + zone context       |
|src/components/location/city-search.tsx |Reusable city search with debounce + dropdown      |
|src/components/location/city-modal.tsx  |City selection modal (site load blocker)            |
|src/components/location/city-gate.tsx   |Conditional modal renderer (checks isSelected)     |
|netlify/functions/sync-exchange-rates.ts|DO NOT MODIFY — production scheduled job           |

-----

## Schema Change Process

1. Write ALTER TABLE / CREATE TABLE SQL
2. Run SQL in Supabase SQL Editor
3. Verify with test query
4. Update SQL_REFERENCE.md (section 2A and 2B)
5. Commit all changes

No Prisma — write explicit SQL for all schema changes.
Column naming convention: camelCase (matching existing schema).
