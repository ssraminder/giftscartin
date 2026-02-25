# Database Table Audit Report

**Date:** 2026-02-25
**Audited by:** Claude Code (automated codebase analysis)
**Supabase Project:** `saeditdtacprxcnlgips`
**Total Tables in Schema:** 54 (per SQL_REFERENCE.md)

> **Note:** Database credentials were not available in the environment, so row counts and overlap queries could not be executed against the live database. This report is based on thorough codebase analysis (`.from()` calls in all `src/**/*.ts` and `src/**/*.tsx` files) combined with documentation from `SQL_REFERENCE.md` and `PROGRESS.md`. Findings marked with `[VERIFY IN DB]` require live database confirmation.

---

## 1. Tables Confirmed in Active Use

These 49 tables are actively queried by API routes, lib utilities, or frontend components via `supabase.from('table_name')` calls:

| # | Table | Primary Usage Locations |
|---|-------|----------------------|
| 1 | `users` | Auth routes, admin customers, orders |
| 2 | `otp_verifications` | `/api/auth/otp/send`, `/api/auth/otp/verify` |
| 3 | `addresses` | `/api/addresses`, checkout, orders |
| 4 | `cities` | City selector, serviceability, admin/cities, pincode-resolver |
| 5 | `city_zones` | `/api/orders`, `/api/serviceability`, `/api/admin/cities`, `/api/city/resolve` |
| 6 | `delivery_slots` | `/api/delivery/*`, recalculate-city-slots, admin delivery config |
| 7 | `city_delivery_configs` | `/api/delivery/slots`, `/api/delivery/availability`, admin delivery config |
| 8 | `delivery_holidays` | `/api/delivery/slots`, `/api/delivery/available-dates`, `/api/products/same-day`, admin holidays |
| 9 | `delivery_surcharges` | `/api/delivery/slots`, `/api/delivery/availability`, `/api/orders`, admin surcharges |
| 10 | `vendors` | Vendor dashboard, admin vendors, orders, serviceability |
| 11 | `vendor_working_hours` | `/api/vendor/settings`, `/api/orders`, `/api/delivery/availability`, admin vendors |
| 12 | `vendor_slots` | `/api/vendor/settings`, `/api/orders`, `/api/delivery/availability`, admin vendors |
| 13 | `vendor_holidays` | `/api/vendor/settings`, `/api/orders` |
| 14 | `vendor_pincodes` | `/api/vendor/settings`, `/api/orders`, `/api/serviceability`, `/api/products`, admin vendor coverage |
| 15 | `vendor_zones` | `/api/serviceability` (vendor zone-based coverage check) |
| 16 | `vendor_capacity` | `/api/orders`, `/api/delivery/availability` |
| 17 | `categories` | `/api/categories`, `/api/admin/categories`, product pages, auto-assign |
| 18 | `products` | `/api/products`, product pages, admin products, sitemap, SEO |
| 19 | `product_attributes` | Product detail page, `/api/products/[id]`, admin products |
| 20 | `product_attribute_options` | Product detail page (via nested select on product_attributes) |
| 21 | `product_variations` | Product detail page, `/api/products`, `/api/orders`, admin products, vendor products |
| 22 | `product_addon_groups` | Product detail page, `/api/products/[id]`, admin products, template sync |
| 23 | `product_addon_options` | Product detail page (via nested select), admin products, template sync |
| 24 | `product_upsells` | Product detail page, `/api/products/[id]`, admin products |
| 25 | `vendor_products` | `/api/vendor/products`, admin vendor products, auto-assign, orders |
| 26 | `orders` | Order management (customer, vendor, admin), payments |
| 27 | `order_items` | Order detail pages, order creation |
| 28 | `order_status_history` | Order detail pages, vendor order actions |
| 29 | `payments` | Payment creation, verification, webhooks, admin order payment |
| 30 | `vendor_payouts` | `/api/vendor/earnings` |
| 31 | `partners` | `/api/partners/resolve`, admin partners |
| 32 | `partner_earnings` | `/api/orders` (on order creation), admin partners |
| 33 | `cart_items` | `/api/cart` |
| 34 | `coupons` | `/api/coupons/validate` |
| 35 | `reviews` | Product detail page, `/api/products/[id]` |
| 36 | `category_addon_templates` | Admin categories, template sync |
| 37 | `category_addon_template_options` | Admin categories (via nested select), template sync |
| 38 | `seo_settings` | `src/lib/seo.ts`, `/api/admin/seo` |
| 39 | `currency_configs` | `/api/currencies/resolve`, `/api/admin/currencies` |
| 40 | `audit_logs` | Admin vendor actions, order assignment |
| 41 | `pincode_city_map` | `/api/city/resolve` (Layer 2 fallback), `src/lib/pincode-resolver.ts` (Layer 2) |
| 42 | `city_notifications` | `/api/city/notify` |
| 43 | `payment_methods` | `/api/admin/payment-methods`, admin order payment |
| 44 | `banners` | `/api/banners`, `/api/admin/banners` |
| 45 | `banner_generation_jobs` | `/api/admin/banners/generate-image`, `/api/admin/banners/generate/[jobId]` |
| 46 | `city_slot_cutoff` | `/api/serviceability`, `/api/delivery/city-slots`, `src/lib/recalculate-city-slots.ts` |
| 47 | `menu_items` | Shop layout, `/api/admin/menu` |
| 48 | `platform_settings` | Shop layout, `/api/admin/settings/logo`, `/api/admin/settings/general` |
| 49 | `service_areas` | `/api/serviceability`, `/api/city/resolve`, `/api/admin/areas`, pincode-resolver, admin dashboard, vendor coverage |

