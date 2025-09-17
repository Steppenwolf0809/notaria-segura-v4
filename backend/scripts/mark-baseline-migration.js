#!/usr/bin/env node

/**
 * Script para marcar la migración de baseline como aplicada
 * Esto evita que Prisma intente recrear tablas existentes
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function markBaselineMigration() {
  try {
    console.log('🔄 Marcando migración de baseline como aplicada...');

    // Leer el contenido de la migración
    const migrationPath = join(__dirname, '../prisma/migrations/20250117000000_baseline/migration.sql');
    const migrationContent = readFileSync(migrationPath, 'utf8');

    // Calcular checksum del archivo
    const crypto = await import('crypto');
    const checksum = crypto.default.createHash('sha256').update(migrationContent).digest('base64');

    // Insertar registro en tabla de migraciones de Prisma
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (
        "id",
        "checksum",
        "finished_at",
        "migration_name",
        "logs",
        "rolled_back_at",
        "started_at",
        "applied_steps_count"
      ) VALUES (
        '20250117000000_baseline',
        ${checksum},
        NOW(),
        '20250117000000_baseline',
        NULL,
        NULL,
        NOW(),
        1
      )
      ON CONFLICT ("id") DO NOTHING;
    `;

    console.log('✅ Migración de baseline marcada como aplicada exitosamente');
    console.log('📝 ID de migración: 20250117000000_baseline');
    console.log('🔒 Checksum:', checksum);

  } catch (error) {
    console.error('❌ Error marcando migración de baseline:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  markBaselineMigration();
}

export { markBaselineMigration };