-- UAFE Reportes OLA 1: Nuevos campos en ProtocoloUAFE + nuevo modelo ReporteUAFE
-- Safe migration: solo ADD, no DROP/ALTER destructivos
-- Nota: FK a notaries omitida porque staging tiene notaries.id=UUID vs notary_id=INTEGER

-- ============================================
-- 1. Nuevos campos en protocolos_uafe
-- ============================================
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "estado" TEXT NOT NULL DEFAULT 'BORRADOR';
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "minutaUrl" TEXT;
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "minutaParseada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "datosExtraidos" JSONB;
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "documentId" TEXT;
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "reporteUafeId" TEXT;
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "codigoCanton" TEXT NOT NULL DEFAULT '1701';
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "tipoBien" TEXT;
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "descripcionBien" TEXT;

-- ============================================
-- 2. Indices nuevos en protocolos_uafe
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS "protocolos_uafe_documentId_key" ON "protocolos_uafe"("documentId");
CREATE INDEX IF NOT EXISTS "protocolos_uafe_estado_idx" ON "protocolos_uafe"("estado");
CREATE INDEX IF NOT EXISTS "protocolos_uafe_reporteUafeId_idx" ON "protocolos_uafe"("reporteUafeId");

-- ============================================
-- 3. Nueva tabla reportes_uafe
-- ============================================
CREATE TABLE IF NOT EXISTS "reportes_uafe" (
    "id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "totalTransacciones" INTEGER NOT NULL DEFAULT 0,
    "totalIntervinientes" INTEGER NOT NULL DEFAULT 0,
    "archivoTransacciones" TEXT,
    "archivoIntervinientes" TEXT,
    "generadoPor" INTEGER NOT NULL,
    "generadoAt" TIMESTAMP(3),
    "verificadoConCJ" BOOLEAN NOT NULL DEFAULT false,
    "notary_id" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reportes_uafe_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reportes_uafe_notary_id_idx" ON "reportes_uafe"("notary_id");
CREATE UNIQUE INDEX IF NOT EXISTS "reportes_uafe_mes_anio_notary_id_key" ON "reportes_uafe"("mes", "anio", "notary_id");

-- ============================================
-- 4. Foreign keys (solo las seguras)
-- ============================================
-- FK: protocolos_uafe.documentId -> documents.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'protocolos_uafe_documentId_fkey') THEN
    ALTER TABLE "protocolos_uafe"
      ADD CONSTRAINT "protocolos_uafe_documentId_fkey"
      FOREIGN KEY ("documentId") REFERENCES "documents"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- FK: protocolos_uafe.reporteUafeId -> reportes_uafe.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'protocolos_uafe_reporteUafeId_fkey') THEN
    ALTER TABLE "protocolos_uafe"
      ADD CONSTRAINT "protocolos_uafe_reporteUafeId_fkey"
      FOREIGN KEY ("reporteUafeId") REFERENCES "reportes_uafe"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- FK: reportes_uafe.generadoPor -> users.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reportes_uafe_generadoPor_fkey') THEN
    ALTER TABLE "reportes_uafe"
      ADD CONSTRAINT "reportes_uafe_generadoPor_fkey"
      FOREIGN KEY ("generadoPor") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Nota: FK reportes_uafe.notary_id -> notaries.id OMITIDA
-- Staging tiene notaries.id como UUID pero notary_id como INTEGER.
-- Se agregara cuando se unifique el schema de notaries.
