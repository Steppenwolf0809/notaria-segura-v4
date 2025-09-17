#!/usr/bin/env node

/**
 * DIAGNÓSTICO COMPLETO PARA ERROR P3009 EN RAILWAY POSTGRESQL
 * Ejecuta todas las validaciones necesarias para entender el estado actual
 */

import pg from 'pg';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 ${title.toUpperCase()}`);
  console.log(`${'='.repeat(60)}\n`);
}

async function getPgClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no configurada');
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway') ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();
  return client;
}

async function queryDb(sql, params = []) {
  const client = await getPgClient();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    await client.end();
  }
}

async function checkMigrationStatus() {
  logSection('ESTADO DE MIGRACIONES PRISMA');

  try {
    const result = await queryDb(`
      SELECT
        migration_name,
        started_at,
        finished_at,
        checksum,
        logs,
        EXTRACT(EPOCH FROM (finished_at - started_at)) as duration_seconds
      FROM _prisma_migrations
      ORDER BY started_at DESC
      LIMIT 20
    `);

    log(`Encontradas ${result.rows.length} migraciones en BD`);

    const applied = result.rows.filter(r => r.finished_at);
    const failed = result.rows.filter(r => !r.finished_at);
    const pending = result.rows.filter(r => !r.started_at);

    log(`✅ Aplicadas: ${applied.length}`);
    log(`❌ Fallidas: ${failed.length}`);
    log(`⏳ Pendientes: ${pending.length}`);

    if (failed.length > 0) {
      log('MIGRACIONES FALLIDAS:', 'error');
      failed.forEach(m => {
        log(`   • ${m.migration_name} (iniciada: ${m.started_at})`, 'error');
      });
    }

    // Verificar consistencia con archivos locales
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
    const localMigrations = fs.readdirSync(migrationsDir)
      .filter(dir => fs.statSync(path.join(migrationsDir, dir)).isDirectory())
      .sort();

    const dbMigrations = result.rows.map(r => r.migration_name).sort();

    const missingInDb = localMigrations.filter(m => !dbMigrations.includes(m));
    const extraInDb = dbMigrations.filter(m => !localMigrations.includes(m));

    if (missingInDb.length > 0) {
      log(`⚠️  Migraciones locales no aplicadas: ${missingInDb.join(', ')}`, 'warning');
    }

    if (extraInDb.length > 0) {
      log(`⚠️  Migraciones en BD no en filesystem: ${extraInDb.join(', ')}`, 'warning');
    }

    return {
      total: result.rows.length,
      applied: applied.length,
      failed: failed.length,
      pending: pending.length,
      failedMigrations: failed,
      consistencyIssues: missingInDb.length > 0 || extraInDb.length > 0
    };

  } catch (error) {
    log(`Error verificando migraciones: ${error.message}`, 'error');
    return { error: error.message };
  }
}

async function checkTableStructure() {
  logSection('ESTRUCTURA DE TABLA USERS');

  try {
    // Verificar estructura de tabla
    const tableResult = await queryDb(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    log(`Tabla 'users' tiene ${tableResult.rows.length} columnas`);

    const roleColumn = tableResult.rows.find(col => col.column_name === 'role');
    if (roleColumn) {
      log(`Columna 'role': ${roleColumn.data_type} (${roleColumn.udt_name}) - Nullable: ${roleColumn.is_nullable}`);
    } else {
      log('❌ Columna "role" NO ENCONTRADA', 'error');
    }

    // Verificar datos de ejemplo
    const dataResult = await queryDb(`
      SELECT id, email, role, pg_typeof(role) as role_type
      FROM users
      LIMIT 5
    `);

    log(`Primeros ${dataResult.rows.length} registros de users:`);
    dataResult.rows.forEach((row, i) => {
      log(`   ${i + 1}. ID: ${row.id}, Email: ${row.email}, Role: ${row.role} (${row.role_type})`);
    });

    return {
      columns: tableResult.rows,
      roleColumn,
      sampleData: dataResult.rows
    };

  } catch (error) {
    log(`Error verificando estructura de tabla: ${error.message}`, 'error');
    return { error: error.message };
  }
}

async function checkEnumStatus() {
  logSection('VERIFICACIÓN DE ENUM USERROLE');

  try {
    // Verificar si enum existe
    const enumResult = await queryDb(`
      SELECT n.nspname AS schema_name, t.typname AS type_name, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'UserRole'
      ORDER BY e.enumsortorder
    `);

    if (enumResult.rows.length > 0) {
      log(`✅ Enum 'UserRole' existe con ${enumResult.rows.length} valores:`);
      enumResult.rows.forEach(row => {
        log(`   • ${row.enumlabel}`);
      });
    } else {
      log('❌ Enum "UserRole" NO EXISTE', 'error');
    }

    // Verificar si hay valores inválidos en la tabla
    const invalidResult = await queryDb(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE role IS NOT NULL
      GROUP BY role
      ORDER BY count DESC
    `);

    log(`Distribución de valores de role en users:`);
    invalidResult.rows.forEach(row => {
      const isValidEnum = enumResult.rows.some(e => e.enumlabel === row.role);
      const status = isValidEnum ? '✅' : '❌';
      log(`   ${status} ${row.role}: ${row.count} registros`);
    });

    return {
      enumExists: enumResult.rows.length > 0,
      enumValues: enumResult.rows.map(r => r.enumlabel),
      roleDistribution: invalidResult.rows
    };

  } catch (error) {
    log(`Error verificando enum: ${error.message}`, 'error');
    return { error: error.message };
  }
}

