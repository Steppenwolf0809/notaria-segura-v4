/**
 * Script para agregar eventos de pago al historial de documentos ya pagados
 * 
 * Uso: node scripts/add-payment-events-to-history.js [--dry-run]
 */

import { db as prisma } from '../backend/src/db.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function addPaymentEvents() {
    console.log('\n========================================');
    console.log('Agregando eventos de pago al historial');
    if (DRY_RUN) {
        console.log('⚠️  MODO SIMULACIÓN (dry-run) - No se harán cambios');
    }
    console.log('========================================\n');

    try {
        // 1. Buscar facturas pagadas con documento vinculado
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                status: 'PAID',
                documentId: { not: null }
            },
            include: {
                document: {
                    select: {
                        protocolNumber: true,
                        clientName: true
                    }
                }
            }
        });

        console.log(`✓ Encontradas ${paidInvoices.length} facturas pagadas con documento vinculado`);

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const invoice of paidInvoices) {
            try {
                // Verificar si ya existe un evento de pago para esta factura
                const existingEvent = await prisma.documentEvent.findFirst({
                    where: {
                        documentId: invoice.documentId,
                        eventType: 'PAGO_REGISTRADO',
                        details: {
                            contains: invoice.invoiceNumber
                        }
                    }
                });

                if (existingEvent) {
                    console.log(`⏭️  ${invoice.invoiceNumber}: Evento ya existe (saltando)`);
                    skippedCount++;
                    continue;
                }

                console.log(`📝 ${invoice.invoiceNumber}: $${invoice.totalAmount} | ${invoice.document.clientName?.substring(0, 30)}`);

                if (!DRY_RUN) {
                    await prisma.documentEvent.create({
                        data: {
                            documentId: invoice.documentId,
                            userId: 1, // System user
                            eventType: 'PAGO_REGISTRADO',
                            description: `Factura ${invoice.invoiceNumber} marcada como pagada`,
                            details: JSON.stringify({
                                invoiceNumber: invoice.invoiceNumber,
                                invoiceId: invoice.id,
                                amount: Number(invoice.totalAmount),
                                paidAmount: Number(invoice.paidAmount),
                                paymentDate: invoice.fechaUltimoPago || invoice.lastSyncAt || invoice.issueDate,
                                syncSource: invoice.syncSource || 'MANUAL_BACKFILL',
                                backfilledAt: new Date().toISOString()
                            })
                        }
                    });
                    createdCount++;
                } else {
                    createdCount++;
                }
            } catch (error) {
                console.error(`❌ ${invoice.invoiceNumber}: Error - ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n========================================');
        console.log('RESUMEN:');
        console.log('========================================');
        console.log(`✅ Eventos creados: ${createdCount}`);
        console.log(`⏭️  Saltados (ya existen): ${skippedCount}`);
        console.log(`❌ Errores: ${errorCount}`);

        if (DRY_RUN && createdCount > 0) {
            console.log('\n⚠️  Esto fue una simulación. Para ejecutar los cambios reales:');
            console.log('   node scripts/add-payment-events-to-history.js');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

addPaymentEvents();
