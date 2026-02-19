-- Fase 2 (paso incremental):
-- Preparar tablas core de documentos para aislamiento por tenant.
-- No activa RLS aun; solo agrega notary_id + backfill + autocompletado.

CREATE SCHEMA IF NOT EXISTS app;

-- 1) Columnas tenant en tablas core
ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "notary_id" UUID;

ALTER TABLE "document_events"
  ADD COLUMN IF NOT EXISTS "notary_id" UUID;

ALTER TABLE "whatsapp_notifications"
  ADD COLUMN IF NOT EXISTS "notary_id" UUID;

-- 2) FKs a notaries (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_notary_id_fkey'
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_notary_id_fkey"
      FOREIGN KEY ("notary_id")
      REFERENCES "notaries"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_events_notary_id_fkey'
  ) THEN
    ALTER TABLE "document_events"
      ADD CONSTRAINT "document_events_notary_id_fkey"
      FOREIGN KEY ("notary_id")
      REFERENCES "notaries"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_notifications_notary_id_fkey'
  ) THEN
    ALTER TABLE "whatsapp_notifications"
      ADD CONSTRAINT "whatsapp_notifications_notary_id_fkey"
      FOREIGN KEY ("notary_id")
      REFERENCES "notaries"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Indices por tenant
CREATE INDEX IF NOT EXISTS "documents_notary_id_idx"
  ON "documents"("notary_id");

CREATE INDEX IF NOT EXISTS "documents_notary_id_status_idx"
  ON "documents"("notary_id", "status");

CREATE INDEX IF NOT EXISTS "document_events_notary_id_idx"
  ON "document_events"("notary_id");

CREATE INDEX IF NOT EXISTS "whatsapp_notifications_notary_id_idx"
  ON "whatsapp_notifications"("notary_id");

CREATE INDEX IF NOT EXISTS "whatsapp_notifications_notary_id_status_idx"
  ON "whatsapp_notifications"("notary_id", "status");

-- 4) Sanidad previa: garantizar users.notary_id en entornos legacy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'notaryId'
  ) THEN
    UPDATE "users"
    SET "notary_id" = "notaryId"::uuid
    WHERE "notary_id" IS NULL
      AND "notaryId" IS NOT NULL;
  END IF;
END $$;

-- 5) Backfill inicial
-- 5.1 documents desde createdBy -> users.notary_id
UPDATE "documents" d
SET "notary_id" = u."notary_id"
FROM "users" u
WHERE d."notary_id" IS NULL
  AND d."createdById" = u."id"
  AND u."notary_id" IS NOT NULL;

-- 5.2 document_events desde documents.notary_id
UPDATE "document_events" e
SET "notary_id" = d."notary_id"
FROM "documents" d
WHERE e."notary_id" IS NULL
  AND e."documentId" IS NOT NULL
  AND e."documentId" = d."id"
  AND d."notary_id" IS NOT NULL;

-- 5.3 document_events fallback desde users.notary_id
UPDATE "document_events" e
SET "notary_id" = u."notary_id"
FROM "users" u
WHERE e."notary_id" IS NULL
  AND e."userId" = u."id"
  AND u."notary_id" IS NOT NULL;

-- 5.4 whatsapp_notifications desde documents.notary_id
UPDATE "whatsapp_notifications" w
SET "notary_id" = d."notary_id"
FROM "documents" d
WHERE w."notary_id" IS NULL
  AND w."documentId" IS NOT NULL
  AND w."documentId" = d."id"
  AND d."notary_id" IS NOT NULL;

-- 6) Triggers de autocompletado notary_id para transicion segura
CREATE OR REPLACE FUNCTION app.assign_document_notary_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."notary_id" IS NULL THEN
    NEW."notary_id" := app.current_notary_uuid();
  END IF;

  IF NEW."notary_id" IS NULL AND NEW."createdById" IS NOT NULL THEN
    SELECT u."notary_id"
    INTO NEW."notary_id"
    FROM "users" u
    WHERE u."id" = NEW."createdById";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "documents_assign_notary_id_trigger" ON "documents";
CREATE TRIGGER "documents_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id", "createdById" ON "documents"
FOR EACH ROW
EXECUTE FUNCTION app.assign_document_notary_id();

CREATE OR REPLACE FUNCTION app.assign_document_event_notary_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."notary_id" IS NULL THEN
    NEW."notary_id" := app.current_notary_uuid();
  END IF;

  IF NEW."notary_id" IS NULL AND NEW."documentId" IS NOT NULL THEN
    SELECT d."notary_id"
    INTO NEW."notary_id"
    FROM "documents" d
    WHERE d."id" = NEW."documentId";
  END IF;

  IF NEW."notary_id" IS NULL AND NEW."userId" IS NOT NULL THEN
    SELECT u."notary_id"
    INTO NEW."notary_id"
    FROM "users" u
    WHERE u."id" = NEW."userId";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "document_events_assign_notary_id_trigger" ON "document_events";
CREATE TRIGGER "document_events_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id", "documentId", "userId" ON "document_events"
FOR EACH ROW
EXECUTE FUNCTION app.assign_document_event_notary_id();

CREATE OR REPLACE FUNCTION app.assign_whatsapp_notification_notary_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."notary_id" IS NULL THEN
    NEW."notary_id" := app.current_notary_uuid();
  END IF;

  IF NEW."notary_id" IS NULL AND NEW."documentId" IS NOT NULL THEN
    SELECT d."notary_id"
    INTO NEW."notary_id"
    FROM "documents" d
    WHERE d."id" = NEW."documentId";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "whatsapp_notifications_assign_notary_id_trigger" ON "whatsapp_notifications";
CREATE TRIGGER "whatsapp_notifications_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id", "documentId" ON "whatsapp_notifications"
FOR EACH ROW
EXECUTE FUNCTION app.assign_whatsapp_notification_notary_id();
