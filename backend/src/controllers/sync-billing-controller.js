/**
 * Sync Billing Controller
 * Handles synchronization of billing data from Koinor Sync Agent
 * 
 * Endpoints:
 * - POST /api/sync/billing - Receive invoices from Sync Agent
 * - GET /api/sync/billing/status - Get last sync status
 * - GET /api/sync/billing/history - Get sync history (last 20)
 */

import { db as prisma } from '../db.js';
import { normalizeInvoiceNumber } from '../utils/billing-utils.js';

// Constants
const BATCH_SIZE = 50; // Process invoices in batches for better transaction handling
const MAX_RECORDS_PER_REQUEST = 2000; // Limit per sync request for safety
const CXC_BATCH_SIZE = 100; // CXC can handle larger batches (simpler upsert)

// Valid payment states from Koinor
const VALID_PAYMENT_STATES = ['PAGADA', 'PARCIAL', 'PENDIENTE', 'ANULADA'];

// Map Koinor estado_pago to PendingReceivable status
const CXC_STATUS_MAP = {
    'PAGADA': 'PAID',
    'PARCIAL': 'PARTIAL',
    'PENDIENTE': 'PENDING',   // Will be upgraded to OVERDUE if overdue
    'ANULADA': 'CANCELLED'
};

/**
 * Map Koinor payment state to InvoiceStatus enum
 */
function mapPaymentStateToStatus(estadoPago) {
    const mapping = {
        'PAGADA': 'PAID',
        'PARCIAL': 'PARTIAL',
        'PENDIENTE': 'PENDING',
        'ANULADA': 'CANCELLED'
    };
    return mapping[estadoPago] || 'PENDING';
}

/**
 * Validate incoming invoice data
 */
function validateInvoiceData(data) {
    const errors = [];

    if (!data.numero_factura) {
        errors.push('numero_factura es requerido');
    }

    if (data.total_factura === undefined || data.total_factura === null) {
        errors.push('total_factura es requerido');
    } else if (typeof data.total_factura !== 'number' || data.total_factura < 0) {
        errors.push('total_factura debe ser un número positivo');
    }

    if (data.estado_pago && !VALID_PAYMENT_STATES.includes(data.estado_pago)) {
        errors.push(`estado_pago debe ser uno de: ${VALID_PAYMENT_STATES.join(', ')}`);
    }

    return errors;
}

/**
 * POST /api/sync/billing
 * Receive billing data from Koinor Sync Agent and update database
 */
