-- OLA B (fase segura): agregar notary_id + FK + indices + backfill.
-- No activa RLS todavia; se hace en una siguiente ola tras endurecer servicios restantes.

-- ============================================================================
-- 1) Columnas notary_id (nullable en esta fase)
-- ============================================================================
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "import_logs" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "pending_receivables" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "escrituras_qr" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "mensajes_internos" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "whatsapp_templates" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "personas_protocolo" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "formulario_uafe_asignaciones" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "formulario_uafe_respuestas" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "sesiones_formulario_uafe" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "auditoria_personas" ADD COLUMN IF NOT EXISTS "notary_id" UUID;

-- ============================================================================
-- 2) Foreign keys a notaries(id) (idempotente)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_notary_id_fkey') THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_notary_id_fkey') THEN
    ALTER TABLE "payments"
      ADD CONSTRAINT "payments_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'import_logs_notary_id_fkey') THEN
    ALTER TABLE "import_logs"
      ADD CONSTRAINT "import_logs_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_receivables_notary_id_fkey') THEN
    ALTER TABLE "pending_receivables"
      ADD CONSTRAINT "pending_receivables_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escrituras_qr_notary_id_fkey') THEN
    ALTER TABLE "escrituras_qr"
      ADD CONSTRAINT "escrituras_qr_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mensajes_internos_notary_id_fkey') THEN
    ALTER TABLE "mensajes_internos"
      ADD CONSTRAINT "mensajes_internos_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_templates_notary_id_fkey') THEN
    ALTER TABLE "whatsapp_templates"
      ADD CONSTRAINT "whatsapp_templates_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'protocolos_uafe_notary_id_fkey') THEN
    ALTER TABLE "protocolos_uafe"
      ADD CONSTRAINT "protocolos_uafe_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personas_protocolo_notary_id_fkey') THEN
    ALTER TABLE "personas_protocolo"
      ADD CONSTRAINT "personas_protocolo_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'formulario_uafe_asignaciones_notary_id_fkey') THEN
    ALTER TABLE "formulario_uafe_asignaciones"
      ADD CONSTRAINT "formulario_uafe_asignaciones_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'formulario_uafe_respuestas_notary_id_fkey') THEN
    ALTER TABLE "formulario_uafe_respuestas"
      ADD CONSTRAINT "formulario_uafe_respuestas_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sesiones_formulario_uafe_notary_id_fkey') THEN
    ALTER TABLE "sesiones_formulario_uafe"
      ADD CONSTRAINT "sesiones_formulario_uafe_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auditoria_personas_notary_id_fkey') THEN
    ALTER TABLE "auditoria_personas"
      ADD CONSTRAINT "auditoria_personas_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 3) Backfill notary_id (deterministico)
-- ============================================================================
DO $$
DECLARE
  fallback_notary_id UUID;
  active_notaries_count INTEGER;
