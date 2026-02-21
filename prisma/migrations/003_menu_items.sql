-- Migration: Create menu_items table for admin-controlled mega menu
-- Run this in Supabase SQL Editor

CREATE TABLE menu_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  parent_id TEXT REFERENCES menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  slug TEXT,
  href TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  item_type TEXT NOT NULL DEFAULT 'link',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX menu_items_parent_id_idx ON menu_items(parent_id);

-- ==================== SEED DATA ====================

-- Top level items
INSERT INTO menu_items (id, label, slug, sort_order, is_visible, item_type) VALUES
  ('menu_cakes', 'Cakes', 'cakes', 1, true, 'top_level'),
  ('menu_flowers', 'Flowers', 'flowers', 2, true, 'top_level'),
  ('menu_combos', 'Combos & Hampers', 'combos', 3, true, 'top_level'),
  ('menu_plants', 'Plants', 'plants', 4, true, 'top_level'),
  ('menu_gifts', 'Gifts', 'gifts', 5, true, 'top_level'),
  ('menu_occasions', 'Occasions', 'occasions', 6, true, 'top_level'),
  ('menu_sameday', 'Same Day Delivery', 'same-day', 7, true, 'top_level');

-- ==================== CAKES ====================

-- Cakes subgroups
INSERT INTO menu_items (id, parent_id, label, sort_order, is_visible, item_type) VALUES
  ('menu_cakes_flavour', 'menu_cakes', 'By Flavour', 1, true, 'category_group'),
  ('menu_cakes_type', 'menu_cakes', 'By Type', 2, true, 'category_group'),
  ('menu_cakes_occasion', 'menu_cakes', 'By Occasion', 3, true, 'category_group');

-- Cakes > By Flavour links
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_cakes_flavour', 'Chocolate Cakes', '/category/chocolate-cakes', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_flavour', 'Red Velvet Cakes', '/category/red-velvet-cakes', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_flavour', 'Black Forest Cakes', '/category/black-forest-cakes', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_flavour', 'Butterscotch Cakes', '/category/butterscotch-cakes', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_flavour', 'Vanilla Cakes', '/category/vanilla-cakes', 5, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_flavour', 'Pineapple Cakes', '/category/pineapple-cakes', 6, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_flavour', 'Eggless Cakes', '/category/eggless-cakes', 7, true, 'link');

-- Cakes > By Type links
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_cakes_type', 'Photo Cakes', '/category/photo-cakes', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_type', 'Designer Cakes', '/category/designer-cakes', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_type', 'Tier Cakes', '/category/tier-cakes', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_type', 'Jar Cakes', '/category/jar-cakes', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_type', 'Cup Cakes', '/category/cup-cakes', 5, true, 'link');

-- Cakes > By Occasion links
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_cakes_occasion', 'Birthday Cakes', '/category/birthday-cakes', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_occasion', 'Anniversary Cakes', '/category/anniversary-cakes', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_occasion', 'Wedding Cakes', '/category/wedding-cakes', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_occasion', 'Baby Shower Cakes', '/category/baby-shower-cakes', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_occasion', 'Farewell Cakes', '/category/farewell-cakes', 5, true, 'link'),
  (gen_random_uuid()::text, 'menu_cakes_occasion', 'Congratulations Cakes', '/category/congratulations-cakes', 6, true, 'link');

-- ==================== FLOWERS ====================

INSERT INTO menu_items (id, parent_id, label, sort_order, is_visible, item_type) VALUES
  ('menu_flowers_flower', 'menu_flowers', 'By Flower', 1, true, 'category_group'),
  ('menu_flowers_arrangement', 'menu_flowers', 'By Arrangement', 2, true, 'category_group'),
  ('menu_flowers_occasion', 'menu_flowers', 'By Occasion', 3, true, 'category_group');

-- Flowers > By Flower
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_flowers_flower', 'Red Roses', '/category/red-roses', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_flower', 'Mixed Roses', '/category/mixed-roses', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_flower', 'Sunflowers', '/category/sunflowers', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_flower', 'Lilies', '/category/lilies', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_flower', 'Orchids', '/category/orchids', 5, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_flower', 'Carnations', '/category/carnations', 6, true, 'link');

-- Flowers > By Arrangement
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_flowers_arrangement', 'Bouquets', '/category/bouquets', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_arrangement', 'Flower Boxes', '/category/flower-boxes', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_arrangement', 'Vase Arrangements', '/category/vase-arrangements', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_arrangement', 'Hand-Tied Bunches', '/category/hand-tied-bunches', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_arrangement', 'Table Arrangements', '/category/table-arrangements', 5, true, 'link');

-- Flowers > By Occasion
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_flowers_occasion', 'Valentine''s Day Flowers', '/category/valentines-day-flowers', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_occasion', 'Mother''s Day Flowers', '/category/mothers-day-flowers', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_occasion', 'Birthday Flowers', '/category/birthday-flowers', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_occasion', 'Anniversary Flowers', '/category/anniversary-flowers', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_flowers_occasion', 'Sympathy Flowers', '/category/sympathy-flowers', 5, true, 'link');

-- ==================== COMBOS & HAMPERS ====================

INSERT INTO menu_items (id, parent_id, label, sort_order, is_visible, item_type) VALUES
  ('menu_combos_cake', 'menu_combos', 'Cake Combos', 1, true, 'category_group'),
  ('menu_combos_hamper', 'menu_combos', 'Gift Hampers', 2, true, 'category_group'),
  ('menu_combos_bundle', 'menu_combos', 'Occasion Bundles', 3, true, 'category_group');

