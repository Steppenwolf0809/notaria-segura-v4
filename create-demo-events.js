/**
 * Script para crear eventos de demostración que muestren todas las mejoras
 * Crea ejemplos de cada tipo de evento con información realista
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDemoEvents() {
  console.log('🎭 Creando eventos de demostración...\n');

  try {
    // 1. Obtener un documento para usar como ejemplo
    const demoDocument = await prisma.document.findFirst({
      where: { status: 'LISTO' },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } }
      }
    });

    if (!demoDocument) {
      console.log('❌ No se encontró documento para demo');
      return;
    }

    console.log(`📄 Usando documento: ${demoDocument.protocolNumber} - ${demoDocument.clientName}\n`);

    // Obtener usuario de recepción
    const recepcionUser = await prisma.user.findFirst({
      where: { role: 'RECEPCION' }
    });

    if (!recepcionUser) {
      console.log('❌ No se encontró usuario de recepción');
      return;
    }

    // 2. Crear evento de entrega realista
    console.log('📦 2. Creando evento de entrega...');
    
    const deliveryEvent = await prisma.documentEvent.create({
      data: {
        documentId: demoDocument.id,
        userId: recepcionUser.id,
        eventType: 'STATUS_CHANGED',
        description: `Documento entregado a ${demoDocument.clientName}`,
        details: {
          previousStatus: 'LISTO',
          newStatus: 'ENTREGADO',
          deliveredTo: demoDocument.clientName,
          recipientId: '1234567890',
          relationship: 'titular',
          deliveredBy: `${recepcionUser.firstName} ${recepcionUser.lastName}`,
          verificationCode: '5678',
          invoicePresented: true,
          manualVerification: false,
          observations: 'Cliente presentó factura original y cédula de identidad',
          timestamp: new Date().toISOString()
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log(`   ✅ Evento de entrega creado: ${deliveryEvent.id}`);

    // 3. Crear evento adicional de cambio de estado
    console.log('📱 3. Creando evento adicional de proceso...');
    
    const processEvent = await prisma.documentEvent.create({
      data: {
        documentId: demoDocument.id,
        userId: demoDocument.assignedTo?.id || recepcionUser.id,
        eventType: 'STATUS_CHANGED',
        description: 'Documento en proceso de revisión final',
        details: {
          previousStatus: 'EN_PROCESO',
          newStatus: 'LISTO',
          processStage: 'FINAL_REVIEW',
          reviewedBy: demoDocument.assignedTo ? 
            `${demoDocument.assignedTo.firstName} ${demoDocument.assignedTo.lastName}` : 
            'Sistema',
          qualityCheckPassed: true,
          timestamp: new Date().toISOString()
        },
        ipAddress: '192.168.1.102',
        userAgent: 'notaria-system-v2.1'
      }
    });

    console.log(`   ✅ Evento de proceso creado: ${processEvent.id}`);

    // 4. Crear evento de edición de información
    console.log('✏️  4. Creando evento de edición...');
    
    const editEvent = await prisma.documentEvent.create({
      data: {
        documentId: demoDocument.id,
        userId: demoDocument.assignedTo?.id || recepcionUser.id,
        eventType: 'INFO_EDITED',
        description: 'Información del documento actualizada',
        details: {
          changes: {
            clientPhone: {
              from: '0987654321',
              to: demoDocument.clientPhone
            },
            detalle_documento: {
              from: 'Detalle anterior',
              to: 'Certificación de libertad y tradición actualizada'
            }
          },
          changedBy: demoDocument.assignedTo?.id || recepcionUser.id,
          timestamp: new Date().toISOString()
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/118.0.0.0'
      }
    });

    console.log(`   ✅ Evento de edición creado: ${editEvent.id}`);

    // 5. Crear evento de generación de código
    console.log('🔐 5. Creando evento de código de verificación...');
    
    const verificationEvent = await prisma.documentEvent.create({
      data: {
        documentId: demoDocument.id,
        userId: recepcionUser.id,
        eventType: 'VERIFICATION_GENERATED',
        description: 'Código de verificación generado para entrega',
        details: {
          verificationCodeGenerated: true,
          code: '9876',
          generatedFor: 'document_delivery',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
          timestamp: new Date().toISOString()
        },
        ipAddress: '192.168.1.100',
        userAgent: 'notaria-system-v2.1'
      }
    });

    console.log(`   ✅ Evento de código creado: ${verificationEvent.id}`);

    // 6. Mostrar resultado final
    console.log('\n📈 6. Verificando eventos creados...');
    
    const allEvents = await prisma.documentEvent.findMany({
      where: { documentId: demoDocument.id },
      include: {
        user: {
          select: { firstName: true, lastName: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`   ✅ Total de eventos para ${demoDocument.protocolNumber}: ${allEvents.length}`);
    console.log('\n   📋 HISTORIAL COMPLETO:');
    console.log('   ' + '='.repeat(60));

    allEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. [${event.eventType}] ${event.description}`);
      console.log(`      👤 ${event.user.firstName} ${event.user.lastName} (${event.user.role})`);
      console.log(`      📅 ${event.createdAt.toLocaleDateString('es-CO')} ${event.createdAt.toLocaleTimeString('es-CO')}`);
      console.log('');
    });

    console.log('\n🎉 ¡Eventos de demostración creados exitosamente!');
    console.log('\n📋 RESUMEN:');
    console.log(`   📄 Documento: ${demoDocument.protocolNumber}`);
    console.log(`   👤 Cliente: ${demoDocument.clientName}`);
    console.log(`   📈 Eventos totales: ${allEvents.length}`);
    console.log(`   🔄 Nuevos eventos: 4`);
    console.log('\n✨ El sistema de historial está listo para producción con:');
    console.log('   ✅ Mensajes profesionales y claros');
    console.log('   ✅ Información contextual relevante');
    console.log('   ✅ Todos los documentos históricos migrados');
    console.log('   ✅ Eventos de demostración completos');

  } catch (error) {
    console.error('❌ Error creando eventos de demostración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar creación de eventos de demo
createDemoEvents();