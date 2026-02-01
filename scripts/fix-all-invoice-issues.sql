-- ============================================
-- Script completo para corregir problemas de facturas
-- ============================================

-- PASO 1: Corregir facturas huérfanas con documento vinculado
-- (Actualizar clientTaxId usando el clientId del documento)
UPDATE invoices i
SET "clientTaxId" = d."clientId"
FROM documents d
WHERE i."documentId" = d.id
  AND d."clientId" IS NOT NULL
  AND (i."clientTaxId" IS NULL OR i."clientTaxId" = '');

-- PASO 2: Vincular factura 001-002-000124689 con documento 20261701018C00219
-- Primero verificar que el documento existe
DO $$
DECLARE
  doc_id TEXT;
  doc_client_id TEXT;
BEGIN
  -- Buscar documento por protocolo
  SELECT id, "clientId" INTO doc_id, doc_client_id
  FROM documents
  WHERE "protocolNumber" = '20261701018C00219';

  IF doc_id IS NOT NULL THEN
    -- Vincular factura con documento
    UPDATE invoices
    SET 
      "documentId" = doc_id,
      "clientTaxId" = doc_client_id
    WHERE "invoiceNumber" = '001-002-000124689';
    
    RAISE NOTICE 'Factura 001-002-000124689 vinculada con documento 20261701018C00219';
  ELSE
    -- Si no existe el documento, cancelar la factura
    UPDATE invoices
    SET "status" = 'CANCELLED'
    WHERE "invoiceNumber" = '001-002-000124689'
      AND "paidAmount" = 0;
    
    RAISE NOTICE 'Documento no encontrado. Factura 001-002-000124689 cancelada';
  END IF;
END $$;

-- PASO 3: Crear tabla pending_receivables si no existe
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
  "matrizadorName" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceFile" TEXT NOT NULL,
  "reportDate" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pending_receivables_pkey" PRIMARY KEY ("id")
);

-- PASO 4: Crear índices para pending_receivables
CREATE UNIQUE INDEX IF NOT EXISTS "pending_receivables_invoiceNumberRaw_reportDate_key" 
  ON "pending_receivables"("invoiceNumberRaw", "reportDate");

CREATE INDEX IF NOT EXISTS "pending_receivables_clientTaxId_idx" 
  ON "pending_receivables"("clientTaxId");

CREATE INDEX IF NOT EXISTS "pending_receivables_dueDate_idx" 
  ON "pending_receivables"("dueDate");

CREATE INDEX IF NOT EXISTS "pending_receivables_balance_idx" 
  ON "pending_receivables"("balance");

CREATE INDEX IF NOT EXISTS "pending_receivables_status_idx" 
  ON "pending_receivables"("status");

CREATE INDEX IF NOT EXISTS "pending_receivables_reportDate_idx" 
  ON "pending_receivables"("reportDate");

CREATE INDEX IF NOT EXISTS "pending_receivables_matrizadorName_idx" 
  ON "pending_receivables"("matrizadorName");

-- PASO 5: Verificar resultados
SELECT 
    'Facturas huérfanas corregidas' as descripcion,
    COUNT(*) as total
FROM invoices
WHERE "documentId" IS NOT NULL
  AND "clientTaxId" IS NOT NULL
  AND "clientTaxId" != '';

SELECT 
    'Facturas aún sin clientTaxId' as descripcion,
    COUNT(*) as total
FROM invoices
WHERE "clientTaxId" IS NULL OR "clientTaxId" = '';

SELECT 
    'Estado de factura 001-002-000124689' as descripcion,
    "invoiceNumber",
    "clientTaxId",
    "documentId",
    "status"
FROM invoices
WHERE "invoiceNumber" = '001-002-000124689';
