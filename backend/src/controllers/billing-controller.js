/**
 * Billing Controller
 * Handles billing module endpoints for invoices, payments, and imports
 */
import { db as prisma } from '../db.js';

/**
 * Helper function to get payment status for a document (internal use)
 * Can be called from other controllers without req/res
 * @param {number} documentId - Document ID
 * @returns {Object} Payment status info
 */
export async function getPaymentStatusForDocument(documentId) {
    try {
        const invoices = await prisma.invoice.findMany({
            where: { documentId },
            include: {
                payments: true
            }
        });

        if (invoices.length === 0) {
            return {
                hasInvoice: false,
                status: 'NO_INVOICE',
                message: '',
                totalDebt: 0,
                infoPago: '' // No mostrar nada si no hay factura
            };
        }

        let totalAmount = 0;
        let totalPaid = 0;
        const invoiceDetails = [];

        for (const invoice of invoices) {
            const paid = invoice.payments.reduce(
                (sum, p) => sum + Number(p.amount),
                0
            );
            const balance = Number(invoice.totalAmount) - paid;

            totalAmount += Number(invoice.totalAmount);
            totalPaid += paid;

            invoiceDetails.push({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                total: Number(invoice.totalAmount),
                paid: paid,
                balance: balance,
                status: balance <= 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING')
            });
        }

        const totalDebt = totalAmount - totalPaid;
        const firstInvoice = invoiceDetails[0];

        // Generar texto de infoPago solo si hay saldo pendiente
        let infoPago = '';
        if (totalDebt > 0) {
            infoPago = `
💰 *INFORMACIÓN DE PAGO:*
📄 *Factura:* ${firstInvoice.invoiceNumber}
💵 *Total:* $${totalAmount.toFixed(2)}
✅ *Pagado:* $${totalPaid.toFixed(2)}
⚠️ *Saldo pendiente:* $${totalDebt.toFixed(2)}

🔔 Por favor regularice su pago antes de retirar.
`;
        }

        return {
            hasInvoice: true,
            status: totalDebt <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING'),
            message: totalDebt <= 0
                ? 'Pagado completamente'
                : `Saldo pendiente: $${totalDebt.toFixed(2)}`,
            totalAmount,
            totalPaid,
            totalDebt,
            invoices: invoiceDetails,
            // Variables para templates
            saldoPendiente: totalDebt > 0 ? `$${totalDebt.toFixed(2)}` : '',
            numeroFactura: firstInvoice?.invoiceNumber || '',
            totalFactura: `$${totalAmount.toFixed(2)}`,
            estadoPago: totalDebt <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING'),
            infoPago
        };
    } catch (error) {
        console.error('[billing-controller] getPaymentStatusForDocument error:', error);
        return {
            hasInvoice: false,
            status: 'ERROR',
            message: '',
            totalDebt: 0,
            infoPago: ''
        };
    }
}


/**
 * Health check for billing module
 */
export async function healthCheck(req, res) {
    try {
        // Test database connection
        const invoiceCount = await prisma.invoice.count();
        const paymentCount = await prisma.payment.count();

        res.json({
            status: 'ok',
            module: 'billing',
            timestamp: new Date().toISOString(),
            stats: {
                invoices: invoiceCount,
                payments: paymentCount
            }
        });
    } catch (error) {
        console.error('[billing-controller] Health check error:', error);
        res.status(500).json({
            status: 'error',
            module: 'billing',
            error: error.message
        });
    }
}

/**
 * Get all invoices with pagination and filters
 */
