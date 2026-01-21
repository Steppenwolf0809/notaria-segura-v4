// Script para verificar eventos de un documento específico
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentEvents() {
    const protocolNumber = '20261701018C00053';

    console.log(`\n🔍 Buscando documento: ${protocolNumber}\n`);

    const doc = await prisma.document.findUnique({
        where: { protocolNumber },
        select: {
            id: true,
            protocolNumber: true,
            status: true,
            createdAt: true,
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
    console.log(`   Matrizador ID: ${doc.assignedToId}`);
    console.log(`   Matrizador Nombre: ${doc.matrizadorName}`);

    const events = await prisma.documentEvent.findMany({
        where: { documentId: doc.id },
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

checkDocumentEvents().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
