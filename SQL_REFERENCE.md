# SQL_REFERENCE.md — Gifts Cart India Database Reference

> **IMPORTANT:** Update this file whenever the database schema changes.

---

## 2A — Current Tables

| Table | Model Name | Key Columns | Relations |
|-------|-------------|-------------|-----------|
| `users` | User | id, phone, email, name, passwordHash, role, walletBalance, isActive | -> addresses, orders, reviews, cart_items |
| `otp_verifications` | OtpVerification | id, phone, email, otp, expiresAt, verified, attempts | (standalone) |
| `addresses` | Address | id, userId, name, phone, address, landmark, city, state, pincode, lat, lng, isDefault | -> users, orders |
| `cities` | City | id, name, slug, state, isActive, lat, lng, baseDeliveryCharge, freeDeliveryAbove, aliases[], is_coming_soon, notify_count, display_name, pincode_prefix[] | -> city_zones, vendors, city_delivery_configs, delivery_holidays, city_slot_cutoff, service_areas |
| `city_zones` | CityZone | id, cityId, name, pincodes[], extraCharge, isActive | -> cities, vendor_zones |
| `delivery_slots` | DeliverySlot | id, name, slug, startTime, endTime, baseCharge, isActive, cutoffHours, cutoffTime, slotGroup | -> city_delivery_configs, vendor_slots, city_slot_cutoff |
| `city_delivery_configs` | CityDeliveryConfig | id, cityId, slotId, isAvailable, chargeOverride | -> cities, delivery_slots |
| `delivery_holidays` | DeliveryHoliday | id, date, cityId, reason, customerMessage, mode (FULL_BLOCK/STANDARD_ONLY/CUSTOM), slotOverrides (JSONB) | -> cities |
| `delivery_surcharges` | DeliverySurcharge | id, name, startDate, endDate, amount, appliesTo, isActive | (standalone) |
| `vendors` | Vendor | id, userId, businessName, ownerName, phone, email, cityId, address, lat, lng, categories[], status, commissionRate, rating, totalOrders, isOnline, autoAccept, vacationStart, vacationEnd, panNumber, gstNumber, fssaiNumber, bankAccountNo, bankIfsc, bankName, delivery_radius_km, coverage_method, coverage_radius_km | -> cities, vendor_products, orders, vendor_working_hours, vendor_slots, vendor_holidays, vendor_pincodes, vendor_zones, vendor_capacity, vendor_payouts, vendor_product_variations |
| `vendor_working_hours` | VendorWorkingHours | id, vendorId, dayOfWeek, openTime, closeTime, isClosed | -> vendors |
| `vendor_slots` | VendorSlot | id, vendorId, slotId, isEnabled, customCharge | -> vendors, delivery_slots |
| `vendor_holidays` | VendorHoliday | id, vendorId, date, blockedSlots[], reason | -> vendors |
| `vendor_pincodes` | VendorPincode | id, vendorId, pincode, deliveryCharge, isActive | -> vendors |
| `vendor_zones` | VendorZone | id, vendorId, zoneId, deliveryCharge, minOrder | -> vendors, city_zones |
| `vendor_capacity` | VendorCapacity | id, vendorId, date, slotId, maxOrders, bookedOrders | -> vendors |
| `categories` | Category | id, name, slug, description, image, parentId, sortOrder, isActive, metaTitle, metaDescription, metaKeywords[], ogImage | -> self (parent/children), products, category_addon_templates |
| `products` | Product | id, name, slug, description, shortDesc, categoryId, basePrice, images[], tags[], occasion[], weight, isVeg, isActive, avgRating, totalReviews, productType, metaTitle, metaDescription, metaKeywords[], ogImage, canonicalUrl, aiImagePrompt, minLeadTimeHours, leadTimeNote, isSameDayEligible | -> categories, vendor_products, order_items, cart_items, reviews, product_addons, product_attributes, product_variations, product_addon_groups, product_upsells |
| `product_addons` | ProductAddon | id, productId, name, price, image, isActive | -> products (legacy -- being replaced by product_addon_groups) |
| `product_attributes` | ProductAttribute | id, productId, name, slug, isForVariations | -> products, product_attribute_options |
| `product_attribute_options` | ProductAttributeOption | id, attributeId, value, sortOrder | -> product_attributes |
| `product_variations` | ProductVariation | id, productId, type, label, value, price, sku, sortOrder, isDefault, isActive, attributes (JSONB), salePrice, saleFrom, saleTo, image, stockQty | -> products, vendor_product_variations |
| `product_addon_groups` | ProductAddonGroup | id, productId, name, type, required, templateGroupId, isOverridden | -> products, product_addon_options |
| `product_addon_options` | ProductAddonOption | id, groupId, label, price, isDefault | -> product_addon_groups |
| `product_upsells` | ProductUpsell | id, productId, upsellProductId, sortOrder | -> products (x2) |
| `vendor_product_variations` | VendorProductVariation | id, vendorId, productId, variationId, costPrice, sellingPrice, isAvailable | -> vendors, product_variations |
| `vendor_products` | VendorProduct | id, vendorId, productId, costPrice, sellingPrice, isAvailable, preparationTime, dailyLimit, isSameDayEligible, isExpressEligible | -> vendors, products |
| `orders` | Order | id, orderNumber, userId, vendorId, partnerId, addressId, deliveryDate, deliverySlot, deliveryCharge, subtotal, discount, surcharge, total, status, paymentStatus, paymentMethod, giftMessage, specialInstructions, couponCode, businessModel, vendorCost, commissionAmount, senderName, senderPhone, senderEmail, occasion, guestEmail, guestPhone | -> users, vendors, partners, addresses, order_items, payments, order_status_history |
| `order_items` | OrderItem | id, orderId, productId, name, quantity, price, addons, variationId, variationLabel | -> orders, products |
| `order_status_history` | OrderStatusHistory | id, orderId, status, note, changedBy | -> orders |
| `payments` | Payment | id, orderId, amount, currency, razorpayOrderId, razorpayPaymentId, razorpaySignature, method, status, gateway, stripeSessionId, stripePaymentIntentId, paypalOrderId, paypalCaptureId, paidAt | -> orders |
| `vendor_payouts` | VendorPayout | id, vendorId, amount, period, orderCount, deductions, tdsAmount, netAmount, status, transactionRef, paidAt | -> vendors |
| `partners` | Partner | id, name, refCode, subdomain, customDomain, logoUrl, primaryColor, secondaryColor, showPoweredBy, commissionPercent, isActive, default_city_id, default_vendor_id | -> orders, partner_earnings |
| `partner_earnings` | PartnerEarning | id, partnerId, orderId, amount, status | -> partners |
| `cart_items` | CartItem | id, userId, productId, quantity, addons, deliveryDate, deliverySlot, variationId | -> users, products |
| `coupons` | Coupon | id, code, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, usedCount, perUserLimit, validFrom, validUntil, isActive, applicableOn[] | (standalone) |
| `reviews` | Review | id, userId, productId, orderId, rating, comment, images[], isVerified | -> users, products |
| `category_addon_templates` | CategoryAddonTemplate | id, categoryId, name, type, required | -> categories, category_addon_template_options |
| `category_addon_template_options` | CategoryAddonTemplateOption | id, templateId, label, price, isDefault | -> category_addon_templates |
| `seo_settings` | SeoSettings | id, siteName, siteDescription, defaultOgImage, robotsTxt | singleton -- always 1 row |
| `currency_configs` | CurrencyConfig | id, code, name, symbol, symbolPosition, exchangeRate, markup, rounding, roundTo, locale, countries[], isDefault, isActive | (standalone) |
| `audit_logs` | AuditLog | id, adminId, adminRole, actionType, entityType, entityId, fieldChanged, oldValue (JSONB), newValue (JSONB), reason, ipAddress | (standalone) |
| `pincode_city_map` | PincodeCityMap | id, pincode, city_id, area_name, is_active | -> cities |
| `city_notifications` | CityNotification | id, email, phone, city_name | (standalone) |
| `product_relations` | ProductRelation | id, product_id, related_product_id, relation_type, sort_order, is_active | -> products (x2), unique(product_id, related_product_id, relation_type) |
| `image_generation_jobs` | ImageGenerationJob | id, product_id, image_index, image_type, status, prompt_used, openai_generation_id, storage_url, retry_count, error_message, started_at, completed_at | -> products, unique(product_id, image_index) |
| `catalog_imports` | CatalogImport | id, admin_id, file_name, status, categories_count, products_count, addons_count, relations_count, skipped_count, errors_json (JSONB), completed_at | (standalone) |
| `payment_methods` | PaymentMethod | id, name, slug (unique), description, isActive, sortOrder | (standalone) |
| `banners` | Banner | id, title_html, subtitle_html, image_url, cta_text, cta_link, secondary_cta_text, secondary_cta_link, text_position, overlay_style, badge_text, is_active, sort_order, valid_from, valid_until, target_city_slug, theme, subject_image_url, content_width, title_size, subtitle_size, vertical_align, hero_size, content_padding, content_x/y/w/h, hero_x/y/w/h, content_lock_ratio, hero_lock_ratio, cta_bg_color, cta_text_color, cta_border_color, badge_bg_color, badge_text_color, layers (JSONB), layout, mobile_only | (standalone) |
| `banner_generation_jobs` | BannerGenerationJob | id, status, theme, result (JSONB), error | (standalone) |
| `city_slot_cutoff` | CitySlotCutoff | id, city_id, slot_id, slot_name, slot_slug, slot_start, slot_end, cutoff_hours, base_charge, min_vendors, is_available | -> cities, delivery_slots |
| `menu_items` | MenuItem | id, parentId, label, slug, href, icon, sortOrder, isVisible, itemType | -> self (parent/children) |
| `platform_settings` | PlatformSetting | id, key (unique), value, updated_at, updated_by, updatedAt, updatedBy | (standalone) |
| `service_areas` | ServiceArea | id, name, pincode, city_id, city_name, state, lat, lng, is_active, altNames[] | -> cities |
| `vendor_service_areas` | VendorServiceArea | id, vendor_id (FK vendors), service_area_id (FK service_areas), delivery_surcharge, status (PENDING/ACTIVE/REJECTED), is_active, requested_at, activated_at, activated_by (FK users), rejection_reason | -> vendors, service_areas, UNIQUE(vendor_id, service_area_id) |

