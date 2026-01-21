// Script para verificar el documento en producción por ID
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
        console.log('❌ Documento no encontrado con ese ID');

        // Buscar por protocolo
        console.log('\n🔍 Buscando por protocolo C00131...');
        const byProtocol = await prisma.document.findFirst({
            where: { protocolNumber: { contains: 'C00131' } }
        });
        console.log('Resultado:', byProtocol ? byProtocol.protocolNumber : 'No encontrado');

        // Mostrar últimos 5 documentos
        console.log('\n📋 Últimos 5 documentos creados:');
        const recent = await prisma.document.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, protocolNumber: true, createdAt: true, clientName: true }
        });
        recent.forEach(d => console.log(`   ${d.protocolNumber} | ${d.createdAt}`));

        await prisma.$disconnect();
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
        console.log('⚠️ NO HAY EVENTOS - BUG CONFIRMADO: la creación del documento no generó eventos');
    } else {
        events.forEach((e, i) => {
            console.log(`\n${i + 1}. [${e.eventType}]`);
            console.log(`   Desc: ${e.description?.substring(0, 80)}`);
            console.log(`   User: ${e.user?.firstName} ${e.user?.lastName}`);
        });
    }

    await prisma.$disconnect();
}

checkDoc().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
