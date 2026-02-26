-- Add delivery_surcharge column to service_areas table
-- This column stores a per-area delivery surcharge amount (e.g., ₹30 for extended areas)
-- Default is 0 (no surcharge)

ALTER TABLE service_areas
ADD COLUMN IF NOT EXISTS delivery_surcharge NUMERIC NOT NULL DEFAULT 0;
