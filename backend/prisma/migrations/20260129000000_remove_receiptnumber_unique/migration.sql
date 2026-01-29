-- DropConstraint: Eliminar constraint único de receiptNumber en payments
-- Este constraint impide pagos multi-factura (un recibo que paga varias facturas)
-- El schema actual NO tiene @@unique en receiptNumber, pero existe en la DB

-- Eliminar el constraint único (esto también elimina el índice asociado)
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_receiptNumber_key";

-- Recrear solo el índice normal (no único) si no existe
CREATE INDEX IF NOT EXISTS "payments_receiptNumber_idx" ON "payments"("receiptNumber");
