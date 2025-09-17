#!/usr/bin/env node

/**
 * SISTEMA DE BACKUP AUTOMÁTICO PARA NOTARÍA SEGURA
 * Implementa estrategia de backup multinivel de Architect
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
  console.log(`\n${'='.repeat(50)}`);
  console.log(`💾 ${title.toUpperCase()}`);
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

function ensureBackupDirectory() {
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
    log(`📁 Directorio de backups creado: ${backupsDir}`);
  }
  return backupsDir;
}

async function createFullBackup() {
  logSection('CREANDO BACKUP COMPLETO');

  const backupsDir = ensureBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-full-${timestamp}.sql`;

  try {
    log('💾 Generando backup completo de base de datos...');
    execSync(`pg_dump "${process.env.DATABASE_URL}" > "${path.join(backupsDir, filename)}"`, {
      stdio: 'pipe'
    });

    // Verificar que el archivo se creó y tiene contenido
    const stats = fs.statSync(path.join(backupsDir, filename));
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    log(`✅ Backup completo creado: ${filename} (${sizeMB} MB)`);
    return { filename, size: stats.size, type: 'full' };

  } catch (error) {
    log(`❌ Error creando backup completo: ${error.message}`, 'error');
    throw error;
  }
}

async function createSchemaBackup() {
  logSection('CREANDO BACKUP DE ESQUEMA');

  const backupsDir = ensureBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-schema-${timestamp}.sql`;

  try {
    log('🏗️  Generando backup de estructura de BD...');
    execSync(`pg_dump --schema-only "${process.env.DATABASE_URL}" > "${path.join(backupsDir, filename)}"`, {
      stdio: 'pipe'
    });

    const stats = fs.statSync(path.join(backupsDir, filename));
    const sizeKB = (stats.size / 1024).toFixed(2);

    log(`✅ Backup de esquema creado: ${filename} (${sizeKB} KB)`);
    return { filename, size: stats.size, type: 'schema' };

  } catch (error) {
    log(`❌ Error creando backup de esquema: ${error.message}`, 'error');
    throw error;
  }
}

async function createCriticalDataBackup() {
  logSection('CREANDO BACKUP DE DATOS CRÍTICOS');

  const backupsDir = ensureBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-critical-${timestamp}.sql`;

  try {
    log('🔐 Generando backup de datos críticos (users, documents)...');

    // Crear archivo con datos críticos
    const dumpCommand = `pg_dump --data-only --table=users --table=documents "${process.env.DATABASE_URL}" > "${path.join(backupsDir, filename)}"`;
    execSync(dumpCommand, { stdio: 'pipe' });

    // Verificar contenido
    const stats = fs.statSync(path.join(backupsDir, filename));
    const sizeKB = (stats.size / 1024).toFixed(2);

    // Contar registros
    const userCount = await queryDb('SELECT COUNT(*) as count FROM users');
    const docCount = await queryDb('SELECT COUNT(*) as count FROM documents');

    log(`✅ Backup de datos críticos creado: ${filename} (${sizeKB} KB)`);
    log(`   📊 Contenido: ${userCount.rows[0].count} usuarios, ${docCount.rows[0].count} documentos`);

    return {
      filename,
      size: stats.size,
      type: 'critical',
      users: parseInt(userCount.rows[0].count),
      documents: parseInt(docCount.rows[0].count)
    };

  } catch (error) {
    log(`❌ Error creando backup crítico: ${error.message}`, 'error');
    throw error;
  }
}

async function createIncrementalBackup() {
  logSection('CREANDO BACKUP INCREMENTAL');

  const backupsDir = ensureBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-incremental-${timestamp}.sql`;

  try {
    log('📈 Generando backup incremental (últimas 24h)...');

    // Backup de datos modificados en las últimas 24 horas
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const recentUsers = await queryDb(`
      SELECT COUNT(*) as count FROM users
      WHERE "updatedAt" > $1 OR "createdAt" > $1
    `, [yesterday]);

    const recentDocs = await queryDb(`
      SELECT COUNT(*) as count FROM documents
      WHERE "updatedAt" > $1 OR "createdAt" > $1
    `, [yesterday]);

    // Crear backup con datos recientes
    const dumpCommand = `
      pg_dump --data-only "${process.env.DATABASE_URL}" \
        --table=users --table=documents --table=document_events \
        --table=whatsapp_notifications \
        -T 'SELECT * FROM users WHERE "updatedAt" <= \'${yesterday}\'' \
        -T 'SELECT * FROM documents WHERE "updatedAt" <= \'${yesterday}\'' \
        -T 'SELECT * FROM document_events WHERE "createdAt" <= \'${yesterday}\'' \
        -T 'SELECT * FROM whatsapp_notifications WHERE "createdAt" <= \'${yesterday}\'' \
        > "${path.join(backupsDir, filename)}"
    `;

    execSync(dumpCommand.replace(/\n/g, ' '), { stdio: 'pipe' });

    const stats = fs.statSync(path.join(backupsDir, filename));
    const sizeKB = (stats.size / 1024).toFixed(2);

    log(`✅ Backup incremental creado: ${filename} (${sizeKB} KB)`);
    log(`   📊 Cambios recientes: ${recentUsers.rows[0].count} usuarios, ${recentDocs.rows[0].count} documentos`);

    return {
      filename,
      size: stats.size,
      type: 'incremental',
      recentUsers: parseInt(recentUsers.rows[0].count),
      recentDocuments: parseInt(recentDocs.rows[0].count)
    };

  } catch (error) {
    log(`❌ Error creando backup incremental: ${error.message}`, 'error');
    throw error;
  }
}

async function createMetadataBackup() {
  logSection('CREANDO BACKUP DE METADATOS');

  const backupsDir = ensureBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-metadata-${timestamp}.json`;

  try {
    log('📋 Recopilando metadatos del sistema...');

    const metadata = {
      timestamp: new Date().toISOString(),
      database: {
        version: (await queryDb('SELECT version()')).rows[0].version,
        timezone: (await queryDb('SHOW timezone')).rows[0].timezone
      },
      tables: {},
      enums: {},
      indexes: {}
    };

    // Información de tablas
    const tablesResult = await queryDb(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    for (const table of tablesResult.rows) {
      const countResult = await queryDb(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
      metadata.tables[table.table_name] = {
        count: parseInt(countResult.rows[0].count),
        type: table.table_type
      };
    }

    // Información de enums
    const enumsResult = await queryDb(`
      SELECT t.typname as enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname
    `);

    enumsResult.rows.forEach(enumItem => {
      metadata.enums[enumItem.enum_name] = enumItem.values;
    });

    // Información de índices
    const indexesResult = await queryDb(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    indexesResult.rows.forEach(index => {
      if (!metadata.indexes[index.tablename]) {
        metadata.indexes[index.tablename] = [];
      }
      metadata.indexes[index.tablename].push({
        name: index.indexname,
        definition: index.indexdef
      });
    });

    // Guardar metadata
    fs.writeFileSync(path.join(backupsDir, filename), JSON.stringify(metadata, null, 2));

    const stats = fs.statSync(path.join(backupsDir, filename));
    const sizeKB = (stats.size / 1024).toFixed(2);

    log(`✅ Backup de metadatos creado: ${filename} (${sizeKB} KB)`);
    return { filename, size: stats.size, type: 'metadata' };

  } catch (error) {
    log(`❌ Error creando backup de metadatos: ${error.message}`, 'error');
    throw error;
  }
}

function cleanupOldBackups() {
  logSection('LIMPIANDO BACKUPS ANTIGUOS');

  try {
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) return;

    const files = fs.readdirSync(backupsDir)
      .map(file => ({
        name: file,
        path: path.join(backupsDir, file),
        stats: fs.statSync(path.join(backupsDir, file))
      }))
      .filter(file => file.name.startsWith('backup-'))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);

    // Mantener solo los últimos 10 backups de cada tipo
    const types = ['full', 'schema', 'critical', 'incremental', 'metadata'];
    let deletedCount = 0;

    types.forEach(type => {
      const typeFiles = files.filter(f => f.name.includes(`-${type}-`));
      if (typeFiles.length > 10) {
        const toDelete = typeFiles.slice(10);
        toDelete.forEach(file => {
          fs.unlinkSync(file.path);
          deletedCount++;
        });
      }
    });

    if (deletedCount > 0) {
      log(`🗑️  ${deletedCount} backups antiguos eliminados`);
    } else {
      log('✅ No hay backups antiguos para limpiar');
    }

  } catch (error) {
    log(`⚠️  Error limpiando backups antiguos: ${error.message}`, 'warning');
  }
}

async function runBackupStrategy(strategy = 'full') {
  log(`🚀 INICIANDO BACKUP CON ESTRATEGIA: ${strategy.toUpperCase()}`);

  const results = [];
  const startTime = Date.now();

  try {
    switch (strategy) {
      case 'full':
        results.push(await createFullBackup());
        results.push(await createSchemaBackup());
        results.push(await createCriticalDataBackup());
        break;

      case 'critical':
        results.push(await createCriticalDataBackup());
        break;

      case 'incremental':
        results.push(await createIncrementalBackup());
        break;

      case 'metadata':
        results.push(await createMetadataBackup());
        break;

      case 'all':
        results.push(await createFullBackup());
        results.push(await createSchemaBackup());
        results.push(await createCriticalDataBackup());
        results.push(await createIncrementalBackup());
        results.push(await createMetadataBackup());
        break;

      default:
        throw new Error(`Estrategia de backup desconocida: ${strategy}`);
    }

    // Limpiar backups antiguos
    cleanupOldBackups();

    // Reporte final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    logSection('BACKUP COMPLETADO EXITOSAMENTE');
    log(`⏱️  Duración: ${duration}s`);
    log(`💾 Tamaño total: ${totalSizeMB} MB`);
    log(`📦 Archivos creados: ${results.length}`);

    results.forEach(result => {
      const sizeMB = (result.size / (1024 * 1024)).toFixed(2);
      log(`   ✅ ${result.filename} (${sizeMB} MB) - Tipo: ${result.type}`);
    });

    // Guardar registro de backup
    const backupLog = {
      timestamp: new Date().toISOString(),
      strategy,
      duration: parseFloat(duration),
      totalSize,
      files: results
    };

    const logPath = path.join(__dirname, '..', 'backups', 'backup-log.json');
    const existingLog = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
    existingLog.push(backupLog);
    fs.writeFileSync(logPath, JSON.stringify(existingLog.slice(-50), null, 2)); // Mantener últimos 50

    return results;

  } catch (error) {
    log(`💥 BACKUP FALLIDO: ${error.message}`, 'critical');
    throw error;
  }
}

async function main() {
  const strategy = process.argv.find(arg => arg.startsWith('--strategy='))?.split('=')[1] || 'full';

  await runBackupStrategy(strategy);
}

// Ejecutar backup
main().catch(error => {
  console.error('💥 Error fatal en backup:', error);
  process.exit(1);
});