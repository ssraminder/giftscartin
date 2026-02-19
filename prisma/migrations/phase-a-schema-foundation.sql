-- Phase A — Schema Foundation Migration
-- Run each block separately in Supabase SQL Editor.
-- Confirm no errors before moving to the next block.
-- https://saeditdtacprxcnlgips.supabase.co → SQL Editor

-- ============================================================
-- Block 1 — New enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AddonType" AS ENUM ('CHECKBOX', 'RADIO', 'SELECT', 'TEXT_INPUT', 'TEXTAREA', 'FILE_UPLOAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Block 2 — SEO and type columns on products
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type "ProductType" NOT NULL DEFAULT 'SIMPLE',
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS meta_keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS og_image TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS ai_image_prompt TEXT;

-- ============================================================
-- Block 3 — SEO columns on categories
-- ============================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS meta_keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS og_image TEXT;

-- ============================================================
-- Block 4 — product_attributes
-- ============================================================

CREATE TABLE IF NOT EXISTS product_attributes (
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

-- ============================================================
-- Block 5 — product_attribute_options
-- ============================================================

CREATE TABLE IF NOT EXISTS product_attribute_options (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  attribute_id TEXT NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Block 6 — Migrate product_variations to new schema
-- The existing table has columns: type, label, value, is_default
-- The new schema uses: attributes (JSONB), sale_price, sale_from, sale_to, image, stock_qty
-- ============================================================

-- Back up existing variation data
CREATE TABLE IF NOT EXISTS _product_variations_backup AS
  SELECT * FROM product_variations;

-- Drop the old table and recreate with new schema
DROP TABLE IF EXISTS product_variations CASCADE;

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
CREATE INDEX IF NOT EXISTS product_variations_product_id_idx ON product_variations(product_id);

-- Migrate old data to new format (type+label+value → JSONB attributes)
INSERT INTO product_variations (id, product_id, attributes, sku, price, sort_order, is_active, created_at, updated_at)
SELECT
  id,
  product_id,
  jsonb_build_object('weight', label),
  sku,
  price,
  sort_order,
  is_active,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM _product_variations_backup;

-- Verify migration
SELECT count(*) as migrated_variations FROM product_variations;
SELECT count(*) as original_variations FROM _product_variations_backup;

-- Drop backup table after verification
-- DROP TABLE _product_variations_backup;

-- ============================================================
-- Block 7 — product_addon_groups
-- ============================================================

CREATE TABLE IF NOT EXISTS product_addon_groups (
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
CREATE INDEX IF NOT EXISTS product_addon_groups_product_id_idx ON product_addon_groups(product_id);

-- ============================================================
-- Block 8 — product_addon_options
-- ============================================================

CREATE TABLE IF NOT EXISTS product_addon_options (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES product_addon_groups(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- Block 9 — product_upsells
-- ============================================================

CREATE TABLE IF NOT EXISTS product_upsells (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  upsell_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, upsell_product_id)
);

-- ============================================================
-- Block 10 — vendor_product_variations
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_product_variations (
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
CREATE INDEX IF NOT EXISTS vpv_vendor_id_idx ON vendor_product_variations(vendor_id);
CREATE INDEX IF NOT EXISTS vpv_variation_id_idx ON vendor_product_variations(variation_id);

-- ============================================================
-- Block 11 — category_addon_templates
-- ============================================================

CREATE TABLE IF NOT EXISTS category_addon_templates (
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

-- ============================================================
-- Block 12 — category_addon_template_options
-- ============================================================

CREATE TABLE IF NOT EXISTS category_addon_template_options (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_id TEXT NOT NULL REFERENCES category_addon_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- Block 13 — seo_settings (singleton)
-- ============================================================

CREATE TABLE IF NOT EXISTS seo_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  site_name TEXT NOT NULL DEFAULT 'Gifts Cart India',
  site_description TEXT NOT NULL DEFAULT 'Fresh cakes, flowers and gifts delivered same day across India',
  default_og_image TEXT,
  google_verification TEXT,
  robots_txt TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO seo_settings (id, site_name, site_description)
VALUES (gen_random_uuid()::text, 'Gifts Cart India', 'Fresh cakes, flowers and gifts delivered same day across India')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Block 14 — Migrate existing product_addons to addon groups
-- ============================================================

-- Create a CHECKBOX group for each existing addon, preserving name and price
WITH inserted_groups AS (
  INSERT INTO product_addon_groups (
    id, product_id, name, type, required, sort_order, created_at, updated_at
  )
  SELECT
    gen_random_uuid()::text,
    product_id,
    name,
    'CHECKBOX'::"AddonType",
    false,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY id),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM product_addons
  WHERE is_active = true
  RETURNING id, product_id, name
)
INSERT INTO product_addon_options (id, group_id, label, price, image, is_default, sort_order, is_active)
SELECT
  gen_random_uuid()::text,
  ig.id,
  ig.name,
  pa.price,
  pa.image,
  false,
  0,
  true
FROM inserted_groups ig
JOIN product_addons pa ON pa.product_id = ig.product_id AND pa.name = ig.name;

-- Verify
SELECT
  (SELECT count(*) FROM product_addons WHERE is_active = true) AS original_addons,
  (SELECT count(*) FROM product_addon_groups) AS new_groups,
  (SELECT count(*) FROM product_addon_options) AS new_options;

-- ============================================================
-- Block 15 — Seed Cakes category addon templates
-- ============================================================

DO $$
DECLARE
  cakes_id TEXT;
  tmpl_name_id TEXT;
  tmpl_card_id TEXT;
BEGIN
  SELECT id INTO cakes_id FROM categories WHERE slug = 'cakes' LIMIT 1;
  IF cakes_id IS NULL THEN
    RAISE NOTICE 'Cakes category not found — skipping';
    RETURN;
  END IF;

  -- Name on Cake template
  INSERT INTO category_addon_templates
    (id, category_id, name, type, required, max_length, placeholder, sort_order, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, cakes_id, 'Name on Cake',
     'TEXT_INPUT'::"AddonType", false, 20, 'E.g. Happy Birthday Priya', 0,
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  RETURNING id INTO tmpl_name_id;

  -- Message Card template
  INSERT INTO category_addon_templates
    (id, category_id, name, type, required, sort_order, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, cakes_id, 'Message Card',
     'CHECKBOX'::"AddonType", false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  RETURNING id INTO tmpl_card_id;

  -- Message Card options
  INSERT INTO category_addon_template_options
    (id, template_id, label, price, is_default, sort_order, is_active)
  VALUES
    (gen_random_uuid()::text, tmpl_card_id, 'No Card', 0, true, 0, true),
    (gen_random_uuid()::text, tmpl_card_id, 'Printed Card', 49, false, 1, true),
    (gen_random_uuid()::text, tmpl_card_id, 'Premium Card', 99, false, 2, true);

  RAISE NOTICE 'Cakes addon templates created successfully';
END $$;

-- ============================================================
-- Block 16 — Verification queries
-- ============================================================

-- Verify all 10 new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'product_attributes', 'product_attribute_options',
    'product_variations', 'product_addon_groups',
    'product_addon_options', 'product_upsells',
    'vendor_product_variations', 'category_addon_templates',
    'category_addon_template_options', 'seo_settings'
  )
ORDER BY table_name;
-- Expected: 10 rows

SELECT count(*) as seo_settings_row FROM seo_settings;
-- Expected: 1

SELECT
  cat.name,
  count(t.id) as templates,
  count(o.id) as template_options
FROM categories cat
LEFT JOIN category_addon_templates t ON t.category_id = cat.id
LEFT JOIN category_addon_template_options o ON o.template_id = t.id
GROUP BY cat.name
HAVING count(t.id) > 0;
-- Expected: Cakes with 2 templates, 3 options
