// Script para verificar los documentos más recientes
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findRecent() {
    console.log('\n🔍 Buscando los 20 documentos más recientes...\n');

    const docs = await prisma.document.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
            id: true,
            protocolNumber: true,
            status: true,
            createdAt: true,
            clientName: true
        }
    });

    docs.forEach((d, i) => {
        console.log(`${i + 1}. ${d.protocolNumber} | ${d.status} | ${d.createdAt.toISOString().substring(0, 10)} | ${d.clientName?.substring(0, 25)}`);
    });

    // Contar por fecha
    console.log('\n📊 Conteo de documentos por fecha (últimos 10 días):');
    const result = await prisma.$queryRaw`
    SELECT DATE(created_at) as fecha, COUNT(*) as total 
    FROM "Document" 
    WHERE created_at > NOW() - INTERVAL '10 days'
    GROUP BY DATE(created_at) 
    ORDER BY fecha DESC
    LIMIT 10
  `;
    console.log(result);

    await prisma.$disconnect();
}

findRecent().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
