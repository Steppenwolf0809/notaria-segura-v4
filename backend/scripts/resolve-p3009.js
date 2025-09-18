#!/usr/bin/env node
/**
 * RESOLVE P3009: Marcar migración fallida como aplicada sin re-ejecutarla
 * Esto resuelve el estado bloqueado de Prisma sin intentar recrear objetos existentes
 */

import { execSync } from 'child_process';
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️ ',
    success: '✅ ',
    warning: '⚠️ ',
    error: '❌ ',
    critical: '🚨 '
  }[type] || '📝 ';

  console.log(`[${timestamp}] ${prefix}${message}`);
}

async function getPgClient() {
  // Tomar DATABASE_URL de argumentos de línea de comandos o variable de entorno
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no configurada. Pasa la URL como primer argumento o configura la variable de entorno');
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();
  return client;
}

async function resolveP3009() {
  log('🔧 RESOLVIENDO P3009 - MARCANDO MIGRACIÓN COMO APLICADA');

  const client = await getPgClient();

  try {
    // Verificar estado actual de migraciones
    log('🔍 Verificando estado de migraciones...');
    const result = await client.query(`
      SELECT migration_name, started_at, finished_at
      FROM _prisma_migrations
      ORDER BY started_at DESC
    `);

    const failed = result.rows.filter(r => r.started_at && !r.finished_at);
    const applied = result.rows.filter(r => r.finished_at);

    log(`📊 Migraciones aplicadas: ${applied.length}`);
    log(`❌ Migraciones fallidas: ${failed.length}`);

    if (failed.length === 0) {
      log('✅ No hay migraciones fallidas. P3009 ya puede estar resuelto.', 'success');
      return;
    }

    // Mostrar migraciones fallidas
    failed.forEach(f => {
      log(`❌ Fallida: ${f.migration_name} (iniciada: ${f.started_at})`, 'warning');
    });

    // Marcar la migración fallida como aplicada
    const failedMigration = failed[0]; // Tomar la primera/más reciente
    const migrationName = failedMigration.migration_name;

    log(`🔧 Marcando "${migrationName}" como aplicada...`);

    await client.query(`
      UPDATE _prisma_migrations
      SET finished_at = NOW()
      WHERE migration_name = $1 AND finished_at IS NULL
    `, [migrationName]);

    log(`✅ Migración "${migrationName}" marcada como aplicada`, 'success');

    // Verificar que el enum UserRole existe (lo que la migración debía crear)
    log('🔍 Verificando que el enum UserRole existe...');
    const enumCheck = await client.query(`
      SELECT COUNT(*) as count FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'UserRole' AND n.nspname = 'public'
    `);

    if (enumCheck.rows[0].count > 0) {
      log('✅ Enum UserRole existe correctamente', 'success');
    } else {
      log('⚠️ Enum UserRole no encontrado. Puede requerir atención manual.', 'warning');
    }

    // Verificar estado final
    const finalResult = await client.query(`
      SELECT migration_name, started_at, finished_at
      FROM _prisma_migrations
      WHERE finished_at IS NULL
    `);

    if (finalResult.rows.length === 0) {
      log('🎉 P3009 RESUELTO: Todas las migraciones están en estado consistente', 'success');
    } else {
      log(`⚠️ Aún quedan ${finalResult.rows.length} migraciones sin resolver`, 'warning');
    }

  } catch (error) {
    log(`❌ Error resolviendo P3009: ${error.message}`, 'error');
    throw error;
  } finally {
    await client.end();
  }
}

// Ejecutar resolución
resolveP3009().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});