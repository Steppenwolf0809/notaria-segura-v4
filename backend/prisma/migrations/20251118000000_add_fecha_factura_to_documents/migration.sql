-- AlterTable
-- Agregar campo fechaFactura para almacenar la fecha de emisión de la factura extraída del XML
-- Este campo es opcional (puede ser NULL) ya que no todos los documentos tienen esta información

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "fechaFactura" TIMESTAMP(3);
