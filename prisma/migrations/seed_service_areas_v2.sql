-- ============================================================
-- Comprehensive service_areas seed — Chandigarh tricity + Patiala
-- Adds missing localities, named areas, and alt_names
-- Run AFTER seed_service_areas.sql (idempotent via ON CONFLICT)
-- ============================================================

-- Add alt_names column if not present
ALTER TABLE service_areas
  ADD COLUMN IF NOT EXISTS alt_names TEXT[] NOT NULL DEFAULT '{}';

-- Add indexes for search performance
CREATE INDEX IF NOT EXISTS service_areas_pincode_idx ON service_areas(pincode);
CREATE INDEX IF NOT EXISTS service_areas_city_id_idx ON service_areas(city_id);
CREATE INDEX IF NOT EXISTS service_areas_name_idx ON service_areas USING gin(to_tsvector('english', name));

-- ============================================================
-- 1. Chandigarh — named localities (not just sectors)
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng, alt_names)
SELECT area.name, area.pincode, c.id, 'Chandigarh', 'Chandigarh', area.lat, area.lng, area.alt_names
FROM cities c,
(VALUES
  -- Major named localities
  ('Mani Majra',           '160101', 30.7266, 76.8118, ARRAY['manimajra', 'mani-majra']),
  ('Industrial Area Phase 1', '160002', 30.7106, 76.8014, ARRAY['industrial area', 'phase 1 industrial']),
  ('Industrial Area Phase 2', '160002', 30.7080, 76.8040, ARRAY['industrial area phase 2']),
  ('IT Park',              '160101', 30.7263, 76.8080, ARRAY['it park chandigarh', 'rajiv gandhi technology park']),
  ('Chandigarh Railway Station', '160002', 30.6870, 76.7935, ARRAY['railway station', 'station area']),
  ('ISBT Chandigarh',      '160017', 30.7298, 76.7598, ARRAY['isbt', 'bus stand chandigarh', 'interstate bus terminal']),
  ('PGI Hospital',         '160012', 30.7632, 76.7741, ARRAY['pgi', 'pgimer', 'postgraduate institute']),
  ('Panjab University',    '160014', 30.7602, 76.7674, ARRAY['punjab university', 'pu campus', 'panjab university campus']),
  ('Sukhna Lake',          '160003', 30.7422, 76.8186, ARRAY['sukhna', 'lake area']),
  ('Rock Garden',          '160001', 30.7523, 76.8085, ARRAY['rock garden nek chand']),
  ('Elante Mall Area',     '160002', 30.7057, 76.8017, ARRAY['elante', 'elante mall']),
  ('Grain Market',         '160026', 30.7340, 76.7518, ARRAY['grain market chandigarh', 'anaj mandi']),
  ('Dhanas',               '160014', 30.7683, 76.7489, ARRAY['dhanas village']),
  ('Hallomajra',           '160002', 30.7017, 76.7967, ARRAY['hallo majra', 'halo majra']),
  ('Kishangarh',           '160101', 30.7238, 76.8209, ARRAY['kishan garh']),
  ('Burail',               '160047', 30.7167, 76.7600, ARRAY['burail village']),
  ('Attawa',               '160036', 30.7230, 76.7400, ARRAY['attawa village']),
  ('Daria',                '160002', 30.6980, 76.7870, ARRAY['daria village']),
  ('Ram Darbar',           '160002', 30.7160, 76.7950, ARRAY['ram darbar colony', 'ramdarbar']),
  ('Maloya',               '160025', 30.6805, 76.7470, ARRAY['maloya colony']),
  ('Behlana',              '160063', 30.6750, 76.7350, ARRAY['behlana village']),
  ('Khuda Lahora',         '160014', 30.7650, 76.7350, ARRAY['khuda lahora village', 'khuda-lahora']),
  ('Kaimbwala',            '160003', 30.7580, 76.8060, ARRAY['kaimbwala village']),
  ('Sarangpur',            '160002', 30.7020, 76.7820, ARRAY['sarangpur village']),
  ('Mauli Jagran',         '160101', 30.7320, 76.8100, ARRAY['maulijagran', 'mauli-jagran']),
  ('Kajheri',              '160104', 30.6750, 76.7470, ARRAY['kajheri village']),
  ('Khuda Ali Sher',       '160062', 30.6890, 76.7530, ARRAY['khuda ali sher village']),
  ('Badheri',              '160055', 30.6980, 76.7300, ARRAY['badheri village']),
  ('Raipur Kalan',         '160014', 30.7690, 76.7550, ARRAY['raipur kalan village']),
  ('Raipur Khurd',         '160014', 30.7720, 76.7600, ARRAY['raipur khurd village']),
  ('Nayagaon',             '160103', 30.7780, 76.7920, ARRAY['naya gaon', 'nayagaon chandigarh']),
  ('Mansa Devi',           '160101', 30.7690, 76.8200, ARRAY['mansa devi temple area'])
) AS area(name, pincode, lat, lng, alt_names)
WHERE c.slug = 'chandigarh'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. Mohali — comprehensive areas + sub-localities
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng, alt_names)
SELECT area.name, area.pincode, c.id, 'Mohali', 'Punjab', area.lat, area.lng, area.alt_names
FROM cities c,
(VALUES
  -- Missing Mohali sectors
  ('Sector 53',            '160059', 30.7050, 76.7110, ARRAY['sector 53 mohali']),
  ('Sector 54',            '160059', 30.7020, 76.7140, ARRAY['sector 54 mohali']),
  ('Sector 55',            '160055', 30.6990, 76.7170, ARRAY['sector 55 mohali']),
  ('Sector 56',            '160055', 30.6960, 76.7200, ARRAY['sector 56 mohali']),
  ('Sector 57',            '160055', 30.6930, 76.7230, ARRAY['sector 57 mohali']),
  ('Sector 58',            '160059', 30.6900, 76.7260, ARRAY['sector 58 mohali']),
  ('Sector 59',            '160059', 30.6870, 76.7290, ARRAY['sector 59 mohali']),
  ('Sector 60',            '160062', 30.6840, 76.7320, ARRAY['sector 60 mohali']),
  ('Sector 61',            '160062', 30.6810, 76.7350, ARRAY['sector 61 mohali']),
  ('Sector 62',            '160062', 30.6780, 76.7380, ARRAY['sector 62 mohali']),
  ('Sector 63',            '160062', 30.6750, 76.7410, ARRAY['sector 63 mohali']),
  ('Sector 64',            '160062', 30.6720, 76.7440, ARRAY['sector 64 mohali']),
  ('Sector 65',            '160062', 30.6690, 76.7470, ARRAY['sector 65 mohali']),
  ('Sector 66',            '160062', 30.6660, 76.7500, ARRAY['sector 66 mohali']),
  ('Sector 67',            '160062', 30.6630, 76.7530, ARRAY['sector 67 mohali']),
  ('Sector 69',            '160062', 30.6870, 76.7397, ARRAY['sector 69 mohali']),
  ('Sector 72',            '160071', 30.6770, 76.7450, ARRAY['sector 72 mohali']),
  ('Sector 73',            '160071', 30.6740, 76.7480, ARRAY['sector 73 mohali']),
  ('Sector 74',            '160071', 30.6710, 76.7510, ARRAY['sector 74 mohali']),
  ('Sector 75',            '160071', 30.6680, 76.7540, ARRAY['sector 75 mohali']),
  ('Sector 79',            '160071', 30.6650, 76.7570, ARRAY['sector 79 mohali']),
  ('Sector 80',            '160071', 30.6620, 76.7600, ARRAY['sector 80 mohali']),
  ('Sector 82',            '140308', 30.6590, 76.7630, ARRAY['sector 82 mohali']),
  ('Sector 88',            '160055', 30.6560, 76.7660, ARRAY['sector 88 mohali']),
  ('Sector 91',            '160055', 30.6530, 76.7690, ARRAY['sector 91 mohali']),
  -- Named Mohali localities
  ('Mohali Bus Stand',     '160055', 30.7060, 76.7150, ARRAY['bus stand mohali']),
  ('Mohali Stadium',       '160055', 30.6921, 76.7377, ARRAY['pca stadium', 'is bindra stadium', 'cricket stadium mohali']),
  ('IISER Mohali',         '140306', 30.6667, 76.7290, ARRAY['iiser', 'indian institute of science education']),
  ('NIPER Mohali',         '160062', 30.6880, 76.7270, ARRAY['niper', 'national institute of pharmaceutical']),
  ('Fortis Hospital Mohali', '160062', 30.6880, 76.7280, ARRAY['fortis', 'fortis mohali']),
  -- Kharar sub-areas
  ('Kharar Bus Stand',     '140301', 30.7469, 76.6451, ARRAY['kharar bus stand']),
  ('Balongi',              '140301', 30.7100, 76.6800, ARRAY['balongi village']),
  ('Sohana',               '140301', 30.7200, 76.6950, ARRAY['sohana village']),
  ('Landran',              '140307', 30.6750, 76.7800, ARRAY['landran village']),
  ('Banur',                '140601', 30.5767, 76.7390, ARRAY['banur town']),
  ('Lalru',                '140501', 30.6050, 76.7920, ARRAY['lalru town']),
  ('Kurali',               '140103', 30.7860, 76.5590, ARRAY['kurali town']),
  -- Zirakpur sub-areas
  ('Zirakpur Main',        '140603', 30.6470, 76.8173, ARRAY['zirakpur main market']),
  ('VIP Road Zirakpur',    '140603', 30.6490, 76.8200, ARRAY['vip road', 'zirakpur vip road']),
  ('Patiala Road Zirakpur', '140603', 30.6430, 76.8100, ARRAY['patiala road zirakpur']),
  ('Ambala Road Zirakpur', '140603', 30.6510, 76.8230, ARRAY['ambala road zirakpur']),
  ('Dhakoli',              '160104', 30.6370, 76.8070, ARRAY['dhakoli village']),
  ('Baltana',              '140603', 30.6530, 76.8250, ARRAY['baltana village']),
  ('Lohgarh',              '140301', 30.6400, 76.8120, ARRAY['lohgarh village']),
  ('Peer Muchalla',        '140603', 30.6350, 76.8050, ARRAY['peer muchalla', 'pir muchalla']),
  ('Gazipur',              '140603', 30.6310, 76.8020, ARRAY['gazipur village']),
  -- New Chandigarh / Mullanpur
  ('New Chandigarh',       '140901', 30.7800, 76.6700, ARRAY['new chandigarh mullanpur', 'mullanpur garibdas']),
  ('Mullanpur',            '140901', 30.7750, 76.6650, ARRAY['mullanpur town']),
  -- Dera Bassi sub-areas
  ('Dera Bassi Main',      '140507', 30.5987, 76.8368, ARRAY['dera bassi main market', 'derabassi main']),
  ('Dera Bassi Industrial', '140507', 30.5950, 76.8300, ARRAY['dera bassi industrial area'])
) AS area(name, pincode, lat, lng, alt_names)
WHERE c.slug = 'mohali'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Panchkula — missing sectors + localities
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng, alt_names)
SELECT area.name, area.pincode, c.id, 'Panchkula', 'Haryana', area.lat, area.lng, area.alt_names
FROM cities c,
(VALUES
  -- Missing sectors
  ('Sector 13',            '134113', 30.7240, 76.8905, ARRAY['sector 13 panchkula']),
  ('Sector 22',            '134109', 30.6900, 76.8700, ARRAY['sector 22 panchkula']),
  ('Sector 23',            '134109', 30.6920, 76.8720, ARRAY['sector 23 panchkula']),
  ('Sector 24',            '134109', 30.6940, 76.8740, ARRAY['sector 24 panchkula']),
  ('Sector 27',            '134116', 30.7500, 76.9170, ARRAY['sector 27 panchkula']),
  ('Sector 28',            '134116', 30.7520, 76.9190, ARRAY['sector 28 panchkula']),
  -- Named Panchkula localities
  ('Panchkula Bus Stand',  '134109', 30.6942, 76.8606, ARRAY['bus stand panchkula']),
  ('Panchkula Railway Station', '134109', 30.6800, 76.8500, ARRAY['panchkula station', 'railway station panchkula']),
  ('Industrial Area Phase 1', '134113', 30.7100, 76.8650, ARRAY['industrial area panchkula']),
  ('Industrial Area Phase 2', '134113', 30.7150, 76.8700, ARRAY['industrial area phase 2 panchkula']),
  ('Barwala',              '134118', 30.6453, 76.8372, ARRAY['barwala town', 'barwala panchkula']),
  ('Ramgarh',              '134205', 30.5900, 76.8200, ARRAY['ramgarh panchkula']),
  ('Morni Hills',          '134205', 30.7080, 77.0780, ARRAY['morni', 'morni hills panchkula']),
  ('Pinjore Gardens',      '134102', 30.7987, 76.9012, ARRAY['pinjore gardens', 'yadavindra gardens']),
  -- Additional Kalka areas
  ('Kalka Railway Station', '133302', 30.8442, 76.9494, ARRAY['kalka station']),
  ('Parwanoo',             '173220', 30.8350, 76.9600, ARRAY['parwanoo town', 'parwanoo himachal'])
) AS area(name, pincode, lat, lng, alt_names)
WHERE c.slug = 'panchkula'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Patiala — surrounding towns + missing areas
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng, alt_names)
SELECT area.name, area.pincode, c.id, 'Patiala', 'Punjab', area.lat, area.lng, area.alt_names
FROM cities c,
(VALUES
  -- Missing named localities
  ('Sheran Wala Gate',     '147001', 30.3345, 76.3878, ARRAY['sheranwala gate', 'sheran wala darwaza']),
  ('Qila Mubarak',         '147001', 30.3320, 76.3900, ARRAY['qila mubarak patiala', 'patiala fort']),
  ('Fountain Chowk',       '147001', 30.3356, 76.3920, ARRAY['fountain chowk patiala']),
  ('Gurbax Colony',        '147001', 30.3400, 76.3800, ARRAY['gurbax colony patiala']),
  ('Green Park Colony',    '147001', 30.3420, 76.3780, ARRAY['green park patiala']),
  ('Phuwara Chowk',        '147001', 30.3340, 76.3890, ARRAY['phuwara patiala', 'phuwara chowk']),
  ('Old Patiala',          '147001', 30.3300, 76.3870, ARRAY['purana patiala', 'old city patiala']),
  ('Prem Nagar',           '147001', 30.3480, 76.3830, ARRAY['prem nagar patiala']),
  ('Guru Nanak Nagar',     '147001', 30.3490, 76.3850, ARRAY['guru nanak nagar patiala']),
  ('Housing Board Colony', '147002', 30.3550, 76.3700, ARRAY['housing board patiala']),
  ('Rajpura Road (Ext)',   '147002', 30.3580, 76.3680, ARRAY['rajpura road extension']),
  ('New Officer Colony',   '147001', 30.3460, 76.3870, ARRAY['officer colony patiala']),
  ('Lahori Gate',          '147001', 30.3330, 76.3930, ARRAY['lahori gate patiala']),
  ('Jassa Singh Nagar',    '147001', 30.3440, 76.3880, ARRAY['jassa singh nagar patiala']),
  ('Bhadson Road',         '147001', 30.3200, 76.3750, ARRAY['bhadson road patiala']),
  ('Lower Mall',           '147001', 30.3360, 76.3940, ARRAY['lower mall patiala']),
  ('Hira Mahal',           '147001', 30.3310, 76.3910, ARRAY['hira mahal patiala']),
  ('Gali Sher Afghan',     '147001', 30.3325, 76.3905, ARRAY['sher afghan patiala']),
  -- Surrounding towns
  ('Rajpura',              '140401', 30.4834, 76.5935, ARRAY['rajpura town', 'rajpura patiala']),
  ('Rajpura City',         '140401', 30.4800, 76.5900, ARRAY['rajpura city center']),
  ('Nabha',                '147201', 30.3734, 76.1490, ARRAY['nabha town', 'nabha patiala']),
  ('Nabha City',           '147201', 30.3700, 76.1460, ARRAY['nabha city center']),
  ('Samana',               '147101', 30.1530, 76.1878, ARRAY['samana town', 'samana patiala']),
  ('Ghanaur',              '140702', 30.5000, 76.5400, ARRAY['ghanaur town']),
  ('Patran',               '147105', 30.0490, 76.3430, ARRAY['patran town']),
  ('Bhunerheri',           '147002', 30.3600, 76.3650, ARRAY['bhunerheri village']),
  ('Sanour',               '147103', 30.2370, 76.4650, ARRAY['sanour town', 'sanour patiala']),
  -- Additional pincodes
  ('Civil Lines',          '147001', 30.3380, 76.3950, ARRAY['civil lines patiala']),
  ('Model Gram',           '147003', 30.3580, 76.3620, ARRAY['model gram patiala']),
  ('Bahadurgarh',          '147021', 30.3150, 76.3700, ARRAY['bahadurgarh patiala']),
  ('Passiana',             '147002', 30.3620, 76.3640, ARRAY['passiana village patiala'])
) AS area(name, pincode, lat, lng, alt_names)
WHERE c.slug = 'patiala'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Add alt_names to existing service areas (for better search)
-- ============================================================

