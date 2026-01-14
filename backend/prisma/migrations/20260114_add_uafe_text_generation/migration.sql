-- AlterTable ProtocoloUAFE: Agregar campos para generación de textos
ALTER TABLE "protocolos_uafe" 
  -- Hacer numeroProtocolo nullable
  ALTER COLUMN "numeroProtocolo" DROP NOT NULL,
  
  -- Agregar identificadorTemporal
  ADD COLUMN "identificadorTemporal" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  
  -- Agregar tipoActo
  ADD COLUMN "tipoActo" TEXT,
  
  -- Hacer actoContrato opcional
  ALTER COLUMN "actoContrato" DROP NOT NULL,
  
  -- Agregar multa para promesas
  ADD COLUMN "multa" DECIMAL(12,2),
  
  -- Agregar campos de ubicación separados
  ADD COLUMN "ubicacionDescripcion" TEXT,
  ADD COLUMN "ubicacionParroquia" TEXT,
  ADD COLUMN "ubicacionCanton" TEXT DEFAULT 'QUITO',
  ADD COLUMN "ubicacionProvincia" TEXT DEFAULT 'PICHINCHA',
  
  -- Agregar campo ciudad para vehículos
  ADD COLUMN "vehiculoCiudadComercializacion" TEXT,
  
  -- Agregar cache de textos generados
  ADD COLUMN "textoEncabezadoGenerado" TEXT,
  ADD COLUMN "textoComparecenciaGenerado" TEXT,
  ADD COLUMN "fechaUltimaGeneracion" TIMESTAMP(3);

-- Crear índices para ProtocoloUAFE
CREATE UNIQUE INDEX "protocolos_uafe_identificadorTemporal_key" ON "protocolos_uafe"("identificadorTemporal");
CREATE INDEX "protocolos_uafe_tipoActo_idx" ON "protocolos_uafe"("tipoActo");

-- Backfill: Copiar actoContrato a tipoActo para registros existentes
UPDATE "protocolos_uafe" SET "tipoActo" = "actoContrato" WHERE "tipoActo" IS NULL;

-- Ahora hacer tipoActo NOT NULL
ALTER TABLE "protocolos_uafe" ALTER COLUMN "tipoActo" SET NOT NULL;

-- AlterTable PersonaProtocolo: Agregar campos de completitud y redacción
ALTER TABLE "personas_protocolo"
  -- Identificación flexible
  ADD COLUMN "nombreTemporal" TEXT,
  
  -- Estado de completitud (semáforo)
  ADD COLUMN "estadoCompletitud" TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN "porcentajeCompletitud" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "camposFaltantes" JSONB,
  
  -- Campos para redacción
  ADD COLUMN "compareceConyugeJunto" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "esApoderado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mandanteCedula" TEXT,
  ADD COLUMN "mandanteNombre" TEXT,
  
  -- Orden de aparición
  ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

-- Crear índice para estadoCompletitud
CREATE INDEX "personas_protocolo_estadoCompletitud_idx" ON "personas_protocolo"("estadoCompletitud");

-- Backfill: Calcular completitud inicial para registros existentes que estén completados
-- Los que tienen completado=true deberían tener al menos datos parciales
UPDATE "personas_protocolo" 
SET 
  "estadoCompletitud" = CASE 
    WHEN "completado" = true THEN 'completo'
    ELSE 'pendiente'
  END,
  "porcentajeCompletitud" = CASE 
    WHEN "completado" = true THEN 100
    ELSE 0
  END
WHERE "estadoCompletitud" = 'pendiente';