export async function syncBilling(req, res) {
    const startTime = Date.now();

    try {
        const { agentVersion, syncStartedAt, data } = req.body;

        // Validate request structure
        if (!Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                message: 'El campo "data" debe ser un array de facturas'
            });
        }

        if (data.length > MAX_RECORDS_PER_REQUEST) {
            return res.status(400).json({
                success: false,
                message: `Máximo ${MAX_RECORDS_PER_REQUEST} registros por request`
            });
        }

        // Initialize counters
        const metrics = {
            totalReceived: data.length,
            created: 0,
            updated: 0,
            unchanged: 0,
            errors: 0,
            documentsLinked: 0
        };

        const errorDetails = [];

        // Process in batches
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);

            try {
                await prisma.$transaction(async (tx) => {
                    for (const invoiceData of batch) {
                        try {
                            const result = await processInvoice(tx, invoiceData);

                            if (result.action === 'created') metrics.created++;
                            else if (result.action === 'updated') metrics.updated++;
                            else if (result.action === 'unchanged') metrics.unchanged++;

                            if (result.documentLinked) metrics.documentsLinked++;

                        } catch (invoiceError) {
                            metrics.errors++;
                            errorDetails.push({
                                numero_factura: invoiceData.numero_factura || 'UNKNOWN',
                                error: invoiceError.message
                            });
                            console.error(`[sync-billing] Error processing invoice ${invoiceData.numero_factura}:`, invoiceError.message);
                        }
                    }
                });
            } catch (batchError) {
                console.error(`[sync-billing] Batch transaction error:`, batchError.message);
                // Continue with next batch
            }
        }

        const durationMs = Date.now() - startTime;

        // Determine overall status
        let status = 'SUCCESS';
        if (metrics.errors > 0 && metrics.errors === metrics.totalReceived) {
            status = 'ERROR';
        } else if (metrics.errors > 0) {
            status = 'PARTIAL';
        }

        // Create SyncLog entry
        const syncLog = await prisma.syncLog.create({
            data: {
                status,
                totalReceived: metrics.totalReceived,
                created: metrics.created,
                updated: metrics.updated,
                unchanged: metrics.unchanged,
                errors: metrics.errors,
                documentsLinked: metrics.documentsLinked,
                syncStartedAt: syncStartedAt ? new Date(syncStartedAt) : new Date(startTime),
                durationMs,
                agentVersion: agentVersion || null,
                errorDetails: errorDetails.length > 0 ? JSON.stringify(errorDetails) : null
            }
        });

        console.log(`[sync-billing] Sync completed: ${status}, received=${metrics.totalReceived}, created=${metrics.created}, updated=${metrics.updated}, errors=${metrics.errors}, duration=${durationMs}ms`);

        res.json({
            success: true,
            message: 'Sincronización completada',
            data: {
                syncId: syncLog.id,
                ...metrics,
                durationMs,
                errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 10) : undefined // Limit error details in response
            }
        });

    } catch (error) {
        console.error('[sync-billing] Sync error:', error);

        // Try to log the failed sync
        try {
            await prisma.syncLog.create({
                data: {
                    status: 'ERROR',
                    syncStartedAt: new Date(),
                    durationMs: Date.now() - startTime,
                    errorDetails: JSON.stringify([{ error: error.message }])
                }
            });
        } catch (logError) {
            console.error('[sync-billing] Failed to create error log:', logError);
        }

        res.status(500).json({
            success: false,
            message: 'Error durante la sincronización'
        });
    }
}

/**
 * Process a single invoice from sync data
 */
