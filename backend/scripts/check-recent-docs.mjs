// Script para verificar documentos recientes en producción
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentDocs() {
    console.log('\n🔍 Buscando documentos creados hoy...\n');

    // Buscar documentos de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const docs = await prisma.document.findMany({
        where: {
            createdAt: { gte: today }
        },
        select: {
            id: true,
            protocolNumber: true,
            status: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log(`📄 Documentos de hoy: ${docs.length}`);

    for (const doc of docs) {
        const eventCount = await prisma.documentEvent.count({
            where: { documentId: doc.id }
        });
        console.log(`   ${doc.protocolNumber} | ${doc.status} | Eventos: ${eventCount}`);
    }

    // Buscar documentos con protocolo similar
    console.log('\n🔍 Buscando documentos con protocolo similar a 20261701018C00131...');
    const similar = await prisma.document.findMany({
        where: {
            protocolNumber: { contains: '20261701018' }
        },
        select: {
            id: true,
            protocolNumber: true,
            status: true
        },
        take: 5
    });

    console.log(`   Encontrados: ${similar.length}`);
    similar.forEach(d => console.log(`   - ${d.protocolNumber}`));

    // Contar total de documentos
    const total = await prisma.document.count();
    console.log(`\n📊 Total documentos en BD: ${total}`);

    await prisma.$disconnect();
}

checkRecentDocs().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
