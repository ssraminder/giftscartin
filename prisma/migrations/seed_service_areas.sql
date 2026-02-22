-- ============================================================
-- Create service_areas + city_slot_cutoff tables
-- Add coverage columns to vendors
-- Seed tricity + Patiala service areas
-- ============================================================

-- 1. Create service_areas table
CREATE TABLE IF NOT EXISTS service_areas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  pincode TEXT NOT NULL,
  city_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  state TEXT NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create city_slot_cutoff table
CREATE TABLE IF NOT EXISTS city_slot_cutoff (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  city_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  slot_name TEXT NOT NULL,
  slot_slug TEXT NOT NULL,
  slot_start TEXT NOT NULL,
  slot_end TEXT NOT NULL,
  cutoff_hours INT NOT NULL,
  base_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_vendors INT NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(city_id, slot_id)
);

-- 3. Add coverage columns to vendors
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS coverage_method TEXT NOT NULL DEFAULT 'pincode',
  ADD COLUMN IF NOT EXISTS coverage_radius_km DECIMAL(5,2);

-- ============================================================
-- 4. Seed Chandigarh sectors
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng)
SELECT area.name, area.pincode, c.id, 'Chandigarh', 'Chandigarh', area.lat, area.lng
FROM cities c,
(VALUES
  ('Sector 1',  '160001', 30.7422, 76.7836),
  ('Sector 2',  '160002', 30.7401, 76.7812),
  ('Sector 3',  '160003', 30.7389, 76.7798),
  ('Sector 4',  '160004', 30.7376, 76.7774),
  ('Sector 5',  '160005', 30.7362, 76.7751),
  ('Sector 6',  '160006', 30.7348, 76.7727),
  ('Sector 7',  '160007', 30.7335, 76.7704),
  ('Sector 8',  '160008', 30.7321, 76.7680),
  ('Sector 9',  '160009', 30.7308, 76.7657),
  ('Sector 10', '160010', 30.7294, 76.7633),
  ('Sector 11', '160011', 30.7545, 76.7871),
  ('Sector 12', '160012', 30.7531, 76.7847),
  ('Sector 14', '160014', 30.7504, 76.7800),
  ('Sector 15', '160015', 30.7490, 76.7776),
  ('Sector 16', '160016', 30.7477, 76.7753),
  ('Sector 17', '160017', 30.7463, 76.7729),
  ('Sector 18', '160018', 30.7449, 76.7706),
  ('Sector 19', '160019', 30.7436, 76.7682),
  ('Sector 20', '160020', 30.7422, 76.7659),
  ('Sector 21', '160021', 30.7408, 76.7635),
  ('Sector 22', '160022', 30.7395, 76.7612),
  ('Sector 23', '160023', 30.7381, 76.7588),
  ('Sector 24', '160024', 30.7368, 76.7565),
  ('Sector 25', '160025', 30.7354, 76.7541),
  ('Sector 26', '160026', 30.7340, 76.7518),
  ('Sector 27', '160027', 30.7327, 76.7494),
  ('Sector 28', '160028', 30.7313, 76.7470),
  ('Sector 29', '160029', 30.7300, 76.7447),
  ('Sector 30', '160030', 30.7286, 76.7423),
  ('Sector 31', '160031', 30.7272, 76.7400),
  ('Sector 32', '160032', 30.7259, 76.7376),
  ('Sector 33', '160033', 30.7245, 76.7353),
  ('Sector 34', '160034', 30.7232, 76.7329),
  ('Sector 35', '160035', 30.7218, 76.7306),
  ('Sector 36', '160036', 30.7204, 76.7282),
  ('Sector 37', '160037', 30.7191, 76.7259),
  ('Sector 38', '160038', 30.7177, 76.7235),
  ('Sector 39', '160039', 30.7164, 76.7212),
  ('Sector 40', '160040', 30.7150, 76.7188),
  ('Sector 41', '160041', 30.7136, 76.7165),
  ('Sector 42', '160042', 30.7123, 76.7141),
  ('Sector 43', '160043', 30.7109, 76.7118),
  ('Sector 44', '160044', 30.7096, 76.7094),
  ('Sector 45', '160045', 30.7082, 76.7071),
  ('Sector 46', '160046', 30.7068, 76.7047),
  ('Sector 47', '160047', 30.7055, 76.7024),
  ('Sector 48', '160048', 30.7041, 76.7000),
  ('Sector 49', '160049', 30.7028, 76.6977),
  ('Sector 50', '160050', 30.7014, 76.6953),
  ('Sector 51', '160051', 30.7001, 76.6930),
  ('Sector 52', '160052', 30.6987, 76.6906),
  ('Sector 53', '160053', 30.6973, 76.6883),
  ('Sector 54', '160054', 30.6960, 76.6859),
  ('Sector 55', '160055', 30.6946, 76.6836),
  ('Sector 56', '160056', 30.6933, 76.6812),
  ('Sector 57', '160057', 30.6919, 76.6789),
  ('Sector 58', '160058', 30.6906, 76.6765),
  ('Sector 59', '160059', 30.6892, 76.6742),
  ('Sector 60', '160060', 30.6878, 76.6718),
  ('Sector 61', '160061', 30.6865, 76.6695),
  ('Sector 62', '160062', 30.6851, 76.6671),
  ('Sector 63', '160063', 30.6838, 76.6648)
) AS area(name, pincode, lat, lng)
WHERE c.slug = 'chandigarh'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Seed Mohali areas
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng)
SELECT area.name, area.pincode, c.id, 'Mohali', 'Punjab', area.lat, area.lng
FROM cities c,
(VALUES
  ('Phase 1',          '160055', 30.7098, 76.7173),
  ('Phase 2',          '160055', 30.7065, 76.7201),
  ('Phase 3B2',        '160059', 30.7032, 76.7229),
  ('Phase 4',          '160059', 30.6999, 76.7257),
  ('Phase 5',          '160064', 30.6966, 76.7285),
  ('Phase 6',          '160055', 30.6933, 76.7313),
  ('Phase 7',          '160062', 30.6900, 76.7341),
  ('Phase 8',          '160062', 30.6867, 76.7369),
  ('Phase 9',          '160062', 30.6834, 76.7397),
  ('Phase 10',         '160062', 30.6801, 76.7425),
  ('Phase 11',         '160055', 30.6768, 76.7453),
  ('Sector 68',        '160062', 30.6867, 76.7369),
  ('Sector 70',        '160071', 30.6834, 76.7397),
  ('Sector 71',        '160071', 30.6801, 76.7425),
  ('Sector 76',        '160071', 30.6768, 76.7453),
  ('Sector 77',        '160071', 30.6735, 76.7481),
  ('Sector 78',        '160071', 30.6702, 76.7509),
  ('Aerocity Mohali',  '160059', 30.6700, 76.7890),
  ('IT City Mohali',   '160071', 30.6650, 76.7510),
  ('Sunny Enclave',    '140301', 30.7200, 76.7100),
  ('Kharar',           '140301', 30.7469, 76.6451),
  ('Zirakpur',         '140603', 30.6470, 76.8173),
  ('Derabassi',        '140507', 30.5987, 76.8368)
) AS area(name, pincode, lat, lng)
WHERE c.slug = 'mohali'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Seed Panchkula sectors
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng)
SELECT area.name, area.pincode, c.id, 'Panchkula', 'Haryana', area.lat, area.lng
FROM cities c,
(VALUES
  ('Sector 1',          '134109', 30.6942, 76.8606),
  ('Sector 2',          '134109', 30.6968, 76.8632),
  ('Sector 3',          '134109', 30.6994, 76.8658),
  ('Sector 4',          '134109', 30.7020, 76.8684),
  ('Sector 5',          '134113', 30.7046, 76.8710),
  ('Sector 6',          '134113', 30.7072, 76.8736),
  ('Sector 7',          '134109', 30.7098, 76.8762),
  ('Sector 8',          '134109', 30.7124, 76.8788),
  ('Sector 9',          '134113', 30.7150, 76.8814),
  ('Sector 10',         '134113', 30.7176, 76.8840),
  ('Sector 11',         '134112', 30.7202, 76.8866),
  ('Sector 12',         '134112', 30.7228, 76.8892),
  ('Sector 14',         '134113', 30.7254, 76.8918),
  ('Sector 15',         '134113', 30.7280, 76.8944),
  ('Sector 16',         '134113', 30.7306, 76.8970),
  ('Sector 17',         '134116', 30.7332, 76.8996),
  ('Sector 18',         '134116', 30.7358, 76.9022),
  ('Sector 19',         '134116', 30.7384, 76.9048),
  ('Sector 20',         '134116', 30.7410, 76.9074),
  ('Sector 21',         '134116', 30.7436, 76.9100),
  ('Sector 25',         '134116', 30.7462, 76.9126),
  ('Sector 26',         '134116', 30.7488, 76.9152),
  ('Mansa Devi Complex','134114', 30.7306, 76.8970),
  ('Kalka',             '133302', 30.8442, 76.9494),
  ('Pinjore',           '134102', 30.7987, 76.9012)
) AS area(name, pincode, lat, lng)
WHERE c.slug = 'panchkula'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Insert Patiala city (if not exists)
-- NOTE: cities table uses camelCase columns (no @map in Prisma)
-- ============================================================
INSERT INTO cities (id, name, slug, state, "isActive", lat, lng,
  "baseDeliveryCharge", "freeDeliveryAbove", "updatedAt")