async function processInvoice(tx, invoiceData) {
    // Validate data
    const validationErrors = validateInvoiceData(invoiceData);
    if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('; '));
    }

    // Normalize invoice number
    const invoiceNumberRaw = invoiceData.numero_factura.trim();
    const invoiceNumber = normalizeInvoiceNumber(invoiceNumberRaw) || invoiceNumberRaw;

    // Parse dates
    const issueDate = invoiceData.fecha_emision ? new Date(invoiceData.fecha_emision) : new Date();
    const dueDate = invoiceData.fecha_vencimiento ? new Date(invoiceData.fecha_vencimiento) : null;
    const fechaUltimoPago = invoiceData.fecha_ultimo_pago ? new Date(invoiceData.fecha_ultimo_pago) : null;
    const koinorModifiedAt = invoiceData.ultima_modificacion ? new Date(invoiceData.ultima_modificacion) : null;

    // Check if invoice exists
    const existingInvoice = await tx.invoice.findFirst({
        where: {
            OR: [
                { invoiceNumberRaw: invoiceNumberRaw },
                { invoiceNumber: invoiceNumber }
            ]
        }
    });

    let action = 'unchanged';
    let documentLinked = false;
    let invoice;

    if (!existingInvoice) {
        // Create new invoice
        invoice = await tx.invoice.create({
            data: {
                invoiceNumber,
                invoiceNumberRaw,
                clientTaxId: String(invoiceData.cliente_cedula || '').trim(),
                clientName: String(invoiceData.cliente_nombre || '').trim(),
                totalAmount: invoiceData.total_factura,
                paidAmount: invoiceData.total_pagado || 0,
                issueDate,
                dueDate,
                status: mapPaymentStateToStatus(invoiceData.estado_pago),

                // Koinor sync fields
                numeroProtocolo: invoiceData.numero_protocolo || null,
                condicionPago: invoiceData.condicion_pago || null,
                pagoEfectivo: invoiceData.pago_efectivo || 0,
                pagoCheque: invoiceData.pago_cheque || 0,
                pagoTarjeta: invoiceData.pago_tarjeta || 0,
                pagoDeposito: invoiceData.pago_deposito || 0,
                pagoDirecto: invoiceData.pago_directo || 0,
                montoPagadoCxc: invoiceData.monto_pagado_cxc || 0,
                montoNotaCredito: invoiceData.monto_nota_credito || 0,
                tieneNotaCredito: invoiceData.tiene_nota_credito === 'SI',
                fechaUltimoPago,
                saldoPendiente: invoiceData.saldo_pendiente || 0,
                koinorModifiedAt,
                syncSource: 'KOINOR_SYNC'
            }
        });

        action = 'created';
    } else {
        // Check if update is needed (compare modification dates)
        const needsUpdate = !existingInvoice.koinorModifiedAt ||
            !koinorModifiedAt ||
            koinorModifiedAt > existingInvoice.koinorModifiedAt;

        if (needsUpdate) {
            invoice = await tx.invoice.update({
                where: { id: existingInvoice.id },
                data: {
                    // Update payment-related fields only
                    paidAmount: invoiceData.total_pagado || existingInvoice.paidAmount,
                    status: mapPaymentStateToStatus(invoiceData.estado_pago),

                    // Koinor sync fields
                    numeroProtocolo: invoiceData.numero_protocolo || existingInvoice.numeroProtocolo,
                    condicionPago: invoiceData.condicion_pago || existingInvoice.condicionPago,
                    pagoEfectivo: invoiceData.pago_efectivo ?? existingInvoice.pagoEfectivo,
                    pagoCheque: invoiceData.pago_cheque ?? existingInvoice.pagoCheque,
                    pagoTarjeta: invoiceData.pago_tarjeta ?? existingInvoice.pagoTarjeta,
                    pagoDeposito: invoiceData.pago_deposito ?? existingInvoice.pagoDeposito,
                    pagoDirecto: invoiceData.pago_directo ?? existingInvoice.pagoDirecto,
                    montoPagadoCxc: invoiceData.monto_pagado_cxc ?? existingInvoice.montoPagadoCxc,
                    montoNotaCredito: invoiceData.monto_nota_credito ?? existingInvoice.montoNotaCredito,
                    tieneNotaCredito: invoiceData.tiene_nota_credito === 'SI',
                    fechaUltimoPago: fechaUltimoPago || existingInvoice.fechaUltimoPago,
                    saldoPendiente: invoiceData.saldo_pendiente ?? existingInvoice.saldoPendiente,
                    koinorModifiedAt,
                    syncSource: 'KOINOR_SYNC'
                }
            });

            action = 'updated';
        } else {
            invoice = existingInvoice;
        }
    }

    // Try to link with Document by protocol number
    if (invoiceData.numero_protocolo && !invoice.documentId) {
        const document = await tx.document.findFirst({
            where: {
                protocolNumber: invoiceData.numero_protocolo
            }
        });

        if (document) {
            await tx.invoice.update({
                where: { id: invoice.id },
                data: { documentId: document.id }
            });

            // Update document payment status if invoice is paid
            if (invoiceData.estado_pago === 'PAGADA') {
                await tx.document.update({
                    where: { id: document.id },
                    data: { pagoConfirmado: true }
                });
            }

            documentLinked = true;
        }
    }

    return { action, documentLinked };
}

/**
 * GET /api/sync/billing/status
 * Get status of the last sync operation
 */
export async function getSyncStatus(req, res) {
    try {
        const lastSync = await prisma.syncLog.findFirst({
            orderBy: { syncCompletedAt: 'desc' }
        });

        if (!lastSync) {
            return res.json({
                success: true,
                data: {
                    lastSync: null,
                    syncHealthy: false,
                    minutesSinceLastSync: null
                }
            });
        }

        const minutesSinceLastSync = Math.floor(
            (Date.now() - lastSync.syncCompletedAt.getTime()) / 60000
        );

        // Sync is healthy if last sync was within 20 minutes and successful
        const syncHealthy = minutesSinceLastSync < 20 &&
            (lastSync.status === 'SUCCESS' || lastSync.status === 'PARTIAL');

        res.json({
            success: true,
            data: {
                lastSync: {
                    id: lastSync.id,
                    status: lastSync.status,
                    totalReceived: lastSync.totalReceived,
                    created: lastSync.created,
                    updated: lastSync.updated,
                    unchanged: lastSync.unchanged,
                    errors: lastSync.errors,
                    documentsLinked: lastSync.documentsLinked,
                    syncCompletedAt: lastSync.syncCompletedAt,
                    durationMs: lastSync.durationMs
                },
                syncHealthy,
                minutesSinceLastSync
            }
        });
    } catch (error) {
        console.error('[sync-billing] Get status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado de sincronización'
        });
    }
}

