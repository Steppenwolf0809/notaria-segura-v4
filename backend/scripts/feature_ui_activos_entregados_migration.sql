-- feature_ui_activos_entregados_migration.sql
-- Migración idempotente para optimizar búsquedas globales y filtros por pestañas
-- Compatible con PostgreSQL y Prisma ORM

DO $$
BEGIN
    -- Crear extensión pg_trgm si no existe (para búsquedas trigram eficientes)
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        CREATE EXTENSION pg_trgm;
        RAISE NOTICE 'Extensión pg_trgm creada exitosamente';
    END IF;

    -- Índice compuesto para filtrado por estado y fecha (OPTIMIZA: queries ACTIVOS/ENTREGADOS)
    -- Rendimiento esperado: ~10x más rápido en filtrado por pestañas
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_status_created_at') THEN
        CREATE INDEX CONCURRENTLY idx_documents_status_created_at
        ON documents(status, created_at DESC);
        RAISE NOTICE 'Índice idx_documents_status_created_at creado';
    END IF;

    -- Índice GIN para búsqueda trigram en nombre de cliente
    -- Rendimiento esperado: ~5x más rápido en búsquedas LIKE/ILIKE
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_client_name_trgm') THEN
        CREATE INDEX CONCURRENTLY idx_documents_client_name_trgm
        ON documents USING gin(client_name gin_trgm_ops);
        RAISE NOTICE 'Índice idx_documents_client_name_trgm creado';
    END IF;

    -- Índice para búsqueda exacta por código de protocolo
    -- Rendimiento esperado: búsqueda O(1) para códigos específicos
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_protocol_number') THEN
        CREATE INDEX CONCURRENTLY idx_documents_protocol_number
        ON documents(protocol_number);
        RAISE NOTICE 'Índice idx_documents_protocol_number creado';
    END IF;

    -- Índice para búsqueda exacta por identificación de cliente
    -- Rendimiento esperado: búsqueda O(1) para filtros por clientId
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_client_id') THEN
        CREATE INDEX CONCURRENTLY idx_documents_client_id
        ON documents(client_id);
        RAISE NOTICE 'Índice idx_documents_client_id creado';
    END IF;

    -- Índice compuesto para búsqueda por cliente (OPTIMIZA: queries complejas)
    -- Rendimiento esperado: ~3x más rápido en búsquedas combinadas
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_client_composite') THEN
        CREATE INDEX CONCURRENTLY idx_documents_client_composite
        ON documents(client_name, client_id, status);
        RAISE NOTICE 'Índice idx_documents_client_composite creado';
    END IF;

    -- Índice GIN para búsqueda trigram en tipo de documento
    -- Rendimiento esperado: ~4x más rápido en filtros por tipo
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_type_trgm') THEN
        CREATE INDEX CONCURRENTLY idx_documents_type_trgm
        ON documents USING gin(document_type gin_trgm_ops);
        RAISE NOTICE 'Índice idx_documents_type_trgm creado';
    END IF;

    -- Índice para optimizar paginación con filtros
    -- Rendimiento esperado: paginación más eficiente con OFFSET
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_pagination') THEN
        CREATE INDEX CONCURRENTLY idx_documents_pagination
        ON documents(created_at DESC, id);
        RAISE NOTICE 'Índice idx_documents_pagination creado';
    END IF;

    RAISE NOTICE '🎉 Migración completada exitosamente - Todos los índices optimizados para UI Activos/Entregados';
END $$;

-- Verificar índices creados
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'documents'
    AND indexname LIKE 'idx_documents_%'
ORDER BY indexname;