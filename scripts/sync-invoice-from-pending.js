/**
 * Script para sincronizar Invoice desde PendingReceivable
 * Cuando una factura está pagada en CXC pero no en Invoice
 * 
 * Uso: node scripts/sync-invoice-from-pending.js 001002-00125027
 */

import { db as prisma } from '../backend/src/db.js';

async function syncInvoiceFromPending(invoiceNumberRaw) {
    console.log(`\n========================================`);
    console.log(`Sincronizando Invoice desde PendingReceivable`);
    console.log(`Factura: ${invoiceNumberRaw}`);
    console.log(`========================================\n`);

    try {
        // 1. Obtener datos de PendingReceivable
        const pending = await prisma.pendingReceivable.findUnique({
            where: { invoiceNumberRaw }
        });

        if (!pending) {
            console.log('❌ No encontrada en PendingReceivable');
            return;
        }

        if (pending.status !== 'PAID' && pending.balance > 0) {
            console.log(`⚠️  PendingReceivable no está pagada (status: ${pending.status}, balance: ${pending.balance})`);
            console.log('No se requiere sincronización.');
            return;
        }

        console.log('✅ PendingReceivable está pagada:');
        console.log(`   - Balance: $${pending.balance}`);
        console.log(`   - Total Paid: $${pending.totalPaid}`);
        console.log(`   - Status: ${pending.status}`);

        // 2. Buscar Invoice
        const invoice = await prisma.invoice.findFirst({
            where: {
                OR: [
                    { invoiceNumberRaw },
                    { invoiceNumberRaw: invoiceNumberRaw.replace(/-/g, '') }
                ]
            }
        });

        if (!invoice) {
            console.log('\n❌ No encontrada en Invoice');
            console.log('Se debe crear la factura primero.');
            return;
        }

        console.log('\n📋 Invoice actual:');
        console.log(`   - ID: ${invoice.id}`);
        console.log(`   - Status: ${invoice.status}`);
        console.log(`   - Paid Amount: $${invoice.paidAmount}`);
        console.log(`   - Saldo Pendiente: $${invoice.saldoPendiente}`);
        console.log(`   - Document ID: ${invoice.documentId}`);

        // 3. Actualizar Invoice
        console.log('\n🔄 Actualizando Invoice...');

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                status: 'PAID',
                paidAmount: pending.totalAmount, // Total pagado = monto total
                saldoPendiente: 0,
                fechaUltimoPago: pending.lastPaymentDate || new Date(),
                lastSyncAt: new Date(),
                syncSource: 'MANUAL_SYNC_FROM_CXC'
            }
        });

        console.log('✅ Invoice actualizada:');
        console.log(`   - Nuevo Status: ${updatedInvoice.status}`);
        console.log(`   - Nuevo Paid Amount: $${updatedInvoice.paidAmount}`);
        console.log(`   - Nuevo Saldo: $${updatedInvoice.saldoPendiente}`);

        // 4. Actualizar Document si existe
        if (invoice.documentId) {
            console.log('\n🔄 Actualizando Document...');
            
            const updatedDoc = await prisma.document.update({
                where: { id: invoice.documentId },
                data: {
                    pagoConfirmado: true,
                    updatedAt: new Date()
                }
            });

            console.log('✅ Document actualizado:');
            console.log(`   - Pago Confirmado: ${updatedDoc.pagoConfirmado}`);
            console.log(`   - Protocol: ${updatedDoc.protocolNumber}`);
        }

        // 5. Crear evento de auditoría
        await prisma.documentEvent.create({
            data: {
                documentId: invoice.documentId,
                userId: 1, // System user
                eventType: 'PAYMENT_SYNC',
                description: `Sincronización manual de pago desde CXC - Factura ${invoiceNumberRaw}`,
                details: JSON.stringify({
                    invoiceNumberRaw,
                    previousStatus: invoice.status,
                    newStatus: 'PAID',
                    previousBalance: invoice.saldoPendiente,
                    newBalance: 0,
                    syncedAt: new Date().toISOString()
                })
            }
        });

        console.log('\n✅ Sincronización completada exitosamente!');
        console.log('\n📌 La factura ahora debería aparecer como PAGADA en la UI.');

    } catch (error) {
        console.error('\n❌ Error durante la sincronización:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Obtener número de factura de los argumentos
const invoiceNumber = process.argv[2];

if (!invoiceNumber) {
    console.log('Uso: node scripts/sync-invoice-from-pending.js <numero-factura>');
    console.log('Ejemplos:');
    console.log('  node scripts/sync-invoice-from-pending.js 001002-00125027');
    console.log('  node scripts/sync-invoice-from-pending.js 001-002-000125027');
    process.exit(1);
}

// Normalizar formato
const normalized = invoiceNumber.replace(/-/g, '').replace(/(\d{6})(\d{8})/, '$1-$2');
syncInvoiceFromPending(normalized);
