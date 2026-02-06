/**
 * Script para corregir TODAS las facturas con desfase entre PendingReceivable e Invoice
 * 
 * Uso: node scripts/fix-all-invoice-desfase.js [--dry-run]
 * --dry-run: Solo muestra lo que haría, sin ejecutar cambios
 */

import { db as prisma } from '../backend/src/db.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function fixAllDesfase() {
    console.log('\n========================================');
    console.log('Corrigiendo desfase entre PendingReceivable e Invoice');
    if (DRY_RUN) {
        console.log('⚠️  MODO SIMULACIÓN (dry-run) - No se harán cambios');
    }
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
                lastPaymentDate: true
            }
        });

        console.log(`✓ Encontradas ${paidInPending.length} facturas pagadas en PendingReceivable`);

        let fixedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const fixedInvoices = [];

        for (const pending of paidInPending) {
            try {
                // Buscar Invoice correspondiente
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
                        totalAmount: true,
                        documentId: true
                    }
                });

                if (!invoice) {
                    console.log(`⚠️  ${pending.invoiceNumberRaw}: No existe en Invoice`);
                    skippedCount++;
                    continue;
                }

                // Verificar si necesita actualización
                if (invoice.status === 'PAID' && invoice.saldoPendiente <= 0) {
                    console.log(`✓ ${pending.invoiceNumberRaw}: Ya está correcta`);
                    skippedCount++;
                    continue;
                }

                console.log(`🔄 ${pending.invoiceNumberRaw}: ${invoice.status} → PAID | Saldo: $${invoice.saldoPendiente} → $0`);

                if (!DRY_RUN) {
                    // Actualizar Invoice
                    await prisma.invoice.update({
                        where: { id: invoice.id },
                        data: {
                            status: 'PAID',
                            paidAmount: pending.totalAmount,
                            saldoPendiente: 0,
                            fechaUltimoPago: pending.lastPaymentDate || new Date(),
                            lastSyncAt: new Date(),
                            syncSource: 'MANUAL_SYNC_FROM_CXC_BATCH'
                        }
                    });

                    // Actualizar Document si existe
                    if (invoice.documentId) {
                        await prisma.document.update({
                            where: { id: invoice.documentId },
                            data: {
                                pagoConfirmado: true,
                                updatedAt: new Date()
                            }
                        });
                    }

                    // Crear evento de auditoría
                    await prisma.documentEvent.create({
                        data: {
                            documentId: invoice.documentId || 'system',
                            userId: 1,
                            eventType: 'PAYMENT_SYNC_BATCH',
                            description: `Sincronización batch de pago desde CXC - Factura ${pending.invoiceNumberRaw}`,
                            details: JSON.stringify({
                                invoiceNumberRaw: pending.invoiceNumberRaw,
                                previousStatus: invoice.status,
                                newStatus: 'PAID',
                                previousBalance: invoice.saldoPendiente,
                                newBalance: 0,
                                syncedAt: new Date().toISOString()
                            })
                        }
                    });
                }

                fixedCount++;
                fixedInvoices.push({
                    invoiceNumberRaw: pending.invoiceNumberRaw,
                    clientName: pending.clientName,
                    amount: pending.totalAmount
                });

            } catch (error) {
                console.error(`❌ ${pending.invoiceNumberRaw}: Error - ${error.message}`);
                errorCount++;
            }
        }

        // Resumen
        console.log('\n========================================');
        console.log('RESUMEN:');
        console.log('========================================');
        console.log(`✅ Corregidas: ${fixedCount}`);
        console.log(`⏭️  Saltadas (ya correctas o no existen): ${skippedCount}`);
        console.log(`❌ Errores: ${errorCount}`);

        if (fixedCount > 0) {
            const totalFixed = fixedInvoices.reduce((sum, f) => sum + Number(f.amount || 0), 0);
            console.log(`\n💰 Monto total corregido: $${totalFixed.toFixed(2)}`);
            
            console.log('\n📋 Facturas corregidas:');
            fixedInvoices.forEach(f => {
                console.log(`   - ${f.invoiceNumberRaw} | ${f.clientName?.substring(0, 30)} | $${f.amount}`);
            });
        }

        if (DRY_RUN && fixedCount > 0) {
            console.log('\n⚠️  Esto fue una simulación. Para ejecutar los cambios reales:');
            console.log('   node scripts/fix-all-invoice-desfase.js');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

fixAllDesfase();
