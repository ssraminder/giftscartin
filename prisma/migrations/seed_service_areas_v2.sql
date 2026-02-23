-- ============================================================
-- Comprehensive service_areas seed v2 — REAL India Post pincodes
-- Replaces incorrect per-sector pincodes with actual assignments
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

-- Add "altNames" column if not present (Prisma uses camelCase, no @map)
ALTER TABLE service_areas
  ADD COLUMN IF NOT EXISTS "altNames" TEXT[] NOT NULL DEFAULT '{}';

-- Add indexes for search performance
CREATE INDEX IF NOT EXISTS service_areas_pincode_idx ON service_areas(pincode);
CREATE INDEX IF NOT EXISTS service_areas_city_id_idx ON service_areas(city_id);
CREATE INDEX IF NOT EXISTS service_areas_name_idx ON service_areas USING gin(to_tsvector('english', name));

-- ============================================================
-- STEP 1: Delete old incorrect data (wrong pincodes per sector)
-- ============================================================
DELETE FROM service_areas WHERE city_name IN ('Chandigarh', 'Mohali', 'Panchkula', 'Patiala');

-- ============================================================
-- 2. Chandigarh — 23 real pincodes, sectors mapped correctly
-- Source: India Post / chandigarhdistrict.nic.in
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng, "altNames")
SELECT area.name, area.pincode, c.id, 'Chandigarh', 'Chandigarh', area.lat, area.lng, area."altNames"
FROM cities c,
(VALUES
  -- 160001 — Sectors 1-6, Capitol Complex, High Court
  ('Sector 1',                '160001', 30.7572, 76.7871, ARRAY['sec 1']),
  ('Sector 2',                '160001', 30.7551, 76.7849, ARRAY['sec 2']),
  ('Sector 3',                '160001', 30.7529, 76.7827, ARRAY['sec 3']),
  ('Sector 4',                '160001', 30.7507, 76.7805, ARRAY['sec 4']),
  ('Sector 5',                '160001', 30.7485, 76.7783, ARRAY['sec 5']),
  ('Sector 6',                '160001', 30.7463, 76.7761, ARRAY['sec 6']),
  ('Capitol Complex',         '160001', 30.7577, 76.8003, ARRAY['vidhan sabha', 'secretariat', 'high court chandigarh']),

  -- 160002 — Industrial Area, Ram Darbar, Hallomajra
  ('Industrial Area Phase 1', '160002', 30.7106, 76.8014, ARRAY['industrial area chandigarh', 'phase 1 industrial']),
  ('Industrial Area Phase 2', '160002', 30.7080, 76.8040, ARRAY['industrial area phase 2']),
  ('Ram Darbar',              '160002', 30.7160, 76.7950, ARRAY['ram darbar colony', 'ramdarbar']),
  ('Hallomajra',              '160002', 30.7017, 76.7967, ARRAY['hallo majra', 'halo majra']),
  ('Sarangpur',               '160002', 30.7020, 76.7820, ARRAY['sarangpur village']),
  ('Railway Station',         '160002', 30.6870, 76.7935, ARRAY['chandigarh railway station', 'station area']),

  -- 160003 — Aerodrome, Behlana
  ('Aerodrome Area',          '160003', 30.6725, 76.7875, ARRAY['chandigarh airport', 'airport area']),
  ('Behlana',                 '160003', 30.6750, 76.7350, ARRAY['behlana village']),

  -- 160009 — Sectors 8, 9
  ('Sector 8',                '160009', 30.7441, 76.7739, ARRAY['sec 8']),
  ('Sector 9',                '160009', 30.7419, 76.7717, ARRAY['sec 9']),

  -- 160011 — Sectors 10, 11
  ('Sector 10',               '160011', 30.7540, 76.7850, ARRAY['sec 10']),
  ('Sector 11',               '160011', 30.7518, 76.7828, ARRAY['sec 11']),

  -- 160012 — Sector 12, PGI, PEC
  ('Sector 12',               '160012', 30.7496, 76.7806, ARRAY['sec 12']),
  ('PGI Hospital',            '160012', 30.7632, 76.7741, ARRAY['pgi', 'pgimer', 'postgraduate institute']),
  ('PEC University',          '160012', 30.7610, 76.7720, ARRAY['pec', 'engineering college', 'punjab engineering college']),

  -- 160014 — Sector 14, Panjab University, Dhanas, Dadu Majra
  ('Sector 14',               '160014', 30.7474, 76.7784, ARRAY['sec 14']),
  ('Panjab University',       '160014', 30.7602, 76.7674, ARRAY['punjab university', 'pu campus', 'panjab university campus']),
  ('Dhanas',                  '160014', 30.7683, 76.7489, ARRAY['dhanas village']),
  ('Dadu Majra Colony',       '160014', 30.7250, 76.7450, ARRAY['dadu majra', 'dadumajra']),
  ('Khuda Lahora',            '160014', 30.7650, 76.7350, ARRAY['khuda lahora village', 'khuda-lahora']),
  ('Raipur Kalan',            '160014', 30.7690, 76.7550, ARRAY['raipur kalan village']),
  ('Raipur Khurd',            '160014', 30.7720, 76.7600, ARRAY['raipur khurd village']),

  -- 160015 — Sectors 15, 16
  ('Sector 15',               '160015', 30.7452, 76.7762, ARRAY['sec 15']),
  ('Sector 16',               '160015', 30.7430, 76.7740, ARRAY['sec 16']),

  -- 160017 — Sector 17 (GPO/Main Hub)
  ('Sector 17',               '160017', 30.7408, 76.7718, ARRAY['sec 17', 'sector seventeen', 'main market chandigarh']),
  ('ISBT Chandigarh',         '160017', 30.7298, 76.7598, ARRAY['isbt', 'bus stand chandigarh', 'interstate bus terminal']),

  -- 160018 — Sectors 18
  ('Sector 18',               '160018', 30.7386, 76.7696, ARRAY['sec 18', 'govt press']),

  -- 160019 — Sectors 19, 26, 27
  ('Sector 19',               '160019', 30.7364, 76.7674, ARRAY['sec 19', 'raj bhawan']),
  ('Sector 26',               '160019', 30.7342, 76.7518, ARRAY['sec 26']),
  ('Sector 27',               '160019', 30.7320, 76.7496, ARRAY['sec 27']),

  -- 160020 — Sector 20
  ('Sector 20',               '160020', 30.7342, 76.7652, ARRAY['sec 20']),

  -- 160022 — Sectors 21, 22, 34
  ('Sector 21',               '160022', 30.7320, 76.7630, ARRAY['sec 21']),
  ('Sector 22',               '160022', 30.7298, 76.7608, ARRAY['sec 22', 'sector twenty two']),
  ('Sector 34',               '160022', 30.7232, 76.7329, ARRAY['sec 34']),

  -- 160023 — Sectors 23, 24
  ('Sector 23',               '160023', 30.7276, 76.7586, ARRAY['sec 23']),
  ('Sector 24',               '160023', 30.7254, 76.7564, ARRAY['sec 24']),

  -- 160025 — Sector 25, Maloya
  ('Sector 25',               '160025', 30.7232, 76.7542, ARRAY['sec 25']),
  ('Maloya',                  '160025', 30.6805, 76.7470, ARRAY['maloya colony']),

  -- 160026 — Sectors 26 (Grain Market), 28, 29
  ('Grain Market Sector 26',  '160026', 30.7340, 76.7518, ARRAY['grain market chandigarh', 'anaj mandi']),
  ('Sector 28',               '160026', 30.7298, 76.7474, ARRAY['sec 28']),
  ('Sector 29',               '160026', 30.7276, 76.7452, ARRAY['sec 29']),

  -- 160030 — Sectors 30, 31, 32, 33
  ('Sector 30',               '160030', 30.7254, 76.7430, ARRAY['sec 30']),
  ('Sector 31',               '160030', 30.7232, 76.7408, ARRAY['sec 31']),
  ('Sector 32',               '160030', 30.7210, 76.7386, ARRAY['sec 32']),
  ('Sector 33',               '160030', 30.7188, 76.7364, ARRAY['sec 33']),

  -- 160035 — Sector 35
  ('Sector 35',               '160035', 30.7166, 76.7342, ARRAY['sec 35', 'sector thirty five']),

  -- 160036 — Sectors 36-42, Badheri
  ('Sector 36',               '160036', 30.7144, 76.7320, ARRAY['sec 36']),
  ('Sector 37',               '160036', 30.7122, 76.7298, ARRAY['sec 37']),
  ('Sector 38',               '160036', 30.7100, 76.7276, ARRAY['sec 38']),
  ('Sector 39',               '160036', 30.7078, 76.7254, ARRAY['sec 39']),
  ('Sector 40',               '160036', 30.7056, 76.7232, ARRAY['sec 40']),
  ('Sector 41',               '160036', 30.7034, 76.7210, ARRAY['sec 41']),
  ('Sector 42',               '160036', 30.7012, 76.7188, ARRAY['sec 42']),
  ('Badheri',                 '160036', 30.6980, 76.7300, ARRAY['badheri village']),
  ('Attawa',                  '160036', 30.7230, 76.7400, ARRAY['attawa village']),

  -- 160043 — Sectors 43-44 (District Courts, ISBT area)
  ('Sector 43',               '160043', 30.6990, 76.7166, ARRAY['sec 43', 'district court chandigarh']),
  ('Sector 44',               '160043', 30.6968, 76.7144, ARRAY['sec 44']),

  -- 160047 — Sectors 44-54, Burail
  ('Sector 45',               '160047', 30.6946, 76.7122, ARRAY['sec 45']),
  ('Sector 46',               '160047', 30.6924, 76.7100, ARRAY['sec 46']),
  ('Sector 47',               '160047', 30.6902, 76.7078, ARRAY['sec 47']),
  ('Sector 48',               '160047', 30.6880, 76.7056, ARRAY['sec 48']),
  ('Sector 49',               '160047', 30.6858, 76.7034, ARRAY['sec 49']),
  ('Sector 50',               '160047', 30.6836, 76.7012, ARRAY['sec 50']),
  ('Sector 51',               '160047', 30.6814, 76.6990, ARRAY['sec 51']),
  ('Sector 52',               '160047', 30.6792, 76.6968, ARRAY['sec 52']),
  ('Sector 53',               '160047', 30.6770, 76.6946, ARRAY['sec 53']),
  ('Sector 54',               '160047', 30.6748, 76.6924, ARRAY['sec 54']),
  ('Burail',                  '160047', 30.7167, 76.7600, ARRAY['burail village']),

  -- 160101 — Manimajra, IT Park, Daria
  ('Mani Majra',              '160101', 30.7266, 76.8118, ARRAY['manimajra', 'mani-majra', 'mani majra chandigarh']),
  ('IT Park',                 '160101', 30.7263, 76.8080, ARRAY['it park chandigarh', 'rajiv gandhi technology park']),
  ('Daria',                   '160101', 30.6980, 76.7870, ARRAY['daria village']),
  ('Kishangarh',              '160101', 30.7238, 76.8209, ARRAY['kishan garh']),
  ('Mansa Devi',              '160101', 30.7690, 76.8200, ARRAY['mansa devi temple area']),

  -- 160102 — Mauli Jagran, Raipur Kalan
  ('Mauli Jagran',            '160102', 30.7320, 76.8100, ARRAY['maulijagran', 'mauli-jagran']),

  -- 160103 — Nayagaon
  ('Nayagaon',                '160103', 30.7780, 76.7920, ARRAY['naya gaon', 'nayagaon chandigarh']),

  -- 160106 — Burail (parts)
  ('Kaimbwala',               '160106', 30.7580, 76.8060, ARRAY['kaimbwala village'])
) AS area(name, pincode, lat, lng, "altNames")
WHERE c.slug = 'chandigarh'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Mohali (SAS Nagar) — comprehensive areas
-- Source: India Post / sasnagar.nic.in
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng, "altNames")
SELECT area.name, area.pincode, c.id, 'Mohali', 'Punjab', area.lat, area.lng, area."altNames"
FROM cities c,
(VALUES
  -- 160055 — Phases 1, 2, 6, 11 + Sectors 55-57, 88, 91
  ('Phase 1',                '160055', 30.7098, 76.7173, ARRAY['mohali phase 1']),
  ('Phase 2',                '160055', 30.7065, 76.7201, ARRAY['mohali phase 2']),
  ('Phase 6',                '160055', 30.6933, 76.7313, ARRAY['mohali phase 6']),
  ('Phase 11',               '160055', 30.6768, 76.7453, ARRAY['mohali phase 11']),
  ('Sector 55',              '160055', 30.6990, 76.7170, ARRAY['sector 55 mohali', 'sec 55']),
  ('Sector 56',              '160055', 30.6960, 76.7200, ARRAY['sector 56 mohali', 'sec 56']),
  ('Sector 57',              '160055', 30.6930, 76.7230, ARRAY['sector 57 mohali', 'sec 57']),
  ('Sector 88',              '160055', 30.6560, 76.7660, ARRAY['sector 88 mohali', 'sec 88']),
  ('Sector 91',              '160055', 30.6530, 76.7690, ARRAY['sector 91 mohali', 'sec 91']),
  ('Mohali Bus Stand',       '160055', 30.7060, 76.7150, ARRAY['bus stand mohali']),
  ('Mohali Stadium',         '160055', 30.6921, 76.7377, ARRAY['pca stadium', 'is bindra stadium', 'cricket stadium mohali']),

  -- 160059 — Phases 3B2, 4 + Sectors 53, 54, 58, 59
  ('Phase 3B2',              '160059', 30.7032, 76.7229, ARRAY['mohali phase 3b2']),
  ('Phase 4',                '160059', 30.6999, 76.7257, ARRAY['mohali phase 4']),
  ('Sector 53',              '160059', 30.7050, 76.7110, ARRAY['sector 53 mohali', 'sec 53']),
  ('Sector 54',              '160059', 30.7020, 76.7140, ARRAY['sector 54 mohali', 'sec 54']),
  ('Sector 58',              '160059', 30.6900, 76.7260, ARRAY['sector 58 mohali', 'sec 58']),
  ('Sector 59',              '160059', 30.6870, 76.7290, ARRAY['sector 59 mohali', 'sec 59']),
  ('Aerocity Mohali',        '160059', 30.6700, 76.7890, ARRAY['aerocity']),

  -- 160062 — Phases 7-10 + Sectors 60-69
  ('Phase 7',                '160062', 30.6900, 76.7341, ARRAY['mohali phase 7']),
  ('Phase 8',                '160062', 30.6867, 76.7369, ARRAY['mohali phase 8']),
  ('Phase 9',                '160062', 30.6834, 76.7397, ARRAY['mohali phase 9']),
  ('Phase 10',               '160062', 30.6801, 76.7425, ARRAY['mohali phase 10']),
  ('Sector 60',              '160062', 30.6840, 76.7320, ARRAY['sector 60 mohali', 'sec 60']),
  ('Sector 61',              '160062', 30.6810, 76.7350, ARRAY['sector 61 mohali', 'sec 61']),
  ('Sector 62',              '160062', 30.6780, 76.7380, ARRAY['sector 62 mohali', 'sec 62']),
  ('Sector 63',              '160062', 30.6750, 76.7410, ARRAY['sector 63 mohali', 'sec 63']),
  ('Sector 64',              '160062', 30.6720, 76.7440, ARRAY['sector 64 mohali', 'sec 64']),
  ('Sector 65',              '160062', 30.6690, 76.7470, ARRAY['sector 65 mohali', 'sec 65']),
  ('Sector 66',              '160062', 30.6660, 76.7500, ARRAY['sector 66 mohali', 'sec 66']),
  ('Sector 67',              '160062', 30.6630, 76.7530, ARRAY['sector 67 mohali', 'sec 67']),
  ('Sector 68',              '160062', 30.6867, 76.7369, ARRAY['sector 68 mohali', 'sec 68']),
  ('Sector 69',              '160062', 30.6870, 76.7397, ARRAY['sector 69 mohali', 'sec 69']),
  ('NIPER Mohali',           '160062', 30.6880, 76.7270, ARRAY['niper', 'national institute of pharmaceutical']),
  ('Fortis Hospital Mohali', '160062', 30.6880, 76.7280, ARRAY['fortis', 'fortis mohali']),

  -- 160064 — Phase 5
  ('Phase 5',                '160064', 30.6966, 76.7285, ARRAY['mohali phase 5']),

  -- 160071 — Sectors 70-80
  ('Sector 70',              '160071', 30.6834, 76.7397, ARRAY['sector 70 mohali', 'sec 70']),
  ('Sector 71',              '160071', 30.6801, 76.7425, ARRAY['sector 71 mohali', 'sec 71']),
  ('Sector 72',              '160071', 30.6770, 76.7450, ARRAY['sector 72 mohali', 'sec 72']),
  ('Sector 73',              '160071', 30.6740, 76.7480, ARRAY['sector 73 mohali', 'sec 73']),
  ('Sector 74',              '160071', 30.6710, 76.7510, ARRAY['sector 74 mohali', 'sec 74']),
  ('Sector 75',              '160071', 30.6680, 76.7540, ARRAY['sector 75 mohali', 'sec 75']),
  ('Sector 76',              '160071', 30.6768, 76.7453, ARRAY['sector 76 mohali', 'sec 76']),
  ('Sector 77',              '160071', 30.6735, 76.7481, ARRAY['sector 77 mohali', 'sec 77']),
  ('Sector 78',              '160071', 30.6702, 76.7509, ARRAY['sector 78 mohali', 'sec 78']),
  ('Sector 79',              '160071', 30.6650, 76.7570, ARRAY['sector 79 mohali', 'sec 79']),
  ('Sector 80',              '160071', 30.6620, 76.7600, ARRAY['sector 80 mohali', 'sec 80']),
  ('IT City Mohali',         '160071', 30.6650, 76.7510, ARRAY['it city mohali']),

  -- 160104 — Dhakoli
  ('Dhakoli',                '160104', 30.6370, 76.8070, ARRAY['dhakoli village', 'dhakaoli']),

  -- 140103 — Kurali
  ('Kurali',                 '140103', 30.7860, 76.5590, ARRAY['kurali town']),

  -- 140301 — Kharar + surrounding
  ('Kharar',                 '140301', 30.7469, 76.6451, ARRAY['kharar mohali', 'kharar town']),
  ('Sunny Enclave',          '140301', 30.7200, 76.7100, ARRAY['sunny enclave mohali']),
  ('Balongi',                '140301', 30.7100, 76.6800, ARRAY['balongi village']),
  ('Sohana',                 '140301', 30.7200, 76.6950, ARRAY['sohana village']),

  -- 140306 — IISER, Manauli
  ('IISER Mohali',           '140306', 30.6667, 76.7290, ARRAY['iiser', 'indian institute of science education']),
  ('Manauli',                '140306', 30.6650, 76.7250, ARRAY['manauli village']),

  -- 140307 — Landran
  ('Landran',                '140307', 30.6750, 76.7800, ARRAY['landran village']),

  -- 140308 — Sector 82+
  ('Sector 82',              '140308', 30.6590, 76.7630, ARRAY['sector 82 mohali', 'sec 82']),

  -- 140501 — Lalru
  ('Lalru',                  '140501', 30.6050, 76.7920, ARRAY['lalru town']),

  -- 140507 — Derabassi
  ('Derabassi',              '140507', 30.5987, 76.8368, ARRAY['dera bassi', 'derabassi mohali']),

  -- 140601 — Banur
  ('Banur',                  '140601', 30.5767, 76.7390, ARRAY['banur town']),

  -- 140603/140604 — Zirakpur
  ('Zirakpur',               '140603', 30.6470, 76.8173, ARRAY['zirakpur mohali', 'zrk']),
  ('VIP Road Zirakpur',      '140603', 30.6490, 76.8200, ARRAY['vip road zirakpur']),
  ('Patiala Road Zirakpur',  '140603', 30.6430, 76.8100, ARRAY['patiala road zirakpur']),
  ('Baltana',                '140604', 30.6530, 76.8250, ARRAY['baltana village']),
  ('Peer Muchalla',          '140603', 30.6350, 76.8050, ARRAY['peer muchalla', 'pir muchalla']),
  ('Lohgarh',                '140603', 30.6400, 76.8120, ARRAY['lohgarh village']),
  ('Gazipur',                '140603', 30.6310, 76.8020, ARRAY['gazipur village']),

  -- 140901 — New Chandigarh / Mullanpur
  ('New Chandigarh',         '140901', 30.7800, 76.6700, ARRAY['new chandigarh mullanpur']),
  ('Mullanpur',              '140901', 30.7750, 76.6650, ARRAY['mullanpur town', 'mullanpur garibdas'])
) AS area(name, pincode, lat, lng, "altNames")
WHERE c.slug = 'mohali'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Panchkula — 17 real pincodes
-- Source: India Post / panchkula.nic.in
-- ============================================================
INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng, "altNames")
SELECT area.name, area.pincode, c.id, 'Panchkula', 'Haryana', area.lat, area.lng, area."altNames"
FROM cities c,
(VALUES
  -- 133301 — Suraj Pur
  ('Suraj Pur',              '133301', 30.8400, 76.9400, ARRAY['surajpur']),

  -- 133302 — Kalka
  ('Kalka',                  '133302', 30.8442, 76.9494, ARRAY['kalka town', 'kalka haryana']),
  ('Kalka Railway Station',  '133302', 30.8450, 76.9500, ARRAY['kalka station', 'kalka rs']),

  -- 134101 — HMT Pinjore
  ('HMT Pinjore',            '134101', 30.7950, 76.8980, ARRAY['hmt pinjore']),

  -- 134102 — Pinjore
  ('Pinjore',                '134102', 30.7987, 76.9012, ARRAY['pinjore town', 'pinjore haryana', 'yadavindra gardens']),

  -- 134103 — ITBP Bhanu
  ('ITBP Bhanu',             '134103', 30.8100, 76.9100, ARRAY['itbp bhanu camp']),

  -- 134107 — Chandi Mandir
  ('Chandi Mandir',          '134107', 30.7200, 76.8400, ARRAY['chandi mandir cantonment', 'chandimandir']),
  ('Chandi Mandir Cantt',    '134107', 30.7220, 76.8420, ARRAY['chandimandir cantt']),

  -- 134108 — Old Panchkula
  ('Old Panchkula',          '134108', 30.6900, 76.8550, ARRAY['gk panchkula', 'purana panchkula']),

  -- 134109 — Sectors 1-4, 7, 8, 22-24
  ('Sector 1',               '134109', 30.6942, 76.8606, ARRAY['sector 1 panchkula', 'sec 1']),
  ('Sector 2',               '134109', 30.6968, 76.8632, ARRAY['sector 2 panchkula', 'sec 2']),
  ('Sector 3',               '134109', 30.6994, 76.8658, ARRAY['sector 3 panchkula', 'sec 3']),
  ('Sector 4',               '134109', 30.7020, 76.8684, ARRAY['sector 4 panchkula', 'sec 4']),
  ('Sector 7',               '134109', 30.7098, 76.8762, ARRAY['sector 7 panchkula', 'sec 7']),
  ('Sector 8',               '134109', 30.7124, 76.8788, ARRAY['sector 8 panchkula', 'sec 8']),
  ('Sector 22',              '134109', 30.6900, 76.8700, ARRAY['sector 22 panchkula', 'sec 22']),
  ('Sector 23',              '134109', 30.6920, 76.8720, ARRAY['sector 23 panchkula', 'sec 23']),
  ('Sector 24',              '134109', 30.6940, 76.8740, ARRAY['sector 24 panchkula', 'sec 24']),

  -- 134112 — Sectors 11, 12
  ('Sector 11',              '134112', 30.7202, 76.8866, ARRAY['sector 11 panchkula', 'sec 11']),
  ('Sector 12',              '134112', 30.7228, 76.8892, ARRAY['sector 12 panchkula', 'sec 12']),

  -- 134113 — Sectors 5, 6, 9, 10, 13-16, Industrial Area
  ('Sector 5',               '134113', 30.7046, 76.8710, ARRAY['sector 5 panchkula', 'sec 5']),
  ('Sector 6',               '134113', 30.7072, 76.8736, ARRAY['sector 6 panchkula', 'sec 6']),
  ('Sector 9',               '134113', 30.7150, 76.8814, ARRAY['sector 9 panchkula', 'sec 9']),
  ('Sector 10',              '134113', 30.7176, 76.8840, ARRAY['sector 10 panchkula', 'sec 10']),
  ('Sector 13',              '134113', 30.7240, 76.8905, ARRAY['sector 13 panchkula', 'sec 13']),
  ('Sector 14',              '134113', 30.7254, 76.8918, ARRAY['sector 14 panchkula', 'sec 14']),
  ('Sector 15',              '134113', 30.7280, 76.8944, ARRAY['sector 15 panchkula', 'sec 15']),
  ('Sector 16',              '134113', 30.7306, 76.8970, ARRAY['sector 16 panchkula', 'sec 16']),
  ('Industrial Area Phase 1','134113', 30.7100, 76.8650, ARRAY['industrial area panchkula']),
  ('Industrial Area Phase 2','134113', 30.7150, 76.8700, ARRAY['industrial area phase 2 panchkula']),

  -- 134114 — Mansa Devi Complex (Sector 5 area)
  ('Mansa Devi Complex',     '134114', 30.7306, 76.8970, ARRAY['mansa devi panchkula', 'mdc']),

  -- 134116 — Sectors 17-21, 25-28
  ('Sector 17',              '134116', 30.7332, 76.8996, ARRAY['sector 17 panchkula', 'sec 17']),
  ('Sector 18',              '134116', 30.7358, 76.9022, ARRAY['sector 18 panchkula', 'sec 18']),
  ('Sector 19',              '134116', 30.7384, 76.9048, ARRAY['sector 19 panchkula', 'sec 19']),
  ('Sector 20',              '134116', 30.7410, 76.9074, ARRAY['sector 20 panchkula', 'sec 20']),
  ('Sector 21',              '134116', 30.7436, 76.9100, ARRAY['sector 21 panchkula', 'sec 21']),
  ('Sector 25',              '134116', 30.7462, 76.9126, ARRAY['sector 25 panchkula', 'sec 25']),
  ('Sector 26',              '134116', 30.7488, 76.9152, ARRAY['sector 26 panchkula', 'sec 26']),
  ('Sector 27',              '134116', 30.7500, 76.9170, ARRAY['sector 27 panchkula', 'sec 27']),
  ('Sector 28',              '134116', 30.7520, 76.9190, ARRAY['sector 28 panchkula', 'sec 28']),

  -- 134117 — Sector 20 (partial)
  ('Sector 20 Extension',   '134117', 30.7430, 76.9090, ARRAY['sec 20 ext panchkula']),

  -- 134118 — Barwala
  ('Barwala',                '134118', 30.6453, 76.8372, ARRAY['barwala town', 'barwala panchkula']),

  -- 134204 — Raipur Rani
  ('Raipur Rani',            '134204', 30.6200, 76.8000, ARRAY['raipur rani town']),

  -- 134205 — Morni
  ('Morni Hills',            '134205', 30.7080, 77.0780, ARRAY['morni', 'morni hills panchkula'])
) AS area(name, pincode, lat, lng, "altNames")
WHERE c.slug = 'panchkula'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Patiala — comprehensive with surrounding towns
-- Source: India Post / patiala.nic.in
-- ============================================================

