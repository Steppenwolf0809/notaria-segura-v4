-- AlterTable: Add subtotalAmount (Base Imponible sin IVA) to Invoice
-- Used for Participación al Estado calculation (Resolution 005-2023)
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "subtotalAmount" DECIMAL(12, 2);

-- Backfill: Calculate subtotal from totalAmount using IVA 15%
-- subtotal = totalAmount / 1.15
UPDATE "invoices"
SET "subtotalAmount" = ROUND("totalAmount" / 1.15, 2)
WHERE "subtotalAmount" IS NULL AND "totalAmount" > 0;