**Total: 55 tables** (31 original + 10 Phase A + 1 multi-currency + 5 Sprint 1 + 1 payment methods + 1 banners + 5 new + 1 vendor_service_areas)

---

## 2B — SQL Scripts Log

| Script | Purpose | Status |
|--------|---------|--------|
| Prisma `db push` | Phase 1 schema creation (all 31 tables) | Done |
| `prisma/seed.ts` | Phase 1 seed data (cities, categories, products, vendor) | Done |
| Phase A schema migration | product_attributes, product_variations (migrated to JSONB), addon groups, upsells, vendor_product_variations, category templates, SEO fields on products/categories, seo_settings singleton | Done |
| Migration 002 -- Schema sync | order_items: +variationId, +variationLabel; payments: +gateway (PaymentGateway enum), +stripe/paypal columns; cart_items: +variationId; currency_configs table | Done |
| Sprint 1 migration | pincode_city_map, city_notifications, product_relations (RelationType enum), image_generation_jobs (ImageJobStatus, ImageType enums), catalog_imports (ImportStatus enum). Cities table: +aliases, +display_name, +is_coming_soon, +notify_count, +pincode_prefix. | Done |
| Payment methods table | payment_methods table with 7 default methods (Cash, UPI, Bank Transfer, Razorpay, Cheque, Credit Card, Wallet) | Done |
| Delivery Slot System -- Prompt 7 | Added min_lead_time_hours + lead_time_note to products; cutoff_hours + cutoff_time + slot_group to delivery_slots; replaced blocked_slots[] with mode + slot_overrides on delivery_holidays; seeded 6 fixed windows + Chandigarh city configs + example holidays | Done |
| ALTER TABLE products ADD COLUMN "isSameDayEligible" | Add same-day eligible flag | Done |
| Migration 003 -- Banners table | CREATE TABLE banners with seed rows. Supports homepage slider management with HTML content, CTA buttons, date-range visibility, and city targeting. | Done |
| Banners v2 -- Extended columns | Added theme, subject_image_url, content_width, title_size, subtitle_size, vertical_align, hero_size, content_padding, content/hero positioning columns (x/y/w/h), lock ratios, CTA colors, badge colors, layers (JSONB), layout, mobile_only | Done |
| banner_generation_jobs table | AI banner generation job tracking with status, theme, result JSONB, error | Done |
| city_slot_cutoff table | Per-city per-slot cutoff and availability configuration | Done |
| menu_items table | Dynamic navigation menu with parent/child hierarchy, camelCase columns | Done |
| platform_settings table | Key-value platform settings with mixed snake_case/camelCase columns | Done |
| service_areas table | Service area pincode mapping with geolocation and city references | Done |
| Vendors: delivery radius columns | Added delivery_radius_km, coverage_method, coverage_radius_km to vendors | Done |
| Orders: guest & sender columns | Added senderName, senderPhone, senderEmail, occasion, guestEmail, guestPhone to orders | Done |
| Payments: paidAt column | Added paidAt timestamp to payments | Done |
| Partners: default city/vendor | Added default_city_id, default_vendor_id to partners | Done |
| Users: VENDOR_STAFF/ACCOUNTANT/CITY_MANAGER/OPERATIONS roles | Extended UserRole enum with 4 new roles | Done |
| vendor_products: eligibility flags | Added isSameDayEligible, isExpressEligible to vendor_products | Done |
| product_variations: type/label/value columns | Added type, label, value, isDefault columns to product_variations | Done |