/**
 * GET /api/sync/billing/history
 * Get history of sync operations (last 20)
 */
export async function getSyncHistory(req, res) {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);

        const syncLogs = await prisma.syncLog.findMany({
            orderBy: { syncCompletedAt: 'desc' },
            take: limit,
            select: {
                id: true,
                status: true,
                totalReceived: true,
                created: true,
                updated: true,
                unchanged: true,
                errors: true,
                documentsLinked: true,
                syncStartedAt: true,
                syncCompletedAt: true,
                durationMs: true,
                agentVersion: true
                // Exclude errorDetails for list view to reduce payload
            }
        });

        res.json({
            success: true,
            data: {
                syncLogs,
                count: syncLogs.length
            }
        });
    } catch (error) {
        console.error('[sync-billing] Get history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial de sincronización'
        });
    }
}

// ============================================================================
// CXC (CUENTAS POR COBRAR) SYNC ENDPOINTS
// ============================================================================

/**
 * Validate CXC record data
 */
function validateCxcRecord(record) {
    const errors = [];

    if (!record.invoiceNumberRaw) {
        errors.push('invoiceNumberRaw es requerido');
    }
    if (!record.clientTaxId) {
        errors.push('clientTaxId es requerido');
    }
    if (record.balance === undefined || record.balance === null) {
        errors.push('balance es requerido');
    } else if (typeof record.balance !== 'number' || record.balance < 0) {
        errors.push('balance debe ser un número >= 0');
    }
    if (record.totalAmount !== undefined && (typeof record.totalAmount !== 'number' || record.totalAmount < 0)) {
        errors.push('totalAmount debe ser un número >= 0');
    }
    if (record.totalPaid !== undefined && (typeof record.totalPaid !== 'number' || record.totalPaid < 0)) {
        errors.push('totalPaid debe ser un número >= 0');
    }

    return errors;
}

/**
 * Map Koinor status to PendingReceivable status
 * Handles OVERDUE detection for PENDIENTE records
 */
function mapCxcStatus(status, daysOverdue) {
    const mapped = CXC_STATUS_MAP[status] || 'PENDING';
    // Upgrade PENDING to OVERDUE if days overdue > 0
    if (mapped === 'PENDING' && daysOverdue > 0) {
        return 'OVERDUE';
    }
    return mapped;
}

/**
 * POST /api/sync/cxc
 * Receive CXC (accounts receivable) data from Koinor Sync Agent
 * Performs UPSERT by invoiceNumberRaw
 * Optionally marks missing invoices as PAID when fullSync=true
 */
