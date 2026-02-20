-- ============================================================
-- Migration 002: Sync production DB with Prisma schema
-- Run this in Supabase SQL Editor (https://saeditdtacprxcnlgips.supabase.co)
-- Date: 2026-02-20
-- Purpose: Add missing columns/tables that exist in Prisma schema
--          but were never deployed to production database
-- ============================================================

-- ============================================================
-- 1. order_items: Add variation columns (Phase D)
-- ============================================================
ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "variationId" TEXT,
  ADD COLUMN IF NOT EXISTS "variationLabel" TEXT;

-- ============================================================
-- 2. cart_items: Add variation column (Phase D)
-- ============================================================
ALTER TABLE "cart_items"
  ADD COLUMN IF NOT EXISTS "variationId" TEXT;

-- ============================================================
-- 3. payments: Add multi-gateway columns (Phase 1.5 / Multi-gateway)
-- ============================================================

-- Create PaymentGateway enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentGateway') THEN
    CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'STRIPE', 'PAYPAL', 'COD');
  END IF;
END
$$;

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "gateway" "PaymentGateway" NOT NULL DEFAULT 'RAZORPAY',
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT,
  ADD COLUMN IF NOT EXISTS "method" TEXT;

-- ============================================================
-- 4. currency_configs: Create table (Phase 1.5 / Multi-currency)
-- ============================================================
CREATE TABLE IF NOT EXISTS "currency_configs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "symbolPosition" TEXT NOT NULL DEFAULT 'before',
  "exchangeRate" DECIMAL(12,6) NOT NULL,
  "markup" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "rounding" TEXT NOT NULL DEFAULT 'nearest',
  "roundTo" DECIMAL(10,2) NOT NULL DEFAULT 0.01,
  "locale" TEXT NOT NULL DEFAULT 'en-US',
  "countries" TEXT[] NOT NULL DEFAULT '{}',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "currency_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "currency_configs_code_key" UNIQUE ("code")
);

-- ============================================================
-- 5. Seed default currency (INR) if table is empty
-- ============================================================
INSERT INTO "currency_configs" ("id", "code", "name", "symbol", "symbolPosition", "exchangeRate", "markup", "rounding", "roundTo", "locale", "countries", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT
  'clr_inr_default',
  'INR',
  'Indian Rupee',
  '₹',
  'before',
  1.000000,
  0.00,
  'nearest',
  1.00,
  'en-IN',
  ARRAY['IN'],
  true,
  true,
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM "currency_configs" WHERE "code" = 'INR');

-- ============================================================
-- Verification: Run these queries to confirm migration success
-- ============================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'cart_items' ORDER BY ordinal_position;
-- SELECT count(*) FROM currency_configs;