> Phase A migration executed block-by-block in Supabase SQL Editor (2026-02-19).
> Sprint 1 migration pre-run in Supabase SQL Editor (2026-02-20).

---

## 2C — Useful Admin Queries

### Row Counts for All Tables

```sql
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'otp_verifications', count(*) FROM otp_verifications
UNION ALL SELECT 'addresses', count(*) FROM addresses
UNION ALL SELECT 'cities', count(*) FROM cities
UNION ALL SELECT 'city_zones', count(*) FROM city_zones
UNION ALL SELECT 'delivery_slots', count(*) FROM delivery_slots
UNION ALL SELECT 'city_delivery_configs', count(*) FROM city_delivery_configs
UNION ALL SELECT 'delivery_holidays', count(*) FROM delivery_holidays
UNION ALL SELECT 'delivery_surcharges', count(*) FROM delivery_surcharges
UNION ALL SELECT 'vendors', count(*) FROM vendors
UNION ALL SELECT 'vendor_working_hours', count(*) FROM vendor_working_hours
UNION ALL SELECT 'vendor_slots', count(*) FROM vendor_slots
UNION ALL SELECT 'vendor_holidays', count(*) FROM vendor_holidays
UNION ALL SELECT 'vendor_pincodes', count(*) FROM vendor_pincodes
UNION ALL SELECT 'vendor_zones', count(*) FROM vendor_zones
UNION ALL SELECT 'vendor_capacity', count(*) FROM vendor_capacity
UNION ALL SELECT 'categories', count(*) FROM categories
UNION ALL SELECT 'products', count(*) FROM products
UNION ALL SELECT 'product_addons', count(*) FROM product_addons
UNION ALL SELECT 'vendor_products', count(*) FROM vendor_products
UNION ALL SELECT 'orders', count(*) FROM orders
UNION ALL SELECT 'order_items', count(*) FROM order_items
UNION ALL SELECT 'order_status_history', count(*) FROM order_status_history
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'vendor_payouts', count(*) FROM vendor_payouts
UNION ALL SELECT 'partners', count(*) FROM partners
UNION ALL SELECT 'partner_earnings', count(*) FROM partner_earnings
UNION ALL SELECT 'cart_items', count(*) FROM cart_items
UNION ALL SELECT 'coupons', count(*) FROM coupons
UNION ALL SELECT 'reviews', count(*) FROM reviews
UNION ALL SELECT 'currency_configs', count(*) FROM currency_configs
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
UNION ALL SELECT 'pincode_city_map', count(*) FROM pincode_city_map
UNION ALL SELECT 'city_notifications', count(*) FROM city_notifications
UNION ALL SELECT 'product_relations', count(*) FROM product_relations
UNION ALL SELECT 'image_generation_jobs', count(*) FROM image_generation_jobs
UNION ALL SELECT 'catalog_imports', count(*) FROM catalog_imports
UNION ALL SELECT 'payment_methods', count(*) FROM payment_methods
UNION ALL SELECT 'banners', count(*) FROM banners
UNION ALL SELECT 'banner_generation_jobs', count(*) FROM banner_generation_jobs
UNION ALL SELECT 'city_slot_cutoff', count(*) FROM city_slot_cutoff
UNION ALL SELECT 'menu_items', count(*) FROM menu_items
UNION ALL SELECT 'platform_settings', count(*) FROM platform_settings
UNION ALL SELECT 'service_areas', count(*) FROM service_areas;
```