-- Combos > Cake Combos
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_combos_cake', 'Cake + Flowers', '/category/cake-flowers-combo', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_cake', 'Cake + Chocolate', '/category/cake-chocolate-combo', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_cake', 'Cake + Teddy', '/category/cake-teddy-combo', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_cake', 'Cake + Card', '/category/cake-card-combo', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_cake', 'Cake + Balloon', '/category/cake-balloon-combo', 5, true, 'link');

-- Combos > Gift Hampers
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_combos_hamper', 'Chocolate Hampers', '/category/chocolate-hampers', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_hamper', 'Dry Fruit Hampers', '/category/dry-fruit-hampers', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_hamper', 'Spa Hampers', '/category/spa-hampers', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_hamper', 'Corporate Hampers', '/category/corporate-hampers', 4, true, 'link');

-- Combos > Occasion Bundles
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_combos_bundle', 'Birthday Bundles', '/category/birthday-bundles', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_bundle', 'Anniversary Packages', '/category/anniversary-packages', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_bundle', 'Festival Specials', '/category/festival-specials', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_combos_bundle', 'New Baby Hampers', '/category/new-baby-hampers', 4, true, 'link');

-- ==================== PLANTS ====================

INSERT INTO menu_items (id, parent_id, label, sort_order, is_visible, item_type) VALUES
  ('menu_plants_indoor', 'menu_plants', 'Indoor Plants', 1, true, 'category_group'),
  ('menu_plants_flowering', 'menu_plants', 'Flowering Plants', 2, true, 'category_group');

-- Plants > Indoor Plants
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_plants_indoor', 'Money Plant', '/category/money-plant', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_plants_indoor', 'Peace Lily', '/category/peace-lily', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_plants_indoor', 'Snake Plant', '/category/snake-plant', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_plants_indoor', 'Jade Plant', '/category/jade-plant', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_plants_indoor', 'Bamboo', '/category/bamboo', 5, true, 'link');

-- Plants > Flowering Plants
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_plants_flowering', 'Adenium', '/category/adenium', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_plants_flowering', 'Hibiscus', '/category/hibiscus', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_plants_flowering', 'Bougainvillea', '/category/bougainvillea', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_plants_flowering', 'Rose Plant', '/category/rose-plant', 4, true, 'link');

-- ==================== GIFTS ====================

INSERT INTO menu_items (id, parent_id, label, sort_order, is_visible, item_type) VALUES
  ('menu_gifts_category', 'menu_gifts', 'By Category', 1, true, 'category_group'),
  ('menu_gifts_recipient', 'menu_gifts', 'By Recipient', 2, true, 'category_group'),
  ('menu_gifts_price', 'menu_gifts', 'By Price', 3, true, 'category_group');

-- Gifts > By Category
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_gifts_category', 'Chocolates', '/category/chocolates', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_category', 'Dry Fruits', '/category/dry-fruits', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_category', 'Soft Toys', '/category/soft-toys', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_category', 'Mugs & Cushions', '/category/mugs-cushions', 4, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_category', 'Personalised Gifts', '/category/personalised-gifts', 5, true, 'link');

-- Gifts > By Recipient
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_gifts_recipient', 'Gifts for Him', '/category/gifts-for-him', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_recipient', 'Gifts for Her', '/category/gifts-for-her', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_recipient', 'Gifts for Kids', '/category/gifts-for-kids', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_recipient', 'Gifts for Parents', '/category/gifts-for-parents', 4, true, 'link');

-- Gifts > By Price
INSERT INTO menu_items (id, parent_id, label, href, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_gifts_price', 'Under ₹499', '/category/gifts?maxPrice=499', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_price', '₹500 - ₹999', '/category/gifts?minPrice=500&maxPrice=999', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_price', '₹1000 - ₹1999', '/category/gifts?minPrice=1000&maxPrice=1999', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_gifts_price', 'Above ₹2000', '/category/gifts?minPrice=2000', 4, true, 'link');

-- ==================== OCCASIONS ====================

INSERT INTO menu_items (id, parent_id, label, href, icon, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_occasions', 'Birthday', '/category/gifts?occasion=birthday', '🎂', 1, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Anniversary', '/category/gifts?occasion=anniversary', '💍', 2, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Valentine''s Day', '/category/gifts?occasion=valentines-day', '💝', 3, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Mother''s Day', '/category/gifts?occasion=mothers-day', '👩', 4, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Father''s Day', '/category/gifts?occasion=fathers-day', '👨', 5, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Graduation', '/category/gifts?occasion=graduation', '🎓', 6, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Farewell', '/category/gifts?occasion=farewell', '💐', 7, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Baby Shower', '/category/gifts?occasion=baby-shower', '👶', 8, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Corporate', '/category/gifts?occasion=corporate', '💼', 9, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Diwali', '/category/gifts?occasion=diwali', '🪔', 10, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'Christmas', '/category/gifts?occasion=christmas', '🎄', 11, true, 'occasion'),
  (gen_random_uuid()::text, 'menu_occasions', 'New Year', '/category/gifts?occasion=new-year', '🎊', 12, true, 'occasion');

-- ==================== SAME DAY DELIVERY ====================

INSERT INTO menu_items (id, parent_id, label, href, icon, sort_order, is_visible, item_type) VALUES
  (gen_random_uuid()::text, 'menu_sameday', 'Cakes', '/category/cakes?delivery=same-day', 'cake', 1, true, 'link'),
  (gen_random_uuid()::text, 'menu_sameday', 'Flowers', '/category/flowers?delivery=same-day', 'flower', 2, true, 'link'),
  (gen_random_uuid()::text, 'menu_sameday', 'Plants', '/category/plants?delivery=same-day', 'plant', 3, true, 'link'),
  (gen_random_uuid()::text, 'menu_sameday', 'Combos', '/category/combos?delivery=same-day', 'package', 4, true, 'link');
