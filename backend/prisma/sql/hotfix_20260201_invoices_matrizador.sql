-- Hotfix: asegurar columna matrizador en invoices (nullable)
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "matrizador" TEXT;
