-- AlterTable
-- Renombrar formaPago a formasPago (PostgreSQL)
-- Migrar datos existentes del formato objeto al formato array

-- Paso 1: Agregar nueva columna formasPago (nullable)
ALTER TABLE "protocolos_uafe" ADD COLUMN "formasPago" JSONB;

-- Paso 2: Migrar datos existentes de formaPago a formasPago
-- Convertir el objeto viejo { cheque: {...}, efectivo: {...} }
-- a un array nuevo [{ tipo: "CHEQUE", monto: ..., banco: ... }, ...]
UPDATE "protocolos_uafe"
SET "formasPago" = (
  SELECT jsonb_agg(
    CASE
      WHEN key = 'cheque' THEN
        jsonb_build_object(
          'tipo', 'CHEQUE',
          'monto', (value->>'monto')::numeric,
          'banco', value->>'banco'
        )
      WHEN key = 'efectivo' THEN
        jsonb_build_object(
          'tipo', 'EFECTIVO',
          'monto', (value->>'monto')::numeric
        )
      WHEN key = 'transferencia' THEN
        jsonb_build_object(
          'tipo', 'TRANSFERENCIA',
          'monto', (value->>'monto')::numeric,
          'banco', value->>'banco'
        )
      WHEN key = 'tarjeta' THEN
        jsonb_build_object(
          'tipo', 'TARJETA',
          'monto', (value->>'monto')::numeric,
          'banco', value->>'banco'
        )
    END
  )
  FROM jsonb_each("formaPago")
)
WHERE "formaPago" IS NOT NULL AND "formaPago" != 'null'::jsonb;

-- Paso 3: Eliminar columna antigua formaPago
ALTER TABLE "protocolos_uafe" DROP COLUMN "formaPago";
