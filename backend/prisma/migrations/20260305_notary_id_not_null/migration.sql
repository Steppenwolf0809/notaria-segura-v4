-- OLA B Phase 4: Make notary_id NOT NULL with DEFAULT 1
-- Already applied manually to production DB

-- Make notary_id NOT NULL on all tenant-scoped tables
ALTER TABLE "users" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "documents" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "document_events" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "invoices" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "whatsapp_notifications" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "pending_receivables" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "whatsapp_templates" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "escrituras_qr" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "protocolos_uafe" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "formulario_uafe_asignaciones" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "import_logs" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "mensajes_internos" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "encuestas_satisfaccion" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
ALTER TABLE "consultas_lista_control" ALTER COLUMN "notary_id" SET NOT NULL, ALTER COLUMN "notary_id" SET DEFAULT 1;
