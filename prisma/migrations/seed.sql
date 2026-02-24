-- ============================================================
-- seed.sql — Gifts Cart India seed data
-- Replaces: prisma/seed.ts (Prisma-based seeder)
-- Run in: Supabase SQL Editor
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
-- ============================================================

BEGIN;

-- ==================== CITIES ====================

INSERT INTO cities (id, name, slug, state, lat, lng, "baseDeliveryCharge", "freeDeliveryAbove", "updatedAt")
VALUES
  ('city_chandigarh', 'Chandigarh', 'chandigarh', 'Chandigarh', 30.7333, 76.7794, 49, 499, NOW()),
  ('city_mohali',     'Mohali',     'mohali',     'Punjab',     30.7046, 76.7179, 49, 499, NOW()),
  ('city_panchkula',  'Panchkula',  'panchkula',  'Haryana',    30.6942, 76.8606, 49, 499, NOW())
ON CONFLICT (slug) DO NOTHING;

-- ==================== CITY ZONES (Chandigarh) ====================

-- Core zone: Sectors 15-25 (pincodes 160015-160025)
INSERT INTO city_zones (id, "cityId", name, pincodes, "extraCharge")
VALUES (
  'zone_chd_core',
  'city_chandigarh',
  'Core (Sectors 15-25)',
  ARRAY['160015','160016','160017','160018','160019','160020','160021','160022','160023','160024','160025'],
  0
) ON CONFLICT DO NOTHING;

-- Extended zone: Sectors 1-14 and 26-40
INSERT INTO city_zones (id, "cityId", name, pincodes, "extraCharge")
VALUES (
  'zone_chd_extended',
  'city_chandigarh',
  'Extended (Sectors 1-14, 26-40)',
  ARRAY[
    '160001','160002','160003','160004','160005','160006','160007','160008','160009','160010',
    '160011','160012','160013','160014',
    '160026','160027','160028','160029','160030','160031','160032','160033','160034','160035',
    '160036','160037','160038','160039','160040'
  ],
  30
) ON CONFLICT DO NOTHING;

-- Outskirts zone: Mohali and Panchkula
INSERT INTO city_zones (id, "cityId", name, pincodes, "extraCharge")
VALUES (
  'zone_chd_outskirts',
  'city_chandigarh',
  'Outskirts (Mohali, Panchkula)',
  ARRAY[
    '140301','140302','140303','140304','140305','140306','140307','140308','140309','140310',
    '140311','140312','140313','140314','140315','140316','140317','140318','140319','140320',
    '134101','134102','134103','134104','134105','134106','134107','134108','134109','134110',
    '134111','134112','134113','134114','134115','134116','134117','134118','134119','134120'
  ],
  60
) ON CONFLICT DO NOTHING;

-- ==================== DELIVERY SLOTS ====================

INSERT INTO delivery_slots (id, name, slug, "startTime", "endTime", "baseCharge")
VALUES
  ('slot_standard',      'Standard',      'standard',      '09:00', '21:00', 0),
  ('slot_fixed',         'Fixed Slot',    'fixed-slot',    '10:00', '12:00', 50),
  ('slot_midnight',      'Midnight',      'midnight',      '23:00', '23:59', 199),
  ('slot_early_morning', 'Early Morning', 'early-morning', '06:00', '08:00', 149),
  ('slot_express',       'Express',       'express',       '00:00', '23:59', 249)
ON CONFLICT (slug) DO NOTHING;

-- Link all delivery slots to Chandigarh
INSERT INTO city_delivery_configs ("cityId", "slotId", "isAvailable")
VALUES
  ('city_chandigarh', 'slot_standard',      true),
  ('city_chandigarh', 'slot_fixed',         true),
  ('city_chandigarh', 'slot_midnight',      true),
  ('city_chandigarh', 'slot_early_morning', true),
  ('city_chandigarh', 'slot_express',       true)
ON CONFLICT ("cityId", "slotId") DO NOTHING;

-- ==================== CATEGORIES ====================