---

## 2. Tables with Data but NOT Referenced in Code

These tables exist in the database, likely have seed/test data, but have **zero `.from()` calls** anywhere in the codebase:

| Table | Prisma Model | SQL_REFERENCE Status | Notes |
|-------|-------------|---------------------|-------|
| `product_addons` | `ProductAddon` | Exists, marked as **"legacy -- being replaced by product_addon_groups"** | The new addon system (`product_addon_groups` + `product_addon_options`) has fully replaced this. No API route queries this table. May still contain seed data from Phase 1. `[VERIFY IN DB]` |
| `vendor_product_variations` | `VendorProductVariation` | Exists | Designed to let vendors set per-variation cost/selling prices. Never implemented in any API route or UI. May have been seeded. `[VERIFY IN DB]` |

---

## 3. Empty Tables NOT Referenced in Code

These tables were created during migrations but have no API implementation and are likely empty:

| Table | Prisma Model | SQL_REFERENCE Status | Notes |
|-------|-------------|---------------------|-------|
| `product_relations` | `ProductRelation` | Sprint 1 migration | Designed for UPSELL/CROSS_SELL relations between products. Superseded by `product_upsells` table which is actively used. No `.from('product_relations')` call exists. `[VERIFY IN DB — confirm 0 rows]` |
| `image_generation_jobs` | `ImageGenerationJob` | Sprint 1 migration | Designed for AI product image generation job tracking. No API route queries or writes to this table. Note: `banner_generation_jobs` (a separate table) IS actively used. `[VERIFY IN DB — confirm 0 rows]` |
| `catalog_imports` | `CatalogImport` | Sprint 1 migration | Designed for bulk catalog import tracking. No import feature was ever built. No `.from('catalog_imports')` call exists. `[VERIFY IN DB — confirm 0 rows]` |

---

## 4. Overlapping Tables

### 4A. Location/Pincode Mapping: `service_areas` vs `pincode_city_map` vs `city_zones`

**Purpose comparison:**

| Table | Purpose | Key Columns | Code Usage |
|-------|---------|-------------|-----------|
| `service_areas` | **Primary** pincode-to-city mapping with geo coordinates and area names | pincode, city_id, city_name, state, lat, lng, altNames[], is_active | Serviceability check (Layer 1), city/resolve (Layer 1), admin areas CRUD, pincode-resolver (auto-creates entries), admin dashboard stats, vendor coverage preview |
| `pincode_city_map` | **Fallback** pincode-to-city mapping | pincode, city_id, area_name, is_active | city/resolve (Layer 2 fallback), pincode-resolver (Layer 2 fallback) |
| `city_zones` | **Zone grouping** — groups pincodes into delivery zones with surcharges | cityId, name, pincodes[], extraCharge, isActive | Orders (zone-based delivery surcharge), serviceability (zone detection), admin city management |

**Analysis:**
- `service_areas` and `pincode_city_map` store the **same kind of data** (pincode → city mapping) but `service_areas` is richer (has lat/lng, altNames, state, city_name).
- `pincode_city_map` is only used as a fallback when a pincode isn't found in `service_areas`.
- `city_zones` serves a **different purpose** (grouping pincodes for delivery surcharges) — NOT redundant.
- The pincode-resolver (`src/lib/pincode-resolver.ts`) already auto-creates `service_areas` entries for resolved pincodes, making `pincode_city_map` increasingly unnecessary over time.

**Recommendation:**
1. `[VERIFY IN DB]` Run the overlap query: How many `pincode_city_map` pincodes already exist in `service_areas`? How many are unique to `pincode_city_map`?
2. Migrate any pincodes unique to `pincode_city_map` into `service_areas` (adding city_name, state from the cities table).
3. Drop `pincode_city_map` after migration.
4. Keep `city_zones` — it serves a distinct purpose.

### 4B. Delivery Slot Config: `city_delivery_configs` vs `city_slot_cutoff`

