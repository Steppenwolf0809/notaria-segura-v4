-- Script para corregir facturas huérfanas sin clientTaxId
-- Estas facturas se crean cuando hay pagos sin factura previa

-- 1. Ver facturas huérfanas (sin clientTaxId o con clientTaxId vacío)
SELECT 
    i."id",
    i."invoiceNumber",
    i."clientName",
    i."clientTaxId",
    i."totalAmount",
    i."paidAmount",
    i."status",
    i."documentId",
    d."clientId" as doc_clientId,
    d."protocolNumber"
FROM invoices i
LEFT JOIN documents d ON i."documentId" = d.id
WHERE i."clientTaxId" IS NULL 
   OR i."clientTaxId" = ''
ORDER BY i."createdAt" DESC;

-- 2. Actualizar clientTaxId de facturas huérfanas usando el documento vinculado
UPDATE invoices i
SET "clientTaxId" = d."clientId"
FROM documents d
WHERE i."documentId" = d.id
  AND d."clientId" IS NOT NULL
  AND (i."clientTaxId" IS NULL OR i."clientTaxId" = '');

-- 3. Para facturas sin documento vinculado, intentar buscar por clientName
-- (Este caso es más complejo y requiere revisión manual)
SELECT 
    i."id",
    i."invoiceNumber",
    i."clientName",
    i."clientTaxId",
    COUNT(d.id) as matching_docs
FROM invoices i
LEFT JOIN documents d ON UPPER(d."clientName") = UPPER(i."clientName")
WHERE (i."clientTaxId" IS NULL OR i."clientTaxId" = '')
  AND i."documentId" IS NULL
GROUP BY i."id", i."invoiceNumber", i."clientName", i."clientTaxId"
ORDER BY matching_docs DESC;

-- 4. Marcar facturas huérfanas sin solución como CANCELLED
-- (Solo ejecutar después de revisar manualmente)
-- UPDATE invoices
-- SET "status" = 'CANCELLED'
-- WHERE (clientTaxId IS NULL OR clientTaxId = '')
--   AND documentId IS NULL
--   AND paidAmount = 0;
