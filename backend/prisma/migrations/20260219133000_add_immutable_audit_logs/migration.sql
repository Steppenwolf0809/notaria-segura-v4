-- Seguridad: audit_logs inmutable + helper para contexto tenant por RLS.

CREATE SCHEMA IF NOT EXISTS app;

-- Convierte el setting de sesion app.current_notary_id en UUID seguro.
-- Si no existe o es invalido, retorna NULL (fail-safe para politicas RLS).
CREATE OR REPLACE FUNCTION app.current_notary_uuid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_value text;
BEGIN
  raw_value := current_setting('app.current_notary_id', true);

  IF raw_value IS NULL OR btrim(raw_value) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN raw_value::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

-- Compatibilidad legacy:
-- Si existe audit_logs viejo (camelCase), preservarlo y migrar sus datos.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'notaryId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'notary_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'audit_logs_legacy_20260219'
    ) THEN
      ALTER TABLE "audit_logs" RENAME TO "audit_logs_legacy_20260219";
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" BIGSERIAL PRIMARY KEY,
  "notary_id" UUID,
  "actor_user_id" INTEGER,
  "actor_role" TEXT,
  "action" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs_legacy_20260219'
  ) THEN
    INSERT INTO "audit_logs" (
      "notary_id",
      "actor_user_id",
      "actor_role",
      "action",
      "resource_type",
      "resource_id",
      "metadata",
      "ip_address",
      "user_agent",
      "created_at"
    )
    SELECT
      CASE
        WHEN legacy."notaryId" IS NOT NULL
         AND legacy."notaryId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN legacy."notaryId"::uuid
        ELSE NULL
      END AS "notary_id",
      legacy."userId" AS "actor_user_id",
      NULL AS "actor_role",
      COALESCE(legacy."action", 'LEGACY_ACTION') AS "action",
      COALESCE(NULLIF(legacy."resource", ''), 'legacy_resource') AS "resource_type",
      legacy."resourceId" AS "resource_id",
      (
        jsonb_build_object(
          'legacy', true,
          'legacy_id', legacy."id",
          'legacy_severity', legacy."severity"
        )
        || COALESCE(legacy."details", '{}'::jsonb)
      ) AS "metadata",
      legacy."ipAddress" AS "ip_address",
      legacy."userAgent" AS "user_agent",
      COALESCE(legacy."createdAt"::timestamptz, NOW()) AS "created_at"
    FROM "audit_logs_legacy_20260219" legacy
    WHERE NOT EXISTS (
      SELECT 1
      FROM "audit_logs" current_log
      WHERE current_log."metadata"->>'legacy_id' = legacy."id"
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_notary_id_fkey'
  ) THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_notary_id_fkey"
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
    WHERE conname = 'audit_logs_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
      FOREIGN KEY ("actor_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_notary_id_idx" ON "audit_logs"("notary_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_tenant_policy" ON "audit_logs";
CREATE POLICY "audit_logs_tenant_policy"
ON "audit_logs"
USING (
  current_setting('app.is_super_admin', true) = 'true'
  OR (
    app.current_notary_uuid() IS NOT NULL
    AND "notary_id" = app.current_notary_uuid()
  )
)
WITH CHECK (
  current_setting('app.is_super_admin', true) = 'true'
  OR (
    app.current_notary_uuid() IS NOT NULL
    AND "notary_id" = app.current_notary_uuid()
  )
);

-- Bloquea mutaciones de auditoria: append-only.
CREATE OR REPLACE FUNCTION app.prevent_audit_logs_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs es inmutable (solo INSERT permitido)'
    USING ERRCODE = '42501';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "audit_logs_immutable_row_trigger" ON "audit_logs";
CREATE TRIGGER "audit_logs_immutable_row_trigger"
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION app.prevent_audit_logs_mutation();

DROP TRIGGER IF EXISTS "audit_logs_immutable_truncate_trigger" ON "audit_logs";
CREATE TRIGGER "audit_logs_immutable_truncate_trigger"
BEFORE TRUNCATE ON "audit_logs"
FOR EACH STATEMENT
EXECUTE FUNCTION app.prevent_audit_logs_mutation();
