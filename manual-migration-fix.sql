-- MANUAL FIX FOR MIGRATION 20251117164900_add_formas_pago_array
-- Execute these commands in order via psql or Railway dashboard SQL console

-- Step 1: Remove failed migration record
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20251117164900_add_formas_pago_array';

-- Step 2: Execute the migration SQL
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

-- Step 3: Mark migration as applied
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
VALUES (
  gen_random_uuid(),
  '3f8e9d1a2b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8',
  NOW(),
  '20251117164900_add_formas_pago_array',
  NULL,
  NULL,
  NOW(),
  1
);
