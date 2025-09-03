#!/usr/bin/env node

/**
 * Reasigna documentos de CERTIFICACION/OTROS sin asignar al usuario con rol ARCHIVO.
 * - No cambia el estado del documento (respeta LISTO/EN_PROCESO/etc.)
 * - Registra un DocumentEvent por cada reasignación
 *
 * Uso:
 *   node scripts/reassign-archivo-documents.js           # dry-run (no aplica cambios)
 *   node scripts/reassign-archivo-documents.js apply     # aplica cambios
 *   node scripts/reassign-archivo-documents.js apply 200 # aplica hasta 200 documentos
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const doApply = (process.argv[2] || '').toLowerCase() === 'apply';
  const limitArg = parseInt(process.argv[3] || '0', 10);
  const maxDocs = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : undefined;

  console.log('🔎 Buscando usuario con rol ARCHIVO...');
  // Intentar seleccionar a Maria por email si existe; fallback al primer ARCHIVO activo
  let archivoUser = await prisma.user.findFirst({
    where: { email: 'maria.diaz@notaria.com', role: 'ARCHIVO', isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true, role: true }
  });
  if (!archivoUser) {
    archivoUser = await prisma.user.findFirst({
      where: { role: 'ARCHIVO', isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, firstName: true, lastName: true, email: true, role: true }
    });
  }

  if (!archivoUser) {
    console.error('❌ No se encontró un usuario activo con rol ARCHIVO. Abortando.');
    process.exit(1);
  }

  console.log(`👤 Usuario ARCHIVO objetivo: ${archivoUser.firstName} ${archivoUser.lastName} <${archivoUser.email}>`);

  // Seleccionar documentos candidatos: CERTIFICACION/OTROS sin assignedToId
  console.log('🔎 Buscando documentos CERTIFICACION/OTROS sin asignación...');
  const candidates = await prisma.document.findMany({
    where: {
      assignedToId: null,
      documentType: { in: ['CERTIFICACION', 'OTROS'] }
    },
    select: {
      id: true,
      protocolNumber: true,
      documentType: true,
      status: true,
      clientName: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' },
    take: maxDocs
  });

  if (candidates.length === 0) {
    console.log('✅ No hay documentos para reasignar. Nada que hacer.');
    process.exit(0);
  }

  console.log(`📋 Documentos encontrados: ${candidates.length}${maxDocs ? ` (limit ${maxDocs})` : ''}`);
  candidates.slice(0, 10).forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.protocolNumber} [${d.documentType}] - estado: ${d.status}`);
  });
  if (candidates.length > 10) {
    console.log(`  ... y ${candidates.length - 10} más`);
  }

  if (!doApply) {
    console.log('\n🧪 Modo dry-run. Ejecute con "apply" para aplicar cambios:');
    console.log('   node scripts/reassign-archivo-documents.js apply');
    process.exit(0);
  }

  console.log('\n🚀 Aplicando reasignación...');
  let updated = 0;

  // Procesar por lotes para registrar eventos individuales
  for (const doc of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.document.update({
          where: { id: doc.id },
          data: { assignedToId: archivoUser.id }
        });
        await tx.documentEvent.create({
          data: {
            documentId: doc.id,
            userId: archivoUser.id, // registramos al propio usuario ARCHIVO como agente técnico de la reasignación
            eventType: 'DOCUMENT_ASSIGNED',
            description: `Reasignación masiva a ARCHIVO (${archivoUser.firstName} ${archivoUser.lastName})`,
            details: {
              assignmentType: 'MAINTENANCE_ARCHIVO',
              reason: 'Backfill histórico CERTIFICACION/OTROS sin asignar',
              assignedTo: archivoUser.id,
              previousAssignedTo: null,
              previousStatus: doc.status,
              newStatus: doc.status
            },
            ipAddress: 'maintenance-script',
            userAgent: 'reassign-archivo-documents.js'
          }
        });
      });
      updated++;
    } catch (e) {
      console.error(`❌ Error reasignando ${doc.protocolNumber}:`, e.message);
    }
  }

  console.log(`\n✅ Reasignación completada. Total reasignados: ${updated}/${candidates.length}`);
}

main()
  .catch((e) => {
    console.error('Error inesperado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