### All Users with Roles

```sql
SELECT id, email, phone, name, role, is_active, created_at
FROM users
ORDER BY created_at;
```

### All Vendors with Status

```sql
SELECT id, business_name, owner_name, phone, city_id, status,
       commission_rate, rating, is_online
FROM vendors;
```

### Products with Category

```sql
SELECT p.id, p.name, p.slug, p.base_price, c.name as category
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY c.name, p.name;
```

### Orders Summary

```sql
SELECT status, payment_status, count(*)
FROM orders
GROUP BY status, payment_status;
```

### Seed Data Integrity Check

```sql
SELECT 'vendor_products' as check_name, count(*) as rows
FROM vendor_products WHERE vendor_id = 'vendor_sweet_delights'
UNION ALL
SELECT 'vendor_pincodes', count(*)
FROM vendor_pincodes WHERE vendor_id = 'vendor_sweet_delights'
UNION ALL
SELECT 'vendor_capacity', count(*)
FROM vendor_capacity WHERE vendor_id = 'vendor_sweet_delights'
UNION ALL
SELECT 'vendor_working_hours', count(*)
FROM vendor_working_hours WHERE vendor_id = 'vendor_sweet_delights';
```

### Categories with Product Counts

```sql
SELECT c.id, c.name, c.slug, c.parent_id,
       count(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name, c.slug, c.parent_id
ORDER BY c.sort_order;
```

### Recent OTP Verifications (Debug)

```sql
SELECT id, email, otp, expires_at, verified, attempts, created_at
FROM otp_verifications
ORDER BY created_at DESC
LIMIT 20;
```

### Delivery Slots Configuration

```sql
SELECT ds.name, ds.slug, ds.start_time, ds.end_time, ds.base_charge,
       c.name as city, cdc.is_available, cdc.charge_override
FROM delivery_slots ds
LEFT JOIN city_delivery_configs cdc ON cdc.slot_id = ds.id
LEFT JOIN cities c ON c.id = cdc.city_id
ORDER BY ds.name, c.name;
```

### Promote User to SUPER_ADMIN

```sql
-- UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'raminder@cethos.com';
```

### Reset OTP Attempts

```sql
-- DELETE FROM otp_verifications WHERE email = 'user@example.com' AND verified = false;
```

### Banners

```sql
-- All banners with status
SELECT id, title_html, is_active, sort_order, valid_from, valid_until, target_city_slug
FROM banners
ORDER BY sort_order ASC;

-- Active banners for homepage (what customers see)
SELECT id, title_html, image_url, cta_text, cta_link, badge_text
FROM banners
WHERE is_active = true
  AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
  AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
ORDER BY sort_order ASC;
```

---

## 2D — Schema Change Process

Standard procedure for any database changes:

1. **Edit** `prisma/schema.prisma` with the desired changes
2. **Run** `npx prisma generate` to regenerate the Prisma client types
3. **Write SQL** `ALTER TABLE` / `CREATE TABLE` statements for the migration
4. **Run SQL** in Supabase SQL Editor at https://saeditdtacprxcnlgips.supabase.co
5. **Verify** the change with a test query
6. **Update** this `SQL_REFERENCE.md` with a new entry in the Scripts Log (section 2B)
7. **Commit** all changes (schema + docs + any code updates)

### Alternative: Prisma Push (Dev Only)

For development, you can use `npx prisma db push` which syncs the schema directly. **Do not use in production** as it may cause data loss.

### Notes
- Prisma uses `camelCase` field names -> PostgreSQL uses `snake_case` column names (auto-mapped)
- The `@@map("table_name")` directive controls the PostgreSQL table name
- The `@map("column_name")` directive (if used) controls individual column names
- Prisma auto-maps `createdAt` -> `created_at`, `userId` -> `user_id`, etc.
- Some tables use camelCase columns directly (menu_items, platform_settings, currency_configs, payment_methods, payments, order_items) -- these bypass Prisma's snake_case mapping

---

## 2E — Schema DDL Reference

### Enums

