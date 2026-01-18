/**
 * Koinor Import Service
 * Handles importing invoice and payment data from Koinor Excel files
 * 
 * Supports:
 * - POR_COBRAR26.xls (Full export with FC facturas and AB abonos)
 * - CXC files (Pending balances only)
 */
import XLSX from 'xlsx';
import { db as prisma } from '../db.js';
import {
    normalizeInvoiceNumber,
    parseExcelDate,
    parseMoneyAmount,
    detectFileType,
    cleanTaxId,
    calculateInvoiceStatus
} from '../utils/billing-utils.js';

/**
 * Main import function - processes Koinor Excel file
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} fileName - Original file name
 * @param {number} userId - User ID executing the import
 * @param {Object} options - Import options
 * @returns {Object} Import result with statistics
 */
export async function importKoinorFile(fileBuffer, fileName, userId, options = {}) {
    const startTime = Date.now();
    const fileType = detectFileType(fileName);

    console.log(`[import-koinor] Starting import of ${fileName} (type: ${fileType})`);

    // Create import log entry
    const importLog = await prisma.importLog.create({
        data: {
            fileName,
            fileType,
            totalRows: 0,
            status: 'PROCESSING',
            executedBy: userId,
            startedAt: new Date()
        }
    });

    const stats = {
        totalRows: 0,
        invoicesCreated: 0,
        invoicesUpdated: 0,
        paymentsCreated: 0,
        paymentsSkipped: 0,
        legacyInvoicesCreated: 0,
        documentsLinked: 0,
        errors: 0,
        errorDetails: []
    };

    try {
        // Parse Excel file
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        stats.totalRows = rows.length;
        console.log(`[import-koinor] Parsed ${rows.length} rows from sheet "${sheetName}"`);

        // Separate FC (invoices) and AB (payments)
        const facturas = rows.filter(r => r.tipdoc === 'FC');
        const abonos = rows.filter(r => r.tipdoc === 'AB');

        console.log(`[import-koinor] Found ${facturas.length} FC (invoices), ${abonos.length} AB (payments)`);

        // Step 1: Process invoices (FC)
        const invoiceMap = new Map(); // numtra -> invoice
        for (const row of facturas) {
            try {
                const result = await processInvoice(row, fileName);
                invoiceMap.set(row.numtra, result.invoice);
                if (result.created) stats.invoicesCreated++;
                else stats.invoicesUpdated++;
                if (result.documentLinked) stats.documentsLinked++;
            } catch (error) {
                stats.errors++;
                stats.errorDetails.push({
                    type: 'INVOICE',
                    numtra: row.numtra,
                    error: error.message
                });
                console.error(`[import-koinor] Error processing invoice ${row.numtra}:`, error.message);
            }
        }

        // Step 2: Process payments (AB)
        for (const row of abonos) {
            try {
                const result = await processPayment(row, invoiceMap, fileName);
                if (result.created) {
                    stats.paymentsCreated++;
                    if (result.legacyInvoiceCreated) {
                        stats.legacyInvoicesCreated++;
                    }
                } else {
                    stats.paymentsSkipped++;
                }
            } catch (error) {
                stats.errors++;
                stats.errorDetails.push({
                    type: 'PAYMENT',
                    numdoc: row.numdoc,
                    numtra: row.numtra,
                    error: error.message
                });
                console.error(`[import-koinor] Error processing payment ${row.numdoc}:`, error.message);
            }
        }

        // Step 3: Update invoice statuses
        await updateInvoiceStatuses();

        // Update import log with success
        await prisma.importLog.update({
            where: { id: importLog.id },
            data: {
                totalRows: stats.totalRows,
                invoicesCreated: stats.invoicesCreated,
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
        console.log(`[import-koinor] Import completed in ${duration}s`);
        console.log(`[import-koinor] Stats:`, stats);

        return {
            success: true,
            importLogId: importLog.id,
            stats,
            duration: `${duration}s`
        };

    } catch (error) {
        console.error('[import-koinor] Import failed:', error);

        // Update import log with failure
        await prisma.importLog.update({
            where: { id: importLog.id },
            data: {
                status: 'FAILED',
                errorDetails: { message: error.message, stack: error.stack },
                completedAt: new Date()
            }
        });

        throw error;
    }
}

/**
 * Process a single invoice row (FC)
 */
async function processInvoice(row, sourceFile) {
    const invoiceNumberRaw = String(row.numtra || '').trim();
    const invoiceNumber = normalizeInvoiceNumber(invoiceNumberRaw);

    if (!invoiceNumber) {
        throw new Error('Missing invoice number (numtra)');
    }

    const clientTaxId = cleanTaxId(row.codcli);
    const clientName = String(row.nomcli || '').trim() || 'Cliente sin nombre';
    const totalAmount = parseMoneyAmount(row.valcob);
    const issueDate = parseExcelDate(row.fecemi) || new Date();
    const dueDate = parseExcelDate(row.fecven);
    const concept = String(row.concep || '').trim();

    // Check if invoice exists
    const existing = await prisma.invoice.findUnique({
        where: { invoiceNumber }
    });

    let invoice;
    let created = false;
    let documentLinked = false;

    if (existing) {
        // Update existing invoice (only if not legacy)
        invoice = await prisma.invoice.update({
            where: { invoiceNumber },
            data: {
                clientTaxId,
                clientName,
                totalAmount,
                issueDate,
                dueDate,
                concept,
                sourceFile,
                isLegacy: false // If we now have the real FC, it's no longer legacy
            }
        });
    } else {
        // Create new invoice
        invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceNumberRaw,
                clientTaxId,
                clientName,
                totalAmount,
                issueDate,
                dueDate,
                concept,
                sourceFile,
                status: 'PENDING',
                isLegacy: false
            }
        });
        created = true;

        // Try to link to existing document
        documentLinked = await linkInvoiceToDocument(invoice);
    }

    return { invoice, created, documentLinked };
}

