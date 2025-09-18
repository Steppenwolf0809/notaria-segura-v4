-- RESOLVE P3009: Marcar migración fallida como aplicada (SQL directo)
-- Ejecutar en Railway PostgreSQL console si el script Node.js falla

-- 1. Verificar migraciones fallidas
SELECT migration_name, started_at, finished_at
FROM _prisma_migrations
WHERE finished_at IS NULL
ORDER BY started_at DESC;

-- 2. Marcar la migración fallida como aplicada (reemplaza 'migration_name' con el nombre real)
-- UPDATE _prisma_migrations
-- SET finished_at = NOW()
-- WHERE migration_name = '20250117000000_fix_role_enum_conversion'
-- AND finished_at IS NULL;

-- 3. Verificar que el enum UserRole existe
SELECT COUNT(*) as enum_exists FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typname = 'UserRole' AND n.nspname = 'public';

-- 4. Verificar estado final
SELECT migration_name, started_at, finished_at
FROM _prisma_migrations
ORDER BY started_at DESC;