```sql
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN', 'VENDOR_STAFF', 'ACCOUNTANT', 'CITY_MANAGER', 'OPERATIONS');
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "BusinessModel" AS ENUM ('MODEL_A', 'MODEL_B');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIABLE');
CREATE TYPE "AddonType" AS ENUM ('CHECKBOX', 'RADIO', 'SELECT', 'TEXT_INPUT', 'TEXTAREA', 'FILE_UPLOAD');
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'STRIPE', 'PAYPAL', 'COD');
CREATE TYPE "HolidayMode" AS ENUM ('FULL_BLOCK', 'STANDARD_ONLY', 'CUSTOM');
CREATE TYPE "RelationType" AS ENUM ('UPSELL', 'CROSS_SELL');
CREATE TYPE "ImageJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED');
CREATE TYPE "ImageType" AS ENUM ('HERO', 'LIFESTYLE', 'DETAIL');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
```

### Users & Auth
-- NOTE: users, otp_verifications, addresses use camelCase column names via Prisma mapping

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    name TEXT,
    "passwordHash" TEXT,
    role "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "walletBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE otp_verifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    phone TEXT,
    email TEXT,
    otp TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    attempts INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX otp_verifications_email_otp_idx ON otp_verifications(email, otp);

CREATE TABLE addresses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
```

### Location
-- NOTE: cities uses camelCase column names via Prisma mapping

```sql
CREATE TABLE cities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    "baseDeliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 49,
    "freeDeliveryAbove" DECIMAL(10,2) NOT NULL DEFAULT 499,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    is_coming_soon BOOLEAN NOT NULL DEFAULT false,
    notify_count INTEGER NOT NULL DEFAULT 0,
    display_name TEXT,
    pincode_prefix TEXT[]
);

CREATE TABLE city_zones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "cityId" TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pincodes TEXT[] NOT NULL,
    "extraCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
```

### Delivery Configuration
-- NOTE: delivery_slots uses camelCase; delivery_holidays, delivery_surcharges use snake_case

```sql
CREATE TABLE delivery_slots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "baseCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cutoffHours" INTEGER NOT NULL DEFAULT 4,
    "cutoffTime" TEXT,
    "slotGroup" TEXT NOT NULL DEFAULT 'standard'
);

CREATE TABLE city_delivery_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "cityId" TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    "slotId" TEXT NOT NULL REFERENCES delivery_slots(id) ON DELETE CASCADE,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "chargeOverride" DECIMAL(10,2),
    UNIQUE("cityId", "slotId")
);

CREATE TABLE delivery_holidays (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date DATE NOT NULL,
    city_id TEXT REFERENCES cities(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    customer_message TEXT,
    mode TEXT NOT NULL DEFAULT 'FULL_BLOCK',
    slot_overrides JSONB
);

CREATE TABLE delivery_surcharges (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
```

### Vendors
-- NOTE: vendors use snake_case; vendor sub-tables use snake_case

```sql
CREATE TABLE vendors (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL UNIQUE,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    "cityId" TEXT NOT NULL REFERENCES cities(id),
    address TEXT NOT NULL,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    categories TEXT[] NOT NULL,
    status "VendorStatus" NOT NULL DEFAULT 'PENDING',
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "autoAccept" BOOLEAN NOT NULL DEFAULT false,
    "vacationStart" TIMESTAMP(3),
    "vacationEnd" TIMESTAMP(3),
    "panNumber" TEXT,
    "gstNumber" TEXT,
    "fssaiNumber" TEXT,
    "bankAccountNo" TEXT,
    "bankIfsc" TEXT,
    "bankName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    delivery_radius_km DECIMAL(10,2) DEFAULT 10,
    coverage_method TEXT DEFAULT 'pincode',
    coverage_radius_km DECIMAL(10,2)
);

CREATE TABLE vendor_working_hours (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    UNIQUE("vendorId", "dayOfWeek")
);

CREATE TABLE vendor_slots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    "slotId" TEXT NOT NULL REFERENCES delivery_slots(id) ON DELETE CASCADE,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customCharge" DECIMAL(10,2),
    UNIQUE("vendorId", "slotId")
);

CREATE TABLE vendor_holidays (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    "blockedSlots" TEXT[] NOT NULL,
    reason TEXT
);

CREATE TABLE vendor_pincodes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    pincode TEXT NOT NULL,
    "deliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    UNIQUE("vendorId", pincode)
);

CREATE TABLE vendor_zones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    "zoneId" TEXT NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
    "deliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minOrder" DECIMAL(10,2) NOT NULL DEFAULT 0,
    UNIQUE("vendorId", "zoneId")
);

