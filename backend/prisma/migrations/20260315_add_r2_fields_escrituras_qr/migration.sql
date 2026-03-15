-- Add R2 storage fields to escrituras_qr
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfR2Key" TEXT;
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfR2KeyPublic" TEXT;
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfFileSizeCompressed" INTEGER;
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfOptimized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "escrituras_qr" ADD COLUMN "fotoR2Key" TEXT;
