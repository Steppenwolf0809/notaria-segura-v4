-- Fase 2: activar RLS fail-closed en tablas core de documentos.
-- Requiere app.current_notary_uuid() (creada en migracion 20260219133000).

CREATE SCHEMA IF NOT EXISTS app;

-- Rol runtime sin BYPASSRLS para ejecutar queries de app con aislamiento real.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'app_runtime_rls'
  ) THEN
    CREATE ROLE app_runtime_rls
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  ELSE
    ALTER ROLE app_runtime_rls
      WITH NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user) THEN
    EXECUTE format('GRANT app_runtime_rls TO %I', current_user);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT app_runtime_rls TO postgres;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_runtime_rls;
GRANT USAGE ON SCHEMA app TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime_rls;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime_rls;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_runtime_rls;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_runtime_rls;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO app_runtime_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT EXECUTE ON FUNCTIONS TO app_runtime_rls;

-- Para piloto single-tenant, completar nulls solo si hay una unica notaria activa.
DO $$
DECLARE
  active_notaries_count integer;
  active_notary_id uuid;
BEGIN
  SELECT COUNT(*)
  INTO active_notaries_count
  FROM "notaries"
  WHERE "is_active" = true
    AND "deleted_at" IS NULL;

  IF active_notaries_count = 1 THEN
    SELECT "id"
    INTO active_notary_id
    FROM "notaries"
    WHERE "is_active" = true
      AND "deleted_at" IS NULL
    LIMIT 1;

    UPDATE "documents"
    SET "notary_id" = active_notary_id
    WHERE "notary_id" IS NULL;

    UPDATE "document_events"
    SET "notary_id" = active_notary_id
    WHERE "notary_id" IS NULL;

    UPDATE "whatsapp_notifications"
    SET "notary_id" = active_notary_id
    WHERE "notary_id" IS NULL;
  END IF;
END $$;

-- ======================================
-- documents
-- ======================================
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_tenant_policy" ON "documents";
CREATE POLICY "documents_tenant_policy"
ON "documents"
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

-- ======================================
-- document_events
-- ======================================
ALTER TABLE "document_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_events" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_events_tenant_policy" ON "document_events";
CREATE POLICY "document_events_tenant_policy"
ON "document_events"
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

-- ======================================
-- whatsapp_notifications
-- ======================================
ALTER TABLE "whatsapp_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_notifications" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_notifications_tenant_policy" ON "whatsapp_notifications";
CREATE POLICY "whatsapp_notifications_tenant_policy"
ON "whatsapp_notifications"
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