BEGIN
  -- Preferir N18 para datos legacy.
  SELECT "id"
  INTO fallback_notary_id
  FROM "notaries"
  WHERE "code" = 'N18'
    AND "is_active" = true
    AND "deleted_at" IS NULL
  ORDER BY "created_at" ASC
  LIMIT 1;

  -- Si N18 no existe, solo permitir fallback automatico cuando hay 1 unico tenant activo.
  IF fallback_notary_id IS NULL THEN
    SELECT COUNT(*), MIN("id")
    INTO active_notaries_count, fallback_notary_id
    FROM "notaries"
    WHERE "is_active" = true
      AND "deleted_at" IS NULL;

    IF active_notaries_count <> 1 THEN
      RAISE EXCEPTION 'No existe fallback notary deterministico (N18 ausente y tenants activos=%). Backfill manual requerido.', active_notaries_count;
    END IF;
  END IF;

  -- invoices: document -> assigned user -> import log user -> fallback
  UPDATE "invoices" i
  SET "notary_id" = d."notary_id"
  FROM "documents" d
  WHERE i."notary_id" IS NULL
    AND i."documentId" = d."id"
    AND d."notary_id" IS NOT NULL;

  UPDATE "invoices" i
  SET "notary_id" = u."notary_id"
  FROM "users" u
  WHERE i."notary_id" IS NULL
    AND i."assignedToId" = u."id"
    AND u."notary_id" IS NOT NULL;

  UPDATE "invoices" i
  SET "notary_id" = u."notary_id"
  FROM "import_logs" l
  JOIN "users" u ON u."id" = l."executedBy"
  WHERE i."notary_id" IS NULL
    AND i."sourceFile" IS NOT NULL
    AND l."fileName" = i."sourceFile"
    AND u."notary_id" IS NOT NULL;

  UPDATE "invoices"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- payments: invoice -> fallback
  UPDATE "payments" p
  SET "notary_id" = i."notary_id"
  FROM "invoices" i
  WHERE p."notary_id" IS NULL
    AND p."invoiceId" = i."id"
    AND i."notary_id" IS NOT NULL;

  UPDATE "payments"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- import_logs: executedBy user -> fallback
  UPDATE "import_logs" l
  SET "notary_id" = u."notary_id"
  FROM "users" u
  WHERE l."notary_id" IS NULL
    AND l."executedBy" = u."id"
    AND u."notary_id" IS NOT NULL;

  UPDATE "import_logs"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- pending_receivables: invoice raw/normalized -> fallback
  UPDATE "pending_receivables" pr
  SET "notary_id" = i."notary_id"
  FROM "invoices" i
  WHERE pr."notary_id" IS NULL
    AND pr."invoiceNumberRaw" = i."invoiceNumberRaw"
    AND i."notary_id" IS NOT NULL;

  UPDATE "pending_receivables" pr
  SET "notary_id" = i."notary_id"
  FROM "invoices" i
  WHERE pr."notary_id" IS NULL
    AND pr."invoiceNumber" IS NOT NULL
    AND i."invoiceNumber" = pr."invoiceNumber"
    AND i."notary_id" IS NOT NULL;

  UPDATE "pending_receivables"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- escrituras_qr: createdBy -> fallback
  UPDATE "escrituras_qr" e
  SET "notary_id" = u."notary_id"
  FROM "users" u
  WHERE e."notary_id" IS NULL
    AND e."createdBy" = u."id"
    AND u."notary_id" IS NOT NULL;

  UPDATE "escrituras_qr"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- mensajes_internos: documento -> remitente -> destinatario -> fallback
  UPDATE "mensajes_internos" m
  SET "notary_id" = d."notary_id"
  FROM "documents" d
  WHERE m."notary_id" IS NULL
    AND m."documentoId" = d."id"
    AND d."notary_id" IS NOT NULL;

  UPDATE "mensajes_internos" m
  SET "notary_id" = u."notary_id"
  FROM "users" u
  WHERE m."notary_id" IS NULL
    AND m."remitenteId" = u."id"
    AND u."notary_id" IS NOT NULL;

  UPDATE "mensajes_internos" m
  SET "notary_id" = u."notary_id"
  FROM "users" u
  WHERE m."notary_id" IS NULL
    AND m."destinatarioId" = u."id"
    AND u."notary_id" IS NOT NULL;

  UPDATE "mensajes_internos"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- whatsapp_templates: fallback (legacy single-tenant templates)
  UPDATE "whatsapp_templates"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- protocolos_uafe: createdBy -> fallback
  UPDATE "protocolos_uafe" p
  SET "notary_id" = u."notary_id"
  FROM "users" u
  WHERE p."notary_id" IS NULL
    AND p."createdBy" = u."id"
    AND u."notary_id" IS NOT NULL;

  UPDATE "protocolos_uafe"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- personas_protocolo: protocolo -> fallback
  UPDATE "personas_protocolo" pp
  SET "notary_id" = p."notary_id"
  FROM "protocolos_uafe" p
  WHERE pp."notary_id" IS NULL
    AND pp."protocoloId" = p."id"
    AND p."notary_id" IS NOT NULL;

  UPDATE "personas_protocolo"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- formulario_uafe_asignaciones: matrizador -> numeroMatriz/protocolo -> fallback
  UPDATE "formulario_uafe_asignaciones" a
  SET "notary_id" = u."notary_id"
  FROM "users" u
  WHERE a."notary_id" IS NULL
    AND a."matrizadorId" = u."id"
    AND u."notary_id" IS NOT NULL;

  UPDATE "formulario_uafe_asignaciones" a
  SET "notary_id" = p."notary_id"
  FROM "protocolos_uafe" p
  WHERE a."notary_id" IS NULL
    AND a."numeroMatriz" IS NOT NULL
    AND p."numeroProtocolo" = a."numeroMatriz"
    AND p."notary_id" IS NOT NULL;

  UPDATE "formulario_uafe_asignaciones"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- formulario_uafe_respuestas: asignacion -> fallback
  UPDATE "formulario_uafe_respuestas" r
  SET "notary_id" = a."notary_id"
  FROM "formulario_uafe_asignaciones" a
  WHERE r."notary_id" IS NULL
    AND r."asignacionId" = a."id"
    AND a."notary_id" IS NOT NULL;

  UPDATE "formulario_uafe_respuestas"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- sesiones_formulario_uafe: persona_protocolo -> fallback
  UPDATE "sesiones_formulario_uafe" s
  SET "notary_id" = pp."notary_id"
  FROM "personas_protocolo" pp
  WHERE s."notary_id" IS NULL
    AND s."personaProtocoloId" = pp."id"
    AND pp."notary_id" IS NOT NULL;

  UPDATE "sesiones_formulario_uafe"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;

  -- auditoria_personas: matrizador -> fallback
  UPDATE "auditoria_personas" a
  SET "notary_id" = u."notary_id"
  FROM "users" u
  WHERE a."notary_id" IS NULL
    AND a."matrizadorId" = u."id"
    AND u."notary_id" IS NOT NULL;

  UPDATE "auditoria_personas"
  SET "notary_id" = fallback_notary_id
  WHERE "notary_id" IS NULL;
