-- Script para resolver la migración fallida en Railway
-- Ejecutar este SQL directamente en la base de datos de Railway

-- Opción 1: Marcar la migración como aplicada exitosamente
UPDATE _prisma_migrations 
SET finished_at = NOW(), 
    rolled_back_at = NULL,
    logs = NULL
WHERE migration_name = '20250106000000_add_pdf_fields_to_escrituras';

-- Verificar el estado de las migraciones
SELECT migration_name, started_at, finished_at, rolled_back_at, logs 
FROM _prisma_migrations 
ORDER BY started_at DESC 
LIMIT 5;
