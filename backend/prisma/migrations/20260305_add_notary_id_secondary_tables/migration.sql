-- AlterTable: Add notary_id to secondary tenant-scoped tables
ALTER TABLE "whatsapp_templates" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "escrituras_qr" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "formulario_uafe_asignaciones" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "import_logs" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "mensajes_internos" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "encuestas_satisfaccion" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "consultas_lista_control" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_templates_notary_id_idx" ON "whatsapp_templates"("notary_id");
CREATE INDEX IF NOT EXISTS "escrituras_qr_notary_id_idx" ON "escrituras_qr"("notary_id");
CREATE INDEX IF NOT EXISTS "protocolos_uafe_notary_id_idx" ON "protocolos_uafe"("notary_id");
CREATE INDEX IF NOT EXISTS "formulario_uafe_asignaciones_notary_id_idx" ON "formulario_uafe_asignaciones"("notary_id");
CREATE INDEX IF NOT EXISTS "import_logs_notary_id_idx" ON "import_logs"("notary_id");
CREATE INDEX IF NOT EXISTS "mensajes_internos_notary_id_idx" ON "mensajes_internos"("notary_id");
CREATE INDEX IF NOT EXISTS "encuestas_satisfaccion_notary_id_idx" ON "encuestas_satisfaccion"("notary_id");
CREATE INDEX IF NOT EXISTS "consultas_lista_control_notary_id_idx" ON "consultas_lista_control"("notary_id");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_templates_notary_id_fkey') THEN
    ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escrituras_qr_notary_id_fkey') THEN
    ALTER TABLE "escrituras_qr" ADD CONSTRAINT "escrituras_qr_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'protocolos_uafe_notary_id_fkey') THEN
    ALTER TABLE "protocolos_uafe" ADD CONSTRAINT "protocolos_uafe_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'formulario_uafe_asignaciones_notary_id_fkey') THEN
    ALTER TABLE "formulario_uafe_asignaciones" ADD CONSTRAINT "formulario_uafe_asignaciones_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'import_logs_notary_id_fkey') THEN
    ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mensajes_internos_notary_id_fkey') THEN
    ALTER TABLE "mensajes_internos" ADD CONSTRAINT "mensajes_internos_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'encuestas_satisfaccion_notary_id_fkey') THEN
    ALTER TABLE "encuestas_satisfaccion" ADD CONSTRAINT "encuestas_satisfaccion_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultas_lista_control_notary_id_fkey') THEN
    ALTER TABLE "consultas_lista_control" ADD CONSTRAINT "consultas_lista_control_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
