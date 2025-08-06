const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeDocuments() {
  try {
    console.log('📊 Analizando estado actual de documentos...\n');

    // 1. Total de documentos
    const totalDocs = await prisma.document.count();
    console.log('📄 Total de documentos:', totalDocs);

    // 2. Documentos por estado
    const docsByStatus = await prisma.document.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    console.log('\n📊 Documentos por estado:');
    docsByStatus.forEach(group => {
      console.log('   -', group.status + ':', group._count.status);
    });

    // 3. Documentos con/sin eventos
    const docsWithEvents = await prisma.document.findMany({
      select: {
        id: true,
        protocolNumber: true,
        status: true,
        clientName: true,
        createdAt: true,
        updatedAt: true,
        assignedToId: true,
        deliveredAt: true,
        _count: { documentEvents: true }
      }
    });

    const withEventsCount = docsWithEvents.filter(doc => doc._count.documentEvents > 0).length;
    const withoutEventsCount = docsWithEvents.filter(doc => doc._count.documentEvents === 0).length;

    console.log('\n📈 Estado de eventos:');
    console.log('   ✅ Con eventos:', withEventsCount);
    console.log('   ❌ Sin eventos:', withoutEventsCount);

    // 4. Mostrar ejemplos de documentos sin eventos
    const docsWithoutEvents = docsWithEvents.filter(doc => doc._count.documentEvents === 0).slice(0, 5);
    
    if (docsWithoutEvents.length > 0) {
      console.log('\n🔍 Ejemplos de documentos sin eventos:');
      docsWithoutEvents.forEach((doc, index) => {
        console.log('   ', index + 1 + '.', doc.protocolNumber);
        console.log('      Estado:', doc.status);
        console.log('      Cliente:', doc.clientName);
        console.log('      Creado:', doc.createdAt.toLocaleDateString());
        console.log('      Asignado:', doc.assignedToId ? 'Sí' : 'No');
        console.log('      Entregado:', doc.deliveredAt ? doc.deliveredAt.toLocaleDateString() : 'No');
        console.log('');
      });
    }

    // 5. Usuarios disponibles para asignar eventos
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, role: true }
    });

    console.log('👥 Usuarios disponibles para eventos:', users.length);
    users.forEach(user => {
      console.log('   -', user.firstName, user.lastName, '(' + user.role + ')');
    });

    return { 
      totalDocs, 
      withEventsCount, 
      withoutEventsCount, 
      docsWithoutEvents: docsWithEvents.filter(doc => doc._count.documentEvents === 0),
      users 
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDocuments();