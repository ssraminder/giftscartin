-- ============================================================
-- PROMPT 7: DELIVERY SLOT SYSTEM MIGRATION
-- ============================================================

-- 1. Products: add lead time columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_lead_time_hours INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS lead_time_note TEXT;

-- 2. Delivery slots: add cutoff and group columns
ALTER TABLE delivery_slots
  ADD COLUMN IF NOT EXISTS cutoff_hours INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS cutoff_time TEXT,
  ADD COLUMN IF NOT EXISTS slot_group TEXT NOT NULL DEFAULT 'standard';

-- 3. Delivery holidays: replace blocked_slots[] with mode system
ALTER TABLE delivery_holidays
  ADD COLUMN IF NOT EXISTS customer_message TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'FULL_BLOCK',
  ADD COLUMN IF NOT EXISTS slot_overrides JSONB;

-- Drop old blocked_slots column (was TEXT[])
ALTER TABLE delivery_holidays
  DROP COLUMN IF EXISTS blocked_slots;

-- 4. Replace the single 'fixed-slot' record with 6 priced windows
DELETE FROM delivery_slots WHERE slug = 'fixed-slot';

-- Insert 6 fixed time windows
-- cutoff_hours = 4 (must order 4h before window start)
INSERT INTO delivery_slots (id, name, slug, start_time, end_time, base_charge, cutoff_hours, cutoff_time, slot_group, is_active)
VALUES
  (gen_random_uuid()::text, 'Morning (9–11 AM)',    'fixed-morning',   '09:00', '11:00', 100.00, 4, NULL, 'fixed', true),
  (gen_random_uuid()::text, 'Late Morning (11–1)',  'fixed-late-morning','11:00','13:00',  75.00, 4, NULL, 'fixed', true),
  (gen_random_uuid()::text, 'Afternoon (12–2 PM)',  'fixed-afternoon',  '12:00', '14:00',  50.00, 4, NULL, 'fixed', true),
  (gen_random_uuid()::text, 'Afternoon (2–4 PM)',   'fixed-afternoon-2','14:00', '16:00',  50.00, 4, NULL, 'fixed', true),
  (gen_random_uuid()::text, 'Evening (4–6 PM)',     'fixed-evening',    '16:00', '18:00',  75.00, 4, NULL, 'fixed', true),
  (gen_random_uuid()::text, 'Evening (6–8 PM)',     'fixed-evening-2',  '18:00', '20:00', 100.00, 4, NULL, 'fixed', true);

-- 5. Update existing standard slots with cutoffs and groups
UPDATE delivery_slots SET
  cutoff_hours = 0,
  cutoff_time  = '17:00',  -- must order before 5pm for same-day standard
  slot_group   = 'standard'
WHERE slug = 'standard';

UPDATE delivery_slots SET
  cutoff_hours = 0,
  cutoff_time  = '18:00',  -- must order before 6pm for midnight
  slot_group   = 'midnight'
WHERE slug = 'midnight';

UPDATE delivery_slots SET
  cutoff_hours = 24,
  cutoff_time  = '18:00',  -- must order by 6pm the PREVIOUS day
  slot_group   = 'early-morning'
WHERE slug = 'early-morning';

UPDATE delivery_slots SET
  cutoff_hours = 3,   -- rolling: always 3h ahead of current time
  cutoff_time  = NULL,
  slot_group   = 'express'
WHERE slug = 'express';

-- 6. Seed city_delivery_configs for Chandigarh (all active slots)
INSERT INTO city_delivery_configs (id, city_id, slot_id, is_available, charge_override)
SELECT
  gen_random_uuid()::text,
  c.id,
  ds.id,
  true,
  NULL
FROM cities c
CROSS JOIN delivery_slots ds
WHERE c.slug = 'chandigarh'
  AND ds.is_active = true
ON CONFLICT (city_id, slot_id) DO NOTHING;

-- Disable express for Chandigarh initially (enable when operationally ready)
UPDATE city_delivery_configs
SET is_available = false
WHERE city_id = (SELECT id FROM cities WHERE slug = 'chandigarh')
  AND slot_id  = (SELECT id FROM delivery_slots WHERE slug = 'express');

-- 7. Update vendor_slots for sweet_delights to include all new fixed windows
-- (vendor already has the 5 original slots; add the 6 new fixed windows)
INSERT INTO vendor_slots (id, vendor_id, slot_id, is_enabled, custom_charge)
SELECT
  gen_random_uuid()::text,
  'vendor_sweet_delights',
  ds.id,
  true,
  NULL
FROM delivery_slots ds
WHERE ds.slot_group = 'fixed'
ON CONFLICT (vendor_id, slot_id) DO NOTHING;

-- 8. Set lead times on sample products
-- Photo cake: 24h
UPDATE products
SET min_lead_time_hours = 24,
    lead_time_note = 'Requires 24 hours for photo printing and baking'
WHERE slug LIKE '%photo%';

-- All other cakes / flowers: default 2h (already set by column default)

-- 9. Seed example delivery holidays (CHANDIGARH + GLOBAL)

-- Diwali — CUSTOM: midnight + early morning blocked, standard gets ₹100 surcharge
INSERT INTO delivery_holidays (id, date, city_id, reason, customer_message, mode, slot_overrides)
VALUES (
  gen_random_uuid()::text,
  '2026-10-20',
  NULL,  -- applies all cities
  'Diwali — reduced operations due to festival',
  'Delivery available in morning and afternoon. Evening and midnight slots unavailable.',
  'CUSTOM',
  '[
    {"slug": "midnight",     "blocked": true,  "priceOverride": null},
    {"slug": "early-morning","blocked": true,  "priceOverride": null},
    {"slug": "fixed-evening","blocked": true,  "priceOverride": null},
    {"slug": "fixed-evening-2","blocked": true,"priceOverride": null},
    {"slug": "standard",     "blocked": false, "priceOverride": 100},
    {"slug": "express",      "blocked": false, "priceOverride": null}
  ]'::jsonb
);

-- Valentine's Day — CUSTOM: all slots available with premium pricing
INSERT INTO delivery_holidays (id, date, city_id, reason, customer_message, mode, slot_overrides)
VALUES (
  gen_random_uuid()::text,
  '2027-02-14',
  NULL,
  'Valentine''s Day — peak demand pricing',
  NULL,  -- no customer message, just normal UI with higher prices
  'CUSTOM',
  '[
    {"slug": "midnight",          "blocked": false, "priceOverride": 399},
    {"slug": "early-morning",     "blocked": false, "priceOverride": 249},
    {"slug": "express",           "blocked": false, "priceOverride": 349},
    {"slug": "fixed-evening-2",   "blocked": false, "priceOverride": 199},
    {"slug": "fixed-evening",     "blocked": false, "priceOverride": 149},
    {"slug": "standard",          "blocked": false, "priceOverride": 99}
  ]'::jsonb
);

-- Holi — STANDARD_ONLY: only standard slot, no note needed
INSERT INTO delivery_holidays (id, date, city_id, reason, customer_message, mode, slot_overrides)
VALUES (
  gen_random_uuid()::text,
  '2027-03-29',
  NULL,
  'Holi — limited delivery operations',
  'Only standard delivery available today due to Holi.',
  'STANDARD_ONLY',
  NULL
);

-- New Year Eve — CUSTOM: midnight premium, express blocked
INSERT INTO delivery_holidays (id, date, city_id, reason, customer_message, mode, slot_overrides)
VALUES (
  gen_random_uuid()::text,
  '2026-12-31',
  NULL,
  'New Year Eve — midnight premium, express unavailable',
  NULL,
  'CUSTOM',
  '[
    {"slug": "midnight", "blocked": false, "priceOverride": 499},
    {"slug": "express",  "blocked": true,  "priceOverride": null}
  ]'::jsonb
);

-- 10. Verification queries
SELECT name, slug, start_time, end_time, base_charge, cutoff_hours, cutoff_time, slot_group
FROM delivery_slots
ORDER BY slot_group, start_time;

SELECT c.name AS city, ds.name AS slot, cdc.is_available, cdc.charge_override
FROM city_delivery_configs cdc
JOIN cities c ON c.id = cdc.city_id
JOIN delivery_slots ds ON ds.id = cdc.slot_id
WHERE c.slug = 'chandigarh'
ORDER BY ds.slot_group, ds.start_time;

SELECT date, mode, reason, customer_message
FROM delivery_holidays
ORDER BY date;
