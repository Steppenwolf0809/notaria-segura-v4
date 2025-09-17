#!/usr/bin/env node

/**
 * Baseline de Prisma para DB ya existente (evita error P3005)
 * Implementación compatible con Prisma 5.22 (sin `migrate status --json`).
 *
 * Estrategia:
 * - Detecta por SQL vía `pg` si hay tablas en `public`.
 * - Verifica si existe `public.prisma_migrations` y si ya hay una fila *_baseline.
 * - Si hay tablas y no hay baseline aplicada:
 *   - Usa `prisma migrate diff --from-empty --to-schema-datamodel --script` para generar baseline
 *   - Guarda en ./prisma/migrations/<timestamp>_baseline/migration.sql
 *   - Registra con `prisma migrate resolve --applied <timestamp>_baseline`.
 * - Idempotente: si la baseline ya está marcada, no hace nada y sale con 0.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import path, { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import pg from 'pg';

function log(msg) {
  console.log(`[db:baseline] ${msg}`);
}

// Rutas y constantes
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '..');
const prismaDir = join(backendDir, 'prisma');
const migrationsDir = join(prismaDir, 'migrations');
const SCHEMA = path.resolve(__dirname, '../prisma/schema.prisma');

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
  // Siempre pasar ruta absoluta de schema
  return run('npx', ['prisma', ...args, `--schema=${SCHEMA}`]);
}

function getSSLConfig(url) {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

async function pgQuery(sql, params = []) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no definida');
  const client = new pg.Client({ connectionString: url, ssl: getSSLConfig(url) });
  await client.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    await client.end();
  }
}

async function getDbState() {
  const url = process.env.DATABASE_URL || '';
  if (!url) {
    log('DATABASE_URL no definida. Asumiendo entorno local sin Postgres. No hacer nada.');
    return { engine: 'unknown', hasTables: false, hasPrismaMigrations: false, baselineName: null };
  }

  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    log(`DATABASE_URL no es Postgres (${url.split(':')[0]}). Omitiendo baseline.`);
    return { engine: 'other', hasTables: false, hasPrismaMigrations: false, baselineName: null };
  }

  // 1) Contar tablas en esquema public
  const tablesRes = await pgQuery(
    `SELECT COUNT(*)::int AS cnt
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  const hasTables = Number(tablesRes.rows?.[0]?.cnt ?? 0) > 0;
  log(`Tablas en public: ${tablesRes.rows?.[0]?.cnt ?? 0}`);

  // 2) Ver si existe tabla prisma_migrations
  const existsRes = await pgQuery(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema='public' AND table_name='prisma_migrations'
     ) AS exists`);
  const hasPrismaMigrations = !!existsRes.rows?.[0]?.exists;
  log(`Tabla prisma_migrations existe: ${hasPrismaMigrations}`);

  // 3) Si existe, buscar *_baseline aplicado
  let baselineName = null;
  if (hasPrismaMigrations) {
    const baseRes = await pgQuery(
      `SELECT migration_name
       FROM public.prisma_migrations
       WHERE migration_name LIKE '%_baseline'
       ORDER BY finished_at DESC NULLS LAST, started_at DESC NULLS LAST
       LIMIT 1`
    );
    baselineName = baseRes.rows?.[0]?.migration_name || null;
    if (baselineName) log(`Baseline ya aplicada en DB: ${baselineName}`);
  }

  return { engine: 'postgres', hasTables, hasPrismaMigrations, baselineName };
}

function findExistingBaselineIdOnDisk() {
  if (!existsSync(migrationsDir)) return null;
  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.endsWith('_baseline'))
    .map((d) => d.name)
    .sort();
  return dirs.length ? dirs[dirs.length - 1] : null;
}

function createBaselineMigrationOnDisk() {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
  const baselineId = `${ts}_baseline`;
  const dir = join(migrationsDir, baselineId);
  if (!existsSync(migrationsDir)) mkdirSync(migrationsDir, { recursive: true });
  if (!existsSync(dir)) mkdirSync(dir);

  log(`Generando baseline con prisma migrate diff → ${baselineId}`);
  const diff = run('npx', ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', SCHEMA, '--script']);
  if (diff.status !== 0) {
    throw new Error(`Fallo al generar baseline (migrate diff): ${diff.stderr || diff.stdout}`);
  }
  writeFileSync(join(dir, 'migration.sql'), diff.stdout, 'utf8');
  return baselineId;
}

function resolveBaselineApplied(baselineId) {
  log(`Marcando baseline como aplicada: ${baselineId}`);
  const res = npxPrisma(['migrate', 'resolve', '--applied', baselineId]);
  if (res.status !== 0) {
    throw new Error(`Fallo al marcar baseline como aplicada: ${res.stderr || res.stdout}`);
  }
}

async function main() {
  log('Inicio baseline idempotente (modo Prisma 5.22)');

  const state = await getDbState();

  // Si no es Postgres o no hay tablas, no hacer nada
  if (state.engine !== 'postgres') {
    log('Entorno no-Postgres o sin DATABASE_URL. Nada que hacer.');
    process.exit(0);
  }

  if (!state.hasTables) {
    log('Base de datos sin tablas en public. No se requiere baseline.');
    process.exit(0);
  }

  if (state.baselineName) {
    log(`Baseline ya aplicada en la DB (${state.baselineName}). Nada que hacer.`);
    process.exit(0);
  }

  // Si hay tablas y no hay baseline registrada, crear/usar baseline local y resolverla como aplicada
  let baselineId = findExistingBaselineIdOnDisk();
  if (baselineId) {
    log(`Baseline encontrada en filesystem: ${baselineId}`);
  } else {
    baselineId = createBaselineMigrationOnDisk();
  }

  // Registrar baseline como aplicada (crea prisma_migrations si no existe)
  resolveBaselineApplied(baselineId);

  log('Baseline registrado correctamente.');
}

main().catch((err) => {
  console.error('[db:baseline] Error:', err?.message || err);
  process.exit(1);
});
