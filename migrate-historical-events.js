/**
 * Script de migración para crear eventos históricos en documentos existentes
 * Crea eventos basados en el estado actual de cada documento
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateHistoricalEvents() {
  console.log('🚀 Iniciando migración de eventos históricos...\n');

  try {
    // 1. Analizar documentos sin eventos
    console.log('📊 1. Analizando documentos sin eventos...');
    
    const documentsWithoutEvents = await prisma.document.findMany({
      where: {
        events: { none: {} }
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        usuarioEntrega: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      }
    });

    console.log(`   📄 Encontrados ${documentsWithoutEvents.length} documentos sin eventos`);

    if (documentsWithoutEvents.length === 0) {
      console.log('✅ ¡Todos los documentos ya tienen eventos!');
      return;
    }

    // 2. Obtener usuario del sistema para eventos automáticos
    let systemUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!systemUser) {
      systemUser = await prisma.user.findFirst();
      if (!systemUser) {
        console.log('❌ Error: No hay usuarios en la base de datos');
        return;
      }
    }

    console.log(`   🤖 Usuario del sistema: ${systemUser.firstName} ${systemUser.lastName} (${systemUser.role})`);

    // 3. Migrar eventos por lotes
    console.log('\n📈 2. Creando eventos históricos...');
    let migratedCount = 0;
    const eventsToCreate = [];

    for (const document of documentsWithoutEvents) {
      const baseEventData = {
        documentId: document.id,
        ipAddress: 'migration-script',
        userAgent: 'historical-migration'
      };

      // Evento 1: Creación del documento
      const creationEvent = {
        ...baseEventData,
        userId: document.createdById || systemUser.id,
        eventType: 'DOCUMENT_CREATED',
        description: `Documento ${document.protocolNumber} creado`,
        details: {
          protocolNumber: document.protocolNumber,
          documentType: document.documentType,
          clientName: document.clientName,
          clientPhone: document.clientPhone,
          source: 'HISTORICAL_MIGRATION',
          totalFactura: document.totalFactura,
          migration: true,
          timestamp: document.createdAt.toISOString()
        },
        createdAt: document.createdAt // Usar fecha original
      };
      eventsToCreate.push(creationEvent);

      // Evento 2: Asignación (si está asignado)
      if (document.assignedToId && document.assignedTo) {
        const assignmentDate = new Date(document.createdAt);
        assignmentDate.setMinutes(assignmentDate.getMinutes() + 15); // 15 min después

        const assignmentEvent = {
          ...baseEventData,
          userId: document.createdById || systemUser.id,
          eventType: 'DOCUMENT_ASSIGNED',
          description: `Documento asignado a ${document.assignedTo.firstName} ${document.assignedTo.lastName}`,
          details: {
            assignedTo: document.assignedToId,
            matrizadorName: `${document.assignedTo.firstName} ${document.assignedTo.lastName}`,
            matrizadorRole: document.assignedTo.role,
            previousStatus: 'PENDIENTE',
            newStatus: 'EN_PROCESO',
            assignmentType: 'HISTORICAL_MIGRATION',
            migration: true,
            timestamp: assignmentDate.toISOString()
          },
          createdAt: assignmentDate
        };
        eventsToCreate.push(assignmentEvent);
      }

      // Evento 3: Cambio a LISTO (si está listo o entregado)
      if (['LISTO', 'ENTREGADO'].includes(document.status)) {
        const readyDate = new Date(document.updatedAt);
        readyDate.setHours(readyDate.getHours() - 2); // 2 horas antes de la última actualización

        const readyEvent = {
          ...baseEventData,
          userId: document.assignedToId || document.createdById || systemUser.id,
          eventType: 'STATUS_CHANGED',
          description: `Documento marcado como listo para entrega`,
          details: {
            previousStatus: 'EN_PROCESO',
            newStatus: 'LISTO',
            completedBy: document.assignedTo ? 
              `${document.assignedTo.firstName} ${document.assignedTo.lastName}` : 
              'Sistema',
            migration: true,
            timestamp: readyDate.toISOString()
          },
          createdAt: readyDate
        };
        eventsToCreate.push(readyEvent);
      }

      // Evento 4: Entrega (si está entregado)
      if (document.status === 'ENTREGADO') {
        const deliveryDate = document.fechaEntrega || document.updatedAt;

        const deliveryEvent = {
          ...baseEventData,
          userId: document.usuarioEntregaId || document.createdById || systemUser.id,
          eventType: 'STATUS_CHANGED',
          description: document.entregadoA ? 
            `Documento entregado a ${document.entregadoA}` :
            `Documento entregado a ${document.clientName}`,
          details: {
            previousStatus: 'LISTO',
            newStatus: 'ENTREGADO',
            deliveredTo: document.entregadoA || document.clientName,
            recipientId: document.cedulaReceptor,
            relationship: document.relacionTitular || 'titular',
            deliveredBy: document.usuarioEntrega ? 
              `${document.usuarioEntrega.firstName} ${document.usuarioEntrega.lastName}` :
              'Sistema de Recepción',
            verificationCode: document.codigoRetiro,
            invoicePresented: document.facturaPresenta,
            manualVerification: document.verificacionManual,
            observations: document.observacionesEntrega,
            migration: true,
            timestamp: deliveryDate.toISOString()
          },
          createdAt: deliveryDate
        };
        eventsToCreate.push(deliveryEvent);
      }
    }

    // 4. Insertar eventos en lotes
    console.log(`   📝 Creando ${eventsToCreate.length} eventos históricos...`);
    
    const batchSize = 50;
    for (let i = 0; i < eventsToCreate.length; i += batchSize) {
      const batch = eventsToCreate.slice(i, i + batchSize);
      await prisma.documentEvent.createMany({
        data: batch
      });
      
      migratedCount += batch.length;
      console.log(`   ✅ Procesados ${Math.min(i + batchSize, eventsToCreate.length)}/${eventsToCreate.length} eventos`);
    }

    // 5. Verificar resultados
    console.log('\n📊 3. Verificando resultados...');
    
    const totalDocuments = await prisma.document.count();
    const documentsWithEvents = await prisma.document.count({
      where: {
        events: { some: {} }
      }
    });
    const documentsWithoutEventsAfter = await prisma.document.count({
      where: {
        events: { none: {} }
      }
    });

    console.log(`   📄 Total de documentos: ${totalDocuments}`);
    console.log(`   ✅ Con eventos: ${documentsWithEvents}`);
    console.log(`   ❌ Sin eventos: ${documentsWithoutEventsAfter}`);
    console.log(`   📈 Eventos creados: ${migratedCount}`);

    // 6. Estadísticas por tipo de evento
    console.log('\n📈 4. Estadísticas de eventos creados:');
    const eventStats = await prisma.documentEvent.groupBy({
      by: ['eventType'],
      _count: { eventType: true },
      where: {
        details: {
          path: ['migration'],
          equals: true
        }
      }
    });

    eventStats.forEach(stat => {
      console.log(`   - ${stat.eventType}: ${stat._count.eventType}`);
    });

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log(`✅ Se crearon eventos históricos para ${documentsWithoutEvents.length} documentos`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateHistoricalEvents().catch(console.error);
}

module.exports = { migrateHistoricalEvents };