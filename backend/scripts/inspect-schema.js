/**
 * Inspección de schema real en PostgreSQL (Railway)
 * - Lista columnas de "documents" y tipos
 * - Lista valores del enum "DocumentStatus"
 * - No realiza cambios
 *
 * Uso:
 *   NODE_ENV=production DATABASE_URL=postgres://... node scripts/inspect-schema.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listDocumentColumns() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents'
    ORDER BY ordinal_position
  `);
  return rows;
}

async function listDocumentStatusEnum() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT e.enumlabel AS value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'DocumentStatus'
    ORDER BY e.enumsortorder
  `);
  return rows.map(r => r.value);
}

async function main() {
  console.log('🔎 Inspeccionando schema de base de datos...');
  const [columns, enumValues] = await Promise.all([
    listDocumentColumns(),
    listDocumentStatusEnum().catch(() => [])
  ]);

  console.log('\n📄 Tabla: documents (columnas)');
  for (const c of columns) {
    console.log(` - ${c.column_name} :: ${c.data_type} ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  }

  console.log('\n🔤 Enum DocumentStatus (valores)');
  if (enumValues.length === 0) {
    console.log(' (no disponible o tipo no existe)');
  } else {
    console.log(' ' + enumValues.join(', '));
  }
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });


