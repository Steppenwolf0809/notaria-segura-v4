-- AlterTable
ALTER TABLE "escrituras_qr" 
ADD COLUMN IF NOT EXISTS "extractoTextoCompleto" TEXT,
ADD COLUMN IF NOT EXISTS "origenDatos" TEXT NOT NULL DEFAULT 'PDF';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "escrituras_qr_origenDatos_idx" ON "escrituras_qr"("origenDatos");