async function checkSchemaConsistency() {
  logSection('CONSISTENCIA SCHEMA VS BASE DE DATOS');

  try {
    // Intentar generar diff
    log('Generando diff entre schema y base de datos...');

    try {
      const diffResult = execSync('npx prisma db diff --from-schema-datamodel --to-database-url', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        timeout: 30000
      });

      if (diffResult.trim()) {
        log('⚠️  DIFERENCIAS ENCONTRADAS:', 'warning');
        console.log(diffResult);
      } else {
        log('✅ Schema consistente con base de datos');
      }

      return { diff: diffResult, consistent: !diffResult.trim() };

    } catch (error) {
      log(`Error generando diff: ${error.message}`, 'warning');
      return { error: error.message };
    }

  } catch (error) {
    log(`Error en verificación de consistencia: ${error.message}`, 'error');
    return { error: error.message };
  }
}

async function generateReport(results) {
  logSection('REPORTE DE DIAGNÓSTICO COMPLETO');

  const report = {
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA',
    results
  };

  // Análisis de severidad
  let severity = 'LOW';
  let recommendations = [];

  if (results.migrations?.failed > 0) {
    severity = 'CRITICAL';
    recommendations.push('🚨 RECOVERY INMEDIATO: Migraciones fallidas detectadas');
  }

  if (!results.enum?.enumExists) {
    severity = 'HIGH';
    recommendations.push('⚠️  CREAR ENUM: UserRole no existe en base de datos');
  }

  if (results.consistency?.diff) {
    severity = 'MEDIUM';
    recommendations.push('📝 SYNC SCHEMA: Inconsistencias entre schema y BD');
  }

  if (results.table?.roleColumn?.data_type !== 'USER-DEFINED') {
    severity = 'HIGH';
    recommendations.push('🔄 CONVERTIR TIPO: Columna role debe ser enum UserRole');
  }

  log(`🔴 SEVERIDAD: ${severity}`, severity === 'CRITICAL' ? 'critical' : 'warning');
  log('📋 RECOMENDACIONES:');
  recommendations.forEach(rec => log(`   • ${rec}`));

  // Guardar reporte
  const reportPath = path.join(__dirname, '..', 'diagnose-p3009-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📄 Reporte guardado en: ${reportPath}`);

  return { severity, recommendations };
}

async function main() {
  log('🚀 INICIANDO DIAGNÓSTICO COMPLETO P3009');

  try {
    const results = {};

    // Ejecutar todas las verificaciones
    results.migrations = await checkMigrationStatus();
    results.table = await checkTableStructure();
    results.enum = await checkEnumStatus();
    results.consistency = await checkSchemaConsistency();

    // Generar reporte final
    const { severity, recommendations } = await generateReport(results);

    logSection('RESUMEN EJECUTIVO');

    if (severity === 'CRITICAL') {
      log('🚨 SITUACIÓN CRÍTICA: Se requiere recovery inmediato', 'critical');
      log('Comando recomendado: node scripts/recovery.js --strategy=in-place');
    } else if (severity === 'HIGH') {
      log('⚠️  SITUACIÓN SERIA: Se requiere atención inmediata', 'warning');
    } else {
      log('✅ SITUACIÓN ESTABLE: Sistema funcionando correctamente', 'success');
    }

    log(`\n🎯 PRÓXIMOS PASOS:`);
    recommendations.forEach((rec, i) => log(`${i + 1}. ${rec}`));

    process.exit(severity === 'CRITICAL' ? 1 : 0);

  } catch (error) {
    log(`💥 ERROR CRÍTICO EN DIAGNÓSTICO: ${error.message}`, 'critical');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar diagnóstico
main().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});