CREATE TABLE vendor_capacity (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    "slotId" TEXT NOT NULL,
    "maxOrders" INTEGER NOT NULL,
    "bookedOrders" INTEGER NOT NULL DEFAULT 0,
    UNIQUE("vendorId", date, "slotId")
);
```

### Products
-- NOTE: categories, products use snake_case via Prisma mapping

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    "parentId" TEXT REFERENCES categories(id),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT[] NOT NULL DEFAULT '{}',
    "ogImage" TEXT
);

CREATE TABLE products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    "shortDesc" TEXT,
    "categoryId" TEXT NOT NULL REFERENCES categories(id),
    "basePrice" DECIMAL(10,2) NOT NULL,
    images TEXT[] NOT NULL,
    tags TEXT[] NOT NULL,
    occasion TEXT[] NOT NULL,
    weight TEXT,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avgRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productType" "ProductType" NOT NULL DEFAULT 'SIMPLE',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT[] NOT NULL DEFAULT '{}',
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "aiImagePrompt" TEXT,
    "minLeadTimeHours" INTEGER NOT NULL DEFAULT 2,
    "leadTimeNote" TEXT,
    "isSameDayEligible" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE product_addons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE product_attributes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    is_for_variations BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, slug)
);

CREATE TABLE product_attribute_options (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    attribute_id TEXT NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE product_variations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type TEXT,
    label TEXT,
    value TEXT,
    price DECIMAL(10,2) NOT NULL,
    sku TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    attributes JSONB NOT NULL DEFAULT '{}',
    "salePrice" DECIMAL(10,2),
    "saleFrom" TIMESTAMP(3),
    "saleTo" TIMESTAMP(3),
    image TEXT,
    "stockQty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX product_variations_product_id_idx ON product_variations("productId");

CREATE TABLE product_addon_groups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type "AddonType" NOT NULL,
    required BOOLEAN NOT NULL DEFAULT false,
    max_length INTEGER,
    placeholder TEXT,
    accepted_file_types TEXT[] NOT NULL DEFAULT '{}',
    max_file_size_mb INTEGER DEFAULT 5,
    template_group_id TEXT,
    is_overridden BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX product_addon_groups_product_id_idx ON product_addon_groups(product_id);

CREATE TABLE product_addon_options (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    group_id TEXT NOT NULL REFERENCES product_addon_groups(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    image TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE product_upsells (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "upsellProductId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    UNIQUE("productId", "upsellProductId")
);

CREATE TABLE vendor_product_variations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "variationId" TEXT NOT NULL REFERENCES product_variations(id) ON DELETE CASCADE,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("vendorId", "variationId")
);
CREATE INDEX vpv_vendor_id_idx ON vendor_product_variations("vendorId");
CREATE INDEX vpv_variation_id_idx ON vendor_product_variations("variationId");

CREATE TABLE vendor_products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "preparationTime" INTEGER NOT NULL DEFAULT 120,
    "dailyLimit" INTEGER,
    "isSameDayEligible" BOOLEAN NOT NULL DEFAULT false,
    "isExpressEligible" BOOLEAN NOT NULL DEFAULT false,
    UNIQUE("vendorId", "productId")
);
```

### Orders
-- NOTE: orders use snake_case via Prisma; order_items uses camelCase columns

```sql
CREATE TABLE orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderNumber" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL REFERENCES users(id),
    "vendorId" TEXT REFERENCES vendors(id),
    "partnerId" TEXT REFERENCES partners(id),
    "addressId" TEXT NOT NULL REFERENCES addresses(id),
    "deliveryDate" DATE NOT NULL,
    "deliverySlot" TEXT NOT NULL,
    "deliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    surcharge DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "giftMessage" TEXT,
    "specialInstructions" TEXT,
    "couponCode" TEXT,
    "businessModel" "BusinessModel" NOT NULL DEFAULT 'MODEL_A',
    "vendorCost" DECIMAL(10,2),
    "commissionAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderName" TEXT,
    "senderPhone" TEXT,
    "senderEmail" TEXT,
    occasion TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT
);
CREATE INDEX orders_user_id_idx ON orders("userId");
CREATE INDEX orders_vendor_id_idx ON orders("vendorId");
CREATE INDEX orders_order_number_idx ON orders("orderNumber");

CREATE TABLE order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES products(id),
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    addons JSONB,
    "variationId" TEXT,
    "variationLabel" TEXT
);

CREATE TABLE order_status_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status "OrderStatus" NOT NULL,
    note TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Payments
-- NOTE: payments uses camelCase columns

```sql
CREATE TABLE payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL UNIQUE REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    method TEXT,
    status "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    gateway "PaymentGateway" NOT NULL DEFAULT 'RAZORPAY',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    "paidAt" TIMESTAMP(3)
);

CREATE TABLE vendor_payouts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "vendorId" TEXT NOT NULL REFERENCES vendors(id),
    amount DECIMAL(10,2) NOT NULL,
    period TEXT NOT NULL,
    "orderCount" INTEGER NOT NULL,
    deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tdsAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    status "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "transactionRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Partners

```sql
CREATE TABLE partners (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    "refCode" TEXT NOT NULL UNIQUE,
    subdomain TEXT UNIQUE,
    "customDomain" TEXT UNIQUE,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#E91E63',
    "secondaryColor" TEXT NOT NULL DEFAULT '#9C27B0',
    "showPoweredBy" BOOLEAN NOT NULL DEFAULT true,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    default_city_id TEXT,
    default_vendor_id TEXT
);

CREATE TABLE partner_earnings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "partnerId" TEXT NOT NULL REFERENCES partners(id),
    "orderId" TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Cart

```sql
CREATE TABLE cart_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    addons JSONB,
    "deliveryDate" DATE,
    "deliverySlot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "variationId" TEXT,
    UNIQUE("userId", "productId")
);
```

### Coupons

```sql
CREATE TABLE coupons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxDiscount" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableOn" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Reviews

