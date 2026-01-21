// Script para verificar el documento recién creado localmente
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDoc() {
    const docId = '79b2299d-f9a9-4d9f-bb2e-d7de68e72f71';

    console.log(`\n🔍 Buscando documento con ID: ${docId}\n`);

    const doc = await prisma.document.findUnique({
        where: { id: docId },
        select: {
            id: true,
            protocolNumber: true,
            status: true,
            createdAt: true,
            clientName: true,
            assignedToId: true,
            matrizadorName: true
        }
    });

    if (!doc) {
        console.log('❌ Documento no encontrado');
        return;
    }

    console.log('📄 Documento encontrado:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Protocolo: ${doc.protocolNumber}`);
    console.log(`   Estado: ${doc.status}`);
    console.log(`   Creado: ${doc.createdAt}`);
    console.log(`   Cliente: ${doc.clientName}`);
    console.log(`   Matrizador: ${doc.matrizadorName}`);

    const events = await prisma.documentEvent.findMany({
        where: { documentId: docId },
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: { firstName: true, lastName: true }
            }
        }
    });

    console.log(`\n📋 Eventos encontrados: ${events.length}`);

    if (events.length === 0) {
        console.log('⚠️ NO HAY EVENTOS - El documento no tiene historial registrado');
        console.log('\n🔍 Esto indica un BUG en la creación del evento DOCUMENT_CREATED');
    } else {
        events.forEach((e, i) => {
            console.log(`\n${i + 1}. [${e.eventType}]`);
            console.log(`   Descripción: ${e.description?.substring(0, 100)}`);
            console.log(`   Usuario: ${e.user?.firstName} ${e.user?.lastName}`);
            console.log(`   Fecha: ${e.createdAt}`);
        });
    }

    await prisma.$disconnect();
}

checkDoc().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
