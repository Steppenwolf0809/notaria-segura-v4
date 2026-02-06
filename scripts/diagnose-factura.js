/**
 * Script de diagnóstico para verificar el estado de una factura específica
 * Uso: node scripts/diagnose-factura.js 001002-00125027
 */

import { db as prisma } from '../backend/src/db.js';

async function diagnoseFactura(invoiceNumberRaw) {
    console.log(`\n========================================`);
    console.log(`Diagnóstico de factura: ${invoiceNumberRaw}`);
    console.log(`========================================\n`);

    try {
        // 1. Verificar en PendingReceivable (tabla de CXC sincronizada)
        console.log('1. Estado en PendingReceivable (CXC):');
        const pending = await prisma.pendingReceivable.findUnique({
            where: { invoiceNumberRaw }
        });
        
        if (pending) {
            console.log('   ✓ Encontrada en PendingReceivable');
            console.log(`   - Status: ${pending.status}`);
            console.log(`   - Balance: $${pending.balance}`);
            console.log(`   - Total Amount: $${pending.totalAmount}`);
            console.log(`   - Total Paid: $${pending.totalPaid}`);
            console.log(`   - Last Sync: ${pending.lastSyncAt}`);
            console.log(`   - Client: ${pending.clientName} (${pending.clientTaxId})`);
        } else {
            console.log('   ✗ NO encontrada en PendingReceivable');
        }

        // 2. Verificar en Invoice (tabla de facturas)
        console.log('\n2. Estado en Invoice:');
        const invoice = await prisma.invoice.findFirst({
            where: {
                OR: [
                    { invoiceNumberRaw },
                    { invoiceNumberRaw: invoiceNumberRaw.replace(/-/g, '') }
                ]
            },
            include: { payments: true }
        });

        if (invoice) {
            console.log('   ✓ Encontrada en Invoice');
            console.log(`   - ID: ${invoice.id}`);
            console.log(`   - Status: ${invoice.status}`);
            console.log(`   - Total: $${invoice.totalAmount}`);
            console.log(`   - Paid Amount: $${invoice.paidAmount}`);
            console.log(`   - Saldo Pendiente: $${invoice.saldoPendiente}`);
            console.log(`   - Document ID: ${invoice.documentId || 'No vinculado'}`);
            console.log(`   - Last Sync: ${invoice.lastSyncAt}`);
            console.log(`   - Payments count: ${invoice.payments.length}`);
            
            if (invoice.payments.length > 0) {
                const totalPayments = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                console.log(`   - Total from payments table: $${totalPayments}`);
            }
        } else {
            console.log('   ✗ NO encontrada en Invoice');
        }

        // 3. Buscar documento relacionado
        console.log('\n3. Búsqueda de Document relacionado:');
        const normalizedNumber = invoiceNumberRaw.replace(/(\d{3})(\d{3})-(\d{8})/, '$1-$2-0$3');
        const document = await prisma.document.findFirst({
            where: {
                OR: [
                    { numeroFactura: invoiceNumberRaw },
                    { numeroFactura: normalizedNumber },
                    { numeroFactura: invoiceNumberRaw.replace(/-/g, '') }
                ]
            }
        });

        if (document) {
            console.log('   ✓ Documento encontrado');
            console.log(`   - ID: ${document.id}`);
            console.log(`   - Protocol: ${document.protocolNumber}`);
            console.log(`   - Status: ${document.status}`);
            console.log(`   - Pago Confirmado: ${document.pagoConfirmado}`);
            console.log(`   - Numero Factura (en doc): ${document.numeroFactura}`);
        } else {
            console.log('   ✗ NO encontrado documento con ese número de factura');
        }

        // 4. Ver últimos sync logs
        console.log('\n4. Últimos sync logs con errores:');
        const recentLogs = await prisma.syncLog.findMany({
            where: {
                errors: { gt: 0 }
            },
            orderBy: { syncCompletedAt: 'desc' },
            take: 3
        });

        for (const log of recentLogs) {
            console.log(`   - ${log.syncCompletedAt}: ${log.errors} errores`);
            if (log.errorDetails) {
                try {
                    const errors = JSON.parse(log.errorDetails);
                    const relevantErrors = errors.filter(e => 
                        e.invoiceNumberRaw?.includes(invoiceNumberRaw.split('-')[1]) ||
                        e.numero_factura?.includes(invoiceNumberRaw.split('-')[1])
                    );
                    if (relevantErrors.length > 0) {
                        console.log(`     Errores relacionados:`);
                        relevantErrors.forEach(e => console.log(`       - ${e.error}`));
                    }
                } catch (e) {
                    // ignore parse errors
                }
            }
        }

        // 5. Recomendación
        console.log('\n========================================');
        console.log('RECOMENDACIÓN:');
        console.log('========================================');
        
        if (!pending && !invoice) {
            console.log('La factura no existe en ninguna tabla. Verificar:');
            console.log('1. Que el número de factura sea correcto');
            console.log('2. Que el sync agent esté funcionando');
            console.log('3. Revisar logs del sync agent en el servidor de Koinor');
        } else if (pending && pending.balance > 0) {
            console.log('La factura tiene saldo pendiente en CXC. Si ya fue pagada:');
            console.log('1. Verificar que Koinor tenga el saldo en 0');
            console.log('2. Ejecutar sincronización manual desde el sync agent');
            console.log('3. Verificar logs del sync agent por errores específicos');
        } else if (pending && pending.balance <= 0 && invoice && invoice.saldoPendiente > 0) {
            console.log('DESFASE DETECTADO: PendingReceivable está pagado pero Invoice no.');
            console.log('Solución: Forzar sincronización o actualizar Invoice manualmente.');
        } else if (!pending && invoice) {
            console.log('La factura existe en Invoice pero no en PendingReceivable.');
            console.log('Esto puede indicar que fue importada manualmente pero no sincronizada desde Koinor.');
        }

    } catch (error) {
        console.error('Error en diagnóstico:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Obtener número de factura de los argumentos
const invoiceNumber = process.argv[2];

if (!invoiceNumber) {
    console.log('Uso: node scripts/diagnose-factura.js <numero-factura>');
    console.log('Ejemplos:');
    console.log('  node scripts/diagnose-factura.js 001002-00125027');
    console.log('  node scripts/diagnose-factura.js 001-002-000125027');
    process.exit(1);
}

// Normalizar formato (aceptar ambos formatos)
const normalized = invoiceNumber.replace(/-/g, '').replace(/(\d{6})(\d{8})/, '$1-$2');
diagnoseFactura(normalized);
