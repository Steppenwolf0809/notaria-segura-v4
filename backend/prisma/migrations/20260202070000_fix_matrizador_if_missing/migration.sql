-- Ensure invoices.matrizador column exists (idempotent)
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "matrizador" TEXT;