-- Parent categories
INSERT INTO categories (id, name, slug, description, image, "sortOrder", "createdAt")
VALUES
  ('cat_cakes',    'Cakes',    'cakes',    'Freshly baked cakes for every occasion',  '/placeholder-product.svg', 1, NOW()),
  ('cat_flowers',  'Flowers',  'flowers',  'Beautiful fresh flower arrangements',     '/placeholder-product.svg', 2, NOW()),
  ('cat_combos',   'Combos',   'combos',   'Perfect gift combinations',               '/placeholder-product.svg', 3, NOW()),
  ('cat_plants',   'Plants',   'plants',   'Indoor and outdoor plants',               '/placeholder-product.svg', 4, NOW()),
  ('cat_gifts',    'Gifts',    'gifts',    'Unique gifts for your loved ones',        '/placeholder-product.svg', 5, NOW()),
  ('cat_pastries', 'Pastries', 'pastries', 'Fresh baked pastries and patisserie items','/placeholder-product.svg', 6, NOW()),
  ('cat_sweets',   'Sweets',   'sweets',   'Traditional Indian sweets and mithai',    '/placeholder-product.svg', 7, NOW()),
  ('cat_dry_cakes','Dry Cakes','dry-cakes','Long-lasting dry cakes and plum cakes',   '/placeholder-product.svg', 8, NOW()),
  ('cat_biscuits', 'Biscuits & Rusks','biscuits','Freshly baked biscuits, rusks, and cookies','/placeholder-product.svg', 9, NOW()),
  ('cat_namkeen',  'Namkeen & Snacks','namkeen','Savoury namkeen, mathi, and snacks', '/placeholder-product.svg', 10, NOW()),
  ('cat_decorations','Decoration Items','decorations','Party decorations, toppers, candles, and more','/placeholder-product.svg', 11, NOW()),
  ('cat_festive',  'Festive Hampers','festive-hampers','Curated gift hampers for festivals like Diwali, Rakhi, and Holi','/placeholder-product.svg', 12, NOW()),
  ('cat_chocolates','Chocolates','chocolates','Premium chocolate boxes and assortments','/placeholder-product.svg', 13, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Cake subcategories
INSERT INTO categories (id, name, slug, description, image, "parentId", "sortOrder", "createdAt")
VALUES
  ('cat_choc_cakes',    'Chocolate Cakes',    'chocolate-cakes',    'Rich chocolate cakes',                              '/placeholder-product.svg', 'cat_cakes', 1, NOW()),
  ('cat_fruit_cakes',   'Fruit Cakes',        'fruit-cakes',        'Fresh fruit cakes',                                '/placeholder-product.svg', 'cat_cakes', 2, NOW()),
  ('cat_photo_cakes',   'Photo Cakes',        'photo-cakes',        'Personalized photo cakes',                         '/placeholder-product.svg', 'cat_cakes', 3, NOW()),
  ('cat_eggless_cakes', 'Eggless Cakes',      'eggless-cakes',      'Delicious eggless cakes',                          '/placeholder-product.svg', 'cat_cakes', 4, NOW()),
  ('cat_premium_cakes', 'Premium Cakes',      'premium-cakes',      'Premium designer cakes for special occasions',     '/placeholder-product.svg', 'cat_cakes', 5, NOW()),
  ('cat_fondant_cakes', 'Fondant Cakes',      'fondant-cakes',      'Beautifully decorated fondant cakes',              '/placeholder-product.svg', 'cat_cakes', 6, NOW()),
  ('cat_wedding_cakes', 'Wedding Cakes',      'wedding-cakes',      'Multi-tier and designer wedding cakes',            '/placeholder-product.svg', 'cat_cakes', 7, NOW()),
  ('cat_anniv_cakes',   'Anniversary Cakes',  'anniversary-cakes',  'Romantic cakes for anniversary celebrations',      '/placeholder-product.svg', 'cat_cakes', 8, NOW()),
  ('cat_custom_cakes',  'Customized Cakes',   'customized-cakes',   'Custom-designed cakes for any theme or occasion',  '/placeholder-product.svg', 'cat_cakes', 9, NOW()),
  ('cat_val_cakes',     'Valentine''s Cakes', 'valentines-cakes',   'Romantic cakes for Valentine''s Day',              '/placeholder-product.svg', 'cat_cakes', 10, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Flower subcategories
INSERT INTO categories (id, name, slug, description, image, "parentId", "sortOrder", "createdAt")
VALUES
  ('cat_roses',          'Roses',           'roses',           'Beautiful roses',              '/placeholder-product.svg', 'cat_flowers', 1, NOW()),
  ('cat_mixed_bouquets', 'Mixed Bouquets',  'mixed-bouquets',  'Mixed flower bouquets',       '/placeholder-product.svg', 'cat_flowers', 2, NOW()),
  ('cat_premium_flowers','Premium Flowers', 'premium-flowers', 'Premium flower arrangements', '/placeholder-product.svg', 'cat_flowers', 3, NOW())
ON CONFLICT (slug) DO NOTHING;

-- ==================== PRODUCTS ====================

-- Cakes
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, weight, "isVeg", "updatedAt")
VALUES
  ('prod_choc_truffle', 'Chocolate Truffle Cake', 'chocolate-truffle-cake',
   'Rich and indulgent chocolate truffle cake layered with smooth ganache and topped with chocolate shavings.',
   'Rich chocolate truffle cake with ganache',
   'cat_choc_cakes', 599,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/ChatGPT%20Image%20Feb%2017,%202026,%2005_28_19%20PM.png'],
   ARRAY['bestseller','chocolate'], ARRAY['birthday','anniversary'], '500g', true, NOW()),

  ('prod_red_velvet', 'Red Velvet Cake', 'red-velvet-cake',
   'Classic red velvet cake with cream cheese frosting, perfect for celebrations.',
   'Classic red velvet with cream cheese frosting',
   'cat_cakes', 699,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/ChatGPT%20Image%20Feb%2017,%202026,%2005_30_42%20PM.png'],
   ARRAY['popular','premium'], ARRAY['birthday','anniversary','valentines'], '500g', true, NOW()),

  ('prod_black_forest', 'Black Forest Cake', 'black-forest-cake',
   'Traditional black forest cake with layers of chocolate sponge, whipped cream, and cherries.',
   'Traditional black forest with cherries',
   'cat_choc_cakes', 549,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_black_forest.png'],
   ARRAY['classic','chocolate'], ARRAY['birthday'], '500g', true, NOW()),

  ('prod_butterscotch', 'Butterscotch Cake', 'butterscotch-cake',
   'Delicious butterscotch cake topped with crunchy caramel bits and smooth butterscotch frosting.',
   'Butterscotch cake with caramel bits',
   'cat_cakes', 499,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_butterscotch.png'],
   ARRAY['classic'], ARRAY['birthday'], '500g', true, NOW()),

  ('prod_photo_cake', 'Photo Cake', 'photo-cake',
   'Personalized photo cake printed with your favorite photo on a delicious vanilla base.',
   'Personalized photo cake on vanilla base',
   'cat_photo_cakes', 899,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_photo_cake.png'],
   ARRAY['personalized','premium'], ARRAY['birthday','anniversary'], '1kg', true, NOW()),

  ('prod_pineapple', 'Pineapple Cake', 'pineapple-cake',
   'Light and refreshing pineapple cake with fresh pineapple chunks and whipped cream.',
   'Fresh pineapple cake with whipped cream',
   'cat_fruit_cakes', 549,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_pineapple.png'],
   ARRAY['fruity','classic'], ARRAY['birthday'], '500g', true, NOW()),

  ('prod_eggless_choc', 'Eggless Chocolate Cake', 'eggless-chocolate-cake',
   'Rich eggless chocolate cake that tastes just as amazing. Perfect for vegetarians.',
   'Rich eggless chocolate cake',
   'cat_eggless_cakes', 649,
   ARRAY['/placeholder-product.svg'],
   ARRAY['eggless','chocolate'], ARRAY['birthday','anniversary'], '500g', true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Flowers
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_red_roses', 'Red Roses Bouquet', 'red-roses-bouquet',
   'Stunning bouquet of 12 fresh red roses wrapped in elegant packaging. Perfect for expressing love.',
   '12 fresh red roses bouquet',
   'cat_flowers', 699,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_red_roses.png'],
   ARRAY['bestseller','romantic'], ARRAY['valentines','anniversary','birthday'], true, NOW()),

  ('prod_mixed_flowers', 'Mixed Flower Arrangement', 'mixed-flower-arrangement',
   'Beautiful arrangement of mixed seasonal flowers in a decorative basket.',
   'Mixed seasonal flowers in basket',
   'cat_flowers', 899,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_mixed_flowers.png'],
   ARRAY['premium','arrangement'], ARRAY['birthday','anniversary','housewarming'], true, NOW()),

  ('prod_orchid', 'Orchid Bunch', 'orchid-bunch',
   'Exotic purple orchid bunch that makes a luxurious and long-lasting gift.',
   'Exotic purple orchid bunch',
   'cat_flowers', 1299,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_orchid.png'],
   ARRAY['premium','exotic'], ARRAY['anniversary','birthday'], true, NOW()),

  ('prod_yellow_lily', 'Yellow Lily Bouquet', 'yellow-lily-bouquet',
   'Bright and cheerful yellow lily bouquet to light up any occasion.',
   'Bright yellow lily bouquet',
   'cat_flowers', 799,
   ARRAY['/placeholder-product.svg'],
   ARRAY['cheerful','lily'], ARRAY['birthday','congratulations'], true, NOW()),

  ('prod_sunflower', 'Sunflower Bunch', 'sunflower-bunch',
   'Vibrant bunch of sunflowers that bring happiness and warmth to any room.',
   'Vibrant sunflower bunch',
   'cat_flowers', 599,
   ARRAY['/placeholder-product.svg'],
   ARRAY['cheerful','sunflower'], ARRAY['birthday','housewarming'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Combos
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_cake_flowers', 'Cake & Flowers Combo', 'cake-flowers-combo',
   'Perfect combination of a half kg chocolate cake with a bouquet of 12 red roses.',
   'Chocolate cake + red roses bouquet',
   'cat_combos', 1199,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_cake_flowers.png'],
   ARRAY['bestseller','combo','value'], ARRAY['birthday','anniversary','valentines'], true, NOW()),

  ('prod_roses_choc_combo', 'Roses & Chocolate Combo', 'roses-chocolate-combo',
   'Romantic combo of 6 red roses with a box of premium chocolates.',
   'Red roses + premium chocolates',
   'cat_combos', 999,
   ARRAY['/placeholder-product.svg'],
   ARRAY['romantic','combo'], ARRAY['valentines','anniversary'], true, NOW()),

  ('prod_celebration_hamper', 'Celebration Hamper', 'celebration-hamper',
   'Complete celebration hamper with cake, flowers, chocolates, and a greeting card.',
   'Cake + flowers + chocolates + card',
   'cat_combos', 1999,
   ARRAY['/placeholder-product.svg'],
   ARRAY['premium','hamper'], ARRAY['birthday','anniversary'], true, NOW()),

  ('prod_birthday_bash', 'Birthday Bash Combo', 'birthday-bash-combo',
   'Birthday special combo with a 1kg cake, balloons, and a birthday banner.',
   '1kg cake + balloons + banner',
   'cat_combos', 1499,
   ARRAY['/placeholder-product.svg'],
   ARRAY['birthday','combo'], ARRAY['birthday'], true, NOW()),

  ('prod_sweet_surprise', 'Sweet Surprise Combo', 'sweet-surprise-combo',
   'A delightful surprise combo with a half kg red velvet cake and mixed flower bouquet.',
   'Red velvet cake + mixed flowers',
   'cat_combos', 1349,
   ARRAY['/placeholder-product.svg'],
   ARRAY['surprise','combo'], ARRAY['birthday','anniversary'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Plants
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_money_plant', 'Money Plant', 'money-plant',
   'Lucky money plant in a decorative ceramic pot. Low maintenance and air purifying.',
   'Money plant in ceramic pot',
   'cat_plants', 399,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_money_plant.png'],
   ARRAY['lucky','indoor'], ARRAY['housewarming','birthday'], true, NOW()),

  ('prod_jade', 'Jade Plant', 'jade-plant',
   'Beautiful jade plant known for bringing prosperity. Comes in a stylish pot.',
   'Prosperity jade plant in stylish pot',
   'cat_plants', 499,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_jade_plant.png'],
   ARRAY['lucky','indoor','succulent'], ARRAY['housewarming','diwali'], true, NOW()),

  ('prod_peace_lily', 'Peace Lily', 'peace-lily',
   'Elegant peace lily plant that purifies air and adds beauty to any space.',
   'Air purifying peace lily',
   'cat_plants', 599,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_peace_lily.png'],
   ARRAY['air-purifying','indoor'], ARRAY['housewarming','birthday'], true, NOW()),

  ('prod_snake_plant', 'Snake Plant', 'snake-plant',
   'Hardy snake plant that thrives in any condition. Perfect for beginners.',
   'Low maintenance snake plant',
   'cat_plants', 449,
   ARRAY['/placeholder-product.svg'],
   ARRAY['air-purifying','indoor','low-maintenance'], ARRAY['housewarming'], true, NOW()),

  ('prod_bonsai', 'Bonsai Tree', 'bonsai-tree',
   'Miniature bonsai tree in a ceramic pot. A unique and thoughtful gift.',
   'Miniature bonsai in ceramic pot',
   'cat_plants', 899,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_bonsai.png'],
   ARRAY['premium','unique'], ARRAY['birthday','housewarming'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Gifts
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_choco_box', 'Premium Chocolate Box', 'premium-chocolate-box',
   'Luxurious box of 24 assorted premium chocolates. Perfect for any celebration.',
   '24 assorted premium chocolates',
   'cat_gifts', 799,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_choco_box.png'],
   ARRAY['premium','chocolate'], ARRAY['birthday','anniversary','diwali'], true, NOW()),

  ('prod_candle_set', 'Scented Candle Set', 'scented-candle-set',
   'Set of 3 luxury scented candles in lavender, vanilla, and rose fragrances.',
   '3 luxury scented candles set',
   'cat_gifts', 699,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_scented_candle.png'],
   ARRAY['luxury','home-decor'], ARRAY['birthday','housewarming','diwali'], true, NOW()),

  ('prod_mug', 'Personalized Mug', 'personalized-mug',
   'Custom printed ceramic mug with your photo and message. A memorable keepsake.',
   'Custom photo printed ceramic mug',
   'cat_gifts', 349,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_mug.png'],
   ARRAY['personalized'], ARRAY['birthday','anniversary'], true, NOW()),

  ('prod_dry_fruits', 'Dry Fruits Gift Box', 'dry-fruits-box',
   'Premium assorted dry fruits in an elegant gift box. Includes almonds, cashews, pistachios, and raisins.',
   'Premium assorted dry fruits gift box',
   'cat_gifts', 999,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_dry_fruit_box.png'],
   ARRAY['premium','healthy'], ARRAY['diwali','birthday','housewarming'], true, NOW()),

  ('prod_teddy', 'Teddy Bear', 'teddy-bear',
   'Soft and cuddly teddy bear, 12 inches tall. A perfect gift for loved ones.',
   '12 inch soft teddy bear',
   'cat_gifts', 599,
   ARRAY['/placeholder-product.svg'],
   ARRAY['soft-toy','cute'], ARRAY['valentines','birthday'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- New products with Supabase images
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_mango_cake', 'Mango Delight Cake', 'mango-delight-cake',
   'Bright and tropical mango cake with layers of fresh mango mousse and sponge, topped with mango slices.',
   'Tropical mango mousse cake',
   'cat_fruit_cakes', 649,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_mango_cake.png'],
   ARRAY['fruity','seasonal'], ARRAY['birthday'], true, NOW()),

  ('prod_yellow_roses', 'Yellow Roses Bouquet', 'yellow-roses-bouquet',
   'Cheerful bouquet of 12 bright yellow roses wrapped in white paper with baby''s breath fillers.',
   '12 yellow roses with baby''s breath',
   'cat_flowers', 699,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_yellow_roses.png'],
   ARRAY['cheerful','roses'], ARRAY['birthday','congratulations','friendship-day'], true, NOW()),

  ('prod_white_lily', 'White Lily Bouquet', 'white-lily-bouquet',
   'Elegant bouquet of fresh white lilies with eucalyptus greens, wrapped in premium paper.',
   'Elegant white lilies bouquet',
   'cat_flowers', 899,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_lily_bouquet.png'],
   ARRAY['elegant','premium','lily'], ARRAY['anniversary','sympathy','birthday'], true, NOW()),

  ('prod_choco_bouquet', 'Chocolate Bouquet', 'chocolate-bouquet',
   'Luxurious bouquet made with Ferrero Rocher and Dairy Milk chocolates, wrapped like a flower arrangement.',
   'Ferrero Rocher & Dairy Milk bouquet',
   'cat_combos', 999,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_choco_bouquet%20(1).png'],
   ARRAY['chocolate','premium','unique'], ARRAY['valentines','birthday','anniversary'], true, NOW()),

  ('prod_celebration_box', 'Celebration Gift Box', 'celebration-gift-box',
   'Premium celebration gift box containing a cake slice, chocolates, a scented candle, and a greeting card.',
   'Cake + chocolates + candle + card box',
   'cat_combos', 1299,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_celebration_box.png'],
   ARRAY['premium','gift-box'], ARRAY['birthday','anniversary','congratulations'], true, NOW()),

  ('prod_teddy_combo', 'Teddy & Roses Combo', 'teddy-roses-combo',
   'Adorable combo of a cute brown teddy bear, a small bouquet of red roses, and a box of chocolates.',
   'Teddy bear + roses + chocolates',
   'cat_combos', 1099,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_teddy_combo.png'],
   ARRAY['romantic','combo','cute'], ARRAY['valentines','birthday','anniversary'], true, NOW()),

  ('prod_bamboo', 'Lucky Bamboo', 'lucky-bamboo',
   'Two-layer lucky bamboo arrangement in a clear glass vase with white pebbles. Symbol of good fortune.',
   'Two-layer lucky bamboo in glass vase',
   'cat_plants', 499,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_bamboo.png'],
   ARRAY['lucky','indoor','zen'], ARRAY['housewarming','diwali','birthday'], true, NOW()),

  ('prod_cushion', 'Personalized Photo Cushion', 'personalized-photo-cushion',
   'Soft square cushion with your favorite photo printed in vibrant colors. A cozy and memorable gift.',
   'Custom photo printed cushion',
   'cat_gifts', 449,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_cushion.png'],
   ARRAY['personalized','home-decor'], ARRAY['birthday','anniversary','valentines'], true, NOW()),

  ('prod_perfume_set', 'Mini Perfume Gift Set', 'mini-perfume-gift-set',
   'Elegant set of 4 mini perfume bottles in a luxurious gift box. Perfect for fragrance lovers.',
   '4 mini perfume bottles gift set',
   'cat_gifts', 899,
   ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_perfume_set.png'],
   ARRAY['luxury','fragrance','premium'], ARRAY['birthday','anniversary','valentines'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Pastry products
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_choc_pastry', 'Chocolate Pastry', 'chocolate-pastry',
   'Rich chocolate pastry with chocolate ganache topping and cream filling.',
   'Chocolate pastry with ganache',
   'cat_pastries', 99, ARRAY['/placeholder-product.svg'],
   ARRAY['pastry','chocolate'], ARRAY['birthday'], true, NOW()),

  ('prod_bf_pastry', 'Black Forest Pastry', 'black-forest-pastry',
   'Classic black forest pastry with whipped cream and cherry.',
   'Black forest pastry with cherry',
   'cat_pastries', 89, ARRAY['/placeholder-product.svg'],
   ARRAY['pastry','classic'], ARRAY['birthday'], true, NOW()),

  ('prod_rv_pastry', 'Red Velvet Pastry', 'red-velvet-pastry',
   'Elegant red velvet pastry with cream cheese frosting.',
   'Red velvet pastry with cream cheese',
   'cat_pastries', 109, ARRAY['/placeholder-product.svg'],
   ARRAY['pastry','premium'], ARRAY['birthday','anniversary'], true, NOW()),

  ('prod_bs_pastry', 'Butterscotch Pastry', 'butterscotch-pastry',
   'Creamy butterscotch pastry with caramel crunch.',
   'Butterscotch pastry with caramel',
   'cat_pastries', 89, ARRAY['/placeholder-product.svg'],
   ARRAY['pastry','classic'], ARRAY['birthday'], true, NOW()),

  ('prod_pa_pastry', 'Pineapple Pastry', 'pineapple-pastry',
   'Light pineapple pastry with fresh pineapple chunks.',
   'Pineapple pastry with fresh fruit',
   'cat_pastries', 89, ARRAY['/placeholder-product.svg'],
   ARRAY['pastry','fruity'], ARRAY['birthday'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Sweets
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, weight, "isVeg", "updatedAt")
VALUES
  ('prod_milk_cake', 'Milk Cake', 'milk-cake',
   'Traditional Indian milk cake (alwar ka mawa) made with fresh khoya and sugar.',
   'Traditional milk cake with khoya',
   'cat_sweets', 399, ARRAY['/placeholder-product.svg'],
   ARRAY['traditional','mithai'], ARRAY['diwali','rakhi','housewarming'], '500g', true, NOW()),

  ('prod_kalakand', 'Kalakand', 'kalakand',
   'Soft and grainy milk sweet made with paneer and condensed milk, garnished with pistachios.',
   'Soft paneer sweet with pistachios',
   'cat_sweets', 449, ARRAY['/placeholder-product.svg'],
   ARRAY['traditional','mithai','premium'], ARRAY['diwali','rakhi','housewarming'], '500g', true, NOW()),

  ('prod_kaju_katli', 'Kaju Katli', 'kaju-katli',
   'Premium kaju katli (cashew fudge) made with pure cashew nuts and sugar. A festive favourite.',
   'Premium cashew fudge sweet',
   'cat_sweets', 599, ARRAY['/placeholder-product.svg'],
   ARRAY['premium','mithai','bestseller'], ARRAY['diwali','rakhi','birthday'], '500g', true, NOW()),

  ('prod_gulab_jamun', 'Gulab Jamun', 'gulab-jamun',
   'Soft and syrupy gulab jamun made with khoya, soaked in rose-flavoured sugar syrup.',
   'Soft khoya gulab jamun in syrup',
   'cat_sweets', 349, ARRAY['/placeholder-product.svg'],
   ARRAY['traditional','mithai','popular'], ARRAY['diwali','birthday','housewarming'], '500g', true, NOW()),

  ('prod_rasmalai', 'Rasmalai', 'rasmalai',
   'Creamy rasmalai — soft paneer dumplings soaked in sweetened saffron milk, garnished with almonds.',
   'Saffron milk paneer dumplings',
   'cat_sweets', 499, ARRAY['/placeholder-product.svg'],
   ARRAY['premium','mithai'], ARRAY['diwali','birthday','anniversary'], '500g', true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Dry Cakes
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, weight, "isVeg", "updatedAt")
VALUES
  ('prod_fruit_dry', 'Fruit Dry Cake', 'fruit-cake-dry',
   'Rich fruit dry cake loaded with mixed dry fruits and tutti frutti. Perfect with tea.',
   'Rich fruit dry cake with dry fruits',
   'cat_dry_cakes', 349, ARRAY['/placeholder-product.svg'],
   ARRAY['dry-cake','fruity'], ARRAY['christmas','birthday'], '500g', true, NOW()),

  ('prod_choc_dry', 'Chocolate Dry Cake', 'chocolate-dry-cake',
   'Dense chocolate dry cake with chocolate chips, perfect for gifting.',
   'Dense chocolate chip dry cake',
   'cat_dry_cakes', 399, ARRAY['/placeholder-product.svg'],
   ARRAY['dry-cake','chocolate'], ARRAY['birthday','christmas'], '500g', true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Biscuits & Rusks
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, weight, "isVeg", "updatedAt")
VALUES
  ('prod_fruit_rusk', 'Fruit Cake Rusk', 'fruit-cake-rusk',
   'Crunchy fruit cake rusk with dry fruits. Perfect tea-time snack.',
   'Crunchy fruit cake rusk',
   'cat_biscuits', 199, ARRAY['/placeholder-product.svg'],
   ARRAY['rusk','snack'], ARRAY[]::text[], '400g', true, NOW()),

  ('prod_atta_biscuits', 'Atta Biscuits', 'atta-biscuits',
   'Wholesome atta (wheat) biscuits baked to perfection. Healthy and delicious.',
   'Wholesome wheat biscuits',
   'cat_biscuits', 149, ARRAY['/placeholder-product.svg'],
   ARRAY['biscuit','healthy'], ARRAY[]::text[], '400g', true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Namkeen
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, weight, "isVeg", "updatedAt")
VALUES
  ('prod_mathri', 'Mathri', 'mathri-namkeen',
   'Crispy and flaky traditional mathri, seasoned with ajwain and salt.',
   'Crispy traditional mathri',
   'cat_namkeen', 179, ARRAY['/placeholder-product.svg'],
   ARRAY['namkeen','traditional'], ARRAY['diwali'], '500g', true, NOW()),

  ('prod_mix_namkeen', 'Mix Namkeen', 'mix-namkeen',
   'Assorted mix namkeen with sev, peanuts, and spiced chivda.',
   'Assorted mix namkeen',
   'cat_namkeen', 199, ARRAY['/placeholder-product.svg'],
   ARRAY['namkeen','snack'], ARRAY['diwali'], '500g', true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Decorations
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_sparkling_candle', 'Sparkling Birthday Candle', 'sparkling-candle',
   'Sparkling fountain candle that creates a magical effect on any cake.',
   'Sparkling fountain candle',
   'cat_decorations', 149, ARRAY['/placeholder-product.svg'],
   ARRAY['decoration','candle'], ARRAY['birthday'], true, NOW()),

  ('prod_hb_banner', 'Happy Birthday Banner', 'happy-birthday-banner',
   'Gold foil "Happy Birthday" banner for party decoration.',
   'Gold foil birthday banner',
   'cat_decorations', 199, ARRAY['/placeholder-product.svg'],
   ARRAY['decoration','banner'], ARRAY['birthday'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Festive Hampers
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_diwali_hamper', 'Diwali Dry Fruit Hamper', 'diwali-dry-fruit-hamper',
   'Premium Diwali hamper with almonds, cashews, pistachios, and raisins in a decorative box.',
   'Premium dry fruit Diwali hamper',
   'cat_festive', 1549, ARRAY['/placeholder-product.svg'],
   ARRAY['hamper','premium','dry-fruits'], ARRAY['diwali'], true, NOW()),

  ('prod_sweet_box', 'Festive Sweet Box', 'festive-sweet-box',
   'Assorted sweet box with kaju katli, gulab jamun, rasmalai, and barfi for festive gifting.',
   'Assorted festive sweet box',
   'cat_festive', 999, ARRAY['/placeholder-product.svg'],
   ARRAY['hamper','sweets','festive'], ARRAY['diwali','rakhi'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Chocolates
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "updatedAt")
VALUES
  ('prod_assorted_choc', 'Assorted Chocolate Box', 'assorted-chocolate-box',
   'Premium assorted chocolate box with dark, milk, and white chocolates. 24 pieces.',
   '24-piece assorted chocolate box',
   'cat_chocolates', 899, ARRAY['/placeholder-product.svg'],
   ARRAY['chocolate','premium'], ARRAY['birthday','valentines','anniversary'], true, NOW()),

  ('prod_dark_truffles', 'Dark Chocolate Truffles', 'dark-chocolate-truffles-box',
   'Handcrafted dark chocolate truffles in a luxury gift box. 12 pieces.',
   '12-piece dark chocolate truffles',
   'cat_chocolates', 699, ARRAY['/placeholder-product.svg'],
   ARRAY['chocolate','premium','dark'], ARRAY['valentines','anniversary'], true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- ==================== VENDOR ====================

INSERT INTO users (id, phone, name, role, email, "updatedAt")
VALUES ('user_vendor_1', '9876543210', 'Rajesh Kumar', 'VENDOR', 'rajesh@sweetdelights.in', NOW())
ON CONFLICT (phone) DO NOTHING;

INSERT INTO vendors (id, "userId", "businessName", "ownerName", phone, email, "cityId", address, lat, lng, categories, status, "commissionRate", rating, "totalOrders", "isOnline", "autoAccept", "fssaiNumber", "updatedAt")
VALUES (
  'vendor_sweet_delights',
  'user_vendor_1',
  'Sweet Delights Bakery',
  'Rajesh Kumar',
  '9876543210',
  'rajesh@sweetdelights.in',
  'city_chandigarh',
  'Shop No. 42, Sector 17-C, Chandigarh',
  30.7412, 76.7842,
  ARRAY['cakes','combos'],
  'APPROVED',
  12, 4.5, 150, true, true,
  'FSSAI12345678901234',
  NOW()
) ON CONFLICT ("userId") DO NOTHING;

-- ==================== VENDOR PRODUCTS ====================

INSERT INTO vendor_products ("vendorId", "productId", "costPrice", "isAvailable", "preparationTime", "dailyLimit")
VALUES
  ('vendor_sweet_delights', 'prod_choc_truffle', 390, true, 120, 20),
  ('vendor_sweet_delights', 'prod_red_velvet',   455, true, 120, 20),
  ('vendor_sweet_delights', 'prod_black_forest', 357, true, 120, 20),
  ('vendor_sweet_delights', 'prod_butterscotch', 325, true, 120, 20),
  ('vendor_sweet_delights', 'prod_photo_cake',   585, true, 120, 20),
  ('vendor_sweet_delights', 'prod_pineapple',    357, true, 120, 20),
  ('vendor_sweet_delights', 'prod_eggless_choc', 422, true, 120, 20),
  ('vendor_sweet_delights', 'prod_cake_flowers', 780, true, 120, 20)
ON CONFLICT ("vendorId", "productId") DO NOTHING;

-- ==================== VENDOR PINCODES ====================

INSERT INTO vendor_pincodes ("vendorId", pincode, "deliveryCharge", "isActive")
SELECT 'vendor_sweet_delights', p, 0, true
FROM unnest(ARRAY[
  '160015','160016','160017','160018','160019','160020','160021','160022','160023','160024','160025'
]) AS p
ON CONFLICT ("vendorId", pincode) DO NOTHING;

-- ==================== VENDOR WORKING HOURS ====================

INSERT INTO vendor_working_hours ("vendorId", "dayOfWeek", "openTime", "closeTime", "isClosed")
VALUES
  ('vendor_sweet_delights', 0, '08:00', '22:00', false),  -- Sunday
  ('vendor_sweet_delights', 1, '08:00', '22:00', true),   -- Monday (closed)
  ('vendor_sweet_delights', 2, '08:00', '22:00', false),  -- Tuesday
  ('vendor_sweet_delights', 3, '08:00', '22:00', false),  -- Wednesday
  ('vendor_sweet_delights', 4, '08:00', '22:00', false),  -- Thursday
  ('vendor_sweet_delights', 5, '08:00', '22:00', false),  -- Friday
  ('vendor_sweet_delights', 6, '08:00', '22:00', false)   -- Saturday
ON CONFLICT ("vendorId", "dayOfWeek") DO NOTHING;

-- ==================== VENDOR SLOTS ====================

INSERT INTO vendor_slots ("vendorId", "slotId", "isEnabled")
VALUES
  ('vendor_sweet_delights', 'slot_standard',      true),
  ('vendor_sweet_delights', 'slot_fixed',         true),
  ('vendor_sweet_delights', 'slot_midnight',      true),
  ('vendor_sweet_delights', 'slot_early_morning', true),
  ('vendor_sweet_delights', 'slot_express',       true)
ON CONFLICT ("vendorId", "slotId") DO NOTHING;

-- ==================== VENDOR CAPACITY (7 days) ====================
-- Creates capacity for today + 6 days, all slots, 10 max orders each

INSERT INTO vendor_capacity ("vendorId", date, "slotId", "maxOrders", "bookedOrders")
SELECT 'vendor_sweet_delights', d::date, s.slot_id, 10, 0
FROM generate_series(CURRENT_DATE, CURRENT_DATE + 6, '1 day'::interval) AS d
CROSS JOIN (
  VALUES ('slot_standard'), ('slot_fixed'), ('slot_midnight'), ('slot_early_morning'), ('slot_express')
) AS s(slot_id)
ON CONFLICT ("vendorId", date, "slotId") DO NOTHING;

-- ==================== PRODUCT ADDONS ====================

INSERT INTO product_addons ("productId", name, price, "isActive")
SELECT p.id, a.name, a.price, true
FROM (
  VALUES
    ('prod_choc_truffle'),
    ('prod_red_velvet'),
    ('prod_black_forest'),
    ('prod_butterscotch'),
    ('prod_photo_cake')
) AS p(id)
CROSS JOIN (
  VALUES
    ('Extra Candles (10 pcs)', 49),
    ('Knife & Server Set', 29),
    ('Happy Birthday Topper', 99),
    ('Greeting Card', 49)
) AS a(name, price);

-- ==================== PRODUCT VARIATIONS (Weight) ====================

-- Standard cake weight variations (500g base price × multiplier)
INSERT INTO product_variations ("productId", attributes, price, "sortOrder", "isActive", "updatedAt")
SELECT p.id, jsonb_build_object('weight', v.weight), ROUND(p."basePrice" * v.multiplier), v.sort_order, true, NOW()
FROM products p
CROSS JOIN (
  VALUES
    ('500g (Half Kg)', 0, 1.0),
    ('1 Kg',           1, 1.85),
    ('1.5 Kg',         2, 2.7),
    ('2 Kg',           3, 3.5),
    ('3 Kg',           4, 5.0)
) AS v(weight, sort_order, multiplier)
WHERE p.id IN ('prod_choc_truffle','prod_red_velvet','prod_black_forest','prod_butterscotch','prod_pineapple','prod_eggless_choc');

-- Photo cake variations (start at 1kg)
INSERT INTO product_variations ("productId", attributes, price, "sortOrder", "isActive", "updatedAt")
VALUES
  ('prod_photo_cake', '{"weight":"1 Kg"}',   899,  0, true, NOW()),
  ('prod_photo_cake', '{"weight":"1.5 Kg"}', 1349, 1, true, NOW()),
  ('prod_photo_cake', '{"weight":"2 Kg"}',   1749, 2, true, NOW()),
  ('prod_photo_cake', '{"weight":"3 Kg"}',   2499, 3, true, NOW());

-- Sweet weight variations (250g, 500g, 1kg)
INSERT INTO product_variations ("productId", attributes, price, "sortOrder", "isActive", "updatedAt")
SELECT p.id, jsonb_build_object('weight', v.weight), ROUND(p."basePrice" * v.multiplier), v.sort_order, true, NOW()
FROM products p
CROSS JOIN (
  VALUES
    ('250g', 0, 0.55),
    ('500g', 1, 1.0),
    ('1 Kg', 2, 1.9)
) AS v(weight, sort_order, multiplier)
WHERE p.id IN ('prod_milk_cake','prod_kalakand','prod_kaju_katli','prod_gulab_jamun','prod_rasmalai');

-- ==================== CURRENCY CONFIGS ====================

INSERT INTO currency_configs (code, name, symbol, "symbolPosition", "exchangeRate", markup, rounding, "roundTo", locale, countries, "isDefault", "isActive", "updatedAt")
VALUES
  ('INR', 'Indian Rupee',  '₹',   'before', 1,      0, 'nearest', 1,    'en-IN', ARRAY['IN'], true,  true, NOW()),
  ('USD', 'US Dollar',     '$',   'before', 0.012,  3, 'up',      0.01, 'en-US', ARRAY['US','CA','AU','NZ','PR','GU','VI','AS','MP'], false, true, NOW()),
  ('GBP', 'British Pound', '£',   'before', 0.0095, 3, 'up',      0.01, 'en-GB', ARRAY['GB','GG','JE','IM'], false, true, NOW()),
  ('AED', 'UAE Dirham',    'AED', 'before', 0.044,  2, 'up',      0.01, 'en-AE', ARRAY['AE'], false, true, NOW()),
  ('EUR', 'Euro',          '€',   'before', 0.011,  3, 'up',      0.01, 'de-DE', ARRAY['DE','FR','IT','ES','NL','BE','AT','IE','FI','PT','GR','LU'], false, true, NOW())
ON CONFLICT (code) DO NOTHING;

COMMIT;