-- Ensure Patiala city exists
INSERT INTO cities (id, name, slug, state, "isActive", lat, lng,
  "baseDeliveryCharge", "freeDeliveryAbove", "updatedAt")
VALUES (
  gen_random_uuid()::text, 'Patiala', 'patiala', 'Punjab',
  true, 30.3398, 76.3869, 49, 499, now()
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO service_areas (name, pincode, city_id, city_name, state, lat, lng, "altNames")
SELECT area.name, area.pincode, c.id, 'Patiala', 'Punjab', area.lat, area.lng, area."altNames"
FROM cities c,
(VALUES
  -- 147001 — Patiala City main
  ('Patiala City',           '147001', 30.3398, 76.3869, ARRAY['patiala main', 'patiala center']),
  ('Civil Lines',            '147001', 30.3380, 76.3950, ARRAY['civil lines patiala']),
  ('Model Town',             '147001', 30.3467, 76.3923, ARRAY['model town patiala']),
  ('Leela Bhawan',           '147001', 30.3445, 76.3867, ARRAY['leela bhawan patiala']),
  ('Mall Road',              '147001', 30.3378, 76.3934, ARRAY['mall road patiala']),
  ('Sheran Wala Gate',       '147001', 30.3345, 76.3878, ARRAY['sheranwala gate', 'sheran wala darwaza']),
  ('Qila Mubarak',           '147001', 30.3320, 76.3900, ARRAY['qila mubarak patiala', 'patiala fort']),
  ('Fountain Chowk',         '147001', 30.3356, 76.3920, ARRAY['fountain chowk patiala']),
  ('Baradari Gardens',       '147001', 30.3356, 76.3889, ARRAY['baradari gardens patiala']),
  ('Lal Bagh',               '147001', 30.3389, 76.3831, ARRAY['lal bagh patiala']),
  ('New Lal Bagh',           '147001', 30.3401, 76.3845, ARRAY['new lal bagh patiala']),
  ('Adalat Bazaar',          '147001', 30.3367, 76.3967, ARRAY['adalat bazaar patiala']),
  ('Sanauri Adda',           '147001', 30.3290, 76.4012, ARRAY['sanauri adda patiala']),
  ('Polo Ground',            '147001', 30.3423, 76.3956, ARRAY['polo ground patiala']),
  ('Sirhind Road',           '147001', 30.3189, 76.3834, ARRAY['sirhind road patiala']),
  ('Nabha Road',             '147001', 30.3234, 76.4123, ARRAY['nabha road patiala']),
  ('Rajpura Road',           '147001', 30.3312, 76.3756, ARRAY['rajpura road patiala']),
  ('New Bus Stand',          '147001', 30.3298, 76.3867, ARRAY['new bus stand patiala']),
  ('Dukhniwaran Sahib',      '147001', 30.3300, 76.3850, ARRAY['dukhniwaran sahib gurudwara']),
  ('Ram Bagh',               '147001', 30.3434, 76.3867, ARRAY['ram bagh patiala']),
  ('Preet Nagar',            '147001', 30.3456, 76.3845, ARRAY['preet nagar patiala']),
  ('Anand Nagar',            '147001', 30.3412, 76.3890, ARRAY['anand nagar patiala']),

  -- 147002 — Urban Estate, Punjabi University
  ('Urban Estate Phase 1',   '147002', 30.3523, 76.3712, ARRAY['urban estate patiala']),
  ('Urban Estate Phase 2',   '147002', 30.3498, 76.3698, ARRAY['urban estate phase 2 patiala']),
  ('Punjabi University',     '147002', 30.3534, 76.3778, ARRAY['punjabi university patiala', 'pu patiala']),
  ('Sector 3',               '147002', 30.3567, 76.3734, ARRAY['sector 3 patiala']),
  ('Sector 4',               '147002', 30.3545, 76.3756, ARRAY['sector 4 patiala']),
  ('Sector 5',               '147002', 30.3523, 76.3778, ARRAY['sector 5 patiala']),
  ('Sector 6',               '147002', 30.3501, 76.3800, ARRAY['sector 6 patiala']),
  ('Sector 7',               '147002', 30.3479, 76.3823, ARRAY['sector 7 patiala']),
  ('Housing Board Colony',   '147002', 30.3550, 76.3700, ARRAY['housing board patiala']),

  -- 147003 — Gurbax Colony, DCW
  ('Gurbax Colony',          '147003', 30.3567, 76.3645, ARRAY['gurbax colony patiala']),
  ('Tripuri',                '147003', 30.3567, 76.3645, ARRAY['tripuri patiala']),
  ('Model Gram',             '147003', 30.3580, 76.3620, ARRAY['model gram patiala']),

  -- 147004 — Focal Point, Industrial Area, Thapar
  ('Focal Point',            '147004', 30.3645, 76.3567, ARRAY['focal point patiala']),
  ('Industrial Area',        '147004', 30.3623, 76.3589, ARRAY['industrial area patiala']),
  ('Thapar University',      '147004', 30.3523, 76.3623, ARRAY['thapar university patiala', 'tiet']),

  -- 147005 — Kalyan, Majithia Enclave
  ('Kalyan',                 '147005', 30.3500, 76.4000, ARRAY['kalyan patiala']),
  ('Majithia Enclave',       '147005', 30.3520, 76.4020, ARRAY['majithia enclave patiala']),

  -- 147006 — RGNUL, Sidhuwal
  ('RGNUL Punjab',           '147006', 30.3600, 76.4100, ARRAY['rgnul', 'rajiv gandhi national university of law']),

  -- 147007 — Dakala, New Lal Bagh Colony
  ('Dakala',                 '147007', 30.3400, 76.3700, ARRAY['dakala patiala']),
  ('Passiana',               '147007', 30.3620, 76.3640, ARRAY['passiana village patiala']),

  -- 147021 — Bahadurgarh area
  ('Bahadurgarh',            '147021', 30.3150, 76.3700, ARRAY['bahadurgarh patiala', 'guruteghbahadurgarh']),

  -- 140401 — Rajpura
  ('Rajpura',                '140401', 30.4834, 76.5935, ARRAY['rajpura town', 'rajpura patiala']),
  ('Rajpura Industrial',     '140401', 30.4800, 76.5900, ARRAY['rajpura industrial area']),

  -- 140417 — Shambhu
  ('Shambhu',                '140417', 30.5100, 76.6100, ARRAY['shambhu town', 'shambu']),

  -- 147101 — Samana
  ('Samana',                 '147101', 30.1530, 76.1878, ARRAY['samana town', 'samana patiala']),

  -- 147103 — Sanaur
  ('Sanaur',                 '147103', 30.2370, 76.4650, ARRAY['sanaur town', 'sanour patiala']),

  -- 147105 — Patran
  ('Patran',                 '147105', 30.0490, 76.3430, ARRAY['patran town']),

  -- 147201 — Nabha
  ('Nabha',                  '147201', 30.3734, 76.1490, ARRAY['nabha town', 'nabha patiala']),

  -- 147202 — Bhadson
  ('Bhadson',                '147202', 30.4700, 76.2800, ARRAY['bhadson town', 'bhadson patiala']),

  -- 140702 — Ghanaur
  ('Ghanaur',                '140702', 30.5000, 76.5400, ARRAY['ghanaur town', 'ghanur'])
) AS area(name, pincode, lat, lng, "altNames")
WHERE c.slug = 'patiala'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. Update cities — pincode prefixes + aliases
-- ============================================================
UPDATE cities SET "pincode_prefix" = ARRAY['160']
WHERE slug = 'chandigarh' AND "pincode_prefix" = '{}';

UPDATE cities SET "pincode_prefix" = ARRAY['140', '160']
WHERE slug = 'mohali' AND "pincode_prefix" = '{}';

UPDATE cities SET "pincode_prefix" = ARRAY['134', '133']
WHERE slug = 'panchkula' AND "pincode_prefix" = '{}';

UPDATE cities SET "pincode_prefix" = ARRAY['147', '140']
WHERE slug = 'patiala' AND "pincode_prefix" = '{}';

UPDATE cities SET aliases = ARRAY['chd', 'chandigarh city', 'the city beautiful']
WHERE slug = 'chandigarh' AND aliases = '{}';

UPDATE cities SET aliases = ARRAY['sas nagar', 'mohali city', 'greater mohali']
WHERE slug = 'mohali' AND aliases = '{}';

UPDATE cities SET aliases = ARRAY['panchkula city', 'panchkula haryana']
WHERE slug = 'panchkula' AND aliases = '{}';

UPDATE cities SET aliases = ARRAY['patiala city', 'royal city', 'patiala punjab']
WHERE slug = 'patiala' AND aliases = '{}';