```sql
CREATE TABLE reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES users(id),
    "productId" TEXT NOT NULL REFERENCES products(id),
    "orderId" TEXT,
    rating INTEGER NOT NULL,
    comment TEXT,
    images TEXT[] NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Category Addon Templates

```sql
CREATE TABLE category_addon_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type "AddonType" NOT NULL,
    required BOOLEAN NOT NULL DEFAULT false,
    max_length INTEGER,
    placeholder TEXT,
    accepted_file_types TEXT[] NOT NULL DEFAULT '{}',
    max_file_size_mb INTEGER DEFAULT 5,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category_addon_template_options (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    template_id TEXT NOT NULL REFERENCES category_addon_templates(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    image TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);
```

### SEO Settings

```sql
CREATE TABLE seo_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    site_name TEXT NOT NULL DEFAULT 'Gifts Cart India',
    site_description TEXT NOT NULL DEFAULT 'Fresh cakes, flowers and gifts delivered same day across India',
    default_og_image TEXT,
    google_verification TEXT,
    robots_txt TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Currency Configs
-- NOTE: currency_configs uses camelCase columns

```sql
CREATE TABLE currency_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    "symbolPosition" TEXT NOT NULL DEFAULT 'before',
    "exchangeRate" DECIMAL(12,6) NOT NULL,
    markup DECIMAL(5,2) NOT NULL DEFAULT 0,
    rounding TEXT NOT NULL DEFAULT 'nearest',
    "roundTo" DECIMAL(10,2) NOT NULL DEFAULT 0.01,
    locale TEXT NOT NULL DEFAULT 'en-US',
    countries TEXT[] NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Audit Logs

```sql
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "adminId" TEXT NOT NULL,
    "adminRole" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldChanged" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    reason TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_logs_entity_type_entity_id_idx ON audit_logs("entityType", "entityId");
CREATE INDEX audit_logs_admin_id_idx ON audit_logs("adminId");
```

### Sprint 1 -- City-First UX Tables
-- NOTE: These 5 tables use snake_case column names (not Prisma-mapped camelCase)

```sql
-- Enums (defined above in Enums section)
-- "RelationType": 'UPSELL', 'CROSS_SELL'
-- "ImageJobStatus": 'PENDING', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED'
-- "ImageType": 'HERO', 'LIFESTYLE', 'DETAIL'
-- "ImportStatus": 'PENDING', 'PROCESSING', 'DONE', 'FAILED'

-- Cities table alterations (already applied)
-- ALTER TABLE cities ADD COLUMN aliases TEXT[] NOT NULL DEFAULT '{}';
-- ALTER TABLE cities ADD COLUMN display_name TEXT;
-- ALTER TABLE cities ADD COLUMN is_coming_soon BOOLEAN NOT NULL DEFAULT false;
-- ALTER TABLE cities ADD COLUMN notify_count INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE cities ADD COLUMN pincode_prefix TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE pincode_city_map (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pincode TEXT NOT NULL UNIQUE,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    area_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE city_notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT,
    phone TEXT,
    city_name TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_relations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    related_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    relation_type "RelationType" NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, related_product_id, relation_type)
);

CREATE TABLE image_generation_jobs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_index INTEGER NOT NULL DEFAULT 1,
    image_type "ImageType" NOT NULL DEFAULT 'HERO',
    status "ImageJobStatus" NOT NULL DEFAULT 'PENDING',
    prompt_used TEXT,
    openai_generation_id TEXT,
    storage_url TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP(3),
    completed_at TIMESTAMP(3),
    UNIQUE(product_id, image_index)
);

CREATE TABLE catalog_imports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    admin_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    status "ImportStatus" NOT NULL DEFAULT 'PENDING',
    categories_count INTEGER NOT NULL DEFAULT 0,
    products_count INTEGER NOT NULL DEFAULT 0,
    addons_count INTEGER NOT NULL DEFAULT 0,
    relations_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    errors_json JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP(3)
);
```

### Payment Methods
-- NOTE: payment_methods uses camelCase columns

```sql
CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO payment_methods (id, name, slug, description, "sortOrder") VALUES
  (gen_random_uuid()::text, 'Cash', 'cash', 'Cash on delivery or in person', 1),
  (gen_random_uuid()::text, 'UPI', 'upi', 'Google Pay, PhonePe, Paytm, etc.', 2),
  (gen_random_uuid()::text, 'Bank Transfer', 'bank-transfer', 'NEFT / IMPS / RTGS', 3),
  (gen_random_uuid()::text, 'Razorpay', 'razorpay', 'Online payment via Razorpay gateway', 4),
  (gen_random_uuid()::text, 'Cheque', 'cheque', 'Payment by cheque', 5),
  (gen_random_uuid()::text, 'Credit Card', 'credit-card', 'Visa, Mastercard, Amex', 6),
  (gen_random_uuid()::text, 'Wallet', 'wallet', 'Platform wallet balance', 7);
