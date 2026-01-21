// Script para buscar documentos con patrón flexible
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findDoc() {
    // Buscar todas las variantes posibles
    console.log('\n🔍 Buscando documento C00131...\n');

    const docs = await prisma.document.findMany({
        where: {
            OR: [
                { protocolNumber: { contains: 'C00131' } },
                { protocolNumber: { contains: '00131' } }
            ]
        },
        select: {
            id: true,
            protocolNumber: true,
            status: true,
            createdAt: true
        },
        take: 20
    });

    console.log(`📄 Documentos encontrados: ${docs.length}`);

    for (const doc of docs) {
        const eventCount = await prisma.documentEvent.count({
            where: { documentId: doc.id }
        });
        console.log(`\n   Protocol: ${doc.protocolNumber}`);
        console.log(`   Status: ${doc.status}`);
        console.log(`   Created: ${doc.createdAt}`);
        console.log(`   Events: ${eventCount}`);
    }

    // Buscar documentos de ECUASANITAS
    console.log('\n\n🔍 Buscando documentos de ECUASANITAS...');
    const ecuasanitas = await prisma.document.findMany({
        where: {
            clientName: { contains: 'ECUASANITAS', mode: 'insensitive' }
        },
        select: {
            id: true,
            protocolNumber: true,
            status: true,
            createdAt: true,
            clientName: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log(`📄 Documentos ECUASANITAS: ${ecuasanitas.length}`);
    ecuasanitas.forEach(d => {
        console.log(`   ${d.protocolNumber} | ${d.status} | ${d.createdAt}`);
    });

    await prisma.$disconnect();
}

findDoc().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
