-- Migration: 004_delivery_calendar_indexes
-- Purpose: Add indexes to speed up delivery available-dates calendar queries
-- Run in Supabase SQL Editor BEFORE deploying the route optimization

CREATE INDEX IF NOT EXISTS vendor_products_product_id_idx
  ON vendor_products("productId");

CREATE INDEX IF NOT EXISTS delivery_holidays_date_city_idx
  ON delivery_holidays(date, "cityId");

CREATE INDEX IF NOT EXISTS vendor_working_hours_vendor_id_idx
  ON vendor_working_hours("vendorId");

CREATE INDEX IF NOT EXISTS city_delivery_configs_city_id_idx
  ON city_delivery_configs("cityId");
