# SQL_REFERENCE.md — Gifts Cart India Database Reference

> **IMPORTANT:** Update this file whenever the database schema changes.

---

## 2A — Current Tables

| Table | Prisma Model | Key Columns | Relations |
|-------|-------------|-------------|-----------|
| `users` | User | id, phone, email, name, role, walletBalance, isActive | → addresses, orders, reviews, cart_items |
| `otp_verifications` | OtpVerification | id, email, otp, expiresAt, verified, attempts | (standalone) |
| `addresses` | Address | id, userId, name, phone, address, city, state, pincode | → users, orders |
| `cities` | City | id, name, slug, state, isActive, lat, lng, baseDeliveryCharge | → city_zones, vendors, city_delivery_configs, delivery_holidays |
| `city_zones` | CityZone | id, cityId, name, pincodes[], extraCharge | → cities, vendor_zones |
| `delivery_slots` | DeliverySlot | id, name, slug, startTime, endTime, baseCharge | → city_delivery_configs, vendor_slots |
| `city_delivery_configs` | CityDeliveryConfig | id, cityId, slotId, isAvailable, chargeOverride | → cities, delivery_slots |
| `delivery_holidays` | DeliveryHoliday | id, date, cityId, blockedSlots[], reason | → cities |
| `delivery_surcharges` | DeliverySurcharge | id, name, startDate, endDate, amount, appliesTo | (standalone) |
| `vendors` | Vendor | id, userId, businessName, cityId, status, commissionRate, rating | → cities, vendor_products, orders, vendor_working_hours, vendor_slots, vendor_holidays, vendor_pincodes, vendor_zones, vendor_capacity, vendor_payouts, vendor_product_variations |
| `vendor_working_hours` | VendorWorkingHours | id, vendorId, dayOfWeek, openTime, closeTime, isClosed | → vendors |
| `vendor_slots` | VendorSlot | id, vendorId, slotId, isEnabled, customCharge | → vendors, delivery_slots |
| `vendor_holidays` | VendorHoliday | id, vendorId, date, blockedSlots[], reason | → vendors |
| `vendor_pincodes` | VendorPincode | id, vendorId, pincode, deliveryCharge, isActive | → vendors |
| `vendor_zones` | VendorZone | id, vendorId, zoneId, deliveryCharge, minOrder | → vendors, city_zones |
| `vendor_capacity` | VendorCapacity | id, vendorId, date, slotId, maxOrders, bookedOrders | → vendors |
| `categories` | Category | id, name, slug, description, image, parentId, sortOrder, metaTitle, metaDescription | → self (parent/children), products, category_addon_templates |
| `products` | Product | id, name, slug, categoryId, basePrice, productType, metaTitle, metaDescription, images[], tags[], occasion[] | → categories, vendor_products, order_items, cart_items, reviews, product_addons, product_attributes, product_variations, product_addon_groups, product_upsells |
| `product_addons` | ProductAddon | id, productId, name, price, image | → products (legacy — being replaced by product_addon_groups) |
| `product_attributes` | ProductAttribute | id, productId, name, slug, isForVariations | → products, product_attribute_options |
| `product_attribute_options` | ProductAttributeOption | id, attributeId, value, sortOrder | → product_attributes |
| `product_variations` | ProductVariation | id, productId, attributes (JSONB), price, salePrice, isActive | → products, vendor_product_variations |
| `product_addon_groups` | ProductAddonGroup | id, productId, name, type, required, templateGroupId, isOverridden | → products, product_addon_options |
| `product_addon_options` | ProductAddonOption | id, groupId, label, price, isDefault | → product_addon_groups |
| `product_upsells` | ProductUpsell | id, productId, upsellProductId, sortOrder | → products (×2) |
| `vendor_product_variations` | VendorProductVariation | id, vendorId, productId, variationId, costPrice, isAvailable | → vendors, product_variations |
| `vendor_products` | VendorProduct | id, vendorId, productId, costPrice, sellingPrice, isAvailable | → vendors, products |
| `orders` | Order | id, orderNumber, userId, vendorId, partnerId, addressId, deliveryDate, status, total | → users, vendors, partners, addresses, order_items, payments, order_status_history |
| `order_items` | OrderItem | id, orderId, productId, name, quantity, price, addons, variationId, variationLabel | → orders, products |
| `order_status_history` | OrderStatusHistory | id, orderId, status, note, changedBy | → orders |
| `payments` | Payment | id, orderId, amount, currency, gateway, razorpayOrderId, razorpayPaymentId, razorpaySignature, stripeSessionId, stripePaymentIntentId, paypalOrderId, paypalCaptureId, method, status | → orders |
| `vendor_payouts` | VendorPayout | id, vendorId, amount, period, orderCount, netAmount, status | → vendors |
| `partners` | Partner | id, name, refCode, subdomain, customDomain, commissionPercent | → orders, partner_earnings |
| `partner_earnings` | PartnerEarning | id, partnerId, orderId, amount, status | → partners |
| `cart_items` | CartItem | id, userId, productId, quantity, addons, variationId, deliveryDate, deliverySlot | → users, products |
| `coupons` | Coupon | id, code, discountType, discountValue, minOrderAmount, validFrom, validUntil | (standalone) |
| `reviews` | Review | id, userId, productId, orderId, rating, comment, images[] | → users, products |
| `category_addon_templates` | CategoryAddonTemplate | id, categoryId, name, type, required | → categories, category_addon_template_options |
| `category_addon_template_options` | CategoryAddonTemplateOption | id, templateId, label, price, isDefault | → category_addon_templates |
| `seo_settings` | SeoSettings | id, siteName, siteDescription, defaultOgImage, robotsTxt | singleton — always 1 row |
| `currency_configs` | CurrencyConfig | id, code, name, symbol, symbolPosition, exchangeRate, markup, rounding, roundTo, locale, countries[], isDefault, isActive | (standalone) |
| `audit_logs` | AuditLog | id, adminId, adminRole, actionType, entityType, entityId, reason | (standalone) |
| `pincode_city_map` | PincodeCityMap | id, pincode (unique), cityId, areaName, isActive | → cities |
| `city_notifications` | CityNotification | id, email, phone, cityName | (standalone) |
| `product_relations` | ProductRelation | id, productId, relatedProductId, relationType, sortOrder, isActive | → products (×2), unique(productId, relatedProductId, relationType) |
| `image_generation_jobs` | ImageGenerationJob | id, productId, imageIndex, imageType, status, promptUsed, storageUrl, retryCount | → products, unique(productId, imageIndex) |
| `catalog_imports` | CatalogImport | id, adminId, fileName, status, categoriesCount, productsCount | (standalone) |

