-- Hotfix idempotente para producción
-- Alinea la DB con la migración 20260106000000_add_pdf_fields_to_escrituras
-- y corrige el constraint único de payments.receiptNumber

-- 1) Asegurar columnas PDF en escrituras_qr
ALTER TABLE "escrituras_qr" ADD COLUMN IF NOT EXISTS "pdfFileName" TEXT;
ALTER TABLE "escrituras_qr" ADD COLUMN IF NOT EXISTS "pdfUploadedAt" TIMESTAMP(3);
ALTER TABLE "escrituras_qr" ADD COLUMN IF NOT EXISTS "pdfUploadedBy" INTEGER;
ALTER TABLE "escrituras_qr" ADD COLUMN IF NOT EXISTS "pdfFileSize" INTEGER;
ALTER TABLE "escrituras_qr" ADD COLUMN IF NOT EXISTS "pdfViewCount" INTEGER DEFAULT 0;

-- 2) Quitar unicidad de receiptNumber en payments y crear índice normal
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_receiptNumber_key";
CREATE INDEX IF NOT EXISTS "payments_receiptNumber_idx" ON "payments"("receiptNumber");

-- Nota: Este script es seguro de ejecutar múltiples veces.
