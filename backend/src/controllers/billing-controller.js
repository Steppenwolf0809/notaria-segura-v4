/**
 * Billing Controller
 * Handles billing module endpoints for invoices, payments, and imports
 */
import { db as prisma } from '../db.js';

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