export async function getInvoices(req, res) {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            clientTaxId,
            search,
            dateFrom,
            dateTo
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        const where = {};

        if (status) {
            where.status = status;
        }

        if (clientTaxId) {
            where.clientTaxId = clientTaxId;
        }

        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { clientTaxId: { contains: search } }
            ];
        }

        if (dateFrom || dateTo) {
            where.issueDate = {};
            if (dateFrom) where.issueDate.gte = new Date(dateFrom);
            if (dateTo) where.issueDate.lte = new Date(dateTo);
        }

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                skip,
                take,
                orderBy: { issueDate: 'desc' },
                include: {
                    payments: {
                        select: {
                            id: true,
                            amount: true,
                            paymentDate: true,
                            receiptNumber: true
                        }
                    },
                    document: {
                        select: {
                            id: true,
                            protocolNumber: true,
                            clientName: true,
                            status: true
                        }
                    }
                }
            }),
            prisma.invoice.count({ where })
        ]);

        // Calculate balance for each invoice
        const invoicesWithBalance = invoices.map(invoice => {
            const totalPaid = invoice.payments.reduce(
                (sum, p) => sum + Number(p.amount),
                0
            );
            return {
                ...invoice,
                totalAmount: Number(invoice.totalAmount),
                totalPaid,
                balance: Number(invoice.totalAmount) - totalPaid
            };
        });

        res.json({
            data: invoicesWithBalance,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[billing-controller] Get invoices error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get single invoice by ID
 */
export async function getInvoiceById(req, res) {
    try {
        const { id } = req.params;

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                payments: {
                    orderBy: { paymentDate: 'desc' }
                },
                document: {
                    select: {
                        id: true,
                        protocolNumber: true,
                        clientName: true,
                        clientPhone: true,
                        status: true,
                        codigoRetiro: true
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        const totalPaid = invoice.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0
        );

        res.json({
            ...invoice,
            totalAmount: Number(invoice.totalAmount),
            totalPaid,
            balance: Number(invoice.totalAmount) - totalPaid
        });
    } catch (error) {
        console.error('[billing-controller] Get invoice by ID error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get all payments with pagination and filters
 */
export async function getPayments(req, res) {
    try {
        const {
            page = 1,
            limit = 20,
            invoiceId,
            dateFrom,
            dateTo
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};

        if (invoiceId) {
            where.invoiceId = invoiceId;
        }

        if (dateFrom || dateTo) {
            where.paymentDate = {};
            if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
            if (dateTo) where.paymentDate.lte = new Date(dateTo);
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                skip,
                take,
                orderBy: { paymentDate: 'desc' },
                include: {
                    invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            clientName: true,
                            clientTaxId: true
                        }
                    }
                }
            }),
            prisma.payment.count({ where })
        ]);

        res.json({
            data: payments.map(p => ({
                ...p,
                amount: Number(p.amount)
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[billing-controller] Get payments error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get import logs
 */
export async function getImportLogs(req, res) {
    try {
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [logs, total] = await Promise.all([
            prisma.importLog.findMany({
                skip,
                take,
                orderBy: { startedAt: 'desc' },
                include: {
                    executedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }),
            prisma.importLog.count()
        ]);

        res.json({
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[billing-controller] Get import logs error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get payment status for a document
 * This is used to show payment alerts in document views
 */
export async function getDocumentPaymentStatus(req, res) {
    try {
        const { documentId } = req.params;

        const invoices = await prisma.invoice.findMany({
            where: { documentId },
            include: {
                payments: true
            }
        });

        if (invoices.length === 0) {
            return res.json({
                hasInvoice: false,
                status: 'NO_INVOICE',
                message: 'Sin factura asociada',
                totalDebt: 0
            });
        }

        let totalAmount = 0;
        let totalPaid = 0;
        const invoiceDetails = [];

        for (const invoice of invoices) {
            const paid = invoice.payments.reduce(
                (sum, p) => sum + Number(p.amount),
                0
            );
            const balance = Number(invoice.totalAmount) - paid;

            totalAmount += Number(invoice.totalAmount);
            totalPaid += paid;

            invoiceDetails.push({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                total: Number(invoice.totalAmount),
                paid: paid,
                balance: balance,
                status: balance <= 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING')
            });
        }

        const totalDebt = totalAmount - totalPaid;

        res.json({
            hasInvoice: true,
            status: totalDebt <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING'),
            message: totalDebt <= 0
                ? 'Pagado completamente'
                : `Saldo pendiente: $${totalDebt.toFixed(2)}`,
            totalAmount,
            totalPaid,
            totalDebt,
            invoices: invoiceDetails
        });
    } catch (error) {
        console.error('[billing-controller] Get document payment status error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Import Koinor Excel file
 * Requires multipart/form-data with 'file' field
 */
export async function importFile(req, res) {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó archivo',
                message: 'Debe subir un archivo Excel (.xls, .xlsx) o CSV (.csv)'
            });
        }

        const { file } = req;
        const userId = req.user?.id;

        // Validate file type
        const allowedExtensions = ['.xls', '.xlsx', '.csv'];
        const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

        if (!allowedExtensions.includes(ext)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de archivo no válido',
                message: `Solo se permiten archivos: ${allowedExtensions.join(', ')}`
            });
        }

        console.log(`[billing-controller] Starting import of ${file.originalname} (${file.size} bytes)`);

        // Import the service dynamically to avoid circular dependencies
        const { importKoinorFile } = await import('../services/import-koinor-service.js');

        // Process the file
        const result = await importKoinorFile(
            file.buffer,
            file.originalname,
            userId
        );

        res.json({
            success: true,
            message: 'Importación completada',
            ...result
        });

    } catch (error) {
        console.error('[billing-controller] Import error:', error);
        res.status(500).json({
            success: false,
            error: 'Error durante la importación',
            message: error.message
        });
    }
}

/**
 * Get billing statistics
 */
export async function getStats(req, res) {
    try {
        const { getImportStats } = await import('../services/import-koinor-service.js');
        const stats = await getImportStats();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('[billing-controller] Get stats error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get list of clients with balances
 */
export async function getClients(req, res) {
    try {
        const { page = 1, limit = 20, search, hasDebt } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Get unique clients from invoices with aggregated data
        const clients = await prisma.$queryRaw`
            SELECT 
                i."clientTaxId",
                i."clientName",
                COUNT(DISTINCT i.id) as "invoiceCount",
                SUM(i."totalAmount") as "totalInvoiced",
                COALESCE(SUM(p.paid), 0) as "totalPaid",
                SUM(i."totalAmount") - COALESCE(SUM(p.paid), 0) as "balance",
                MAX(i."issueDate") as "lastInvoiceDate"
            FROM invoices i
            LEFT JOIN (
                SELECT "invoiceId", SUM(amount) as paid
                FROM payments
                GROUP BY "invoiceId"
            ) p ON i.id = p."invoiceId"
            ${search ? prisma.$queryRaw`WHERE i."clientName" ILIKE ${'%' + search + '%'} OR i."clientTaxId" LIKE ${'%' + search + '%'}` : prisma.$queryRaw``}
            GROUP BY i."clientTaxId", i."clientName"
            ${hasDebt === 'true' ? prisma.$queryRaw`HAVING SUM(i."totalAmount") - COALESCE(SUM(p.paid), 0) > 0` : prisma.$queryRaw``}
            ORDER BY "balance" DESC
            LIMIT ${take} OFFSET ${skip}
        `;

        // Get total count
        const countResult = await prisma.$queryRaw`
            SELECT COUNT(DISTINCT "clientTaxId") as count FROM invoices
        `;

        res.json({
            data: clients.map(c => ({
                ...c,
                invoiceCount: Number(c.invoiceCount),
                totalInvoiced: Number(c.totalInvoiced),
                totalPaid: Number(c.totalPaid),
                balance: Number(c.balance)
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: Number(countResult[0]?.count || 0),
                pages: Math.ceil(Number(countResult[0]?.count || 0) / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[billing-controller] Get clients error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get balance for a specific client by tax ID
 */
export async function getClientBalance(req, res) {
    try {
        const { taxId } = req.params;

        // Get client invoices with payments
        const invoices = await prisma.invoice.findMany({
            where: { clientTaxId: taxId },
            include: {
                payments: true,
                document: {
                    select: {
                        id: true,
                        protocolNumber: true,
                        status: true
                    }
                }
            },
            orderBy: { issueDate: 'desc' }
        });

        if (invoices.length === 0) {
            return res.status(404).json({
                error: 'Cliente no encontrado',
                message: `No se encontraron facturas para el cliente ${taxId}`
            });
        }

        let totalInvoiced = 0;
        let totalPaid = 0;
        const invoiceDetails = [];

        for (const invoice of invoices) {
            const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Number(invoice.totalAmount) - paid;

            totalInvoiced += Number(invoice.totalAmount);
            totalPaid += paid;

            invoiceDetails.push({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                issueDate: invoice.issueDate,
                total: Number(invoice.totalAmount),
                paid,
                balance,
                status: invoice.status,
                document: invoice.document
            });
        }

        res.json({
            clientTaxId: taxId,
            clientName: invoices[0].clientName,
            totalInvoiced,
            totalPaid,
            balance: totalInvoiced - totalPaid,
            invoiceCount: invoices.length,
            status: totalInvoiced - totalPaid <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING'),
            invoices: invoiceDetails
        });
    } catch (error) {
        console.error('[billing-controller] Get client balance error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get payments for a specific invoice
 */
export async function getInvoicePayments(req, res) {
    try {
        const { id } = req.params;

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                payments: {
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);

        res.json({
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: Number(invoice.totalAmount),
            totalPaid,
            balance: Number(invoice.totalAmount) - totalPaid,
            payments: invoice.payments.map(p => ({
                ...p,
                amount: Number(p.amount)
            }))
        });
    } catch (error) {
        console.error('[billing-controller] Get invoice payments error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Get billing summary for a date range (for dashboard)
 */
export async function getSummary(req, res) {
    try {
        const { dateFrom, dateTo } = req.query;

        const where = {};
        if (dateFrom || dateTo) {
            where.issueDate = {};
            if (dateFrom) where.issueDate.gte = new Date(dateFrom);
            if (dateTo) where.issueDate.lte = new Date(dateTo);
        }

        // Get invoices in range
        const invoices = await prisma.invoice.findMany({
            where,
            include: { payments: true }
        });

        let totalInvoiced = 0;
        let totalPaid = 0;
        let pendingCount = 0;
        let paidCount = 0;
        let partialCount = 0;

        for (const invoice of invoices) {
            const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Number(invoice.totalAmount) - paid;

            totalInvoiced += Number(invoice.totalAmount);
            totalPaid += paid;

            if (balance <= 0) paidCount++;
            else if (paid > 0) partialCount++;
            else pendingCount++;
        }

        // Get recent imports
        const recentImports = await prisma.importLog.findMany({
            take: 5,
            orderBy: { startedAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                status: true,
                totalRows: true,
                invoicesCreated: true,
                paymentsCreated: true,
                startedAt: true
            }
        });

        res.json({
            period: {
                from: dateFrom || 'all',
                to: dateTo || 'all'
            },
            totals: {
                invoiced: totalInvoiced,
                paid: totalPaid,
                pending: totalInvoiced - totalPaid
            },
            counts: {
                total: invoices.length,
                paid: paidCount,
                partial: partialCount,
                pending: pendingCount
            },
            recentImports
        });
    } catch (error) {
        console.error('[billing-controller] Get summary error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * ============================================================================
 * SPRINT 6: CARTERA DE MATRIZADORES
 * ============================================================================
 */

/**
 * Get my portfolio - invoices for documents assigned to the current user
 * For MATRIZADOR role to see pending invoices from their documents
 */
export async function getMyPortfolio(req, res) {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 50, status, groupByClient = 'true' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        console.log(`[billing-controller] getMyPortfolio for user ${userId}`);

        // Get documents assigned to this user that have invoices
        const documents = await prisma.document.findMany({
            where: {
                assignedToId: userId,
                invoices: {
                    some: {} // Has at least one invoice
                }
            },
            include: {
                invoices: {
                    include: {
                        payments: true
                    }
                }
            }
        });

        // Process invoices and calculate balances
        const clientMap = new Map();
        let totalDebt = 0;
        let totalOverdue = 0;

        for (const doc of documents) {
            for (const invoice of doc.invoices) {
                const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const balance = Number(invoice.totalAmount) - paid;

                if (balance <= 0) continue; // Skip fully paid

                // Check if overdue
                const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();
                if (isOverdue) totalOverdue += balance;
                totalDebt += balance;

                // Group by client
                const clientKey = invoice.clientTaxId;
                if (!clientMap.has(clientKey)) {
                    clientMap.set(clientKey, {
                        clientTaxId: invoice.clientTaxId,
                        clientName: invoice.clientName,
                        clientPhone: doc.clientPhone,
                        totalDebt: 0,
                        overdueDebt: 0,
                        invoices: []
                    });
                }

                const client = clientMap.get(clientKey);
                client.totalDebt += balance;
                if (isOverdue) client.overdueDebt += balance;
                client.invoices.push({
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    documentId: doc.id,
                    protocolNumber: doc.protocolNumber,
                    documentType: doc.documentType,
                    issueDate: invoice.issueDate,
                    dueDate: invoice.dueDate,
                    totalAmount: Number(invoice.totalAmount),
                    totalPaid: paid,
                    balance,
                    isOverdue,
                    daysOverdue: isOverdue
                        ? Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))
                        : 0
                });
            }
        }

        // Convert to array and sort by debt amount
        const clients = Array.from(clientMap.values())
            .sort((a, b) => b.totalDebt - a.totalDebt);

        // Apply pagination
        const paginatedClients = clients.slice(skip, skip + take);

        res.json({
            summary: {
                totalClients: clients.length,
                totalDebt,
                totalOverdue,
                totalCurrent: totalDebt - totalOverdue
            },
            data: groupByClient === 'true' ? paginatedClients : clients.flatMap(c => c.invoices),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: clients.length,
                pages: Math.ceil(clients.length / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[billing-controller] getMyPortfolio error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Generate WhatsApp reminder message for collection
 * Creates a formatted message with all pending invoices for a client
 */
export async function generateCollectionReminder(req, res) {
    try {
        const { clientTaxId } = req.params;
        const userId = req.user.id;

        // Get invoices for this client from documents assigned to the user
        const documents = await prisma.document.findMany({
            where: {
                assignedToId: userId,
                invoices: {
                    some: {
                        clientTaxId
                    }
                }
            },
            include: {
                invoices: {
                    where: { clientTaxId },
                    include: { payments: true }
                }
            }
        });

        if (documents.length === 0) {
            return res.status(404).json({ error: 'No se encontraron facturas para este cliente' });
        }

        // Calculate totals
        let totalDebt = 0;
        const invoiceDetails = [];
        let clientName = '';
        let clientPhone = '';

        for (const doc of documents) {
            if (!clientPhone && doc.clientPhone) clientPhone = doc.clientPhone;

            for (const invoice of doc.invoices) {
                clientName = invoice.clientName;
                const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const balance = Number(invoice.totalAmount) - paid;

                if (balance > 0) {
                    totalDebt += balance;
                    invoiceDetails.push({
                        invoiceNumber: invoice.invoiceNumber,
                        total: Number(invoice.totalAmount),
                        paid,
                        balance,
                        dueDate: invoice.dueDate
                    });
                }
            }
        }

        if (invoiceDetails.length === 0) {
            return res.json({
                success: false,
                message: 'El cliente no tiene saldo pendiente'
            });
        }

        // Build message
        let message = `📋 *NOTARÍA 18 - RECORDATORIO DE PAGO*\n\nEstimado cliente,\n\nLe recordamos que tiene los siguientes valores pendientes:\n\n`;

        for (const inv of invoiceDetails) {
            message += `📄 *Factura:* ${inv.invoiceNumber}\n`;
            message += `   • Total: $${inv.total.toFixed(2)}\n`;
            message += `   • Pagado: $${inv.paid.toFixed(2)}\n`;
            message += `   • Saldo: $${inv.balance.toFixed(2)}\n`;
            if (inv.dueDate) {
                message += `   • Vencimiento: ${new Date(inv.dueDate).toLocaleDateString('es-EC')}\n`;
            }
            message += `\n`;
        }

        message += `💰 *TOTAL PENDIENTE: $${totalDebt.toFixed(2)}*\n\n`;
        message += `Para su comodidad puede realizar el pago mediante:\n`;
        message += `• Transferencia bancaria\n`;
        message += `• Pago en efectivo en nuestras oficinas\n\n`;
        message += `Atentamente,\n`;
        message += `*Notaría Décima Octava del Cantón Quito*\n`;
        message += `📍 Azuay E2-231 y Av Amazonas, Quito\n`;
        message += `📞 Tel: (02) 2247787`;

        // Format phone for wa.me - use query param phone if provided, otherwise use from document
        const phoneToUse = req.query.phone || clientPhone;
        let formattedPhone = phoneToUse ? phoneToUse.replace(/[\s\-\(\)]/g, '') : '';
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '593' + formattedPhone.substring(1);
        } else if (formattedPhone && !formattedPhone.startsWith('593')) {
            formattedPhone = '593' + formattedPhone;
        }

        const waUrl = formattedPhone
            ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
            : null;

        // Log the reminder
        await prisma.documentEvent.create({
            data: {
                documentId: documents[0].id,
                userId,
                eventType: 'COLLECTION_REMINDER',
                description: `Recordatorio de cobro generado para ${clientName}`,
                details: JSON.stringify({
                    clientTaxId,
                    clientName,
                    totalDebt,
                    invoiceCount: invoiceDetails.length,
                    timestamp: new Date().toISOString()
                })
            }
        });

        res.json({
            success: true,
            clientName,
            clientPhone,
            totalDebt,
            invoiceCount: invoiceDetails.length,
            message,
            waUrl
        });
    } catch (error) {
        console.error('[billing-controller] generateCollectionReminder error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * ============================================================================
 * SPRINT 7: REPORTES
 * ============================================================================
 */

/**
 * Report: Cartera por Cobrar (Accounts Receivable by Client)
 * Groups unpaid invoices by client with totals
 */
export async function getCarteraPorCobrar(req, res) {
    try {
        console.log('[billing-controller] getCarteraPorCobrar');

        // Get all invoices with payments
        const invoices = await prisma.invoice.findMany({
            where: {
                status: {
                    in: ['PENDING', 'PARTIAL', 'OVERDUE']
                }
            },
            include: {
                payments: true,
                document: {
                    select: {
                        assignedTo: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: { issueDate: 'desc' }
        });

        // Group by client
        const clientMap = new Map();

        for (const invoice of invoices) {
            const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Number(invoice.totalAmount) - paid;

            if (balance <= 0) continue; // Skip fully paid

            const key = invoice.clientTaxId;
            if (!clientMap.has(key)) {
                clientMap.set(key, {
                    clientTaxId: invoice.clientTaxId,
                    clientName: invoice.clientName,
                    invoiceCount: 0,
                    totalInvoiced: 0,
                    totalPaid: 0,
                    balance: 0,
                    matrizador: invoice.document?.assignedTo
                        ? `${invoice.document.assignedTo.firstName} ${invoice.document.assignedTo.lastName}`
                        : 'Sin asignar'
                });
            }

            const client = clientMap.get(key);
            client.invoiceCount++;
            client.totalInvoiced += Number(invoice.totalAmount);
            client.totalPaid += paid;
            client.balance += balance;
        }

        // Convert to array and sort by balance descending
        const data = Array.from(clientMap.values())
            .sort((a, b) => b.balance - a.balance);

        // Calculate totals
        const totals = data.reduce((acc, c) => ({
            totalInvoiced: acc.totalInvoiced + c.totalInvoiced,
            totalPaid: acc.totalPaid + c.totalPaid,
            totalBalance: acc.totalBalance + c.balance,
            clientCount: acc.clientCount + 1
        }), { totalInvoiced: 0, totalPaid: 0, totalBalance: 0, clientCount: 0 });

        res.json({
            success: true,
            reportType: 'cartera-por-cobrar',
            reportName: 'Cartera por Cobrar',
            generatedAt: new Date().toISOString(),
            data,
            totals
        });
    } catch (error) {
        console.error('[billing-controller] getCarteraPorCobrar error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Report: Pagos del Período (Payments in Date Range)
 */
export async function getPagosDelPeriodo(req, res) {
    try {
        const { dateFrom, dateTo } = req.query;

        console.log(`[billing-controller] getPagosDelPeriodo from ${dateFrom} to ${dateTo}`);

        // Default to current month if no dates provided
        const now = new Date();
        const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const from = dateFrom ? new Date(dateFrom) : defaultFrom;
        const to = dateTo ? new Date(dateTo) : defaultTo;
        // Set to end of day
        to.setHours(23, 59, 59, 999);

        const payments = await prisma.payment.findMany({
            where: {
                paymentDate: {
                    gte: from,
                    lte: to
                }
            },
            include: {
                invoice: {
                    select: {
                        invoiceNumber: true,
                        clientName: true,
                        clientTaxId: true
                    }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });

        const data = payments.map(p => ({
            fecha: p.paymentDate,
            recibo: p.receiptNumber,
            cliente: p.invoice.clientName,
            cedula: p.invoice.clientTaxId,
            factura: p.invoice.invoiceNumber,
            monto: Number(p.amount),
            concepto: p.concept || 'Abono a factura'
        }));

        // Calculate totals
        const totalMonto = data.reduce((sum, p) => sum + p.monto, 0);

        res.json({
            success: true,
            reportType: 'pagos-periodo',
            reportName: 'Pagos del Período',
            generatedAt: new Date().toISOString(),
            period: {
                from: from.toISOString(),
                to: to.toISOString()
            },
            data,
            totals: {
                count: data.length,
                totalMonto
            }
        });
    } catch (error) {
        console.error('[billing-controller] getPagosDelPeriodo error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Report: Facturas Vencidas (Overdue Invoices)
 */
export async function getFacturasVencidas(req, res) {
    try {
        console.log('[billing-controller] getFacturasVencidas');

        const now = new Date();

        // Get invoices with due date in the past
        const invoices = await prisma.invoice.findMany({
            where: {
                dueDate: {
                    lt: now
                },
                status: {
                    not: 'PAID'
                }
            },
            include: {
                payments: true,
                document: {
                    select: {
                        id: true,
                        protocolNumber: true,
                        clientPhone: true,
                        assignedTo: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        const data = invoices
            .map(inv => {
                const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const balance = Number(inv.totalAmount) - paid;

                if (balance <= 0) return null; // Skip fully paid

                const diasVencido = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));

                return {
                    factura: inv.invoiceNumber,
                    cliente: inv.clientName,
                    cedula: inv.clientTaxId,
                    telefono: inv.document?.clientPhone || '',
                    emision: inv.issueDate,
                    vencimiento: inv.dueDate,
                    diasVencido,
                    totalFactura: Number(inv.totalAmount),
                    pagado: paid,
                    saldo: balance,
                    matrizador: inv.document?.assignedTo
                        ? `${inv.document.assignedTo.firstName} ${inv.document.assignedTo.lastName}`
                        : 'Sin asignar'
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.diasVencido - a.diasVencido);

        // Calculate totals
        const totals = data.reduce((acc, inv) => ({
            count: acc.count + 1,
            totalFacturado: acc.totalFacturado + inv.totalFactura,
            totalPagado: acc.totalPagado + inv.pagado,
            totalSaldo: acc.totalSaldo + inv.saldo
        }), { count: 0, totalFacturado: 0, totalPagado: 0, totalSaldo: 0 });

        res.json({
            success: true,
            reportType: 'facturas-vencidas',
            reportName: 'Facturas Vencidas',
            generatedAt: new Date().toISOString(),
            data,
            totals
        });
    } catch (error) {
        console.error('[billing-controller] getFacturasVencidas error:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Report: Entregas con Saldo Pendiente (Delivered Documents with Pending Balance)
 * For auditing purposes - documents marked as ENTREGADO but still have pending payments
 */
export async function getEntregasConSaldo(req, res) {
    try {
        console.log('[billing-controller] getEntregasConSaldo');

        // Get delivered documents that have invoices with pending balance
        const documents = await prisma.document.findMany({
            where: {
                status: 'ENTREGADO',
                invoices: {
                    some: {
                        status: {
                            not: 'PAID'
                        }
                    }
                }
            },
            include: {
                invoices: {
                    include: {
                        payments: true
                    }
                },
                assignedTo: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const data = documents
            .map(doc => {
                // Calculate total invoiced, paid, and balance for this document
                const invoiceData = doc.invoices.reduce((acc, inv) => {
                    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    const balance = Number(inv.totalAmount) - paid;
                    return {
                        totalInvoiced: acc.totalInvoiced + Number(inv.totalAmount),
                        totalPaid: acc.totalPaid + paid,
                        balance: acc.balance + balance,
                        invoiceCount: acc.invoiceCount + 1
                    };
                }, { totalInvoiced: 0, totalPaid: 0, balance: 0, invoiceCount: 0 });

                if (invoiceData.balance <= 0) return null; // Skip if fully paid

                const deliveryDate = doc.deliveryDate || doc.updatedAt;
                const daysSinceDelivery = Math.floor(
                    (new Date().getTime() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                return {
                    protocolo: doc.protocolNumber,
                    cliente: doc.clientName || 'Sin nombre',
                    cedula: doc.clientId || '',
                    telefono: doc.clientPhone || '',
                    fechaEntrega: deliveryDate,
                    diasDesdeEntrega: daysSinceDelivery,
                    facturas: invoiceData.invoiceCount,
                    totalFacturado: invoiceData.totalInvoiced,
                    totalPagado: invoiceData.totalPaid,
                    saldoPendiente: invoiceData.balance,
                    matrizador: doc.assignedTo
                        ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}`
                        : 'Sin asignar'
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.saldoPendiente - a.saldoPendiente);

        // Calculate totals
        const totals = data.reduce((acc, row) => ({
            count: acc.count + 1,
            totalFacturado: acc.totalFacturado + row.totalFacturado,
            totalPagado: acc.totalPagado + row.totalPagado,
            totalSaldo: acc.totalSaldo + row.saldoPendiente
        }), { count: 0, totalFacturado: 0, totalPagado: 0, totalSaldo: 0 });

        res.json({
            success: true,
            reportType: 'entregas-con-saldo',
            reportName: 'Entregas con Saldo Pendiente',
            generatedAt: new Date().toISOString(),
            data,
            totals
        });
    } catch (error) {
        console.error('[billing-controller] getEntregasConSaldo error:', error);
        res.status(500).json({ error: error.message });
    }
}
