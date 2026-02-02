/*
  Warnings:

  - You are about to drop the column `groupId` on the `whatsapp_notifications` table. All the data in the column will be lost.
  - You are about to drop the `DocumentGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `concuerdo_audit_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
-- ALTER TABLE "concuerdo_audit_logs" DROP CONSTRAINT "concuerdo_audit_logs_createdBy_fkey";

-- DropForeignKey
-- ALTER TABLE "concuerdo_audit_logs" DROP CONSTRAINT "concuerdo_audit_logs_docId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_notifications" DROP CONSTRAINT IF EXISTS "whatsapp_notifications_groupId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "documents_assignedToId_idx";

-- DropIndex
DROP INDEX IF EXISTS "invoices_assignedToId_idx";

-- DropIndex
DROP INDEX IF EXISTS "whatsapp_notifications_groupId_idx";

-- AlterTable
ALTER TABLE "document_events" ALTER COLUMN "eventType" SET DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "numeroFactura" TEXT;

-- AlterTable
ALTER TABLE "escrituras_qr" ADD COLUMN IF NOT EXISTS "fotoURL" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) DEFAULT 0,
ALTER COLUMN "lastSyncAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "protocolos_uafe" ADD COLUMN IF NOT EXISTS "bienInmuebleDescripcion" TEXT,
ADD COLUMN IF NOT EXISTS "bienInmuebleUbicacion" TEXT,
ADD COLUMN IF NOT EXISTS "tipoActoOtro" TEXT,
ADD COLUMN IF NOT EXISTS "vehiculoAnio" TEXT,
ADD COLUMN IF NOT EXISTS "vehiculoMarca" TEXT,
ADD COLUMN IF NOT EXISTS "vehiculoModelo" TEXT,
ADD COLUMN IF NOT EXISTS "vehiculoPlaca" TEXT,
ALTER COLUMN "identificadorTemporal" DROP DEFAULT;

-- AlterTable
ALTER TABLE "whatsapp_notifications" DROP COLUMN IF EXISTS "groupId";

-- DropTable
DROP TABLE IF EXISTS "DocumentGroup";

-- DropTable
DROP TABLE IF EXISTS "concuerdo_audit_logs";

-- CreateTable
CREATE TABLE IF NOT EXISTS "encuestas_satisfaccion" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tramiteId" TEXT,
    "calificacion" INTEGER NOT NULL,
    "infoClara" BOOLEAN NOT NULL,
    "tratoCordial" BOOLEAN NOT NULL,
    "sugerencia" TEXT,

    CONSTRAINT "encuestas_satisfaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mensajes_internos" (
    "id" SERIAL NOT NULL,
    "remitenteId" INTEGER NOT NULL,
    "destinatarioId" INTEGER NOT NULL,
    "documentoId" TEXT,
    "facturaId" INTEGER,
    "tipo" TEXT NOT NULL,
    "urgencia" TEXT NOT NULL DEFAULT 'NORMAL',
    "mensaje" TEXT,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "leidoAt" TIMESTAMP(3),
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "resueltoAt" TIMESTAMP(3),
    "notaResolucion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensajes_internos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pending_receivables" (
    "id" TEXT NOT NULL,
    "clientTaxId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "invoiceNumberRaw" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issueDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "daysOverdue" INTEGER NOT NULL DEFAULT 0,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFile" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_receivables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "encuestas_satisfaccion_createdAt_idx" ON "encuestas_satisfaccion"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "encuestas_satisfaccion_calificacion_idx" ON "encuestas_satisfaccion"("calificacion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mensajes_internos_destinatarioId_leido_idx" ON "mensajes_internos"("destinatarioId", "leido");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mensajes_internos_documentoId_idx" ON "mensajes_internos"("documentoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mensajes_internos_createdAt_idx" ON "mensajes_internos"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_receivables_clientTaxId_idx" ON "pending_receivables"("clientTaxId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_receivables_dueDate_idx" ON "pending_receivables"("dueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_receivables_balance_idx" ON "pending_receivables"("balance");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_receivables_status_idx" ON "pending_receivables"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_receivables_reportDate_idx" ON "pending_receivables"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pending_receivables_invoiceNumberRaw_reportDate_key" ON "pending_receivables"("invoiceNumberRaw", "reportDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_events_eventType_idx" ON "document_events"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_clientPhone_idx" ON "documents"("clientPhone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_clientName_idx" ON "documents"("clientName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_clientId_idx" ON "documents"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "protocolos_uafe_identificadorTemporal_idx" ON "protocolos_uafe"("identificadorTemporal");

-- AddForeignKey
ALTER TABLE "mensajes_internos" ADD CONSTRAINT "mensajes_internos_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_internos" ADD CONSTRAINT "mensajes_internos_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_internos" ADD CONSTRAINT "mensajes_internos_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
