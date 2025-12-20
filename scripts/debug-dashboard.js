
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugDashboard() {
    try {
        console.log('--- Debugging Dashboard Stats ---');

        console.log('1. Checking User Roles (Matrizadores)...');
        const matrizadores = await prisma.user.findMany({
            where: { role: 'MATRIZADOR', isActive: true },
            select: { id: true, firstName: true, lastName: true, role: true }
        });
        console.log(`Found ${matrizadores.length} active matrizadores.`);
        matrizadores.forEach(m => console.log(` - ${m.firstName} ${m.lastName} (ID: ${m.id})`));

        console.log('\n2. Checking Document Counts (Active)...');
        const activeCount = await prisma.document.count({
            where: {
                status: { notIn: ['ENTREGADO', 'ANULADO_NOTA_CREDITO'] }
            }
        });
        console.log(`Active Count: ${activeCount}`);

        console.log('\n3. Checking Critical Count (> 15 days)...');
        const thresholdDate = new Date();
        thresholdDate.setDate(new Date().getDate() - 15);
        const criticalCount = await prisma.document.count({
            where: {
                status: { notIn: ['ENTREGADO', 'ANULADO_NOTA_CREDITO'] },
                createdAt: { lt: thresholdDate }
            }
        });
        console.log(`Critical Count (> 15 days): ${criticalCount}`);

        console.log('\n4. Checking Total Billed (Current Month)...');
        const now = new Date();
        const startBilledDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const billedAggregate = await prisma.document.aggregate({
            _sum: { totalFactura: true },
            where: {
                status: { not: 'ANULADO_NOTA_CREDITO' },
                createdAt: { gte: startBilledDate }
            }
        });
        console.log(`Total Billed: ${billedAggregate._sum.totalFactura || 0}`);

        console.log('\n5. Checking One Document (Sample)...');
        const doc = await prisma.document.findFirst({
            where: { status: { notIn: ['ENTREGADO', 'ANULADO_NOTA_CREDITO'] } },
            select: { protocolNumber: true, status: true, totalFactura: true, createdAt: true }
        });
        console.log('Sample Document:', doc);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

debugDashboard();
