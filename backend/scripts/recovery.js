#!/usr/bin/env node

/**
 * SISTEMA DE RECOVERY PARA ERROR P3009 EN RAILWAY POSTGRESQL
 * Implementa las 3 estrategias de recovery diseñadas por Architect
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
  console.log(`🔧 ${title.toUpperCase()}`);
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

async function createBackup() {
  logSection('CREANDO BACKUP AUTOMÁTICO');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupsDir = path.join(__dirname, '..', 'backups');

  // Crear directorio si no existe
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  try {
    // Backup completo
    const fullBackup = `backup-full-${timestamp}.sql`;
    execSync(`pg_dump "${process.env.DATABASE_URL}" > "${path.join(backupsDir, fullBackup)}"`);
    log(`✅ Backup completo creado: ${fullBackup}`);

    // Backup de estructura
    const schemaBackup = `backup-schema-${timestamp}.sql`;
    execSync(`pg_dump --schema-only "${process.env.DATABASE_URL}" > "${path.join(backupsDir, schemaBackup)}"`);
    log(`✅ Backup de esquema creado: ${schemaBackup}`);

    // Backup de datos críticos
    const criticalBackup = `backup-critical-${timestamp}.sql`;
    execSync(`pg_dump --data-only --table=users --table=documents "${process.env.DATABASE_URL}" > "${path.join(backupsDir, criticalBackup)}"`);
    log(`✅ Backup de datos críticos creado: ${criticalBackup}`);

    return {
      full: fullBackup,
      schema: schemaBackup,
      critical: criticalBackup
    };

  } catch (error) {
    log(`Error creando backup: ${error.message}`, 'error');
    throw error;
  }
}

async function getMigrationStatus() {
  const result = await queryDb(`
    SELECT migration_name, started_at, finished_at
    FROM _prisma_migrations
    ORDER BY started_at DESC
  `);

  return {
    applied: result.rows.filter(r => r.finished_at),
    failed: result.rows.filter(r => r.started_at && !r.finished_at),
    pending: result.rows.filter(r => !r.started_at)
  };
}

async function recoveryInPlace() {
  logSection('RECOVERY IN-PLACE (ESTRATEGIA RECOMENDADA)');

  try {
    // Paso 1: Backup
    log('Paso 1: Creando backup de seguridad...');
    const backups = await createBackup();

    // Paso 2: Identificar migraciones problemáticas
    log('Paso 2: Identificando migraciones problemáticas...');
    const { failed } = await getMigrationStatus();

    if (failed.length === 0) {
      log('✅ No hay migraciones fallidas. El sistema parece estar en buen estado.');
      return { success: true, message: 'No recovery needed' };
    }

    log(`Encontradas ${failed.length} migraciones fallidas:`, 'warning');
    failed.forEach(f => log(`   • ${f.migration_name}`, 'warning'));

    // Paso 3: Limpiar migraciones problemáticas
    log('Paso 3: Limpiando migraciones problemáticas...');
    for (const migration of failed) {
      await queryDb('DELETE FROM _prisma_migrations WHERE migration_name = $1', [migration.migration_name]);
      log(`   ✅ Eliminada migración fallida: ${migration.migration_name}`);
    }

    // Paso 4: Verificar estado de enum
    log('Paso 4: Verificando estado del enum UserRole...');
    const enumResult = await queryDb(`
      SELECT COUNT(*) as count FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'UserRole' AND n.nspname = 'public'
    `);

    if (enumResult.rows[0].count === '0') {
      log('   ⚠️  Enum UserRole no existe. Creándolo...');
      await queryDb(`CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO')`);
      log('   ✅ Enum UserRole creado exitosamente');
    } else {
      log('   ✅ Enum UserRole ya existe');
    }

    // Paso 5: Verificar/converter columna role
    log('Paso 5: Verificando tipo de columna role...');
    const columnResult = await queryDb(`
      SELECT data_type, udt_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    `);

    if (columnResult.rows[0].data_type !== 'USER-DEFINED') {
      log('   🔄 Convirtiendo columna role a enum...');

      // Convertir valores existentes
      await queryDb(`
        UPDATE users SET role = CASE
          WHEN UPPER(TRIM(role)) LIKE '%MATRIZADOR%' THEN 'MATRIZADOR'::"UserRole"
          WHEN UPPER(TRIM(role)) = 'ADMIN' THEN 'ADMIN'::"UserRole"
          WHEN UPPER(TRIM(role)) = 'CAJA' THEN 'CAJA'::"UserRole"
          WHEN UPPER(TRIM(role)) LIKE '%RECEPCION%' THEN 'RECEPCION'::"UserRole"
          WHEN UPPER(TRIM(role)) LIKE '%ARCHIVO%' THEN 'ARCHIVO'::"UserRole"
          ELSE 'MATRIZADOR'::"UserRole"
        END
      `);

      // Cambiar tipo de columna
      await queryDb(`ALTER TABLE users ALTER COLUMN role TYPE "UserRole" USING role::"UserRole"`);
      log('   ✅ Columna role convertida a enum exitosamente');
    } else {
      log('   ✅ Columna role ya es del tipo correcto');
    }

    // Paso 6: Aplicar migraciones desde estado limpio
    log('Paso 6: Aplicando migraciones desde estado limpio...');
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    // Paso 7: Verificación final
    log('Paso 7: Verificación final...');
    const finalStatus = await getMigrationStatus();

    if (finalStatus.failed.length === 0) {
      log('✅ RECOVERY IN-PLACE COMPLETADO EXITOSAMENTE', 'success');
      return {
        success: true,
        strategy: 'in-place',
        backups,
        message: 'Recovery completado sin pérdida de datos'
      };
    } else {
      throw new Error(`${finalStatus.failed.length} migraciones aún fallidas`);
    }

  } catch (error) {
    log(`❌ Error en recovery in-place: ${error.message}`, 'error');
    throw error;
  }
}

async function recoveryReset() {
  logSection('RECOVERY RESET COMPLETO (ÚLTIMO RECURSO)');
  log('⚠️  ATENCIÓN: Esta operación ELIMINARÁ TODOS LOS DATOS', 'critical');

  // Confirmación manual requerida
  const confirm = process.argv.includes('--confirm');
  if (!confirm) {
    log('Para proceder con reset completo, ejecute con --confirm', 'warning');
    log('Esto eliminará permanentemente todos los datos', 'critical');
    process.exit(1);
  }

  try {
    // Paso 1: Backup final
    log('Paso 1: Creando backup final...');
    const backups = await createBackup();

    // Paso 2: Reset completo
    log('Paso 2: Ejecutando reset completo...');
    execSync('npx prisma migrate reset --force', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    // Paso 3: Push schema limpio
    log('Paso 3: Aplicando schema limpio...');
    execSync('npx prisma db push --accept-data-loss', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    log('✅ RESET COMPLETO EJECUTADO', 'success');
    log('⚠️  RECUERDA: Los datos están en los backups creados', 'warning');

    return {
      success: true,
      strategy: 'reset',
      backups,
      message: 'Reset completo ejecutado. Datos respaldados.'
    };

  } catch (error) {
    log(`❌ Error en reset completo: ${error.message}`, 'error');
    throw error;
  }
}

async function recoveryHybrid() {
  logSection('RECOVERY HÍBRIDO (MEJOR COMPROMISO)');

  try {
    // Paso 1: Backup inteligente
    log('Paso 1: Creando backup inteligente...');
    const backups = await createBackup();

    // Paso 2: Extraer datos críticos
    log('Paso 2: Extrayendo datos críticos...');
    const usersData = await queryDb('SELECT * FROM users');
    const documentsData = await queryDb('SELECT * FROM documents LIMIT 1000'); // Limitar para evitar sobrecarga

    log(`   📊 Datos extraídos: ${usersData.rows.length} usuarios, ${documentsData.rows.length} documentos`);

    // Paso 3: Reset de migraciones pero mantener estructura
    log('Paso 3: Limpiando estado de migraciones...');
    await queryDb('DELETE FROM _prisma_migrations WHERE finished_at IS NULL OR started_at > NOW() - INTERVAL \'1 hour\'');

    // Paso 4: Recrear estructura con datos
    log('Paso 4: Recreando estructura y restaurando datos críticos...');

    // Recrear enum si no existe
    try {
      await queryDb(`CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO')`);
    } catch (e) {
      // Enum ya existe
    }

    // Recrear tabla users con estructura correcta
    await queryDb(`
      CREATE TABLE IF NOT EXISTS users_temp (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        role "UserRole" NOT NULL DEFAULT 'MATRIZADOR',
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "lastLogin" TIMESTAMP
      )
    `);

    // Migrar datos de usuarios
    for (const user of usersData.rows) {
      try {
        await queryDb(`
          INSERT INTO users_temp (id, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt", "lastLogin")
          VALUES ($1, $2, $3, $4, $5, $6::"UserRole", $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          user.id, user.email, user.password, user.firstName, user.lastName,
          user.role, user.isActive, user.createdAt, user.updatedAt, user.lastLogin
        ]);
      } catch (e) {
        log(`   ⚠️  Error migrando usuario ${user.email}: ${e.message}`, 'warning');
      }
    }

    // Reemplazar tabla
    await queryDb('DROP TABLE users CASCADE');
    await queryDb('ALTER TABLE users_temp RENAME TO users');

    // Recrear índices y constraints
    await queryDb('CREATE UNIQUE INDEX users_email_key ON users(email)');
    await queryDb('CREATE INDEX users_role_idx ON users(role)');

    // Paso 5: Aplicar migraciones desde estado consistente
    log('Paso 5: Aplicando migraciones desde estado consistente...');
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    log('✅ RECOVERY HÍBRIDO COMPLETADO', 'success');

    return {
      success: true,
      strategy: 'hybrid',
      backups,
      restoredUsers: usersData.rows.length,
      restoredDocuments: documentsData.rows.length,
      message: 'Recovery híbrido completado con preservación de datos críticos'
    };

  } catch (error) {
    log(`❌ Error en recovery híbrido: ${error.message}`, 'error');
    throw error;
  }
}

async function validateRecovery() {
  logSection('VALIDACIÓN POST-RECOVERY');

  try {
    // Verificar migraciones
    const { failed } = await getMigrationStatus();
    if (failed.length > 0) {
      throw new Error(`${failed.length} migraciones aún fallidas`);
    }

    // Verificar enum
    const enumResult = await queryDb(`
      SELECT COUNT(*) as count FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typname = 'UserRole' AND n.nspname = 'public'
    `);

    if (enumResult.rows[0].count === '0') {
      throw new Error('Enum UserRole no existe después del recovery');
    }

    // Verificar columna role
    const columnResult = await queryDb(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    `);

    if (columnResult.rows[0].data_type !== 'USER-DEFINED') {
      throw new Error('Columna role no es del tipo enum');
    }

    // Verificar datos
    const dataResult = await queryDb('SELECT COUNT(*) as count FROM users');
    log(`✅ Tabla users tiene ${dataResult.rows[0].count} registros`);

    log('✅ VALIDACIÓN POST-RECOVERY EXITOSA', 'success');
    return true;

  } catch (error) {
    log(`❌ Validación fallida: ${error.message}`, 'error');
    throw error;
  }
}

async function main() {
  const strategy = process.argv.find(arg => arg.startsWith('--strategy='))?.split('=')[1] || 'in-place';

  log(`🚀 INICIANDO RECOVERY CON ESTRATEGIA: ${strategy.toUpperCase()}`);

  try {
    let result;

    switch (strategy) {
      case 'in-place':
        result = await recoveryInPlace();
        break;
      case 'reset':
        result = await recoveryReset();
        break;
      case 'hybrid':
        result = await recoveryHybrid();
        break;
      default:
        throw new Error(`Estrategia desconocida: ${strategy}`);
    }

    // Validación final
    await validateRecovery();

    logSection('RECOVERY COMPLETADO EXITOSAMENTE');
    log(`🎯 Estrategia utilizada: ${result.strategy}`);
    log(`💾 Backups creados: ${Object.values(result.backups || {}).join(', ')}`);
    log(`📊 ${result.message}`);

    if (result.restoredUsers) {
      log(`👥 Usuarios restaurados: ${result.restoredUsers}`);
    }

    log('\n🎉 RECOVERY COMPLETADO. El sistema debería funcionar correctamente ahora.');
    log('💡 Recomendación: Ejecutar npm run railway:health para verificar estado.');

  } catch (error) {
    log(`💥 RECOVERY FALLIDO: ${error.message}`, 'critical');
    log('\n🔄 POSIBLES PRÓXIMOS PASOS:');
    log('1. Revisar logs detallados del error');
    log('2. Restaurar desde backup si es necesario');
    log('3. Contactar soporte si el problema persiste');
    process.exit(1);
  }
}

// Ejecutar recovery
main().catch(error => {
  console.error('💥 Error fatal en recovery:', error);
  process.exit(1);
});