**Total: 47 tables** (31 original + 10 Phase A + 1 multi-currency + 5 Sprint 1)

---

## 2B — SQL Scripts Log

| Script | Purpose | Status |
|--------|---------|--------|
| Prisma `db push` | Phase 1 schema creation (all 31 tables) | ✅ Executed |
| `prisma/seed.ts` | Phase 1 seed data (cities, categories, products, vendor) | ✅ Executed |
| Phase A schema migration | product_attributes, product_variations (migrated to JSONB), addon groups, upsells, vendor_product_variations, category templates, SEO fields on products/categories, seo_settings singleton | ✅ Executed |
| Migration 002 — Schema sync | order_items: +variationId, +variationLabel; payments: +gateway (PaymentGateway enum), +stripe/paypal columns; cart_items: +variationId; currency_configs table | ⏳ **PENDING — Run `prisma/migrations/002_sync_schema.sql` in Supabase SQL Editor** |
| Sprint 1 migration | pincode_city_map, city_notifications, product_relations (RelationType enum), image_generation_jobs (ImageJobStatus, ImageType enums), catalog_imports (ImportStatus enum). Cities table: +aliases, +display_name, +is_coming_soon, +notify_count, +pincode_prefix. | ✅ Executed (pre-run in Supabase) |

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
UNION ALL SELECT 'catalog_imports', count(*) FROM catalog_imports;
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
- Prisma uses `camelCase` field names → PostgreSQL uses `snake_case` column names (auto-mapped)
- The `@@map("table_name")` directive controls the PostgreSQL table name
- The `@map("column_name")` directive (if used) controls individual column names
- Prisma auto-maps `createdAt` → `created_at`, `userId` → `user_id`, etc.

---

## 2E — Schema DDL Reference

### Enums

```sql
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "BusinessModel" AS ENUM ('MODEL_A', 'MODEL_B');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIABLE');
CREATE TYPE "AddonType" AS ENUM ('CHECKBOX', 'RADIO', 'SELECT', 'TEXT_INPUT', 'TEXTAREA', 'FILE_UPLOAD');
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'STRIPE', 'PAYPAL', 'COD');
```

