-- ============================================================
-- Update Product Images - Gifts Cart India
-- Maps Supabase storage URLs to existing products
-- and inserts new products that don't exist yet
-- ============================================================

-- ==================== PART 1: UPDATE EXISTING PRODUCTS ====================

-- 1. Chocolate Truffle Cake
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/ChatGPT%20Image%20Feb%2017,%202026,%2005_28_19%20PM.png']
WHERE slug = 'chocolate-truffle-cake';

-- 2. Red Velvet Cake
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/ChatGPT%20Image%20Feb%2017,%202026,%2005_30_42%20PM.png']
WHERE slug = 'red-velvet-cake';

-- 3. Black Forest Cake
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_black_forest.png']
WHERE slug = 'black-forest-cake';

-- 4. Butterscotch Cake
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_butterscotch.png']
WHERE slug = 'butterscotch-cake';

-- 5. Photo Cake
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_photo_cake.png']
WHERE slug = 'photo-cake';

-- 6. Pineapple Cake
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_pineapple.png']
WHERE slug = 'pineapple-cake';

-- 7. Red Roses Bouquet
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_red_roses.png']
WHERE slug = 'red-roses-bouquet';

-- 8. Mixed Flower Arrangement
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_mixed_flowers.png']
WHERE slug = 'mixed-flower-arrangement';

-- 9. Orchid Bunch
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_orchid.png']
WHERE slug = 'orchid-bunch';

-- 10. Cake & Flowers Combo
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_cake_flowers.png']
WHERE slug = 'cake-flowers-combo';

-- 11. Money Plant
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_money_plant.png']
WHERE slug = 'money-plant';

-- 12. Jade Plant
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_jade_plant.png']
WHERE slug = 'jade-plant';

-- 13. Peace Lily
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_peace_lily.png']
WHERE slug = 'peace-lily';

-- 14. Bonsai Tree (image: Ficus Bonsai)
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_bonsai.png']
WHERE slug = 'bonsai-tree';

-- 15. Personalized Mug (image: Personalized Photo Mug)
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_mug.png']
WHERE slug = 'personalized-mug';

-- 16. Premium Chocolate Box
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_choco_box.png']
WHERE slug = 'premium-chocolate-box';

-- 17. Scented Candle Set (image: Luxury Scented Candle Set)
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_scented_candle.png']
WHERE slug = 'scented-candle-set';

-- 18. Dry Fruits Gift Box (image: Premium Dry Fruit Box)
UPDATE products SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_dry_fruit_box.png']
WHERE slug = 'dry-fruits-box';


-- ==================== PART 2: INSERT NEW PRODUCTS ====================

-- 19. Mango Delight Cake (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Mango Delight Cake',
  'mango-delight-cake',
  'Bright and tropical mango cake with layers of fresh mango mousse and sponge, topped with mango slices.',
  'Tropical mango mousse cake',
  c.id,
  649,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_mango_cake.png'],
  ARRAY['fruity', 'seasonal'],
  ARRAY['birthday'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'fruit-cakes'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_mango_cake.png'];

-- 20. Yellow Roses Bouquet (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Yellow Roses Bouquet',
  'yellow-roses-bouquet',
  'Cheerful bouquet of 12 bright yellow roses wrapped in white paper with baby''s breath fillers.',
  '12 yellow roses with baby''s breath',
  c.id,
  699,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_yellow_roses.png'],
  ARRAY['cheerful', 'roses'],
  ARRAY['birthday', 'congratulations', 'friendship-day'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'roses'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_yellow_roses.png'];

-- 21. White Lily Bouquet (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'White Lily Bouquet',
  'white-lily-bouquet',
  'Elegant bouquet of fresh white lilies with eucalyptus greens, wrapped in premium paper.',
  'Elegant white lilies bouquet',
  c.id,
  899,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_lily_bouquet.png'],
  ARRAY['elegant', 'premium', 'lily'],
  ARRAY['anniversary', 'sympathy', 'birthday'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'premium-flowers'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_lily_bouquet.png'];

-- 22. Chocolate Bouquet (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Chocolate Bouquet',
  'chocolate-bouquet',
  'Luxurious bouquet made with Ferrero Rocher and Dairy Milk chocolates, wrapped like a flower arrangement.',
  'Ferrero Rocher & Dairy Milk bouquet',
  c.id,
  999,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_choco_bouquet%20(1).png'],
  ARRAY['chocolate', 'premium', 'unique'],
  ARRAY['valentines', 'birthday', 'anniversary'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'combos'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_choco_bouquet%20(1).png'];

-- 23. Celebration Gift Box (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Celebration Gift Box',
  'celebration-gift-box',
  'Premium celebration gift box containing a cake slice, chocolates, a scented candle, and a greeting card.',
  'Cake + chocolates + candle + card box',
  c.id,
  1299,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_celebration_box.png'],
  ARRAY['premium', 'gift-box'],
  ARRAY['birthday', 'anniversary', 'congratulations'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'combos'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_celebration_box.png'];

-- 24. Teddy & Roses Combo (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Teddy & Roses Combo',
  'teddy-roses-combo',
  'Adorable combo of a cute brown teddy bear, a small bouquet of red roses, and a box of chocolates.',
  'Teddy bear + roses + chocolates',
  c.id,
  1099,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_teddy_combo.png'],
  ARRAY['romantic', 'combo', 'cute'],
  ARRAY['valentines', 'birthday', 'anniversary'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'combos'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_teddy_combo.png'];

-- 25. Lucky Bamboo (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Lucky Bamboo',
  'lucky-bamboo',
  'Two-layer lucky bamboo arrangement in a clear glass vase with white pebbles. Symbol of good fortune.',
  'Two-layer lucky bamboo in glass vase',
  c.id,
  499,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_bamboo.png'],
  ARRAY['lucky', 'indoor', 'zen'],
  ARRAY['housewarming', 'diwali', 'birthday'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'plants'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_bamboo.png'];

-- 26. Personalized Photo Cushion (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Personalized Photo Cushion',
  'personalized-photo-cushion',
  'Soft square cushion with your favorite photo printed in vibrant colors. A cozy and memorable gift.',
  'Custom photo printed cushion',
  c.id,
  449,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_cushion.png'],
  ARRAY['personalized', 'home-decor'],
  ARRAY['birthday', 'anniversary', 'valentines'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'gifts'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_cushion.png'];

-- 27. Mini Perfume Gift Set (new product)
INSERT INTO products (id, name, slug, description, "shortDesc", "categoryId", "basePrice", images, tags, occasion, "isVeg", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Mini Perfume Gift Set',
  'mini-perfume-gift-set',
  'Elegant set of 4 mini perfume bottles in a luxurious gift box. Perfect for fragrance lovers.',
  '4 mini perfume bottles gift set',
  c.id,
  899,
  ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_perfume_set.png'],
  ARRAY['luxury', 'fragrance', 'premium'],
  ARRAY['birthday', 'anniversary', 'valentines'],
  true,
  NOW(),
  NOW()
FROM categories c WHERE c.slug = 'gifts'
ON CONFLICT (slug) DO UPDATE SET images = ARRAY['https://saeditdtacprxcnlgips.supabase.co/storage/v1/object/public/products/prod_perfume_set.png'];
