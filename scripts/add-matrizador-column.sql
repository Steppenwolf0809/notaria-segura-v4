-- Agregar columna matrizadorName a pending_receivables existente
ALTER TABLE "pending_receivables" ADD COLUMN IF NOT EXISTS "matrizadorName" TEXT;

-- Crear índice para matrizadorName
CREATE INDEX IF NOT EXISTS "pending_receivables_matrizadorName_idx" 
  ON "pending_receivables"("matrizadorName");

-- Verificar que se agregó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pending_receivables' 
  AND column_name = 'matrizadorName';