-- Chandigarh sectors — add common search terms
UPDATE service_areas SET alt_names = ARRAY['sec 17', 'sector seventeen', 'sec seventeen']
WHERE name = 'Sector 17' AND city_name = 'Chandigarh' AND alt_names = '{}';

UPDATE service_areas SET alt_names = ARRAY['sec 22', 'sector twenty two', 'sec twenty two']
WHERE name = 'Sector 22' AND city_name = 'Chandigarh' AND alt_names = '{}';

UPDATE service_areas SET alt_names = ARRAY['sec 35', 'sector thirty five']
WHERE name = 'Sector 35' AND city_name = 'Chandigarh' AND alt_names = '{}';

UPDATE service_areas SET alt_names = ARRAY['sec 43', 'sector forty three']
WHERE name = 'Sector 43' AND city_name = 'Chandigarh' AND alt_names = '{}';

-- Mohali areas — add common search terms
UPDATE service_areas SET alt_names = ARRAY['zirakpur', 'zrk']
WHERE name = 'Zirakpur' AND city_name = 'Mohali' AND alt_names = '{}';

UPDATE service_areas SET alt_names = ARRAY['kharar', 'kharar mohali']
WHERE name = 'Kharar' AND city_name = 'Mohali' AND alt_names = '{}';

UPDATE service_areas SET alt_names = ARRAY['dera bassi', 'derabassi']
WHERE name = 'Derabassi' AND city_name = 'Mohali' AND alt_names = '{}';

