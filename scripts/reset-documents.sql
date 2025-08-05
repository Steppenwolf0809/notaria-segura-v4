-- Script para resetear documentos y notificaciones
-- CONSERVA USUARIOS - Solo elimina documentos, eventos y grupos
-- Ejecutar con precaución en entorno de desarrollo

-- IMPORTANTE: Este script elimina TODOS los documentos y datos relacionados
-- pero MANTIENE intactos los usuarios del sistema

BEGIN TRANSACTION;

-- 1. Eliminar eventos de auditoría de documentos
DELETE FROM document_events;
PRAGMA foreign_keys=off;

-- 2. Eliminar documentos (esto automáticamente eliminará los eventos por CASCADE)
DELETE FROM documents;

-- 3. Eliminar grupos de documentos
DELETE FROM DocumentGroup;

-- 4. Eliminar datos de prueba de conexión (opcional)
DELETE FROM test_connection;

PRAGMA foreign_keys=on;

-- 5. Resetear secuencias/contadores si es necesario
-- SQLite maneja esto automáticamente para AUTOINCREMENT

-- Verificar que los usuarios siguen intactos
SELECT COUNT(*) as usuarios_conservados FROM users;

COMMIT;

-- Mostrar resumen post-limpieza
SELECT 
    (SELECT COUNT(*) FROM users) as usuarios_conservados,
    (SELECT COUNT(*) FROM documents) as documentos_restantes,
    (SELECT COUNT(*) FROM DocumentGroup) as grupos_restantes,
    (SELECT COUNT(*) FROM document_events) as eventos_restantes;