#!/usr/bin/env node

/**
 * Script de migración para convertir eventType de String a enum DocumentEventType
 * Ejecutar después de actualizar el schema.prisma
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeo de strings existentes a valores del enum
const EVENT_TYPE_MAPPING = {
  'DOCUMENT_CREATED': 'DOCUMENT_CREATED',
  'DOCUMENT_ASSIGNED': 'DOCUMENT_ASSIGNED',
  'STATUS_CHANGED': 'STATUS_CHANGED',
  'VERIFICATION_GENERATED': 'VERIFICATION_GENERATED',
  'WHATSAPP_SENT': 'WHATSAPP_SENT',
  'EXTRACTION_SNAPSHOT': 'EXTRACTION_SNAPSHOT',
  'EXTRACTION_APPLIED': 'EXTRACTION_APPLIED',
  'STATUS_UNDO': 'STATUS_UNDO',
  'NOTE_ADDED': 'NOTE_ADDED',
  // Valores por defecto para strings no mapeados
  'default': 'UNKNOWN'
};

async function migrateDocumentEventTypes() {
  console.log('🔄 Iniciando migración de DocumentEvent.eventType...');

  try {
    // Obtener todos los eventos que necesitan migración
    const events = await prisma.documentEvent.findMany({
      where: {
        eventType: {
          not: {
            in: Object.keys(EVENT_TYPE_MAPPING).filter(key => key !== 'default')
          }
        }
      }
    });

    console.log(`📊 Encontrados ${events.length} eventos para migrar`);

    if (events.length === 0) {
      console.log('✅ No hay eventos para migrar');
      return;
    }

    // Procesar eventos en lotes para evitar timeouts
    const batchSize = 100;
    let processed = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      await prisma.$transaction(async (tx) => {
        for (const event of batch) {
          const mappedType = EVENT_TYPE_MAPPING[event.eventType] || EVENT_TYPE_MAPPING.default;

          if (mappedType !== event.eventType) {
            await tx.documentEvent.update({
              where: { id: event.id },
              data: { eventType: mappedType }
            });
            updated++;
          } else {
            skipped++;
          }

          processed++;
        }
      });

      console.log(`📈 Progreso: ${processed}/${events.length} eventos procesados`);
    }

    console.log('✅ Migración completada:');
    console.log(`   • ${updated} eventos actualizados`);
    console.log(`   • ${skipped} eventos ya correctos`);
    console.log(`   • ${processed} eventos procesados total`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateDocumentEventTypes()
  .then(() => {
    console.log('🎉 Migración finalizada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en migración:', error);
    process.exit(1);
  });