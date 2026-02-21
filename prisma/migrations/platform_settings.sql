-- Platform Settings table for storing site-wide configuration (logo, site name, favicon, etc.)
-- Run this SQL in Supabase SQL Editor

CREATE TABLE platform_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- Seed defaults
INSERT INTO platform_settings (key, value) VALUES
  ('logo_url', null),
  ('site_name', 'Gifts Cart India'),
  ('favicon_url', null)
ON CONFLICT (key) DO NOTHING;
