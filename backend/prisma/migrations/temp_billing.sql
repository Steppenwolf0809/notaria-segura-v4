-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_createdById_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_usuarioEntregaId_fkey";

-- DropForeignKey
ALTER TABLE "document_events" DROP CONSTRAINT "document_events_documentId_fkey";

-- DropForeignKey
ALTER TABLE "document_events" DROP CONSTRAINT "document_events_userId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_notifications" DROP CONSTRAINT "whatsapp_notifications_documentId_fkey";

-- DropForeignKey
ALTER TABLE "escrituras_qr" DROP CONSTRAINT "escrituras_qr_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "sesiones_personales" DROP CONSTRAINT "sesiones_personales_personaId_fkey";

-- DropForeignKey
ALTER TABLE "auditoria_personas" DROP CONSTRAINT "auditoria_personas_matrizadorId_fkey";

-- DropForeignKey
ALTER TABLE "auditoria_personas" DROP CONSTRAINT "auditoria_personas_personaId_fkey";

-- DropForeignKey
ALTER TABLE "formulario_uafe_asignaciones" DROP CONSTRAINT "formulario_uafe_asignaciones_matrizadorId_fkey";

-- DropForeignKey
ALTER TABLE "formulario_uafe_asignaciones" DROP CONSTRAINT "formulario_uafe_asignaciones_personaId_fkey";

-- DropForeignKey
ALTER TABLE "formulario_uafe_asignaciones" DROP CONSTRAINT "formulario_uafe_asignaciones_respuestaId_fkey";

-- DropForeignKey
ALTER TABLE "formulario_uafe_respuestas" DROP CONSTRAINT "formulario_uafe_respuestas_personaId_fkey";

-- DropForeignKey
ALTER TABLE "protocolos_uafe" DROP CONSTRAINT "protocolos_uafe_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "personas_protocolo" DROP CONSTRAINT "personas_protocolo_personaCedula_fkey";

-- DropForeignKey
ALTER TABLE "personas_protocolo" DROP CONSTRAINT "personas_protocolo_protocoloId_fkey";

-- DropForeignKey
ALTER TABLE "personas_protocolo" DROP CONSTRAINT "personas_protocolo_representadoId_fkey";

-- DropForeignKey
ALTER TABLE "sesiones_formulario_uafe" DROP CONSTRAINT "sesiones_formulario_uafe_personaProtocoloId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_documentId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "import_logs" DROP CONSTRAINT "import_logs_executedBy_fkey";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "documents";

-- DropTable
DROP TABLE "document_events";

-- DropTable
DROP TABLE "whatsapp_notifications";

-- DropTable
DROP TABLE "whatsapp_templates";

-- DropTable
DROP TABLE "test_connection";

-- DropTable
DROP TABLE "system_settings";

-- DropTable
DROP TABLE "escrituras_qr";

-- DropTable
DROP TABLE "personas_registradas";

-- DropTable
DROP TABLE "sesiones_personales";

-- DropTable
DROP TABLE "auditoria_personas";

-- DropTable
DROP TABLE "formulario_uafe_asignaciones";

-- DropTable
DROP TABLE "formulario_uafe_respuestas";

-- DropTable
DROP TABLE "protocolos_uafe";

-- DropTable
DROP TABLE "personas_protocolo";

-- DropTable
DROP TABLE "sesiones_formulario_uafe";

-- DropTable
DROP TABLE "encuestas_satisfaccion";

-- DropTable
DROP TABLE "invoices";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "import_logs";

-- DropEnum
DROP TYPE "UserRole";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "PaymentType";

-- DropEnum
DROP TYPE "ImportStatus";

