-- Product page performance indexes
-- Run this in Supabase SQL Editor to improve product detail page query speed.
-- These indexes target the exact query patterns used by the product detail page.

-- Products are looked up by slug on every page visit
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Product variations filtered by productId + isActive
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON product_variations("productId");

-- Addon groups filtered by productId + isActive
CREATE INDEX IF NOT EXISTS idx_product_addon_groups_product_id ON product_addon_groups("productId");

-- Addon options filtered by groupId + isActive
CREATE INDEX IF NOT EXISTS idx_product_addon_options_group_id ON product_addon_options("groupId");

-- Reviews filtered by productId + isVerified, ordered by createdAt
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews("productId");

-- Vendor products filtered by productId + isAvailable
CREATE INDEX IF NOT EXISTS idx_vendor_products_product_id ON vendor_products("productId");

-- Upsells by productId
CREATE INDEX IF NOT EXISTS idx_product_upsells_product_id ON product_upsells("productId");

-- Attributes by productId
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes("productId");

-- Related products: category lookup
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products("categoryId");
