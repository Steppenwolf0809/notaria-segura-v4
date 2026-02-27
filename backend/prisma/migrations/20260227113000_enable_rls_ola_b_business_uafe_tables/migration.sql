-- OLA B (fase RLS): NOT NULL + triggers tenant + RLS fail-closed en tablas business/UAFE.

CREATE SCHEMA IF NOT EXISTS app;

-- ============================================================================
-- 1) Guardrail: bloquear migracion si existe algun notary_id nulo
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "invoices" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'invoices.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "payments" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'payments.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "import_logs" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'import_logs.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "pending_receivables" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'pending_receivables.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "escrituras_qr" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'escrituras_qr.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "mensajes_internos" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'mensajes_internos.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "whatsapp_templates" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'whatsapp_templates.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "protocolos_uafe" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'protocolos_uafe.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "personas_protocolo" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'personas_protocolo.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "formulario_uafe_asignaciones" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'formulario_uafe_asignaciones.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "formulario_uafe_respuestas" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'formulario_uafe_respuestas.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "sesiones_formulario_uafe" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'sesiones_formulario_uafe.notary_id contiene NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM "auditoria_personas" WHERE "notary_id" IS NULL) THEN
    RAISE EXCEPTION 'auditoria_personas.notary_id contiene NULL';
  END IF;
END $$;

-- ============================================================================
-- 2) Enforzar NOT NULL
-- ============================================================================
ALTER TABLE "invoices" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "import_logs" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "pending_receivables" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "escrituras_qr" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "mensajes_internos" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "whatsapp_templates" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "protocolos_uafe" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "personas_protocolo" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "formulario_uafe_asignaciones" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "formulario_uafe_respuestas" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "sesiones_formulario_uafe" ALTER COLUMN "notary_id" SET NOT NULL;
ALTER TABLE "auditoria_personas" ALTER COLUMN "notary_id" SET NOT NULL;

-- ============================================================================
-- 3) Trigger generico para completar tenant desde contexto de sesion
-- ============================================================================
CREATE OR REPLACE FUNCTION app.assign_notary_id_from_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."notary_id" IS NULL THEN
    NEW."notary_id" := app.current_notary_uuid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "invoices_assign_notary_id_trigger" ON "invoices";
CREATE TRIGGER "invoices_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "invoices"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "payments_assign_notary_id_trigger" ON "payments";
CREATE TRIGGER "payments_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "payments"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "import_logs_assign_notary_id_trigger" ON "import_logs";
CREATE TRIGGER "import_logs_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "import_logs"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "pending_receivables_assign_notary_id_trigger" ON "pending_receivables";
CREATE TRIGGER "pending_receivables_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "pending_receivables"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "escrituras_qr_assign_notary_id_trigger" ON "escrituras_qr";
CREATE TRIGGER "escrituras_qr_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "escrituras_qr"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "mensajes_internos_assign_notary_id_trigger" ON "mensajes_internos";
CREATE TRIGGER "mensajes_internos_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "mensajes_internos"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "whatsapp_templates_assign_notary_id_trigger" ON "whatsapp_templates";
CREATE TRIGGER "whatsapp_templates_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "whatsapp_templates"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "protocolos_uafe_assign_notary_id_trigger" ON "protocolos_uafe";
CREATE TRIGGER "protocolos_uafe_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "protocolos_uafe"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "personas_protocolo_assign_notary_id_trigger" ON "personas_protocolo";
CREATE TRIGGER "personas_protocolo_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "personas_protocolo"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "form_uafe_asig_assign_notary_id_trigger" ON "formulario_uafe_asignaciones";
CREATE TRIGGER "form_uafe_asig_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "formulario_uafe_asignaciones"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "form_uafe_resp_assign_notary_id_trigger" ON "formulario_uafe_respuestas";
CREATE TRIGGER "form_uafe_resp_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "formulario_uafe_respuestas"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "ses_form_uafe_assign_notary_id_trigger" ON "sesiones_formulario_uafe";
CREATE TRIGGER "ses_form_uafe_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "sesiones_formulario_uafe"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "auditoria_personas_assign_notary_id_trigger" ON "auditoria_personas";
CREATE TRIGGER "auditoria_personas_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "auditoria_personas"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

