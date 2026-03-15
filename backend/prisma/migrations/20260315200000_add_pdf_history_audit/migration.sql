-- AlterTable: Add pdfHistory column for PDF upload/replace audit trail
ALTER TABLE "EscrituraQR" ADD COLUMN IF NOT EXISTS "pdfHistory" TEXT;