export async function syncCxc(req, res) {
    const startTime = Date.now();

    try {
        const { type, fullSync, timestamp, data } = req.body;

        // Validate request structure
        if (type !== 'cxc') {
            return res.status(400).json({
                success: false,
                message: 'El campo "type" debe ser "cxc"'
            });
        }

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El campo "data" debe ser un array no vacío'
            });
        }

        if (data.length > MAX_RECORDS_PER_REQUEST) {
            return res.status(400).json({
                success: false,
                message: `Máximo ${MAX_RECORDS_PER_REQUEST} registros por request`
            });
        }

        // Initialize counters
        const metrics = {
            received: data.length,
            created: 0,
            updated: 0,
            markedAsPaid: 0,
            errors: 0
        };

        const errorDetails = [];
        const receivedInvoiceNumbers = [];
        const failedInvoiceNumbers = [];  // Track failed records to exclude from "mark as paid"
        const syncedAt = new Date();

        // Process in batches
        for (let i = 0; i < data.length; i += CXC_BATCH_SIZE) {
            const batch = data.slice(i, i + CXC_BATCH_SIZE);

            try {
                await prisma.$transaction(async (tx) => {
                    for (const record of batch) {
                        try {
                            // Validate
                            const validationErrors = validateCxcRecord(record);
                            if (validationErrors.length > 0) {
                                throw new Error(validationErrors.join('; '));
                            }

                            const invoiceNumberRaw = String(record.invoiceNumberRaw).trim();
                            const invoiceNumber = normalizeInvoiceNumber(invoiceNumberRaw) || null;
                            const status = mapCxcStatus(record.status, record.daysOverdue || 0);

                            receivedInvoiceNumbers.push(invoiceNumberRaw);

                            const upsertData = {
                                clientTaxId: String(record.clientTaxId).trim(),
                                clientName: String(record.clientName || '').trim(),
                                invoiceNumber,
                                totalAmount: record.totalAmount || 0,
                                balance: record.balance,
                                totalPaid: record.totalPaid || 0,
                                issueDate: record.issueDate ? new Date(record.issueDate) : null,
                                dueDate: record.dueDate ? new Date(record.dueDate) : null,
                                lastPaymentDate: record.lastPaymentDate ? new Date(record.lastPaymentDate) : null,
                                status,
                                daysOverdue: record.daysOverdue || 0,
                                hasCreditNote: record.hasCreditNote === true,
                                lastSyncAt: syncedAt,
                                syncSource: 'SYNC_AGENT'
                            };

                            const existing = await tx.pendingReceivable.findUnique({
                                where: { invoiceNumberRaw },
                                select: { id: true }
                            });

                            if (existing) {
                                await tx.pendingReceivable.update({
                                    where: { invoiceNumberRaw },
                                    data: upsertData
                                });
                                metrics.updated++;
                            } else {
                                await tx.pendingReceivable.create({
                                    data: {
                                        invoiceNumberRaw,
                                        ...upsertData
                                    }
                                });
                                metrics.created++;
                            }

                        } catch (recordError) {
                            metrics.errors++;
                            const invoiceNumberRaw = record.invoiceNumberRaw || 'UNKNOWN';
                            failedInvoiceNumbers.push(invoiceNumberRaw);  // Track failed invoice
                            
                            const errorDetail = {
                                invoiceNumberRaw,
                                error: recordError.message,
                                stack: recordError.stack,
                                code: recordError.code,
                                meta: recordError.meta,
                                recordData: {
                                    clientTaxId: record.clientTaxId,
                                    clientName: record.clientName?.substring(0, 50),
                                    totalAmount: record.totalAmount,
                                    balance: record.balance,
                                    status: record.status
                                }
                            };
                            errorDetails.push(errorDetail);
                            console.error(`[sync-cxc] Error processing record ${invoiceNumberRaw}:`, recordError.message);
                            console.error(`[sync-cxc] Error details:`, JSON.stringify(errorDetail, null, 2));
                        }
                    }
                });
            } catch (batchError) {
                console.error('[sync-cxc] Batch transaction error:', batchError.message);
            }
        }

        // If fullSync, mark invoices not in the received list as PAID
        // IMPORTANT: Exclude failed records from this operation - we don't know their true status
        let markedAsPaidInvoiceNumbers = [];
        if (fullSync === true && receivedInvoiceNumbers.length > 0) {
            try {
                // Combine received and failed to determine what NOT to mark as paid
                const excludeFromMarkAsPaid = [...receivedInvoiceNumbers, ...failedInvoiceNumbers];
                
                console.log(`[sync-cxc] FullSync: ${receivedInvoiceNumbers.length} received, ${failedInvoiceNumbers.length} failed, marking others as PAID`);
                
                // First, get the list of invoices that will be marked as PAID
                const invoicesToMarkAsPaid = await prisma.pendingReceivable.findMany({
                    where: {
                        invoiceNumberRaw: { notIn: excludeFromMarkAsPaid },
                        status: { notIn: ['PAID', 'CANCELLED'] }
                    },
                    select: {
                        invoiceNumberRaw: true,
                        invoiceNumber: true,
                        totalAmount: true
                    }
                });
                
                markedAsPaidInvoiceNumbers = invoicesToMarkAsPaid.map(inv => ({
                    invoiceNumberRaw: inv.invoiceNumberRaw,
                    invoiceNumber: inv.invoiceNumber,
                    totalAmount: inv.totalAmount
                }));
                
                const result = await prisma.pendingReceivable.updateMany({
                    where: {
                        invoiceNumberRaw: { notIn: excludeFromMarkAsPaid },
                        status: { notIn: ['PAID', 'CANCELLED'] }
                    },
                    data: {
                        status: 'PAID',
                        balance: 0,
                        lastSyncAt: syncedAt
                    }
                });
                metrics.markedAsPaid = result.count;
                console.log(`[sync-cxc] Marked ${result.count} records as PAID in PendingReceivable`);
            } catch (markError) {
                console.error('[sync-cxc] Error marking paid invoices:', markError.message);
            }
        }
        
        // ALSO update Invoice table to keep it in sync with PendingReceivable
        // This fixes the desync between CXC and Invoice tables
        if (markedAsPaidInvoiceNumbers.length > 0) {
            console.log(`[sync-cxc] Syncing ${markedAsPaidInvoiceNumbers.length} PAID invoices to Invoice table...`);
            let invoiceSyncCount = 0;
            
            for (const paidInvoice of markedAsPaidInvoiceNumbers) {
                try {
                    // Try to find and update the corresponding Invoice
                    const invoice = await prisma.invoice.findFirst({
                        where: {
                            OR: [
                                { invoiceNumberRaw: paidInvoice.invoiceNumberRaw },
                                { invoiceNumberRaw: paidInvoice.invoiceNumberRaw?.replace(/-/g, '') },
                                { invoiceNumber: paidInvoice.invoiceNumber }
                            ]
                        }
                    });
                    
                    if (invoice && invoice.status !== 'PAID') {
                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: {
                                status: 'PAID',
                                paidAmount: paidInvoice.totalAmount || invoice.totalAmount,
                                saldoPendiente: 0,
                                lastSyncAt: syncedAt,
                                syncSource: 'KOINOR_SYNC_CXC'
                            }
                        });
                        
                        // Also update Document if linked
                        if (invoice.documentId) {
                            await prisma.document.update({
                                where: { id: invoice.documentId },
                                data: { pagoConfirmado: true }
                            });
                            
                            // 📝 Create event in document history
                            try {
                                await prisma.documentEvent.create({
                                    data: {
                                        documentId: invoice.documentId,
                                        userId: 1, // System user
                                        eventType: 'PAGO_REGISTRADO',
                                        description: `Factura ${invoice.invoiceNumber} marcada como pagada por sincronización CXC`,
                                        details: JSON.stringify({
                                            invoiceNumber: invoice.invoiceNumber,
                                            invoiceId: invoice.id,
                                            amount: paidInvoice.totalAmount || invoice.totalAmount,
                                            paymentDate: new Date().toISOString(),
                                            syncSource: 'KOINOR_SYNC_CXC',
                                            syncedAt: syncedAt.toISOString()
                                        })
                                    }
                                });
                                console.log(`[sync-cxc] Created payment event for document ${invoice.documentId}`);
                            } catch (eventError) {
                                console.error(`[sync-cxc] Error creating payment event:`, eventError.message);
                            }
                        }
                        
                        invoiceSyncCount++;
                    }
                } catch (invoiceSyncError) {
                    console.error(`[sync-cxc] Error syncing invoice ${paidInvoice.invoiceNumberRaw}:`, invoiceSyncError.message);
                }
            }
            
            console.log(`[sync-cxc] Synced ${invoiceSyncCount} invoices to PAID status`);
        }

        const durationMs = Date.now() - startTime;

        console.log(
            `[sync-cxc] Sync completed: received=${metrics.received}, created=${metrics.created}, ` +
            `updated=${metrics.updated}, markedAsPaid=${metrics.markedAsPaid}, errors=${metrics.errors}, ` +
            `fullSync=${!!fullSync}, duration=${durationMs}ms`
        );

        res.json({
            success: true,
            message: 'CXC sincronizada',
            data: {
                ...metrics,
                syncedAt: syncedAt.toISOString()
            }
        });

    } catch (error) {
        console.error('[sync-cxc] Sync error:', error);
        res.status(500).json({
            success: false,
            message: 'Error durante la sincronización de CXC'
        });
    }
}
