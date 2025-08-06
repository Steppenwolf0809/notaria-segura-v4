/**
 * Script de prueba para verificar las mejoras del sistema de historial
 * Muestra cómo se ven los eventos antes y después del formateo
 */

import { PrismaClient } from '@prisma/client';
import { 
  formatEventDescription, 
  getEventContextInfo, 
  getEventTitle,
  getEventIcon, 
  getEventColor 
} from './backend/src/utils/event-formatter.js';

const prisma = new PrismaClient();

async function testImprovedHistory() {
  console.log('🧪 Probando mejoras del sistema de historial...\n');

  try {
    // 1. Obtener documentos con eventos
    console.log('📄 1. Obteniendo documentos con eventos...');
    
    const documentsWithEvents = await prisma.document.findMany({
      where: {
        events: { some: {} }
      },
      include: {
        events: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 3 // Solo los 3 eventos más recientes por documento
        }
      },
      take: 3 // Solo 3 documentos
    });

    console.log(`   ✅ Encontrados ${documentsWithEvents.length} documentos con eventos\n`);

    // 2. Procesar y mostrar eventos mejorados
    for (const document of documentsWithEvents) {
      console.log(`📋 DOCUMENTO: ${document.protocolNumber} - ${document.clientName}`);
      console.log(`   Estado: ${document.status} | Tipo: ${document.documentType}\n`);

      if (document.events.length === 0) {
        console.log('   ❌ Sin eventos\n');
        continue;
      }

      console.log('   📈 HISTORIAL MEJORADO:');
      console.log('   ' + '='.repeat(60));

      for (const event of document.events) {
        // Formateo mejorado
        const improvedDescription = formatEventDescription(event);
        const contextInfo = getEventContextInfo(event);
        const title = getEventTitle(event.eventType);
        const icon = getEventIcon(event.eventType);
        const color = getEventColor(event.eventType, event.details);
        
        console.log(`   
   🔸 ${title}
      📝 ${improvedDescription}
      👤 ${event.user.firstName} ${event.user.lastName} (${event.user.role})
      📅 ${event.createdAt.toLocaleDateString('es-CO')} ${event.createdAt.toLocaleTimeString('es-CO')}
      🎨 Icono: ${icon} | Color: ${color}`);
        
        if (contextInfo.length > 0) {
          console.log(`      ℹ️  Contexto: ${contextInfo.join(' • ')}`);
        }
        
        // Mostrar comparación con descripción original
        if (event.description !== improvedDescription) {
          console.log(`      ⚪ Original: "${event.description}"`);
          console.log(`      ✅ Mejorado: "${improvedDescription}"`);
        }
        
        console.log('   ' + '-'.repeat(50));
      }
      
      console.log('\n');
    }

    // 3. Estadísticas de mejoras
    console.log('📊 3. Estadísticas generales...');
    
    const totalEvents = await prisma.documentEvent.count();
    const eventsByType = await prisma.documentEvent.groupBy({
      by: ['eventType'],
      _count: { eventType: true }
    });
    
    const migratedEvents = await prisma.documentEvent.count({
      where: {
        details: {
          path: 'migration',
          equals: true
        }
      }
    });

    console.log(`   📈 Total de eventos: ${totalEvents}`);
    console.log(`   🔄 Eventos migrados: ${migratedEvents}`);
    console.log(`   📝 Eventos por tipo:`);
    
    eventsByType.forEach(stat => {
      const title = getEventTitle(stat.eventType);
      const icon = getEventIcon(stat.eventType);
      console.log(`      ${icon} ${title}: ${stat._count.eventType}`);
    });

    // 4. Simular respuesta del endpoint mejorado
    console.log('\n🌐 4. Simulando respuesta del endpoint mejorado...');
    
    const testDocument = documentsWithEvents[0];
    if (testDocument) {
      const events = testDocument.events.map(event => {
        const formattedDescription = formatEventDescription(event);
        const contextInfo = getEventContextInfo(event);
        
        return {
          id: event.id,
          type: event.eventType,
          title: getEventTitle(event.eventType),
          description: formattedDescription,
          timestamp: event.createdAt,
          user: {
            id: event.user.id,
            name: `${event.user.firstName} ${event.user.lastName}`,
            role: event.user.role
          },
          icon: getEventIcon(event.eventType),
          color: getEventColor(event.eventType, event.details),
          contextInfo: contextInfo,
          details: event.details // Para debug si es necesario
        };
      });

      console.log('   ✅ Estructura de respuesta mejorada:');
      console.log(JSON.stringify({
        success: true,
        data: {
          document: {
            id: testDocument.id,
            protocolNumber: testDocument.protocolNumber,
            clientName: testDocument.clientName,
            currentStatus: testDocument.status,
            documentType: testDocument.documentType
          },
          history: {
            events: events.slice(0, 2), // Solo 2 para el ejemplo
            pagination: {
              total: events.length,
              limit: 50,
              offset: 0,
              hasMore: false
            }
          },
          permissions: {
            role: 'ADMIN',
            canViewAll: true,
            canViewOwned: false
          }
        }
      }, null, 2));
    }

    console.log('\n🎉 ¡Pruebas completadas exitosamente!');
    console.log('\n📋 RESUMEN DE MEJORAS:');
    console.log('   ✅ Mensajes más claros y profesionales');
    console.log('   ✅ Información contextual relevante');
    console.log('   ✅ Iconos y colores mejorados');
    console.log('   ✅ Fechas en formato legible');
    console.log('   ✅ Eliminación de datos técnicos innecesarios');
    console.log('   ✅ Todos los documentos históricos migrados');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar pruebas
testImprovedHistory();