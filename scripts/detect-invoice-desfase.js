/**
 * Script para detectar facturas con desfase entre PendingReceivable e Invoice
 * Esto ocurre cuando el sync CXC actualiza pero el sync billing no
 * 
 * Uso: node scripts/detect-invoice-desfase.js
 */

import { db as prisma } from '../backend/src/db.js';

async function detectDesfase() {
    console.log('\n========================================');
    console.log('Detectando desfase entre PendingReceivable e Invoice');
    console.log('========================================\n');

    try {
        // 1. Buscar todas las facturas pagadas en PendingReceivable
        const paidInPending = await prisma.pendingReceivable.findMany({
            where: {
                status: 'PAID',
                balance: 0
            },
            select: {
                invoiceNumberRaw: true,
                invoiceNumber: true,
                clientName: true,
                totalAmount: true,
                totalPaid: true,
                lastSyncAt: true
            }
        });

        console.log(`✓ Encontradas ${paidInPending.length} facturas pagadas en PendingReceivable`);

        // 2. Verificar cuáles no están pagadas en Invoice
        const desfaseList = [];

        for (const pending of paidInPending) {
            const invoice = await prisma.invoice.findFirst({
                where: {
                    OR: [
                        { invoiceNumberRaw: pending.invoiceNumberRaw },
                        { invoiceNumberRaw: pending.invoiceNumberRaw?.replace(/-/g, '') },
                        { invoiceNumber: pending.invoiceNumber }
                    ]
                },
                select: {
                    id: true,
                    invoiceNumber: true,
                    invoiceNumberRaw: true,
                    status: true,
                    paidAmount: true,
                    saldoPendiente: true,
                    documentId: true,
                    lastSyncAt: true,
                    koinorModifiedAt: true
                }
            });

            if (!invoice) {
                // No existe en Invoice
                desfaseList.push({
                    type: 'MISSING_IN_INVOICE',
                    invoiceNumberRaw: pending.invoiceNumberRaw,
                    clientName: pending.clientName,
                    pendingStatus: 'PAID',
                    invoiceStatus: 'NOT_FOUND',
                    totalAmount: pending.totalAmount
                });
            } else if (invoice.status !== 'PAID' || invoice.saldoPendiente > 0) {
                // Existe pero no está pagada
                desfaseList.push({
                    type: 'NOT_PAID_IN_INVOICE',
                    invoiceNumberRaw: pending.invoiceNumberRaw,
                    invoiceId: invoice.id,
                    clientName: pending.clientName,
                    pendingStatus: 'PAID',
                    invoiceStatus: invoice.status,
                    pendingBalance: 0,
                    invoiceBalance: invoice.saldoPendiente,
                    totalAmount: pending.totalAmount,
                    documentId: invoice.documentId,
                    lastSyncAt: invoice.lastSyncAt,
                    koinorModifiedAt: invoice.koinorModifiedAt
                });
            }
        }

        // 3. Mostrar resultados
        console.log(`\n⚠️  DESFASE DETECTADO: ${desfaseList.length} facturas`);

        if (desfaseList.length === 0) {
            console.log('\n✅ No hay desfase. Todas las facturas están sincronizadas.');
        } else {
            // Agrupar por tipo
            const missing = desfaseList.filter(d => d.type === 'MISSING_IN_INVOICE');
            const notPaid = desfaseList.filter(d => d.type === 'NOT_PAID_IN_INVOICE');

            if (missing.length > 0) {
                console.log(`\n📋 No existen en Invoice (${missing.length}):`);
                missing.forEach(d => {
                    console.log(`   - ${d.invoiceNumberRaw} | ${d.clientName?.substring(0, 30)} | $${d.totalAmount}`);
                });
            }

            if (notPaid.length > 0) {
                console.log(`\n📋 No están pagadas en Invoice (${notPaid.length}):`);
                notPaid.forEach(d => {
                    console.log(`   - ${d.invoiceNumberRaw} | ${d.clientName?.substring(0, 30)} | Status: ${d.invoiceStatus} | Saldo: $${d.invoiceBalance}`);
                });
            }

            // 4. Generar script de corrección
            console.log('\n========================================');
            console.log('SCRIPT DE CORRECCIÓN:');
            console.log('========================================');
            console.log('\nPara corregir estas facturas, ejecuta:');
            
            notPaid.forEach(d => {
                console.log(`node scripts/sync-invoice-from-pending.js ${d.invoiceNumberRaw}`);
            });

            // 5. Estadísticas
            const totalAmount = desfaseList.reduce((sum, d) => sum + Number(d.totalAmount || 0), 0);
            console.log(`\n💰 Monto total afectado: $${totalAmount.toFixed(2)}`);
        }

        return desfaseList;

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

detectDesfase();