```

### Banners
-- NOTE: banners uses ALL snake_case column names

```sql
CREATE TABLE banners (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title_html TEXT NOT NULL,
  subtitle_html TEXT,
  image_url TEXT NOT NULL,
  cta_text TEXT NOT NULL DEFAULT 'Shop Now',
  cta_link TEXT NOT NULL DEFAULT '/',
  secondary_cta_text TEXT,
  secondary_cta_link TEXT,
  text_position TEXT NOT NULL DEFAULT 'left',
  overlay_style TEXT NOT NULL DEFAULT 'dark-left',
  badge_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  valid_from DATE,
  valid_until DATE,
  target_city_slug TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  theme TEXT NOT NULL DEFAULT 'blush',
  subject_image_url TEXT,
  content_width TEXT NOT NULL DEFAULT 'medium',
  title_size TEXT NOT NULL DEFAULT 'lg',
  subtitle_size TEXT NOT NULL DEFAULT 'sm',
  vertical_align TEXT NOT NULL DEFAULT 'center',
  hero_size TEXT NOT NULL DEFAULT 'md',
  content_padding TEXT NOT NULL DEFAULT 'normal',
  content_x NUMERIC NOT NULL DEFAULT 5,
  content_y NUMERIC NOT NULL DEFAULT 50,
  content_w NUMERIC NOT NULL DEFAULT 55,
  content_h NUMERIC NOT NULL DEFAULT 80,
  hero_x NUMERIC NOT NULL DEFAULT 55,
  hero_y NUMERIC NOT NULL DEFAULT 10,
  hero_w NUMERIC NOT NULL DEFAULT 40,
  hero_h NUMERIC NOT NULL DEFAULT 85,
  content_lock_ratio BOOLEAN NOT NULL DEFAULT false,
  hero_lock_ratio BOOLEAN NOT NULL DEFAULT false,
  cta_bg_color TEXT NOT NULL DEFAULT '#E91E63',
  cta_text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  cta_border_color TEXT,
  badge_bg_color TEXT NOT NULL DEFAULT 'rgba(255,255,255,0.2)',
  badge_text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  layers JSONB NOT NULL DEFAULT '[]',
  layout TEXT NOT NULL DEFAULT '16:9',
  mobile_only BOOLEAN NOT NULL DEFAULT false
);
```

### Banner Generation Jobs
-- NOTE: banner_generation_jobs uses snake_case column names

```sql
CREATE TABLE banner_generation_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending',
  theme TEXT NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### City Slot Cutoff
-- NOTE: city_slot_cutoff uses snake_case column names

```sql
CREATE TABLE city_slot_cutoff (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  city_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  slot_name TEXT NOT NULL,
  slot_slug TEXT NOT NULL,
  slot_start TEXT NOT NULL,
  slot_end TEXT NOT NULL,
  cutoff_hours INTEGER NOT NULL,
  base_charge NUMERIC NOT NULL DEFAULT 0,
  min_vendors INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Menu Items
-- NOTE: menu_items uses camelCase column names

```sql
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "parentId" TEXT,
  label TEXT NOT NULL,
  slug TEXT,
  href TEXT,
  icon TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "itemType" TEXT NOT NULL DEFAULT 'link',
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);
```

### Platform Settings
-- NOTE: platform_settings has MIXED naming -- both snake_case and camelCase duplicate columns

```sql
CREATE TABLE platform_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP,
  updated_by TEXT,
  "updatedAt" TIMESTAMP,
  "updatedBy" TEXT
);
```

### Service Areas
-- NOTE: service_areas uses snake_case column names, with one camelCase column (altNames)

```sql
CREATE TABLE service_areas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  pincode TEXT NOT NULL,
  city_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  state TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  "altNames" TEXT[] DEFAULT '{}',
  delivery_surcharge NUMERIC NOT NULL DEFAULT 0
);
```

### Pincode Lookup Queries

```sql
-- Find city for exact pincode
SELECT pcm.pincode, pcm.area_name, c.name as city, c.slug, c.state
FROM pincode_city_map pcm
JOIN cities c ON c.id = pcm.city_id
WHERE pcm.pincode = '160017' AND pcm.is_active = true;

-- Find cities by pincode prefix
SELECT DISTINCT c.name, c.slug, c.state, c.is_coming_soon
FROM cities c
WHERE c.pincode_prefix && ARRAY['16']
  AND c.is_active = true;

-- City notification signups by city
SELECT city_name, count(*) as signup_count
FROM city_notifications
GROUP BY city_name
ORDER BY signup_count DESC;

-- Cities with notify counts
SELECT name, slug, is_active, is_coming_soon, notify_count
FROM cities
ORDER BY notify_count DESC;
```

---

## Notes

- Prisma uses CUID for all primary keys (not UUID)
- `TIMESTAMP(3)` = millisecond precision timestamps
- `TEXT[]` = PostgreSQL text array type
- `JSONB` = PostgreSQL binary JSON type
- Prisma auto-generates `_prisma_migrations` table for tracking schema state
- Column naming conventions vary by table:
  - **camelCase columns** (via Prisma): users, addresses, cities, delivery_slots, vendors, products, categories, orders, payments, order_items, currency_configs, payment_methods, menu_items, cart_items, coupons, reviews, vendor_payouts, partners, partner_earnings, order_status_history, audit_logs, product_variations, vendor_products, vendor_product_variations, product_addons, product_upsells, delivery_surcharges, city_zones, city_delivery_configs, vendor_working_hours, vendor_slots, vendor_holidays, vendor_pincodes, vendor_zones, vendor_capacity, otp_verifications
  - **snake_case columns** (direct SQL): banners, banner_generation_jobs, city_slot_cutoff, pincode_city_map, city_notifications, product_relations, image_generation_jobs, catalog_imports, delivery_holidays, seo_settings, category_addon_templates, category_addon_template_options, product_attributes, product_attribute_options, product_addon_groups, product_addon_options, service_areas
  - **Mixed columns**: platform_settings (has both snake_case and camelCase duplicates for updated_at/updatedAt and updated_by/updatedBy)