| Table | Purpose | Code Usage |
|-------|---------|-----------|
| `city_delivery_configs` | Admin-managed per-city per-slot configuration (availability + charge override) | Admin delivery config UI, delivery slots API, delivery availability API |
| `city_slot_cutoff` | **Computed/cached** per-city per-slot availability with denormalized slot details + vendor counts | Serviceability API, delivery city-slots API, recalculated by `recalculate-city-slots.ts` |

**Analysis:**
- These are **NOT truly redundant** — `city_slot_cutoff` is a materialized/computed table that `recalculate-city-slots.ts` rebuilds from `delivery_slots`, `vendors`, and `vendor_slots`.
- `city_delivery_configs` is the admin-editable source of truth; `city_slot_cutoff` is the precomputed read cache.
- Both are actively used and serve different purposes.

**Recommendation:** Keep both. This is an intentional denormalization pattern for performance.

### 4C. Product Addons: `product_addons` vs `product_addon_groups` + `product_addon_options`

| Table | Purpose | Code Usage |
|-------|---------|-----------|
| `product_addons` (LEGACY) | Simple name+price addon per product | **None** — zero `.from()` calls |
| `product_addon_groups` | Flexible addon groups with types (checkbox, radio, select, text, file upload), template sync | Heavily used in product detail, admin products, template sync |
| `product_addon_options` | Options within addon groups | Heavily used alongside product_addon_groups |

**Analysis:**
- `product_addons` is the old Phase 1 system. `product_addon_groups` + `product_addon_options` is the replacement.
- SQL_REFERENCE.md explicitly marks `product_addons` as "legacy -- being replaced by product_addon_groups".
- No code queries `product_addons` anymore.

**Recommendation:** Drop `product_addons` after confirming it has no data or that any data has been migrated to the new system.

### 4D. Product Relations: `product_relations` vs `product_upsells`

| Table | Purpose | Code Usage |
|-------|---------|-----------|
| `product_relations` | Generic product-to-product relations (UPSELL, CROSS_SELL types) | **None** — zero `.from()` calls |
| `product_upsells` | Specific upsell relations between products | Actively used in product detail page and admin products |

**Analysis:**
- `product_relations` was designed as a generic relation system but was never implemented.
- `product_upsells` was implemented instead as a simpler, purpose-built alternative.
- They store the same kind of data for the UPSELL case. `product_relations` additionally supports CROSS_SELL but that was never built.

**Recommendation:** Drop `product_relations`. If CROSS_SELL is needed in the future, it can be added to `product_upsells` or rebuilt.

---

## 5. Recommended Drop Order

Ordered from safest (empty + unreferenced) to more careful (has data, needs migration):

### Tier 1 — Safe to Drop Immediately (empty, unreferenced)
These tables have no code references and are likely empty. Verify 0 rows, then DROP.

| # | Table | Risk | Action |
|---|-------|------|--------|
| 1 | `catalog_imports` | None | `DROP TABLE catalog_imports;` |
| 2 | `image_generation_jobs` | None | `DROP TABLE image_generation_jobs;` |
| 3 | `product_relations` | None | `DROP TABLE product_relations;` — superseded by `product_upsells` |

### Tier 2 — Safe to Drop After Data Check (unreferenced, may have data)
No code queries these tables, but they may contain seed data. Verify row count and confirm no needed data.

| # | Table | Risk | Action |
|---|-------|------|--------|
| 4 | `product_addons` | Low — legacy, replaced by `product_addon_groups` | Verify 0 rows or that data was migrated. Then `DROP TABLE product_addons;` |
| 5 | `vendor_product_variations` | Low — never implemented | Verify 0 rows. Then `DROP TABLE vendor_product_variations;` |

### Tier 3 — Requires Data Migration Before Drop
These tables have code references but overlap with another table. Migrate data first.

| # | Table | Risk | Action |
|---|-------|------|--------|
| 6 | `pincode_city_map` | Medium — used as fallback in 2 code paths | 1. Run overlap query to find pincodes unique to `pincode_city_map`<br>2. Migrate unique pincodes to `service_areas`<br>3. Update `src/lib/pincode-resolver.ts` and `src/app/api/city/resolve/route.ts` to remove Layer 2 fallback<br>4. `DROP TABLE pincode_city_map;` |

### Tier 4 — Keep But Monitor
These tables are in active use but may not be needed long-term. Re-evaluate during next architecture review.

| Table | Reason to Monitor |
|-------|------------------|
| `vendor_zones` | Used in serviceability but the task description mentions it was "dropped as unused". Verify if it still has data and if vendors actually use zone-based coverage. If all vendors use pincode-based coverage, this can be dropped. |
| `city_notifications` | Only used by a single `/api/city/notify` endpoint for "coming soon" city interest. Low-traffic feature. Consider whether email list management belongs in the DB or a third-party service (e.g., Brevo lists). |