VALUES (
  gen_random_uuid()::text, 'Patiala', 'patiala', 'Punjab',
  true, 30.3398, 76.3869, 49, 499, now()
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 8. Seed Patiala areas
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng)
SELECT area.name, area.pincode, c.id, 'Patiala', 'Punjab', area.lat, area.lng
FROM cities c,
(VALUES
  ('Urban Estate Phase 1', '147002', 30.3523, 76.3712),
  ('Urban Estate Phase 2', '147002', 30.3498, 76.3698),
  ('New Lal Bagh',         '147001', 30.3401, 76.3845),
  ('Lal Bagh',             '147001', 30.3389, 76.3831),
  ('Model Town',           '147001', 30.3467, 76.3923),
  ('Leela Bhawan',         '147001', 30.3445, 76.3867),
  ('Yadawindra Colony',    '147001', 30.3478, 76.3901),
  ('Baradari Gardens',     '147001', 30.3356, 76.3889),
  ('Chotti Baradari',      '147001', 30.3334, 76.3912),
  ('Mall Road',            '147001', 30.3378, 76.3934),
  ('Sanauri Adda',         '147001', 30.3290, 76.4012),
  ('Tripuri',              '147003', 30.3567, 76.3645),
  ('Punjabi University',   '147002', 30.3534, 76.3778),
  ('Polo Ground',          '147001', 30.3423, 76.3956),
  ('Adalat Bazaar',        '147001', 30.3367, 76.3967),
  ('Rajpura Road',         '147001', 30.3312, 76.3756),
  ('Sirhind Road',         '147001', 30.3189, 76.3834),
  ('Nabha Road',           '147001', 30.3234, 76.4123),
  ('Sangrur Road',         '147001', 30.3156, 76.4067),
  ('Bhupindra Road',       '147001', 30.3512, 76.4034),
  ('New Bus Stand',        '147001', 30.3298, 76.3867),
  ('Focal Point',          '147004', 30.3645, 76.3567),
  ('Industrial Area',      '147004', 30.3623, 76.3589),
  ('Thapar University',    '147004', 30.3523, 76.3623),
  ('Sector 3',             '147002', 30.3567, 76.3734),
  ('Sector 4',             '147002', 30.3545, 76.3756),
  ('Sector 5',             '147002', 30.3523, 76.3778),
  ('Sector 6',             '147002', 30.3501, 76.3800),
  ('Sector 7',             '147002', 30.3479, 76.3823),
  ('Preet Nagar',          '147001', 30.3456, 76.3845),
  ('Ram Bagh',             '147001', 30.3434, 76.3867),
  ('Anand Nagar',          '147001', 30.3412, 76.3890)
) AS area(name, pincode, lat, lng)
WHERE c.slug = 'patiala'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Seed city_slot_cutoff for Patiala
-- NOTE: delivery_slots table uses camelCase columns (no @map in Prisma)
-- ============================================================
INSERT INTO city_slot_cutoff
  (id, city_id, slot_id, slot_name, slot_slug, slot_start, slot_end,
   cutoff_hours, base_charge, min_vendors, is_available)
SELECT
  gen_random_uuid()::text,
  c.id, ds.id, ds.name, ds.slug, ds."startTime", ds."endTime",
  CASE
    WHEN ds.slug = 'midnight'      THEN 6
    WHEN ds.slug = 'early-morning' THEN 12
    WHEN ds.slug = 'express'       THEN 2
    ELSE 4
  END,
  ds."baseCharge", 0, false
FROM cities c
CROSS JOIN delivery_slots ds
WHERE c.slug = 'patiala' AND ds."isActive" = true
ON CONFLICT (city_id, slot_id) DO NOTHING;
