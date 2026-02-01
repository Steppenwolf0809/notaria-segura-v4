/**
 * Import Koinor XML Service
 * Servicio principal de importación de pagos desde XML Koinor
 * 
 * REEMPLAZA: import-koinor-service.js (sistema XLS legacy)
 * 
 * Características:
 * - Idempotencia estricta (evita duplicados)
 * - Búsqueda por invoiceNumberRaw (formato RAW del XML)
 * - Actualización automática de estados
 * - Soporte para pagos multi-factura
 * - Manejo de notas de crédito
 */

import { db as prisma } from '../db.js';
import { parseKoinorXML, validateKoinorXMLStructure } from './xml-koinor-parser.js';

/**
 * Importa archivo XML de Koinor con pagos
 * @param {Buffer} fileBuffer - Buffer del archivo XML
 * @param {string} fileName - Nombre del archivo
 * @param {number} userId - ID del usuario ejecutando la importación
 * @returns {Promise<Object>} - Resultado de la importación
 */
export async function importKoinorXMLFile(fileBuffer, fileName, userId) {
    const startTime = Date.now();
    console.log(`[import-koinor-xml] Starting import of ${fileName} by user ${userId}`);

    // Crear log de importación
    const importLog = await prisma.importLog.create({
        data: {
            fileName,
            fileType: 'XML_KOINOR',
            totalRows: 0,
            status: 'PROCESSING',
            executedBy: userId,
            startedAt: new Date()
        }
    });

    const stats = {
        totalTransactions: 0,
        paymentsCreated: 0,
        paymentsSkipped: 0,
        invoicesUpdated: 0,
        invoicesCreatedLegacy: 0,
        documentsUpdated: 0,
        notasCreditoProcessed: 0,
        errors: 0,
        errorDetails: []
    };

    try {
        // 1. Parsear XML por streaming (incluye decodificación y validación)
        console.log('[import-koinor-xml] Parsing XML...');
        const parsed = await parseKoinorXML(fileBuffer, fileName);
        
        stats.totalTransactions = parsed.summary.totalTransactions;

        // 3. Procesar pagos (AB) - OPTIMIZADO EN BATCHES
        console.log(`[import-koinor-xml] Processing ${parsed.payments.length} payments in batches...`);
        
        const BATCH_SIZE = 50; // Procesar 50 pagos a la vez
        const payments = parsed.payments;
        
        for (let i = 0; i < payments.length; i += BATCH_SIZE) {
            const batch = payments.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(payments.length / BATCH_SIZE);
            
            console.log(`[import-koinor-xml] Processing batch ${batchNum}/${totalBatches} (${batch.length} payments)...`);
            
            // Procesar batch en paralelo (con límite de concurrencia)
            const batchResults = await Promise.allSettled(
                batch.map(payment => processPayment(payment, fileName, stats))
            );
            
            // Agregar resultados
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    const r = result.value;
                    if (r.created > 0) {
                        stats.paymentsCreated += r.created;
                        stats.invoicesUpdated += r.invoicesUpdated;
                        stats.documentsUpdated += r.documentsUpdated;
                    }
                    if (r.createdLegacy > 0) {
                        stats.invoicesCreatedLegacy += r.createdLegacy;
                    }
                    if (r.skipped > 0) {
                        stats.paymentsSkipped += r.skipped;
                    }
                } else {
                    stats.errors++;
                    stats.errorDetails.push({
                        type: 'PAYMENT_BATCH',
                        error: result.reason?.message || 'Unknown error'
                    });
                }
            }
        }

        // 4. Procesar notas de crédito (NC) - OPTIMIZADO EN BATCHES
        if (parsed.notasCredito.length > 0) {
            console.log(`[import-koinor-xml] Processing ${parsed.notasCredito.length} credit notes in batches...`);
            
            for (let i = 0; i < parsed.notasCredito.length; i += BATCH_SIZE) {
                const batch = parsed.notasCredito.slice(i, i + BATCH_SIZE);
                
                const batchResults = await Promise.allSettled(
                    batch.map(nc => processNotaCredito(nc, fileName))
                );
                
                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        stats.notasCreditoProcessed++;
                    } else {
                        stats.errors++;
                        stats.errorDetails.push({
                            type: 'NC_BATCH',
                            error: result.reason?.message || 'Unknown error'
                        });
                    }
                }
            }
        }

        // 5. Actualizar log con éxito
        await prisma.importLog.update({
            where: { id: importLog.id },
            data: {
                totalRows: stats.totalTransactions,
                invoicesCreated: stats.invoicesCreatedLegacy,
                invoicesUpdated: stats.invoicesUpdated,
                paymentsCreated: stats.paymentsCreated,
                paymentsSkipped: stats.paymentsSkipped,
                errors: stats.errors,
                status: stats.errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
                errorDetails: stats.errorDetails.length > 0 ? stats.errorDetails : null,
                completedAt: new Date()
            }
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[import-koinor-xml] Import completed in ${duration}s`);
        console.log(`[import-koinor-xml] Stats:`, stats);

        return {
            success: true,
            importLogId: importLog.id,
            stats: {
                totalTransactions: stats.totalTransactions,
                paymentsCreated: stats.paymentsCreated,
                paymentsSkipped: stats.paymentsSkipped,
                invoicesUpdated: stats.invoicesUpdated,
                invoicesCreatedLegacy: stats.invoicesCreatedLegacy,
                documentsUpdated: stats.documentsUpdated,
                notasCreditoProcessed: stats.notasCreditoProcessed,
                errors: stats.errors
            },
            duration: `${duration}s`,
            info: stats.invoicesCreatedLegacy > 0 ? [
                `${stats.invoicesCreatedLegacy} facturas legacy creadas automáticamente (pagos de facturas pre-sistema)`
            ] : []
        };

    } catch (error) {
        console.error('[import-koinor-xml] Import failed:', error);

        // Actualizar log con fallo
        await prisma.importLog.update({
            where: { id: importLog.id },
            data: {
                status: 'FAILED',
                errorDetails: { 
                    message: error.message, 
                    stack: error.stack 
                },
                completedAt: new Date()
            }
        });

        throw error;
    }
}

/**
 * Procesa un pago (puede ser multi-factura)
 * @param {Object} payment - Pago parseado del XML
 * @param {string} sourceFile - Nombre del archivo origen
 * @param {Object} stats - Objeto de estadísticas
 * @returns {Promise<Object>} - {created, skipped, invoicesUpdated, documentsUpdated}
 */
async function processPayment(payment, sourceFile, stats) {
    const result = {
        created: 0,
        skipped: 0,
        invoicesUpdated: 0,
        documentsUpdated: 0,
        createdLegacy: 0
    };

    // Procesar cada factura en el pago (multi-factura)
    for (const detail of payment.details) {
        try {
            const singleResult = await processSinglePayment(payment, detail, sourceFile);
            
            if (singleResult.created) {
                result.created++;
                result.invoicesUpdated++;
                if (singleResult.documentUpdated) {
                    result.documentsUpdated++;
                }
            } else if (singleResult.skipped) {
                result.skipped++;
            } else if (singleResult.createdLegacy) {
                result.createdLegacy++;
                result.created++; // También contar como pago creado
            }
        } catch (error) {
            // Error en factura específica - registrar pero continuar con las demás
            stats.errorDetails.push({
                type: 'PAYMENT_DETAIL',
                receiptNumber: payment.receiptNumber,
                invoiceNumberRaw: detail.invoiceNumberRaw,
                error: error.message
            });
            console.error(`[import-koinor-xml] Error in payment detail:`, error);
        }
    }

    return result;
}

/**
 * Procesa un pago individual para una factura específica
 * @param {Object} payment - Datos generales del pago
 * @param {Object} detail - Detalle específico (factura + monto)
 * @param {string} sourceFile - Nombre del archivo
 * @returns {Promise<Object>} - {created, skipped, documentUpdated}
 */
async function processSinglePayment(payment, detail, sourceFile) {
    // 1. Buscar factura por invoiceNumberRaw O por invoiceNumber normalizado
    // Esto evita duplicados cuando el formato varía entre importaciones
    const normalizedNumber = detail.invoiceNumberRaw.replace(/^0+/, '');
    
    let invoice = await prisma.invoice.findFirst({
        where: {
            OR: [
                { invoiceNumberRaw: detail.invoiceNumberRaw },
                { invoiceNumber: detail.invoiceNumberRaw },
                { invoiceNumber: normalizedNumber }
            ]
        },
        include: { document: true }
    });

    let createdLegacy = false;

    if (!invoice) {
        // Factura no encontrada - crear factura legacy automáticamente
        console.log(`[import-koinor-xml] Creating legacy invoice for: ${detail.invoiceNumberRaw}`);
        
        // Usar upsert para evitar errores de unique constraint
        invoice = await prisma.invoice.upsert({
            where: { invoiceNumber: detail.invoiceNumberRaw },
            update: {
                // Si ya existe, solo actualizar invoiceNumberRaw si está vacío
                invoiceNumberRaw: detail.invoiceNumberRaw
            },
            create: {
                invoiceNumber: detail.invoiceNumberRaw, // Usar el RAW como número principal
                invoiceNumberRaw: detail.invoiceNumberRaw,
                clientName: payment.clientName || 'Cliente Legacy',
                clientTaxId: payment.clientTaxId || '9999999999999',
                issueDate: payment.paymentDate,
                totalAmount: detail.amount,
                paidAmount: 0,
                status: 'PENDING',
                isLegacy: true,
                sourceFile
            }
        });
        
        createdLegacy = true;
    }

    // 2. Verificar idempotencia - solo receiptNumber + invoiceId
    // No verificamos amount ni paymentDate porque pueden variar entre importaciones XLS/XML
    const existingPayment = await prisma.payment.findFirst({
        where: {
            receiptNumber: payment.receiptNumber,
            invoiceId: invoice.id
        }
    });

    if (existingPayment) {
        // Pago ya existe - idempotencia
        console.log(`[import-koinor-xml] Payment already exists (idempotent): ${payment.receiptNumber} -> ${detail.invoiceNumberRaw}`);
        return { created: false, skipped: true, createdLegacy: false };
    }

    // 3. Crear Payment y actualizar Invoice/Document en transacción
    let documentUpdated = false;

    try {
        await prisma.$transaction(async (tx) => {
            // Crear Payment
            await tx.payment.create({
                data: {
                    receiptNumber: payment.receiptNumber,
                    amount: detail.amount,
                    paymentDate: payment.paymentDate,
                    concept: payment.concept || payment.clientName,
                    paymentType: 'TRANSFER',
                    invoiceId: invoice.id,
                    sourceFile
                }
            });

        // Actualizar paidAmount de Invoice
        const currentPaid = parseFloat(invoice.paidAmount || 0);
        const newPaid = currentPaid + parseFloat(detail.amount);
        const totalAmount = parseFloat(invoice.totalAmount);

        // Calcular nuevo status
        let newStatus = invoice.status;
        if (newPaid >= totalAmount) {
            newStatus = 'PAID';
        } else if (newPaid > 0) {
            newStatus = 'PARTIAL';
        }

        // Actualizar Invoice
        await tx.invoice.update({
            where: { id: invoice.id },
            data: {
                paidAmount: newPaid,
                status: newStatus,
                lastSyncAt: new Date()
            }
        });

        // Si está completamente pagada y tiene documento, actualizar pagoConfirmado
        if (newStatus === 'PAID' && invoice.documentId) {
            await tx.document.update({
                where: { id: invoice.documentId },
                data: { pagoConfirmado: true }
            });
            documentUpdated = true;
        }
    });

        console.log(`[import-koinor-xml] Payment processed: ${payment.receiptNumber} -> ${detail.invoiceNumberRaw} ($${detail.amount})${createdLegacy ? ' [LEGACY INVOICE CREATED]' : ''}`);

        return {
            created: !createdLegacy,
            createdLegacy,
            skipped: false,
            documentUpdated
        };
    } catch (error) {
        // Manejar error P2002 (unique constraint) como idempotencia
        // Esto puede ocurrir si hay un constraint único en la DB que no está en el schema
        if (error.code === 'P2002') {
            console.log(`[import-koinor-xml] Payment already exists (P2002 constraint): ${payment.receiptNumber} -> ${detail.invoiceNumberRaw}`);
            return { created: false, skipped: true, createdLegacy: false };
        }
        // Log y re-throw otros errores
        console.error(`[import-koinor-xml] Error creating payment ${payment.receiptNumber}:`, error.message);
        throw error;
    }
}

/**
 * Procesa una nota de crédito
 * @param {Object} nc - Nota de crédito parseada del XML
 * @param {string} sourceFile - Nombre del archivo
 */
async function processNotaCredito(nc, sourceFile) {
    // Buscar factura afectada por invoiceNumberRaw
    const invoice = await prisma.invoice.findFirst({
        where: { 
            invoiceNumberRaw: nc.invoiceNumberRaw 
        },
        include: { document: true }
    });

    if (!invoice) {
        console.warn(`[import-koinor-xml] Invoice not found for NC: ${nc.invoiceNumberRaw}`);
        return;
    }

    await prisma.$transaction(async (tx) => {
        // Actualizar Invoice a CANCELLED
        await tx.invoice.update({
            where: { id: invoice.id },
            data: {
                status: 'CANCELLED',
                lastSyncAt: new Date()
            }
        });

        // Si tiene documento, actualizar campos de nota de crédito
        if (invoice.documentId) {
            await tx.document.update({
                where: { id: invoice.documentId },
                data: {
                    notaCreditoMotivo: nc.motivo,
                    notaCreditoEstadoPrevio: invoice.status,
                    notaCreditoFecha: nc.fecha
                }
            });
        }
    });

    console.log(`[import-koinor-xml] Credit note processed: ${nc.receiptNumber} -> ${nc.invoiceNumberRaw}`);
}

/**
 * Obtiene estadísticas de importaciones XML
 * @returns {Promise<Object>} - Estadísticas agregadas
 */
export async function getXMLImportStats() {
    const logs = await prisma.importLog.findMany({
        where: {
            fileType: 'XML_KOINOR'
        },
        orderBy: { startedAt: 'desc' },
        take: 10
    });

    const totals = logs.reduce((acc, log) => ({
        totalPayments: acc.totalPayments + log.paymentsCreated,
        totalSkipped: acc.totalSkipped + log.paymentsSkipped,
        totalErrors: acc.totalErrors + log.errors
    }), { totalPayments: 0, totalSkipped: 0, totalErrors: 0 });

    return {
        recentImports: logs,
        totals
    };
}

export default {
    importKoinorXMLFile,
    getXMLImportStats
};