### Users & Auth

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    name TEXT,
    password_hash TEXT,
    role "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE otp_verifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX otp_verifications_email_otp_idx ON otp_verifications(email, otp);

CREATE TABLE addresses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL
);
```

### Location

```sql
CREATE TABLE cities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    base_delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 49,
    free_delivery_above DECIMAL(10,2) NOT NULL DEFAULT 499,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    display_name TEXT,
    is_coming_soon BOOLEAN NOT NULL DEFAULT false,
    notify_count INTEGER NOT NULL DEFAULT 0,
    pincode_prefix TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE city_zones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pincodes TEXT[] NOT NULL,
    extra_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);
```

### Delivery Configuration

```sql
CREATE TABLE delivery_slots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    base_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE city_delivery_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    slot_id TEXT NOT NULL REFERENCES delivery_slots(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT true,
    charge_override DECIMAL(10,2),
    UNIQUE(city_id, slot_id)
);

CREATE TABLE delivery_holidays (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date DATE NOT NULL,
    city_id TEXT REFERENCES cities(id) ON DELETE CASCADE,
    blocked_slots TEXT[] NOT NULL,
    reason TEXT NOT NULL
);

CREATE TABLE delivery_surcharges (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    applies_to TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);
```

### Vendors

```sql
CREATE TABLE vendors (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    city_id TEXT NOT NULL REFERENCES cities(id),
    address TEXT NOT NULL,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    categories TEXT[] NOT NULL,
    status "VendorStatus" NOT NULL DEFAULT 'PENDING',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 12,
    rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    is_online BOOLEAN NOT NULL DEFAULT false,
    auto_accept BOOLEAN NOT NULL DEFAULT false,
    vacation_start TIMESTAMP(3),
    vacation_end TIMESTAMP(3),
    pan_number TEXT,
    gst_number TEXT,
    fssai_number TEXT,
    bank_account_no TEXT,
    bank_ifsc TEXT,
    bank_name TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE vendor_working_hours (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(vendor_id, day_of_week)
);

CREATE TABLE vendor_slots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    slot_id TEXT NOT NULL REFERENCES delivery_slots(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    custom_charge DECIMAL(10,2),
    UNIQUE(vendor_id, slot_id)
);

CREATE TABLE vendor_holidays (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    blocked_slots TEXT[] NOT NULL,
    reason TEXT
);

CREATE TABLE vendor_pincodes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    pincode TEXT NOT NULL,
    delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(vendor_id, pincode)
);

CREATE TABLE vendor_zones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    zone_id TEXT NOT NULL REFERENCES city_zones(id) ON DELETE CASCADE,
    delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_order DECIMAL(10,2) NOT NULL DEFAULT 0,
    UNIQUE(vendor_id, zone_id)
);

CREATE TABLE vendor_capacity (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    slot_id TEXT NOT NULL,
    max_orders INTEGER NOT NULL,
    booked_orders INTEGER NOT NULL DEFAULT 0,
    UNIQUE(vendor_id, date, slot_id)
);
```

### Products

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    parent_id TEXT REFERENCES categories(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[] NOT NULL DEFAULT '{}',
    og_image TEXT
);

CREATE TABLE products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    short_desc TEXT,
    category_id TEXT NOT NULL REFERENCES categories(id),
    base_price DECIMAL(10,2) NOT NULL,
    images TEXT[] NOT NULL,
    tags TEXT[] NOT NULL,
    occasion TEXT[] NOT NULL,
    weight TEXT,
    is_veg BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    product_type "ProductType" NOT NULL DEFAULT 'SIMPLE',
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[] NOT NULL DEFAULT '{}',
    og_image TEXT,
    canonical_url TEXT,
    ai_image_prompt TEXT
);

CREATE TABLE product_addons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
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
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attributes JSONB NOT NULL,
    sku TEXT,
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    sale_from TIMESTAMP(3),
    sale_to TIMESTAMP(3),
    image TEXT,
    stock_qty INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX product_variations_product_id_idx ON product_variations(product_id);

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
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upsell_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(product_id, upsell_product_id)
);

CREATE TABLE vendor_product_variations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variation_id TEXT NOT NULL REFERENCES product_variations(id) ON DELETE CASCADE,
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2),
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, variation_id)
);
CREATE INDEX vpv_vendor_id_idx ON vendor_product_variations(vendor_id);
CREATE INDEX vpv_variation_id_idx ON vendor_product_variations(variation_id);

CREATE TABLE vendor_products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2),
    is_available BOOLEAN NOT NULL DEFAULT true,
    preparation_time INTEGER NOT NULL DEFAULT 120,
    daily_limit INTEGER,
    UNIQUE(vendor_id, product_id)
);
```

