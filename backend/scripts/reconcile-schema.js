/**
 * Script aditivo de reconciliación para PostgreSQL (Railway)
 * - Agrega valor 'AGRUPADO' al enum "DocumentStatus" si falta
 * - Agrega columna "notaCreditoEstadoPrevio" a tabla "documents" si falta
 * - NO elimina valores ni columnas
 *
 * Uso:
 *   NODE_ENV=production DATABASE_URL=postgres://... node scripts/reconcile-schema.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureEnumValue() {
  console.log('\n🔎 Verificando enum "DocumentStatus" para valor AGRUPADO...');
  try {
    // Verificar si existe el tipo y el valor
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'DocumentStatus' AND e.enumlabel = 'AGRUPADO'
    `);

    const exists = Array.isArray(rows) && rows.length > 0;
    if (exists) {
      console.log('✅ Enum "DocumentStatus" ya tiene el valor AGRUPADO');
      return;
    }

    console.log('🛠️ Agregando valor AGRUPADO a enum "DocumentStatus"...');
    await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentStatus" ADD VALUE 'AGRUPADO'`);
    console.log('✅ Valor AGRUPADO agregado correctamente');
  } catch (error) {
    // Si el tipo no existe o hay error, informar y continuar conservadoramente
    console.error('⚠️ No se pudo verificar/agregar el enum AGRUPADO automáticamente:', error.message);
    console.error('   Si el tipo no existe, ejecute las migraciones primero.');
  }
}

async function ensureColumn() {
  console.log('\n🔎 Verificando columna "notaCreditoEstadoPrevio" en tabla "documents"...');
  try {
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'notaCreditoEstadoPrevio'
    `);

    const exists = Array.isArray(rows) && rows.length > 0;
    if (exists) {
      console.log('✅ Columna ya existe');
      return;
    }

    console.log('🛠️ Agregando columna "notaCreditoEstadoPrevio" (TEXT NULL)...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "notaCreditoEstadoPrevio" TEXT`);
    console.log('✅ Columna agregada correctamente');
  } catch (error) {
    console.error('❌ Error agregando columna notaCreditoEstadoPrevio:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🔧 Reconciliación de schema - modo aditivo y conservador');
  await ensureEnumValue();
  await ensureColumn();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🎉 Reconciliación completada');
  })
  .catch(async (e) => {
    console.error('\n💥 Error en reconciliación:', e);
    await prisma.$disconnect();
    process.exit(1);
  });


