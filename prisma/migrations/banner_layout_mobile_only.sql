-- Add layout and mobile_only columns to banners table
-- layout: '16:9' (desktop) or '4:3' (mobile)
-- mobile_only: when true, 4:3 banners only show on mobile viewports

ALTER TABLE banners ADD COLUMN IF NOT EXISTS layout TEXT NOT NULL DEFAULT '16:9';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS mobile_only BOOLEAN NOT NULL DEFAULT false;
