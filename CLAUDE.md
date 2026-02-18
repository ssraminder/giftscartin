# Gifts Cart India — Project Specification
**Business Entity:** Cital Enterprises
**Live Staging:** https://giftscart.netlify.app
**Supabase:** https://saeditdtacprxcnlgips.supabase.co
**Last Updated:** 2026-02-19

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
| Database | Supabase PostgreSQL via Prisma ORM | Prisma for ALL queries |
| Auth | NextAuth.js v4 + Email OTP | Via Brevo — NOT phone/MSG91 |
| Email/OTP | Brevo API | Transactional email + OTP delivery |
| Email (legacy) | SendGrid | src/lib/email.ts — not primary |
| Payments | Razorpay | INR only, always |
| Storage | Supabase Storage | Two buckets: products (public), order-uploads (private) |
| AI — Content | Anthropic Claude API (claude-opus-4-5) | SEO copy generation |
| AI — Images | OpenAI GPT-image-1.5 | Product image generation |
| Hosting | Netlify | Auto-deploy from GitHub main |
| State | Zustand | Cart + UI state only |
| Scheduled Jobs | Netlify Functions | sync-exchange-rates runs daily 00:30 UTC |

---

## Architecture Decisions

### Core Rules — Never Violate
1. NEVER use Supabase Auth — all auth goes through NextAuth.js + Brevo email OTP
2. NEVER use Supabase client for data queries — always use Prisma
3. Supabase client is ONLY used for: Storage uploads, Realtime subscriptions
4. All API inputs validated with Zod schemas (src/lib/validations.ts)
5. All API routes return: `{ success: boolean, data?: any, error?: string }`
6. Prices stored as Decimal in DB, converted to number only for display
7. INR is always the base/settlement currency — Razorpay charges in INR only
8. NEVER delete or modify netlify/functions/sync-exchange-rates.ts
9. Guest checkout is supported — do not add auth guards to order creation flow
10. Mobile-first design — design for mobile, enhance for desktop
11. Indian locale — prices in ₹, phone numbers 10 digits, pincodes 6 digits

### Database Connection
- DATABASE_URL: Supabase Shared Pooler, port 6543, must end with ?pgbouncer=true
- DIRECT_URL: Supabase direct connection, port 5432, for migrations only
- Netlify requires Shared Pooler (IPv4) — never use IPv6 connection strings

### Auth Flow
Email → POST /api/auth/otp/send (creates OTP record, sends via Brevo)
→ POST /api/auth/otp/verify (verifies, creates/finds user)
→ NextAuth session via JWT strategy

### Storage Buckets
- `products` — Public read. Product images, AI-generated images, category images.
  Path pattern: products/ai-generated/{timestamp}-{slug}.png
- `order-uploads` — Private. Customer-uploaded files (e.g. photo cake photos).
  Path pattern: pending/{sessionId}/{addonGroupId}/{timestamp}-{filename}
  Moved to: orders/{orderId}/{addonGroupId}/{filename} on order creation.
  Always accessed via signed URLs (60 min expiry) — never expose raw paths.

---

## Environment Variables

```env
# Database
DATABASE_URL=              # Pooler (port 6543, ?pgbouncer=true)
DIRECT_URL=                # Direct (port 5432, migrations only)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://giftscart.netlify.app

# Email/OTP
BREVO_API_KEY=
BREVO_SENDER_EMAIL=        # e.g. noreply@cethos.com
BREVO_SENDER_NAME=         # Gifts Cart India

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# AI
ANTHROPIC_API_KEY=         # Claude API — SEO content generation
OPENAI_API_KEY=            # GPT-image-1.5 — product image generation
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

-----

## Planned Phases (Not Yet Built)

### Phase A — Schema Foundation

New tables: product_attributes, product_attribute_options, product_variations,
product_addon_groups, product_addon_options, product_upsells,
vendor_product_variations, category_addon_templates,
category_addon_template_options, seo_settings.
New columns on products and categories: SEO fields.
New enum: AddonType (CHECKBOX, RADIO, SELECT, TEXT_INPUT, TEXTAREA, FILE_UPLOAD).
New Supabase bucket: order-uploads (private).

### Phase B — SEO Infrastructure

generateMetadata on all pages, JSON-LD components, sitemap.xml, robots.txt,
breadcrumb component, admin SEO settings page.

### Phase C — Product Form (Admin)

WooCommerce-style tabbed product form. Tabs: General, Pricing, Inventory,
Images, Attributes, Variations, Add-ons, SEO, Advanced.
Handles both create and edit. AI generation integrated (Phase E).
Category addon template system with sync status UI.
Upsell product picker.

### Phase D — Customer-Facing Variations

Product detail page updated with real API data.
Variation selector (attribute swatches/buttons).
Addon group display by type (checkbox, radio, file upload widget, text inputs).
Cart updated to store variationId + addonSelections.
Order assignment updated to match at variation level.

### Phase E — AI Content Generation

Claude (claude-opus-4-5) generates: description, shortDesc, metaTitle,
metaDescription, metaKeywords, tags, and a GPT image prompt.
GPT-image-1.5 generates product image from prompt + optional reference photo.
Images proxied through server and uploaded to products bucket.
Integrated into product form as "Generate with AI" button.

-----

## Key File Reference

|File                                    |Purpose                                            |
|----------------------------------------|---------------------------------------------------|
|CLAUDE.md                               |This file — complete project spec                  |
|PROGRESS.md                             |Current build status, file audit, what's next      |
|SQL_REFERENCE.md                        |All table DDL, admin queries, schema change process|
|prisma/schema.prisma                    |Prisma schema (source of truth for types)          |
|src/lib/prisma.ts                       |Prisma client singleton                            |
|src/lib/brevo.ts                        |Email OTP via Brevo                                |
|src/lib/auth-options.ts                 |NextAuth config (email OTP credentials)            |
|src/lib/razorpay.ts                     |Razorpay helpers                                   |
|src/lib/utils.ts                        |cn(), formatPrice(), generateOrderNumber()         |
|src/lib/validations.ts                  |All Zod schemas                                    |
|src/middleware.ts                       |Route protection (auth + role-based)               |
|src/hooks/use-cart.ts                   |Zustand cart store                                 |
|netlify/functions/sync-exchange-rates.ts|DO NOT MODIFY — production scheduled job           |

-----

## Schema Change Process

1. Edit prisma/schema.prisma
1. Run: npx prisma generate
1. Write ALTER TABLE / CREATE TABLE SQL
1. Run SQL in Supabase SQL Editor
1. Verify with test query
1. Update SQL_REFERENCE.md (section 2A and 2B)
1. Commit all changes

Never use npx prisma db push in production — write explicit SQL instead.
