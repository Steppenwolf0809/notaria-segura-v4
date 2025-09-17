#!/usr/bin/env node

/**
 * RECOVERY REMOTO PARA RAILWAY POSTGRESQL - RESOLUCIÓN P3009
 * Ejecuta recovery directamente en la base de datos de Railway
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
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 ${title.toUpperCase()}`);
  console.log(`${'='.repeat(60)}\n`);
}

async function getRailwayClient() {
  // Usar DATABASE_URL del entorno (Railway la configura automáticamente)
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL no configurada. Asegúrate de estar ejecutando en Railway o tener la variable configurada.');
  }

  if (!databaseUrl.includes('railway')) {
    log('⚠️  ADVERTENCIA: DATABASE_URL no parece ser de Railway. Verifica que estés en el entorno correcto.', 'warning');
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Railway requiere SSL
  });

  await client.connect();
  log('✅ Conexión exitosa a Railway PostgreSQL');
  return client;
}

async function createEmergencyBackup(client) {
  logSection('CREANDO BACKUP DE EMERGENCIA');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Backup de tabla User completa
    await client.query(`
      DROP TABLE IF EXISTS users_backup_p3009;
      CREATE TABLE users_backup_p3009 AS SELECT * FROM "User";
    `);

    // Verificar backup
    const backupCount = await client.query('SELECT COUNT(*) as count FROM users_backup_p3009');
    const originalCount = await client.query('SELECT COUNT(*) as count FROM "User"');

    log(`✅ Backup creado: ${backupCount.rows[0].count} registros respaldados`);
    log(`📊 Registros originales: ${originalCount.rows[0].count}`);

    if (backupCount.rows[0].count !== originalCount.rows[0].count) {
      throw new Error('Backup incompleto - cantidad de registros no coincide');
    }

    return { backupCreated: true, recordCount: parseInt(backupCount.rows[0].count) };

  } catch (error) {
    log(`❌ Error creando backup: ${error.message}`, 'error');
    throw error;
  }
}

async function diagnoseCurrentState(client) {
  logSection('DIAGNÓSTICO DEL ESTADO ACTUAL');

  const diagnosis = {};

  try {
    // Verificar migraciones
    const migrations = await client.query(`
      SELECT migration_name, started_at, finished_at, checksum
      FROM _prisma_migrations
      ORDER BY started_at DESC
      LIMIT 10
    `);

    diagnosis.migrations = {
      total: migrations.rows.length,
      failed: migrations.rows.filter(m => m.started_at && !m.finished_at),
      completed: migrations.rows.filter(m => m.finished_at)
    };

    log(`📦 Migraciones totales: ${diagnosis.migrations.total}`);
    log(`✅ Completadas: ${diagnosis.migrations.completed.length}`);
    log(`❌ Fallidas: ${diagnosis.migrations.failed.length}`);

    if (diagnosis.migrations.failed.length > 0) {
      log('MIGRACIONES FALLIDAS:', 'error');
      diagnosis.migrations.failed.forEach(m => {
        log(`   • ${m.migration_name}`, 'error');
      });
    }

    // Verificar tabla User
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'User' AND table_schema = 'public'
      )
    `);

    diagnosis.tableExists = tableExists.rows[0].exists;
    log(`🏗️  Tabla User existe: ${diagnosis.tableExists ? 'SÍ' : 'NO'}`);

    if (diagnosis.tableExists) {
      // Verificar columna role
      const columnInfo = await client.query(`
        SELECT column_name, data_type, udt_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'role'
      `);

      if (columnInfo.rows.length > 0) {
        const roleColumn = columnInfo.rows[0];
        diagnosis.roleColumn = roleColumn;
        log(`🔑 Columna role: ${roleColumn.data_type} (${roleColumn.udt_name || 'N/A'})`);

        // Verificar datos de ejemplo
        const sampleData = await client.query(`
          SELECT id, email, role, pg_typeof(role) as role_type
          FROM "User"
          LIMIT 3
        `);

        diagnosis.sampleData = sampleData.rows;
        log(`📊 Datos de ejemplo:`);
        sampleData.rows.forEach((row, i) => {
          log(`   ${i + 1}. ${row.email}: ${row.role} (${row.role_type})`);
        });
      }
    }

    // Verificar enum UserRole
    const enumExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typname = 'UserRole' AND n.nspname = 'public'
      )
    `);

    diagnosis.enumExists = enumExists.rows[0].exists;
    log(`🏷️  Enum UserRole existe: ${diagnosis.enumExists ? 'SÍ' : 'NO'}`);

    return diagnosis;

  } catch (error) {
    log(`❌ Error en diagnóstico: ${error.message}`, 'error');
    throw error;
  }
}

async function executeRecoveryInPlace(client, diagnosis) {
  logSection('EJECUTANDO RECOVERY IN-PLACE');

  try {
    // Paso 1: Limpiar migración fallida específica
    log('Paso 1: Limpiando migración fallida...');
    const migrationName = '20250117000000_fix_role_enum_conversion';

    const deleteResult = await client.query(
      'DELETE FROM _prisma_migrations WHERE migration_name = $1',
      [migrationName]
    );

    if (deleteResult.rowCount > 0) {
      log(`✅ Eliminada migración fallida: ${migrationName}`);
    } else {
      log(`ℹ️  Migración ${migrationName} no encontrada (posiblemente ya limpia)`);
    }

    // Paso 2: Crear enum UserRole (idempotente)
    log('Paso 2: Creando enum UserRole...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
          CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO');
          RAISE NOTICE 'Enum UserRole creado exitosamente';
        ELSE
          RAISE NOTICE 'Enum UserRole ya existe';
        END IF;
      END $$;
    `);

    log('✅ Enum UserRole verificado/creado');

    // Paso 3: Convertir datos existentes
    log('Paso 3: Convirtiendo datos existentes...');

    // Primero, manejar valores que podrían estar en formato string
    await client.query(`
      UPDATE "User" SET role =
      CASE
        WHEN UPPER(TRIM(role::text)) LIKE '%ADMIN%' THEN 'ADMIN'::"UserRole"
        WHEN UPPER(TRIM(role::text)) LIKE '%CAJA%' THEN 'CAJA'::"UserRole"
        WHEN UPPER(TRIM(role::text)) LIKE '%MATRIZADOR%' THEN 'MATRIZADOR'::"UserRole"
        WHEN UPPER(TRIM(role::text)) LIKE '%RECEPCION%' THEN 'RECEPCION'::"UserRole"
        WHEN UPPER(TRIM(role::text)) LIKE '%ARCHIVO%' THEN 'ARCHIVO'::"UserRole"
        -- Default para valores no reconocidos
        ELSE 'MATRIZADOR'::"UserRole"
      END
      WHERE role IS NOT NULL
    `);

    log('✅ Datos convertidos a valores enum válidos');

    // Paso 4: Alterar tipo de columna (si no es ya enum)
    log('Paso 4: Alterando tipo de columna role...');

    const currentType = await client.query(`
      SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'role'
    `);

    if (currentType.rows[0].udt_name !== 'UserRole') {
      await client.query(`ALTER TABLE "User" ALTER COLUMN role TYPE "UserRole" USING role::"UserRole"`);
      log('✅ Columna role convertida a tipo enum');
    } else {
      log('ℹ️  Columna role ya es del tipo correcto');
    }

    // Paso 5: Marcar migración como completada
    log('Paso 5: Registrando migración como completada...');

    const checksum = 'your_migration_checksum'; // En un caso real, calcularíamos el checksum correcto
    await client.query(`
      INSERT INTO _prisma_migrations (migration_name, started_at, finished_at, checksum)
      VALUES ($1, NOW(), NOW(), $2)
      ON CONFLICT (migration_name) DO NOTHING
    `, [migrationName, checksum]);

    log('✅ Migración registrada como completada');

    return { success: true, migrationName };

  } catch (error) {
    log(`❌ Error en recovery in-place: ${error.message}`, 'error');
    throw error;
  }
}

async function validateRecovery(client) {
  logSection('VALIDACIÓN POST-RECOVERY');

  try {
    // Verificar enum existe
    const enumCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typname = 'UserRole' AND n.nspname = 'public'
      )
    `);

    if (!enumCheck.rows[0].exists) {
      throw new Error('Enum UserRole no existe después del recovery');
    }

    // Verificar columna role es enum
    const columnCheck = await client.query(`
      SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'role'
    `);

    if (columnCheck.rows[0].udt_name !== 'UserRole') {
      throw new Error('Columna role no es del tipo UserRole enum');
    }

    // Verificar que todos los valores son válidos
    const invalidValues = await client.query(`
      SELECT COUNT(*) as count FROM "User"
      WHERE role NOT IN ('ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO')
    `);

    if (invalidValues.rows[0].count > 0) {
      throw new Error(`${invalidValues.rows[0].count} usuarios tienen valores de role inválidos`);
    }

    // Verificar migración está completada
    const migrationCheck = await client.query(`
      SELECT finished_at FROM _prisma_migrations
      WHERE migration_name = '20250117000000_fix_role_enum_conversion'
    `);

    if (!migrationCheck.rows[0]?.finished_at) {
      throw new Error('Migración no está marcada como completada');
    }

    // Verificar datos de ejemplo
    const sampleCheck = await client.query(`
      SELECT id, email, role, pg_typeof(role) as role_type
      FROM "User"
      LIMIT 3
    `);

    log('✅ Validación completada exitosamente');
    log('📊 Datos de ejemplo post-recovery:');
    sampleCheck.rows.forEach((row, i) => {
      log(`   ${i + 1}. ${row.email}: ${row.role} (${row.role_type})`);
    });

    return {
      enumExists: true,
      columnType: 'UserRole',
      invalidValues: 0,
      migrationCompleted: true,
      sampleData: sampleCheck.rows
    };

  } catch (error) {
    log(`❌ Validación falló: ${error.message}`, 'error');
    throw error;
  }
}

async function emergencyRollback(client) {
  logSection('ROLLBACK DE EMERGENCIA');

  try {
    log('🔄 Iniciando rollback de emergencia...');

    // Restaurar desde backup
    const restoreResult = await client.query(`
      TRUNCATE TABLE "User";
      INSERT INTO "User" SELECT * FROM users_backup_p3009;
    `);

    log(`✅ Restaurados ${restoreResult.rowCount} registros desde backup`);

    // Limpiar backup
    await client.query('DROP TABLE IF EXISTS users_backup_p3009');

    log('✅ Rollback completado. Sistema restaurado al estado anterior.');
    return { success: true, recordsRestored: restoreResult.rowCount };

  } catch (error) {
    log(`❌ Error en rollback: ${error.message}`, 'critical');
    log('🚨 ROLLBACK FALLÓ - CONTACTAR SOPORTE INMEDIATAMENTE', 'critical');
    throw error;
  }
}

async function main() {
  const command = process.argv[2] || 'in-place';

  log(`🚀 INICIANDO RECOVERY REMOTO PARA RAILWAY - ESTRATEGIA: ${command.toUpperCase()}`);

  let client;
  let backupInfo = null;

  try {
    // Conectar a Railway
    client = await getRailwayClient();

    // Diagnóstico inicial
    const diagnosis = await diagnoseCurrentState(client);

    // Backup de emergencia
    backupInfo = await createEmergencyBackup(client);

    // Ejecutar recovery según estrategia
    if (command === 'in-place') {
      const recoveryResult = await executeRecoveryInPlace(client, diagnosis);

      // Validar recovery
      const validation = await validateRecovery(client);

      logSection('RECOVERY COMPLETADO EXITOSAMENTE');
      log(`🎯 Estrategia: ${command}`);
      log(`💾 Backup creado: ${backupInfo.recordCount} registros`);
      log(`✅ Enum UserRole: ${validation.enumExists ? 'OK' : 'ERROR'}`);
      log(`✅ Columna role: ${validation.columnType}`);
      log(`✅ Valores válidos: ${validation.invalidValues === 0 ? 'SÍ' : 'NO'}`);
      log(`✅ Migración completada: ${validation.migrationCompleted ? 'SÍ' : 'NO'}`);

      log('\n🎉 RECOVERY EXITOSO - El error P3009 debería estar resuelto.');
      log('💡 Recomendación: Ejecutar deploy normal para verificar funcionamiento.');

    } else if (command === 'reset') {
      log('⚠️  RESET COMPLETO NO IMPLEMENTADO EN VERSIÓN REMOTA', 'warning');
      log('💡 Usa el script local recovery.js para reset completo');
      process.exit(1);
    } else {
      throw new Error(`Estrategia desconocida: ${command}`);
    }

  } catch (error) {
    log(`💥 RECOVERY FALLIDO: ${error.message}`, 'critical');

    // Intentar rollback automático
    if (client && backupInfo) {
      try {
        log('🔄 Intentando rollback automático...', 'warning');
        await emergencyRollback(client);
        log('✅ Rollback automático exitoso', 'warning');
      } catch (rollbackError) {
        log(`❌ Rollback automático falló: ${rollbackError.message}`, 'critical');
      }
    }

    logSection('RECOVERY ABORTADO');
    log('🔍 Revisar logs arriba para detalles del error');
    log('🛠️  Posibles soluciones:');
    log('   1. Revisar conectividad a Railway PostgreSQL');
    log('   2. Verificar permisos de la base de datos');
    log('   3. Contactar soporte de Railway si persiste');
    process.exit(1);

  } finally {
    if (client) {
      await client.end();
      log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar recovery remoto
main().catch(error => {
  console.error('💥 Error fatal en recovery remoto:', error);
  process.exit(1);
});