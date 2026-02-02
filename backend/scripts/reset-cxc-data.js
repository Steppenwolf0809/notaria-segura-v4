import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Iniciando limpieza de datos CXC...');

    try {
        // 1. Eliminar Pagos (Dependencia de Facturas)
        const deletedPayments = await prisma.payment.deleteMany({});
        console.log(`✅ ${deletedPayments.count} pagos eliminados.`);

        // 2. Eliminar Facturas (Source of Truth actual)
        const deletedInvoices = await prisma.invoice.deleteMany({});
        console.log(`✅ ${deletedInvoices.count} facturas eliminadas.`);

        // 3. Eliminar PendingReceivables (Tabla snapshot antigua)
        const deletedPending = await prisma.pendingReceivable.deleteMany({});
        console.log(`✅ ${deletedPending.count} registros de pending_receivables eliminados.`);

        // 4. Eliminar Logs de Importación (Opcional, pero bueno para limpiar)
        const deletedLogs = await prisma.importLog.deleteMany({});
        console.log(`✅ ${deletedLogs.count} logs de importación eliminados.`);

        console.log('✨ Base de datos CXC limpia. El reporte debe estar en 0.');

    } catch (error) {
        console.error('❌ Error al limpiar datos:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
