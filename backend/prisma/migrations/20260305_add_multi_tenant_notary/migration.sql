-- CreateTable (if not exists - table was created manually before this migration)
CREATE TABLE IF NOT EXISTS "notaries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Quito',
    "province" TEXT NOT NULL DEFAULT 'Pichincha',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notaries_pkey" PRIMARY KEY ("id")
);

-- AddColumn notary_id to tenant-scoped tables
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "document_events" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "whatsapp_notifications" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;
ALTER TABLE "pending_receivables" ADD COLUMN IF NOT EXISTS "notary_id" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_notary_id_idx" ON "users"("notary_id");
CREATE INDEX IF NOT EXISTS "documents_notary_id_idx" ON "documents"("notary_id");
CREATE INDEX IF NOT EXISTS "document_events_notary_id_idx" ON "document_events"("notary_id");
CREATE INDEX IF NOT EXISTS "invoices_notary_id_idx" ON "invoices"("notary_id");
CREATE INDEX IF NOT EXISTS "whatsapp_notifications_notary_id_idx" ON "whatsapp_notifications"("notary_id");
CREATE INDEX IF NOT EXISTS "pending_receivables_notary_id_idx" ON "pending_receivables"("notary_id");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_notary_id_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_notary_id_fkey') THEN
    ALTER TABLE "documents" ADD CONSTRAINT "documents_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_events_notary_id_fkey') THEN
    ALTER TABLE "document_events" ADD CONSTRAINT "document_events_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_notary_id_fkey') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_notifications_notary_id_fkey') THEN
    ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_receivables_notary_id_fkey') THEN
    ALTER TABLE "pending_receivables" ADD CONSTRAINT "pending_receivables_notary_id_fkey" FOREIGN KEY ("notary_id") REFERENCES "notaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable consultas_lista_control
CREATE TABLE IF NOT EXISTS "consultas_lista_control" (
    "id" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "tipoIdentificacion" TEXT NOT NULL DEFAULT 'CI',
    "nombreCompleto" TEXT,
    "resultadoResumen" JSONB NOT NULL,
    "totalCoincidencias" INTEGER NOT NULL DEFAULT 0,
    "consultadoPorId" INTEGER NOT NULL,
    "pdfGenerado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultas_lista_control_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consultas_lista_control_identificacion_idx" ON "consultas_lista_control"("identificacion");
CREATE INDEX IF NOT EXISTS "consultas_lista_control_consultadoPorId_idx" ON "consultas_lista_control"("consultadoPorId");
CREATE INDEX IF NOT EXISTS "consultas_lista_control_createdAt_idx" ON "consultas_lista_control"("createdAt");
CREATE INDEX IF NOT EXISTS "consultas_lista_control_totalCoincidencias_idx" ON "consultas_lista_control"("totalCoincidencias");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultas_lista_control_consultadoPorId_fkey') THEN
    ALTER TABLE "consultas_lista_control" ADD CONSTRAINT "consultas_lista_control_consultadoPorId_fkey" FOREIGN KEY ("consultadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