-- ============================================================================
-- 4) Grants runtime role (idempotente)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO app_runtime_rls;
GRANT USAGE ON SCHEMA app TO app_runtime_rls;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "invoices" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "payments" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "import_logs" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "pending_receivables" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "escrituras_qr" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "mensajes_internos" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "whatsapp_templates" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "protocolos_uafe" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "personas_protocolo" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "formulario_uafe_asignaciones" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "formulario_uafe_respuestas" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "sesiones_formulario_uafe" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "auditoria_personas" TO app_runtime_rls;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime_rls;
GRANT EXECUTE ON FUNCTION app.assign_notary_id_from_context() TO app_runtime_rls;

-- ============================================================================
-- 5) Activar RLS + politicas fail-closed por tabla
-- ============================================================================
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_tenant_policy" ON "invoices";
CREATE POLICY "invoices_tenant_policy" ON "invoices"
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

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_tenant_policy" ON "payments";
CREATE POLICY "payments_tenant_policy" ON "payments"
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

ALTER TABLE "import_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "import_logs_tenant_policy" ON "import_logs";
CREATE POLICY "import_logs_tenant_policy" ON "import_logs"
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

ALTER TABLE "pending_receivables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pending_receivables" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pending_receivables_tenant_policy" ON "pending_receivables";
CREATE POLICY "pending_receivables_tenant_policy" ON "pending_receivables"
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

ALTER TABLE "escrituras_qr" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "escrituras_qr" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "escrituras_qr_tenant_policy" ON "escrituras_qr";
CREATE POLICY "escrituras_qr_tenant_policy" ON "escrituras_qr"
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

ALTER TABLE "mensajes_internos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mensajes_internos" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mensajes_internos_tenant_policy" ON "mensajes_internos";
CREATE POLICY "mensajes_internos_tenant_policy" ON "mensajes_internos"
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

ALTER TABLE "whatsapp_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_templates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_templates_tenant_policy" ON "whatsapp_templates";
CREATE POLICY "whatsapp_templates_tenant_policy" ON "whatsapp_templates"
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

ALTER TABLE "protocolos_uafe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "protocolos_uafe" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "protocolos_uafe_tenant_policy" ON "protocolos_uafe";
CREATE POLICY "protocolos_uafe_tenant_policy" ON "protocolos_uafe"
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

ALTER TABLE "personas_protocolo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "personas_protocolo" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personas_protocolo_tenant_policy" ON "personas_protocolo";
CREATE POLICY "personas_protocolo_tenant_policy" ON "personas_protocolo"
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

ALTER TABLE "formulario_uafe_asignaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "formulario_uafe_asignaciones" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "formulario_uafe_asignaciones_tenant_policy" ON "formulario_uafe_asignaciones";
CREATE POLICY "formulario_uafe_asignaciones_tenant_policy" ON "formulario_uafe_asignaciones"
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

ALTER TABLE "formulario_uafe_respuestas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "formulario_uafe_respuestas" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "formulario_uafe_respuestas_tenant_policy" ON "formulario_uafe_respuestas";
CREATE POLICY "formulario_uafe_respuestas_tenant_policy" ON "formulario_uafe_respuestas"
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

ALTER TABLE "sesiones_formulario_uafe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sesiones_formulario_uafe" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sesiones_formulario_uafe_tenant_policy" ON "sesiones_formulario_uafe";
CREATE POLICY "sesiones_formulario_uafe_tenant_policy" ON "sesiones_formulario_uafe"
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

ALTER TABLE "auditoria_personas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auditoria_personas" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_personas_tenant_policy" ON "auditoria_personas";
CREATE POLICY "auditoria_personas_tenant_policy" ON "auditoria_personas"
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
