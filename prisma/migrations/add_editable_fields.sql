-- Migración para agregar campos editables al modelo Document
-- Conservador: Solo agregamos campos nuevos, no modificamos existentes

-- Agregar campos para funcionalidad de edición
ALTER TABLE "Document" ADD COLUMN "detalle_documento" TEXT;
ALTER TABLE "Document" ADD COLUMN "comentarios_recepcion" TEXT;

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN "Document"."detalle_documento" IS 'Descripción específica del trámite - editable por matrizador';
COMMENT ON COLUMN "Document"."comentarios_recepcion" IS 'Notas especiales para recepción - editable por varios roles';