---

## 6. Schema Changes Needed in `prisma/schema.prisma`

After dropping the recommended tables, remove these Prisma models and related code:

### Models to Remove

| Prisma Model | Maps to Table | Line in schema.prisma |
|-------------|--------------|----------------------|
| `CatalogImport` | `catalog_imports` | Lines 1070–1085 |
| `ImageGenerationJob` | `image_generation_jobs` | Lines 1028–1047 |
| `ProductRelation` | `product_relations` | Lines 996–1010 |
| `ProductAddon` | `product_addons` | Lines 451–462 |
| `VendorProductVariation` | `vendor_product_variations` | Lines 545–561 |
| `PincodeCityMap` | `pincode_city_map` | Lines 964–975 (after data migration) |

### Enums to Remove (if no other table uses them)

| Enum | Used By | Can Remove? |
|------|---------|------------|
| `RelationType` | Only `ProductRelation` | Yes — remove after dropping `product_relations` |
| `ImageJobStatus` | Only `ImageGenerationJob` | Yes — remove after dropping `image_generation_jobs` |
| `ImageType` | Only `ImageGenerationJob` | Yes — remove after dropping `image_generation_jobs` |
| `ImportStatus` | Only `CatalogImport` | Yes — remove after dropping `catalog_imports` |

### Relation References to Clean Up

After removing models, also remove relation fields from parent models:

| Model | Field to Remove | Reason |
|-------|----------------|--------|
| `Product` | `addons ProductAddon[]` | Legacy addon relation |
| `Product` | `relations ProductRelation[] @relation("ProductRelations")` | Unused relation |
| `Product` | `relatedBy ProductRelation[] @relation("RelatedProducts")` | Unused relation |
| `Product` | `imageJobs ImageGenerationJob[]` | Unused relation |
| `Vendor` | `productVariations VendorProductVariation[]` | Unused relation |
| `City` | `pincodes PincodeCityMap[]` | After migration to service_areas |

### Additional Cleanup

1. **Drop unused enums from the database:**
   ```sql
   DROP TYPE IF EXISTS "RelationType";
   DROP TYPE IF EXISTS "ImageJobStatus";
   DROP TYPE IF EXISTS "ImageType";
   DROP TYPE IF EXISTS "ImportStatus";
   ```

2. **Update `SQL_REFERENCE.md`:** Remove dropped tables from Section 2A and update the total count.

3. **Update `PROGRESS.md`:** Remove references to dropped tables from the Database Status section.

---

## Summary

| Category | Count | Tables |
|----------|-------|--------|
| Actively used | 49 | All core business tables |
| Unreferenced + likely empty | 3 | `catalog_imports`, `image_generation_jobs`, `product_relations` |
| Unreferenced + may have data | 2 | `product_addons` (legacy), `vendor_product_variations` |
| Overlapping (needs migration) | 1 | `pincode_city_map` (merge into `service_areas`) |
| **Total droppable** | **6** | Reduces schema from 54 to 48 tables |

---

## Appendix: SQL Queries to Run Before Dropping

Execute these in the Supabase SQL Editor to verify findings before any DROP operations:

```sql
-- Step 1: Row counts for ALL tables
SELECT tablename, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Step 2: Confirm candidate tables are empty
SELECT 'product_relations' as tbl, count(*) FROM product_relations
UNION ALL SELECT 'image_generation_jobs', count(*) FROM image_generation_jobs
UNION ALL SELECT 'catalog_imports', count(*) FROM catalog_imports
UNION ALL SELECT 'product_addons', count(*) FROM product_addons
UNION ALL SELECT 'vendor_product_variations', count(*) FROM vendor_product_variations;

-- Step 3: Pincode overlap analysis
SELECT count(*) as total_in_pcm FROM pincode_city_map;
SELECT count(*) as total_in_sa FROM service_areas;

SELECT count(*) as already_in_service_areas
FROM pincode_city_map pcm
WHERE EXISTS (SELECT 1 FROM service_areas sa WHERE sa.pincode = pcm.pincode);

SELECT count(*) as only_in_pcm
FROM pincode_city_map pcm
WHERE NOT EXISTS (SELECT 1 FROM service_areas sa WHERE sa.pincode = pcm.pincode);

-- Step 4: Check vendor_zones usage
SELECT count(*) FROM vendor_zones;

-- Step 5: Foreign key dependencies on candidate tables
SELECT
    kcu.table_name AS referencing_table,
    kcu.column_name,
    ccu.table_name AS referenced_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name IN ('product_relations', 'image_generation_jobs', 'catalog_imports', 'product_addons', 'vendor_product_variations', 'pincode_city_map')
ORDER BY ccu.table_name;
```