-- Panchkula areas
UPDATE service_areas SET alt_names = ARRAY['kalka town', 'kalka haryana']
WHERE name = 'Kalka' AND city_name = 'Panchkula' AND alt_names = '{}';

UPDATE service_areas SET alt_names = ARRAY['pinjore town', 'pinjore haryana']
WHERE name = 'Pinjore' AND city_name = 'Panchkula' AND alt_names = '{}';

-- ============================================================
-- 6. Update cities table — add pincode prefixes for better search
-- ============================================================
UPDATE cities SET "pincode_prefix" = ARRAY['160', '161']
WHERE slug = 'chandigarh' AND "pincode_prefix" = '{}';

UPDATE cities SET "pincode_prefix" = ARRAY['140', '160']
WHERE slug = 'mohali' AND "pincode_prefix" = '{}';

UPDATE cities SET "pincode_prefix" = ARRAY['134', '133']
WHERE slug = 'panchkula' AND "pincode_prefix" = '{}';

UPDATE cities SET "pincode_prefix" = ARRAY['147', '140']
WHERE slug = 'patiala' AND "pincode_prefix" = '{}';

-- ============================================================
-- 7. Add aliases to cities for better text search
-- ============================================================
UPDATE cities SET aliases = ARRAY['chd', 'chandigarh city', 'the city beautiful']
WHERE slug = 'chandigarh' AND aliases = '{}';

UPDATE cities SET aliases = ARRAY['sas nagar', 'mohali city', 'greater mohali']
WHERE slug = 'mohali' AND aliases = '{}';

UPDATE cities SET aliases = ARRAY['panchkula city', 'panchkula haryana']
WHERE slug = 'panchkula' AND aliases = '{}';

UPDATE cities SET aliases = ARRAY['patiala city', 'royal city', 'patiala punjab']
WHERE slug = 'patiala' AND aliases = '{}';
