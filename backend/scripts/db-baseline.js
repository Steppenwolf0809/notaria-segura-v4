#!/usr/bin/env node

/**
 * Baseline de Prisma para DB ya existente (evita error P3005)
 *
 * ¿Qué es un baseline?
 * - Es una migración especial que representa el estado actual del esquema en la base de datos
 *   pero NO se ejecuta. Solo se marca como "aplicada" para que Prisma no intente recrear
 *   tablas ya existentes cuando aún no hay historial de migraciones.
 *
 * ¿Por qué correrlo ANTES de `prisma migrate deploy`?
 * - En Railway a veces la DB PostgreSQL ya tiene tablas (pre-cargadas o por `db push`).
 *   Si no existe historial en `_prisma_migrations`, `migrate deploy` falla con P3005
 *   ("Database is not empty"). Al marcar un baseline primero, Prisma puede continuar
 *   con `migrate deploy` sin intentar recrear lo existente.
 *
 * Idempotencia:
 * - Si ya hay migraciones aplicadas o ya existe un baseline aplicado, el script no hace nada.
 * - Si no hay migraciones aplicadas PERO la base está vacía, no hace nada.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

// Usamos `pg` para detectar si la DB tiene tablas reales.
// Está en dependencies del backend, por lo que está disponible en producción.
import pg from 'pg';

const rootDir = resolve(new URL('.', import.meta.url).pathname, '..');
const backendDir = resolve(rootDir, '..');
const prismaDir = join(backendDir, 'prisma');
const migrationsDir = join(prismaDir, 'migrations');
const schemaPath = './prisma/schema.prisma';

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...opts,
  });
  return res;
}

function npxPrisma(args) {
  return run('npx', ['prisma', ...args]);
}

function log(msg) {
  // Prefijo claro para logs en Railway
  console.log(`[db:baseline] ${msg}`);
}

async function databaseHasTables() {
  // Primero, si no hay DATABASE_URL, devolvemos false (no podemos comprobar)
  const url = process.env.DATABASE_URL;
  if (!url) {
    log('VARIABLE DATABASE_URL no definida; no se puede verificar tablas. Asumiendo DB vacía.');
    return false;
  }

  try {
    const client = new pg.Client({ connectionString: url, ssl: getSSLConfig(url) });
    await client.connect();
    const q = `
      SELECT COUNT(*)::int AS cnt
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog','information_schema')
        AND table_type = 'BASE TABLE';
    `;
    const { rows } = await client.query(q);
    await client.end();
    const count = rows?.[0]?.cnt ?? 0;
    log(`Tablas existentes detectadas: ${count}`);
    return Number(count) > 0;
  } catch (err) {
    log(`No se pudo consultar tablas vía pg: ${err.message}`);
  }

  // Fallback: leer salida de `prisma migrate status` en texto y buscar pista
  try {
    const res = npxPrisma(['migrate', 'status', `--schema=${schemaPath}`]);
    const txt = `${res.stdout}\n${res.stderr}`;
    if (/not empty/i.test(txt)) {
      log('Prisma indica que la base NO está vacía.');
      return true;
    }
  } catch (e) {
    // Ignorar
  }
  return false;
}

function getSSLConfig(url) {
  // Railway suele requerir SSL en Postgres administrados
  // Si es un file: (SQLite) o localhost, no aplicar SSL.
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function getMigrateStatusJSON() {
  const res = npxPrisma(['migrate', 'status', `--schema=${schemaPath}`, '--json']);
  if (res.status !== 0) {
    throw new Error(`Fallo al ejecutar prisma migrate status: ${res.stderr || res.stdout}`);
  }
  try {
    return JSON.parse(res.stdout);
  } catch (e) {
    throw new Error(`No se pudo parsear JSON de migrate status: ${e.message}\n${res.stdout}`);
  }
}

function findExistingBaselineId() {
  if (!existsSync(migrationsDir)) return null;
  const entries = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.endsWith('_baseline'))
    .map((d) => d.name)
    .sort(); // escoger la más reciente por nombre (timestamp prefijo)
  return entries.length ? entries[entries.length - 1] : null;
}

function createBaselineMigration() {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
  const baselineId = `${ts}_baseline`;
  const dir = join(migrationsDir, baselineId);
  if (!existsSync(migrationsDir)) mkdirSync(migrationsDir, { recursive: true });
  if (!existsSync(dir)) mkdirSync(dir);

  log(`Generando baseline con prisma migrate diff → ${baselineId}`);
  const diff = npxPrisma([
    'migrate',
    'diff',
    '--from-empty',
    '--to-schema-datamodel',
    'backend/prisma/schema.prisma',
    '--script',
  ]);
  if (diff.status !== 0) {
    throw new Error(`Fallo al generar baseline (migrate diff): ${diff.stderr || diff.stdout}`);
  }
  writeFileSync(join(dir, 'migration.sql'), diff.stdout, 'utf8');
  return baselineId;
}

function markBaselineApplied(baselineId) {
  log(`Marcando baseline como aplicada: ${baselineId}`);
  const res = npxPrisma([
    'migrate',
    'resolve',
    `--schema=${schemaPath}`,
    '--applied',
    baselineId,
  ]);
  if (res.status !== 0) {
    throw new Error(`Fallo al marcar baseline como aplicada: ${res.stderr || res.stdout}`);
  }
}

async function main() {
  log('Inicio baseline idempotente (P3005 guard)');

  // 1) Estado de migraciones Prisma (JSON)
  let statusJSON;
  try {
    statusJSON = getMigrateStatusJSON();
  } catch (err) {
    // Si falla status, continuamos con heurísticas; pero usualmente debería estar disponible
    log(`Aviso: no se pudo obtener migrate status en JSON: ${err.message}`);
  }

  const applied = statusJSON?.appliedMigrationNames ?? [];
  const hasApplied = applied.length > 0;
  const appliedBaseline = applied.find((n) => n.endsWith('_baseline'));

  if (appliedBaseline) {
    log(`Baseline ya aplicada (${appliedBaseline}). Nada que hacer.`);
    process.exit(0);
  }

  if (hasApplied) {
    log('Ya existen migraciones aplicadas. No se requiere baseline.');
    process.exit(0);
  }

  // 2) Si no hay migraciones aplicadas, verificar si la DB tiene tablas
  const hasTables = await databaseHasTables();
  if (!hasTables) {
    log('Base de datos vacía. No se requiere baseline.');
    process.exit(0);
  }

  // 3) Buscar baseline existente en carpeta
  let baselineId = findExistingBaselineId();
  if (baselineId) {
    log(`Baseline encontrado en filesystem: ${baselineId}`);
  } else {
    // 4) Crear baseline por diff si no existe
    baselineId = createBaselineMigration();
  }

  // 5) Marcar baseline como aplicada (idempotente si ya lo está)
  try {
    markBaselineApplied(baselineId);
  } catch (e) {
    // Si ya fue aplicada, Prisma devolverá error; intentamos detectar ese caso con un segundo status
    log(`Aviso al marcar baseline: ${e.message}`);
    try {
      const st = getMigrateStatusJSON();
      const ap = st?.appliedMigrationNames ?? [];
      if (ap.includes(baselineId)) {
        log('Confimado: baseline ya constaba como aplicada.');
        process.exit(0);
      }
    } catch (_) {}
    // Error real
    process.exit(1);
  }

  log('Baseline aplicado/registrado correctamente.');
}

main().catch((err) => {
  console.error('[db:baseline] Error no controlado:', err);
  process.exit(1);
});

