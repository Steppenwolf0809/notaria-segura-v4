-- OLA C: Entitlements por notaria (modulos + planes), sin cobro in-app.

-- ============================================================================
-- 1) Tablas base de entitlements
-- ============================================================================
CREATE TABLE IF NOT EXISTS "plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "modules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plan_modules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "module_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_modules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_modules_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "plan_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "notary_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "notary_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notary_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notary_subscriptions_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "notary_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "notary_module_overrides" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "notary_id" UUID NOT NULL,
  "module_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notary_module_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notary_module_overrides_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "notary_module_overrides_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================================
-- 2) Indices y constraints
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "plans_name_key" ON "plans"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "modules_code_key" ON "modules"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "plan_modules_plan_id_module_id_key" ON "plan_modules"("plan_id", "module_id");
CREATE UNIQUE INDEX IF NOT EXISTS "notary_module_overrides_notary_id_module_id_key" ON "notary_module_overrides"("notary_id", "module_id");

CREATE INDEX IF NOT EXISTS "plans_is_active_idx" ON "plans"("is_active");
CREATE INDEX IF NOT EXISTS "modules_is_active_idx" ON "modules"("is_active");
CREATE INDEX IF NOT EXISTS "plan_modules_plan_id_idx" ON "plan_modules"("plan_id");
CREATE INDEX IF NOT EXISTS "plan_modules_module_id_idx" ON "plan_modules"("module_id");
CREATE INDEX IF NOT EXISTS "notary_subscriptions_notary_id_is_active_idx" ON "notary_subscriptions"("notary_id", "is_active");
CREATE INDEX IF NOT EXISTS "notary_subscriptions_plan_id_idx" ON "notary_subscriptions"("plan_id");
CREATE INDEX IF NOT EXISTS "notary_subscriptions_expires_at_idx" ON "notary_subscriptions"("expires_at");
CREATE INDEX IF NOT EXISTS "notary_module_overrides_module_id_idx" ON "notary_module_overrides"("module_id");

-- Una sola suscripcion activa por notaria.
CREATE UNIQUE INDEX IF NOT EXISTS "notary_subscriptions_one_active_per_notary_idx"
  ON "notary_subscriptions"("notary_id")
  WHERE "is_active" = true;

-- ============================================================================
-- 3) Seed inicial idempotente
-- ============================================================================
INSERT INTO "modules" ("code", "name", "description", "is_active")
VALUES
  ('DOCUMENTOS', 'Documentos', 'Gestion documental notarial', true),
  ('FACTURACION', 'Facturacion', 'Facturacion y cartera por cobrar', true),
  ('UAFE', 'UAFE', 'Modulo de cumplimiento UAFE', true),
  ('WHATSAPP', 'WhatsApp', 'Notificaciones y mensajes por WhatsApp', true),
  ('ESCRITURAS_QR', 'Escrituras QR', 'Gestion y verificacion de escrituras QR', true),
  ('MENSAJES_INTERNOS', 'Mensajes internos', 'Comunicacion interna entre roles', true)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "plans" ("name", "description", "is_active")
VALUES (
  'PLAN_BASE_PILOTO',
  'Plan base para piloto y transicion multi-tenant (habilita modulos iniciales).',
  true
)
ON CONFLICT ("name") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT "id"
  INTO v_plan_id
  FROM "plans"
  WHERE "name" = 'PLAN_BASE_PILOTO'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo resolver PLAN_BASE_PILOTO para seed de entitlements';
  END IF;

  INSERT INTO "plan_modules" ("plan_id", "module_id")
  SELECT v_plan_id, m."id"
  FROM "modules" m
  WHERE m."code" IN ('DOCUMENTOS', 'FACTURACION', 'UAFE', 'WHATSAPP', 'ESCRITURAS_QR', 'MENSAJES_INTERNOS')
  ON CONFLICT ("plan_id", "module_id") DO NOTHING;

  -- Asignar suscripcion activa por defecto a notarías activas sin suscripcion vigente.
  INSERT INTO "notary_subscriptions" ("notary_id", "plan_id", "started_at", "is_active")
  SELECT n."id", v_plan_id, CURRENT_TIMESTAMP, true
  FROM "notaries" n
  WHERE n."is_active" = true
    AND n."deleted_at" IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "notary_subscriptions" ns
      WHERE ns."notary_id" = n."id"
        AND ns."is_active" = true
        AND (ns."expires_at" IS NULL OR ns."expires_at" >= CURRENT_TIMESTAMP)
    );
END $$;

-- ============================================================================
-- 4) Trigger tenant auto-assign + grants runtime
-- ============================================================================
DROP TRIGGER IF EXISTS "notary_subscriptions_assign_notary_id_trigger" ON "notary_subscriptions";
CREATE TRIGGER "notary_subscriptions_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "notary_subscriptions"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

DROP TRIGGER IF EXISTS "notary_module_overrides_assign_notary_id_trigger" ON "notary_module_overrides";
CREATE TRIGGER "notary_module_overrides_assign_notary_id_trigger"
BEFORE INSERT OR UPDATE OF "notary_id" ON "notary_module_overrides"
FOR EACH ROW
EXECUTE FUNCTION app.assign_notary_id_from_context();

GRANT USAGE ON SCHEMA public TO app_runtime_rls;
GRANT USAGE ON SCHEMA app TO app_runtime_rls;

GRANT SELECT ON TABLE "plans" TO app_runtime_rls;
GRANT SELECT ON TABLE "modules" TO app_runtime_rls;
GRANT SELECT ON TABLE "plan_modules" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notary_subscriptions" TO app_runtime_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notary_module_overrides" TO app_runtime_rls;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime_rls;
GRANT EXECUTE ON FUNCTION app.assign_notary_id_from_context() TO app_runtime_rls;

-- ============================================================================
-- 5) RLS fail-closed en tablas tenant de entitlements
-- ============================================================================
ALTER TABLE "notary_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notary_subscriptions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notary_subscriptions_tenant_policy" ON "notary_subscriptions";
CREATE POLICY "notary_subscriptions_tenant_policy" ON "notary_subscriptions"
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

ALTER TABLE "notary_module_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notary_module_overrides" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notary_module_overrides_tenant_policy" ON "notary_module_overrides";
CREATE POLICY "notary_module_overrides_tenant_policy" ON "notary_module_overrides"
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
