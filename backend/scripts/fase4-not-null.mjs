/**
 * OLA B - Fase 4: Hacer notary_id NOT NULL en todas las tablas tenant-scoped.
 * Pre-requisito: backfill completo (0 NULLs) + auto-inject middleware activo.
 *
 * Ejecutar: DATABASE_URL="..." node scripts/fase4-not-null.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_TABLES = [
  'users',
  'documents',
  'document_events',
  'invoices',
  'whatsapp_notifications',
  'pending_receivables',
  'whatsapp_templates',
  'escrituras_qr',
  'protocolos_uafe',
  'formulario_uafe_asignaciones',
  'import_logs',
  'mensajes_internos',
  'encuestas_satisfaccion',
  'consultas_lista_control',
];

async function main() {
  console.log('=== OLA B - Fase 4: Hacer notary_id NOT NULL ===\n');

  // 1. Verificar que no hay NULLs
  console.log('--- Paso 1: Verificar que no hay NULLs ---');
  let hasNulls = false;
  for (const table of TENANT_TABLES) {
    const result = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "${table}" WHERE notary_id IS NULL`
    );
    const nullCount = result[0].count;
    if (nullCount > 0) {
      console.log(`  ${table}: ${nullCount} NULLs - CORRIGIENDO...`);
      await prisma.$executeRawUnsafe(`UPDATE "${table}" SET notary_id = 1 WHERE notary_id IS NULL`);
      const verify = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "${table}" WHERE notary_id IS NULL`
      );
      if (verify[0].count > 0) {
        console.error(`  FALLO: ${table} aun tiene ${verify[0].count} NULLs`);
        hasNulls = true;
      } else {
        console.log(`  ${table}: backfill corregido OK`);
      }
    } else {
      console.log(`  ${table}: 0 NULLs OK`);
    }
  }

  if (hasNulls) {
    console.error('\nABORTADO: Hay NULLs que no se pudieron corregir.');
    process.exit(1);
  }
  console.log('');

  // 2. Alterar columnas a NOT NULL
  console.log('--- Paso 2: ALTER COLUMN SET NOT NULL ---');
  for (const table of TENANT_TABLES) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" ALTER COLUMN notary_id SET NOT NULL`
      );
      console.log(`  ${table}: notary_id SET NOT NULL OK`);
    } catch (e) {
      console.error(`  ${table}: ERROR - ${e.message.substring(0, 100)}`);
    }
  }
  console.log('');

  // 3. Agregar DEFAULT 1 para safety (N18 es la unica notaria)
  console.log('--- Paso 3: SET DEFAULT 1 (safety para N18) ---');
  for (const table of TENANT_TABLES) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" ALTER COLUMN notary_id SET DEFAULT 1`
      );
      console.log(`  ${table}: DEFAULT 1 OK`);
    } catch (e) {
      console.error(`  ${table}: ERROR - ${e.message.substring(0, 100)}`);
    }
  }
  console.log('');

  // 4. Verificacion final
  console.log('--- Paso 4: Verificacion final ---');
  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND column_name='notary_id'
    ORDER BY table_name
  `);
  let allOk = true;
  for (const c of cols) {
    const ok = c.is_nullable === 'NO';
    if (!ok) allOk = false;
    console.log(`  ${c.table_name}: nullable=${c.is_nullable} default=${c.column_default} ${ok ? 'OK' : 'FALLO'}`);
  }

  console.log(`\n=== Fase 4 ${allOk ? 'COMPLETADA' : 'CON PROBLEMAS'} ===`);
}

main()
  .catch(e => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
