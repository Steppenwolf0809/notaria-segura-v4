-- AlterTable
-- Hacer documentId opcional en document_events para permitir eventos de auditoría globales del sistema

-- Paso 1: Eliminar el constraint NOT NULL de documentId
ALTER TABLE "document_events" ALTER COLUMN "documentId" DROP NOT NULL;
