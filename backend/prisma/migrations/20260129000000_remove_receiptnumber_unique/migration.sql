-- DropIndex: Eliminar constraint único de receiptNumber en payments
-- Este constraint impide pagos multi-factura (un recibo que paga varias facturas)
-- El schema actual NO tiene @@unique en receiptNumber, pero existe en la DB

-- Eliminar todos los posibles índices únicos en receiptNumber
DROP INDEX IF EXISTS "payments_receiptNumber_key";
DROP INDEX IF EXISTS "Payment_receiptNumber_key";
DROP INDEX IF EXISTS "payments_receipt_number_key";

-- Recrear solo el índice normal (no único) si no existe
CREATE INDEX IF NOT EXISTS "payments_receiptNumber_idx" ON "payments"("receiptNumber");
