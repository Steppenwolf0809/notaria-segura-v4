#!/usr/bin/env node

/**
 * HEALTH CHECKS AUTOMÁTICOS PARA SISTEMA NOTARÍA SEGURA
 * Implementa todas las validaciones de Architect para prevenir problemas
 */

import pg from 'pg';
import { execSync } from 'child_process';
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
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🔍 ${title.toUpperCase()}`);
  console.log(`${'='.repeat(50)}\n`);
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

async function checkDatabaseConnection() {
  log('🔗 Verificando conexión a base de datos...');

  try {
    const client = await getPgClient();
    await client.query('SELECT 1 as test');
    await client.end();

    log('   ✅ Conexión a BD exitosa');
    return { status: 'PASS', message: 'Database connection OK' };

  } catch (error) {
    log(`   ❌ Error de conexión: ${error.message}`, 'error');
    return { status: 'FAIL', message: `Database connection failed: ${error.message}` };
  }
}

async function checkMigrationStatus() {
  log('📦 Verificando estado de migraciones...');

  try {
    const result = await queryDb(`
      SELECT migration_name, started_at, finished_at
      FROM _prisma_migrations
      ORDER BY started_at DESC
    `);

    const applied = result.rows.filter(r => r.finished_at);
    const failed = result.rows.filter(r => r.started_at && !r.finished_at);
    const pending = result.rows.filter(r => !r.started_at);

    if (failed.length > 0) {
      log(`   ❌ ${failed.length} migraciones fallidas detectadas`, 'error');
      return {
        status: 'FAIL',
        message: `${failed.length} failed migrations: ${failed.map(f => f.migration_name).join(', ')}`,
        failed: failed.length
      };
    }

    log(`   ✅ Migraciones OK: ${applied.length} aplicadas, ${pending.length} pendientes`);
    return {
      status: 'PASS',
      message: `Migrations OK: ${applied.length} applied, ${pending.length} pending`,
      applied: applied.length,
      pending: pending.length
    };

  } catch (error) {
    log(`   ❌ Error verificando migraciones: ${error.message}`, 'error');
    return { status: 'FAIL', message: `Migration check failed: ${error.message}` };
  }
}

async function checkSchemaConsistency() {
  log('🏗️  Verificando consistencia de esquema...');

  try {
    // Verificar tablas críticas
    const criticalTables = ['users', 'documents', 'document_events', 'whatsapp_notifications'];
    const missingTables = [];

    for (const table of criticalTables) {
      const result = await queryDb(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = $1 AND table_schema = 'public'
        )
      `, [table]);

      if (!result.rows[0].exists) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      log(`   ❌ Tablas faltantes: ${missingTables.join(', ')}`, 'error');
      return {
        status: 'FAIL',
        message: `Missing tables: ${missingTables.join(', ')}`,
        missingTables
      };
    }

    // Verificar foreign keys
    const fkResult = await queryDb(`
      SELECT COUNT(*) as broken_fks
      FROM (
        SELECT DISTINCT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_name = ccu.table_name
          )
      ) as broken_refs
    `);

    if (fkResult.rows[0].broken_fks > 0) {
      log(`   ⚠️  ${fkResult.rows[0].broken_fks} foreign keys rotas detectadas`, 'warning');
    }

    log('   ✅ Esquema consistente');
    return { status: 'PASS', message: 'Schema consistency OK' };

  } catch (error) {
    log(`   ❌ Error verificando esquema: ${error.message}`, 'error');
    return { status: 'FAIL', message: `Schema check failed: ${error.message}` };
  }
}

