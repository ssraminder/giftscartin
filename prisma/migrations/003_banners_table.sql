-- Migration 003: Banners table for homepage slider management
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS banners (
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
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed data: 5 default banners (3 active, 2 inactive)
INSERT INTO banners (title_html, subtitle_html, image_url, cta_text, cta_link, text_position, overlay_style, badge_text, sort_order, is_active) VALUES
  ('<strong>Fresh Cakes,</strong><br/>Delivered Today', 'Order by <strong>6 PM</strong> for same-day delivery', '/banners/banner-cakes.png', 'Order a Cake', '/category/cakes', 'right', 'dark-right', '🎂 Same Day Available', 1, true),
  ('Celebrate <em>Every</em><br/>Occasion', 'Flowers, cakes &amp; gifts — all in one place', '/banners/banner-occasions.png', 'Explore Gifts', '/category/gifts', 'left', 'dark-left', null, 2, true),
  ('Midnight<br/><strong>Surprises ✨</strong>', 'Order before <strong>10 PM</strong> for 11 PM delivery', '/banners/banner-midnight.png', 'Book Midnight', '/category/cakes?slot=midnight', 'right', 'full-dark', '🌙 11 PM – 12 AM', 3, true),
  ('Corporate Gifting,<br/><strong>Simplified</strong>', 'Bulk orders · Custom branding · GST invoices', '/banners/banner-corporate.png', 'Get Bulk Quote', '/corporate', 'left', 'dark-left', null, 4, false),
  ('Make Maa Feel<br/><strong>Special 💝</strong>', 'Flowers, cakes &amp; gifts for <strong>Mother''s Day</strong>', '/banners/banner-mothers-day.png', 'Shop Mother''s Day', '/category/gifts?occasion=mothers-day', 'left', 'dark-left', '💝 Mother''s Day', 5, false);