/**
 * Process a single payment row (AB)
 */
async function processPayment(row, invoiceMap, sourceFile) {
    const receiptNumber = String(row.numdoc || '').trim();

    if (!receiptNumber) {
        throw new Error('Missing receipt number (numdoc)');
    }

    // Check if payment already exists (idempotency)
    const existingPayment = await prisma.payment.findUnique({
        where: { receiptNumber }
    });

    if (existingPayment) {
        return { created: false, legacyInvoiceCreated: false };
    }

    const invoiceNumberRaw = String(row.numtra || '').trim();
    const invoiceNumber = normalizeInvoiceNumber(invoiceNumberRaw);

    // Find or create the invoice
    let invoice = invoiceMap.get(invoiceNumberRaw);
    let legacyInvoiceCreated = false;

    if (!invoice) {
        // Try to find in database
        invoice = await prisma.invoice.findUnique({
            where: { invoiceNumber }
        });
    }

    if (!invoice) {
        // Create legacy invoice from payment data
        // Use fectra (original invoice date), NOT fecemi (payment date)
        const invoiceDate = parseExcelDate(row.fectra) || parseExcelDate(row.fecemi) || new Date();
        const clientTaxId = cleanTaxId(row.codcli);
        const clientName = String(row.nomcli || '').trim() || 'Cliente sin nombre';

        invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceNumberRaw,
                clientTaxId,
                clientName,
                totalAmount: parseMoneyAmount(row.valcob), // Estimate from payment
                issueDate: invoiceDate,
                concept: `[LEGACY] Factura histórica creada desde pago`,
                sourceFile,
                status: 'PARTIAL', // Has payment, so at least partial
                isLegacy: true
            }
        });

        legacyInvoiceCreated = true;
        invoiceMap.set(invoiceNumberRaw, invoice);

        console.log(`[import-koinor] Created LEGACY invoice ${invoiceNumber} (date: ${invoiceDate.toISOString().split('T')[0]})`);

        // Try to link to document
        await linkInvoiceToDocument(invoice);
    }

    // Create payment
    const paymentDate = parseExcelDate(row.fecemi) || new Date();
    const amount = parseMoneyAmount(row.valcob);
    const concept = String(row.concep || '').trim();
    const accountingRef = String(row.numcco || '').trim();

    await prisma.payment.create({
        data: {
            receiptNumber,
            amount,
            paymentDate,
            concept,
            accountingRef,
            paymentType: detectPaymentType(concept),
            invoiceId: invoice.id,
            sourceFile
        }
    });

    return { created: true, legacyInvoiceCreated };
}

/**
 * Try to link an invoice to an existing document by numeroFactura
 */
async function linkInvoiceToDocument(invoice) {
    // Find document with matching numeroFactura
    const document = await prisma.document.findFirst({
        where: {
            numeroFactura: invoice.invoiceNumber
        }
    });

    if (document) {
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { documentId: document.id }
        });

        console.log(`[import-koinor] Linked invoice ${invoice.invoiceNumber} to document ${document.protocolNumber}`);
        return true;
    }

    return false;
}

/**
 * Update all invoice statuses based on payments
 */
async function updateInvoiceStatuses() {
    console.log('[import-koinor] Updating invoice statuses...');

    // Get all invoices with their payments
    const invoices = await prisma.invoice.findMany({
        where: {
            status: { not: 'CANCELLED' }
        },
        include: {
            payments: true
        }
    });

    for (const invoice of invoices) {
        const totalPaid = invoice.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0
        );

        const newStatus = calculateInvoiceStatus(
            Number(invoice.totalAmount),
            totalPaid,
            invoice.dueDate
        );

        if (invoice.status !== newStatus) {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: newStatus }
            });
        }
    }

    console.log('[import-koinor] Invoice statuses updated');
}

/**
 * Detect payment type from concept text
 */
function detectPaymentType(concept) {
    const text = (concept || '').toUpperCase();

    if (text.includes('TRANSFER') || text.includes('TRANSF')) {
        return 'TRANSFER';
    }
    if (text.includes('CHEQUE') || text.includes('CHQ')) {
        return 'CHECK';
    }
    if (text.includes('RETENCION') || text.includes('RET')) {
        return 'RETENTION';
    }
    if (text.includes('NOTA DE CREDITO') || text.includes('NC')) {
        return 'CREDIT_NOTE';
    }

    return 'CASH'; // Default
}

/**
 * Get import statistics summary
 */
export async function getImportStats() {
    const [invoiceCount, paymentCount, legacyCount, linkedCount] = await Promise.all([
        prisma.invoice.count(),
        prisma.payment.count(),
        prisma.invoice.count({ where: { isLegacy: true } }),
        prisma.invoice.count({ where: { documentId: { not: null } } })
    ]);

    const byStatus = await prisma.invoice.groupBy({
        by: ['status'],
        _count: { status: true }
    });

    return {
        totalInvoices: invoiceCount,
        totalPayments: paymentCount,
        legacyInvoices: legacyCount,
        linkedToDocuments: linkedCount,
        byStatus: byStatus.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
        }, {})
    };
}