### Orders

```sql
CREATE TABLE orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id),
    vendor_id TEXT REFERENCES vendors(id),
    partner_id TEXT REFERENCES partners(id),
    address_id TEXT NOT NULL REFERENCES addresses(id),
    delivery_date DATE NOT NULL,
    delivery_slot TEXT NOT NULL,
    delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    surcharge DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status "OrderStatus" NOT NULL DEFAULT 'PENDING',
    payment_status "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    payment_method TEXT,
    gift_message TEXT,
    special_instructions TEXT,
    coupon_code TEXT,
    business_model "BusinessModel" NOT NULL DEFAULT 'MODEL_A',
    vendor_cost DECIMAL(10,2),
    commission_amount DECIMAL(10,2),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX orders_user_id_idx ON orders(user_id);
CREATE INDEX orders_vendor_id_idx ON orders(vendor_id);
CREATE INDEX orders_order_number_idx ON orders(order_number);

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
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status "OrderStatus" NOT NULL,
    note TEXT,
    changed_by TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Payments

```sql
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'STRIPE', 'PAYPAL', 'COD');

CREATE TABLE payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL UNIQUE REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    gateway "PaymentGateway" NOT NULL DEFAULT 'RAZORPAY',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paypalOrderId" TEXT,
    "paypalCaptureId" TEXT,
    method TEXT,
    status "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE vendor_payouts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vendor_id TEXT NOT NULL REFERENCES vendors(id),
    amount DECIMAL(10,2) NOT NULL,
    period TEXT NOT NULL,
    order_count INTEGER NOT NULL,
    deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
    tds_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    status "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    transaction_ref TEXT,
    paid_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Partners

```sql
CREATE TABLE partners (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    ref_code TEXT NOT NULL UNIQUE,
    subdomain TEXT UNIQUE,
    custom_domain TEXT UNIQUE,
    logo_url TEXT,
    primary_color TEXT NOT NULL DEFAULT '#E91E63',
    secondary_color TEXT NOT NULL DEFAULT '#9C27B0',
    show_powered_by BOOLEAN NOT NULL DEFAULT true,
    commission_percent DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE partner_earnings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    partner_id TEXT NOT NULL REFERENCES partners(id),
    order_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Cart

```sql
CREATE TABLE cart_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    addons JSONB,
    delivery_date DATE,
    delivery_slot TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    UNIQUE(user_id, product_id)
);
```

### Coupons

```sql
CREATE TABLE coupons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    per_user_limit INTEGER NOT NULL DEFAULT 1,
    valid_from TIMESTAMP(3) NOT NULL,
    valid_until TIMESTAMP(3) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    applicable_on TEXT[] NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Reviews

```sql
CREATE TABLE reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    order_id TEXT,
    rating INTEGER NOT NULL,
    comment TEXT,
    images TEXT[] NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    admin_id TEXT NOT NULL,
    admin_role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_changed TEXT,
    old_value JSONB,
    new_value JSONB,
    reason TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_logs_entity_type_entity_id_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_admin_id_idx ON audit_logs(admin_id);
```

### Sprint 1 — City-First UX Tables

```sql
-- Enums
CREATE TYPE "RelationType" AS ENUM ('UPSELL', 'CROSS_SELL');
CREATE TYPE "ImageJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED');
CREATE TYPE "ImageType" AS ENUM ('HERO', 'LIFESTYLE', 'DETAIL');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- Cities table alterations (already run)
ALTER TABLE cities ADD COLUMN aliases TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE cities ADD COLUMN display_name TEXT;
ALTER TABLE cities ADD COLUMN is_coming_soon BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cities ADD COLUMN notify_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cities ADD COLUMN pincode_prefix TEXT[] NOT NULL DEFAULT '{}';

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
- Column names use `snake_case` in PostgreSQL (Prisma maps `camelCase` automatically)