async function checkDataIntegrity() {
  log('🔍 Verificando integridad de datos...');

  try {
    // Verificar usuarios
    const userResult = await queryDb('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userResult.rows[0].count);

    if (userCount === 0) {
      return { status: 'FAIL', message: 'No users found in database' };
    }

    // Verificar roles válidos
    const invalidRolesResult = await queryDb(`
      SELECT COUNT(*) as count FROM users
      WHERE role NOT IN ('ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO')
    `);

    const invalidRoles = parseInt(invalidRolesResult.rows[0].count);
    if (invalidRoles > 0) {
      log(`   ⚠️  ${invalidRoles} usuarios con roles inválidos`, 'warning');
    }

    // Verificar documentos sin usuario asignado
    const orphanedDocsResult = await queryDb(`
      SELECT COUNT(*) as count FROM documents
      WHERE created_by_id NOT IN (SELECT id FROM users)
    `);

    const orphanedDocs = parseInt(orphanedDocsResult.rows[0].count);
    if (orphanedDocs > 0) {
      log(`   ⚠️  ${orphanedDocs} documentos huérfanos`, 'warning');
    }

    log(`   ✅ Integridad OK: ${userCount} usuarios, ${invalidRoles} roles inválidos, ${orphanedDocs} docs huérfanos`);
    return {
      status: 'PASS',
      message: `Data integrity OK: ${userCount} users`,
      users: userCount,
      invalidRoles,
      orphanedDocs
    };

  } catch (error) {
    log(`   ❌ Error verificando integridad: ${error.message}`, 'error');
    return { status: 'FAIL', message: `Data integrity check failed: ${error.message}` };
  }
}

async function checkEnumValidation() {
  log('🏷️  Verificando validación de enums...');

  try {
    // Verificar enum UserRole
    const enumResult = await queryDb(`
      SELECT COUNT(*) as count FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'UserRole' AND n.nspname = 'public'
    `);

    if (enumResult.rows[0].count === '0') {
      return { status: 'FAIL', message: 'UserRole enum does not exist' };
    }

    // Verificar valores del enum
    const enumValuesResult = await queryDb(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'UserRole' AND n.nspname = 'public'
      ORDER BY e.enumsortorder
    `);

    const expectedValues = ['ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'];
    const actualValues = enumValuesResult.rows.map(r => r.enumlabel);

    const missingValues = expectedValues.filter(v => !actualValues.includes(v));
    const extraValues = actualValues.filter(v => !expectedValues.includes(v));

    if (missingValues.length > 0 || extraValues.length > 0) {
      return {
        status: 'FAIL',
        message: `Enum mismatch - Missing: ${missingValues.join(', ')}, Extra: ${extraValues.join(', ')}`
      };
    }

    // Verificar que columna role usa el enum
    const columnResult = await queryDb(`
      SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    `);

    if (columnResult.rows[0].data_type !== 'USER-DEFINED' || columnResult.rows[0].udt_name !== 'UserRole') {
      return { status: 'FAIL', message: 'Role column does not use UserRole enum' };
    }

    log('   ✅ Enums validados correctamente');
    return { status: 'PASS', message: 'Enum validation OK' };

  } catch (error) {
    log(`   ❌ Error validando enums: ${error.message}`, 'error');
    return { status: 'FAIL', message: `Enum validation failed: ${error.message}` };
  }
}

async function checkApplicationHealth() {
  log('🚀 Verificando salud de aplicación...');

  try {
    // Verificar que el servidor responde
    const http = await import('http');

    return new Promise((resolve) => {
      const req = http.get('http://localhost:3001/api/health', { timeout: 5000 }, (res) => {
        if (res.statusCode === 200) {
          log('   ✅ Aplicación responde correctamente');
          resolve({ status: 'PASS', message: 'Application health OK' });
        } else {
          log(`   ❌ Aplicación responde con código ${res.statusCode}`, 'error');
          resolve({ status: 'FAIL', message: `Application returned status ${res.statusCode}` });
        }
      });

      req.on('error', (error) => {
        log(`   ⚠️  Aplicación no responde (posiblemente no iniciada): ${error.message}`, 'warning');
        resolve({ status: 'WARN', message: `Application not responding: ${error.message}` });
      });

      req.on('timeout', () => {
        log('   ⚠️  Timeout conectando a aplicación', 'warning');
        resolve({ status: 'WARN', message: 'Application connection timeout' });
      });
    });

  } catch (error) {
    log(`   ❌ Error verificando aplicación: ${error.message}`, 'error');
    return { status: 'FAIL', message: `Application health check failed: ${error.message}` };
  }
}

async function runHealthChecks() {
  logSection('EJECUTANDO HEALTH CHECKS COMPLETOS');

  const checks = [
    { name: 'Database Connection', check: checkDatabaseConnection },
    { name: 'Migration Status', check: checkMigrationStatus },
    { name: 'Schema Consistency', check: checkSchemaConsistency },
    { name: 'Data Integrity', check: checkDataIntegrity },
    { name: 'Enum Validation', check: checkEnumValidation },
    { name: 'Application Health', check: checkApplicationHealth }
  ];

  const results = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const { name, check } of checks) {
    try {
      const result = await check();
      results.push({ name, ...result });

      switch (result.status) {
        case 'PASS':
          passed++;
          break;
        case 'FAIL':
          failed++;
          break;
        case 'WARN':
          warnings++;
          break;
      }
    } catch (error) {
      results.push({ name, status: 'ERROR', message: error.message });
      failed++;
    }
  }

  // Reporte final
  logSection('REPORTE DE HEALTH CHECKS');

  log(`📊 Resumen: ${passed} PASSED, ${warnings} WARNINGS, ${failed} FAILED`);

  if (failed > 0) {
    log('❌ CHEQUEOS FALLIDOS:', 'error');
    results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').forEach(r => {
      log(`   • ${r.name}: ${r.message}`, 'error');
    });
  }

  if (warnings > 0) {
    log('⚠️  ADVERTENCIAS:', 'warning');
    results.filter(r => r.status === 'WARN').forEach(r => {
      log(`   • ${r.name}: ${r.message}`, 'warning');
    });
  }

  if (passed > 0) {
    log('✅ CHEQUEOS EXITOSOS:', 'success');
    results.filter(r => r.status === 'PASS').forEach(r => {
      log(`   • ${r.name}: ${r.message}`, 'success');
    });
  }

  // Guardar reporte
  const report = {
    timestamp: new Date().toISOString(),
    summary: { passed, warnings, failed, total: results.length },
    results
  };

  const reportPath = path.join(__dirname, '..', 'health-check-report.json');
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(`📄 Reporte guardado en: ${reportPath}`);

  // Código de salida
  if (failed > 0) {
    log('💥 HEALTH CHECKS FALLARON - REVISAR LOGS', 'critical');
    process.exit(1);
  } else if (warnings > 0) {
    log('⚠️  HEALTH CHECKS PASARON CON ADVERTENCIAS', 'warning');
    process.exit(0);
  } else {
    log('🎉 TODOS LOS HEALTH CHECKS PASARON', 'success');
    process.exit(0);
  }
}

// Ejecutar health checks
runHealthChecks().catch(error => {
  console.error('💥 Error fatal en health checks:', error);
  process.exit(1);
});