END $$;

-- ============================================================================
-- 4) Indices tenant-scoped
-- ============================================================================
CREATE INDEX IF NOT EXISTS "invoices_notary_id_idx" ON "invoices"("notary_id");
CREATE INDEX IF NOT EXISTS "payments_notary_id_idx" ON "payments"("notary_id");
CREATE INDEX IF NOT EXISTS "import_logs_notary_id_idx" ON "import_logs"("notary_id");
CREATE INDEX IF NOT EXISTS "pending_receivables_notary_id_idx" ON "pending_receivables"("notary_id");
CREATE INDEX IF NOT EXISTS "escrituras_qr_notary_id_idx" ON "escrituras_qr"("notary_id");
CREATE INDEX IF NOT EXISTS "mensajes_internos_notary_id_idx" ON "mensajes_internos"("notary_id");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_notary_id_idx" ON "whatsapp_templates"("notary_id");
CREATE INDEX IF NOT EXISTS "protocolos_uafe_notary_id_idx" ON "protocolos_uafe"("notary_id");
CREATE INDEX IF NOT EXISTS "personas_protocolo_notary_id_idx" ON "personas_protocolo"("notary_id");
CREATE INDEX IF NOT EXISTS "formulario_uafe_asignaciones_notary_id_idx" ON "formulario_uafe_asignaciones"("notary_id");
CREATE INDEX IF NOT EXISTS "formulario_uafe_respuestas_notary_id_idx" ON "formulario_uafe_respuestas"("notary_id");
CREATE INDEX IF NOT EXISTS "sesiones_formulario_uafe_notary_id_idx" ON "sesiones_formulario_uafe"("notary_id");
CREATE INDEX IF NOT EXISTS "auditoria_personas_notary_id_idx" ON "auditoria_personas"("notary_id");
