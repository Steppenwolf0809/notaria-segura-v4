/**
 * Billing Controller
 * Handles billing module endpoints for invoices, payments, and imports
 */
import { db as prisma } from '../db.js';

// Normalización de nombres de matrizadores para evitar duplicados visuales
const MATRIZADOR_NAME_NORMALIZATION = {
    // Mayra Corella
    'Mayra Cristina Corella Parra': 'Mayra Corella',
    'Mayra Corella Parra': 'Mayra Corella',
    'Mayra Cristina': 'Mayra Corella',
    'Mayra': 'Mayra Corella',

    // Karol Velastegui
    'Karol Daniela Velastegui Cadena': 'Karol Velastegui',
    'Karol Daniela': 'Karol Velastegui',
    'Karol': 'Karol Velastegui',

    // Jose Zapata
    'Jose Luis Zapata Silva': 'Jose Zapata',
    'Jose Luis': 'Jose Zapata',
    'Jose': 'Jose Zapata',

    // Gissela Velastegui
    'Gissela': 'Gissela Velastegui',

    // Maria Diaz
    'Maria Lucinda': 'Maria Diaz',
    'Maria': 'Maria Diaz',

    // Esteban Proaño
    'Francisco Esteban': 'Esteban Proaño',
    'Francisco': 'Esteban Proaño',
    'Esteban': 'Esteban Proaño'
};

/**
 * Normaliza el nombre del matrizador a un formato estándar
 * @param {string} name - Nombre del matrizador
 * @returns {string} - Nombre normalizado
 */
function normalizeMatrizadorName(name) {
    if (!name) return 'Sin asignar';
    const normalized = MATRIZADOR_NAME_NORMALIZATION[name.trim()] || name.trim();
    return normalized;
}

/**
 * Helper function to get payment status for a document (internal use)
 * Can be called from other controllers without req/res
 * @param {number} documentId - Document ID
 * @returns {Object} Payment status info
 */
export async function getPaymentStatusForDocument(documentId) {
    try {
        // Obtener datos mínimos del documento para posibles estrategias de coincidencia
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: { numeroFactura: true, protocolNumber: true }
        });

        // Primero: facturas vinculadas directamente al documento
        let invoices = await prisma.invoice.findMany({
            where: { documentId },
            include: { payments: true }
        });

        // Fallback: si no hay facturas vinculadas pero el documento tiene numeroFactura,
        // buscar por invoiceNumber/invoiceNumberRaw considerando el secuencial
        if (invoices.length === 0 && doc?.numeroFactura) {
            const numero = doc.numeroFactura;
            const seq = String(numero).split('-').pop()?.replace(/^0+/, '') || '';

            const candidates = await prisma.invoice.findMany({
                where: {
                    OR: [
                        { invoiceNumber: numero },
                        { invoiceNumberRaw: numero },
                        seq ? { invoiceNumber: { endsWith: seq } } : undefined,
                        seq ? { invoiceNumberRaw: { endsWith: seq } } : undefined
                    ].filter(Boolean)
                },
                include: { payments: true },
                orderBy: { issueDate: 'desc' },
                take: 3
            });

            if (candidates.length > 0) {
                // Usar el candidato más reciente para cálculo del estado
                invoices = [candidates[0]];

                // Enlazar si no tiene documento y la coincidencia es exacta por numero o secuencial único
                if (!candidates[0].documentId && (candidates.length === 1)) {
                    await prisma.invoice.update({
                        where: { id: candidates[0].id },
                        data: { documentId }
                    });
                }
            }
        }

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
            // Calculate paid amount from both sources:
            // 1. Payments table (manual imports/XML)
            const paymentsTotal = invoice.payments.reduce(
                (sum, p) => sum + Number(p.amount),
                0
            );
            // 2. paidAmount from Koinor sync (sync-billing)
            const syncedPaidAmount = Number(invoice.paidAmount || 0);
            // Use the higher value (sync might have more recent data)
            const paid = Math.max(paymentsTotal, syncedPaidAmount);
            
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            status: 'error',
            module: 'billing',
            message: 'Error en health check del módulo de facturación'
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
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                where.issueDate.gte = fromDate;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                where.issueDate.lte = toDate;
            }
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
            const paymentsTotal = invoice.payments.reduce(
                (sum, p) => sum + Number(p.amount),
                0
            );
            // Use the higher value between synced paidAmount and payments table sum
            const syncedPaidAmount = Number(invoice.paidAmount || 0);
            const totalPaid = Math.max(syncedPaidAmount, paymentsTotal);
            return {
                ...invoice,
                totalAmount: Number(invoice.totalAmount),
                paidAmount: totalPaid,
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al obtener facturas'
        });
    }
}

/**
 * Get single invoice by ID
 * 🔒 OWASP Security: Added ownership validation to prevent IDOR attacks
 */
export async function getInvoiceById(req, res) {
    try {
        // ✅ SECURITY: ID is validated by Zod middleware before reaching here
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

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
                        codigoRetiro: true,
                        assignedToId: true // 🔒 SECURITY: Need this for ownership check
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        // 🔒 SECURITY FIX: Check ownership - only ADMIN, CAJA, or assigned user can view
        if (userRole !== 'ADMIN' && userRole !== 'CAJA' && userRole !== 'RECEPCION') {
            // For MATRIZADOR and ARCHIVO: verify they own the document
            if (invoice.document?.assignedToId !== userId) {
                console.warn(`[SECURITY] IDOR attempt: User ${userId} (${userRole}) tried to access invoice ${id} owned by ${invoice.document?.assignedToId}`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a esta factura'
                });
            }
        }

        // Calculate total from payments table
        const paymentsTotal = invoice.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0
        );

        // Use the higher value between synced paidAmount and payments table sum
        // This handles both Koinor sync (updates paidAmount directly) and manual payments
        const syncedPaidAmount = Number(invoice.paidAmount || 0);
        const totalPaid = Math.max(syncedPaidAmount, paymentsTotal);

        // Remove assignedToId from response (internal use only)
        const { assignedToId, ...documentData } = invoice.document || {};

        res.json({
            ...invoice,
            document: documentData,
            totalAmount: Number(invoice.totalAmount),
            paidAmount: totalPaid, // Override with calculated value
            totalPaid,
            balance: Number(invoice.totalAmount) - totalPaid
        });
    } catch (error) {
        console.error('[billing-controller] Get invoice by ID error:', error);
        // 🔒 SECURITY: Never expose internal error details to client
        res.status(500).json({
            success: false,
            message: 'Error al obtener factura'
        });
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al obtener pagos'
        });
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al obtener logs de importación'
        });
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
            // Calculate paid amount from both sources:
            // 1. Payments table (manual imports/XML)
            const paymentsTotal = invoice.payments.reduce(
                (sum, p) => sum + Number(p.amount),
                0
            );
            // 2. paidAmount from Koinor sync (sync-billing)
            const syncedPaidAmount = Number(invoice.paidAmount || 0);
            // Use the higher value (sync might have more recent data)
            const paid = Math.max(paymentsTotal, syncedPaidAmount);
            
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado de pago del documento'
        });
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error durante la importación del archivo'
        });
    }
}

/**
 * Import Koinor XML file (NUEVO - Reemplaza sistema XLS)
 * Requires multipart/form-data with 'file' field
 *
 * Características:
 * - Parser por streaming para archivos grandes
 * - Idempotencia estricta (evita duplicados)
 * - Búsqueda por invoiceNumberRaw (formato XML)
 * - Actualización automática de estados
 */
export async function importXmlFile(req, res) {
    try {
        // Validar archivo
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó archivo',
                message: 'Debe subir un archivo XML (.xml)'
            });
        }

        const { file } = req;
        const userId = req.user?.id;

        // Validar extensión
        const ext = file.originalname.toLowerCase().substring(
            file.originalname.lastIndexOf('.')
        );

        if (ext !== '.xml') {
            return res.status(400).json({
                success: false,
                error: 'Tipo de archivo no válido',
                message: 'Solo se permiten archivos XML (.xml)'
            });
        }

        // Validar tamaño (máximo 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: 'Archivo demasiado grande',
                message: 'El archivo no debe superar 50MB'
            });
        }

        console.log(`[billing-controller] Starting XML import of ${file.originalname} (${file.size} bytes)`);

        // Detectar tipo de XML por contenido
        let xmlPreview;
        try {
            // Intentar leer como UTF-16LE primero (formato típico de Koinor)
            xmlPreview = file.buffer.toString('utf16le').substring(0, 1000);
            if (!xmlPreview.includes('<?xml')) {
                xmlPreview = file.buffer.toString('utf8').substring(0, 1000);
            }
        } catch (e) {
            xmlPreview = file.buffer.toString('utf8').substring(0, 1000);
        }

        // Detectar si es XML de CXC (tag raíz: cxc_YYYYMMDD)
        const isCxcXml = /<cxc_\d{8}>/.test(xmlPreview);

        // Detectar si es XML de MOV (Movimientos de Caja)
        const isMovXml = xmlPreview.includes('d_vc_i_diario_caja_detallado') ||
            xmlPreview.includes('<MOV_');

        // 🔍 VALIDACIÓN: No permitir archivos MOV en pestaña PAGOS
        if (isMovXml) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de archivo incorrecto',
                message: 'Este archivo es de Movimientos de Caja (contiene facturas pagadas en efectivo). ' +
                    'Por favor use la pestaña "MOVIMIENTOS" en lugar de "PAGOS".'
            });
        }

        let result;
        if (isCxcXml) {
            // Usar servicio de CXC para archivos de cartera por cobrar
            console.log('[billing-controller] Detected CXC XML format, using CXC import service');
            const { importCxcFile } = await import('../services/cxc-import-service.js');
            result = await importCxcFile(
                file.buffer,
                file.originalname,
                userId
            );
        } else {
            // Usar servicio de pagos para archivos de estado de cuenta
            console.log('[billing-controller] Detected payment XML format, using payment import service');
            const { importKoinorXMLFile } = await import('../services/import-koinor-xml-service.js');
            result = await importKoinorXMLFile(
                file.buffer,
                file.originalname,
                userId
            );
        }

        res.json({
            success: true,
            message: 'Importación XML completada',
            ...result
        });

    } catch (error) {
        console.error('[billing-controller] XML import error:', error);
        console.error('[billing-controller] Error stack:', error.stack);
        console.error('[billing-controller] Error code:', error.code);
        console.error('[billing-controller] Error meta:', error.meta);

        // 🔒 SECURITY: Never expose internal error details in production
        // Pero en staging, dar más información para debugging
        const isStaging = process.env.NODE_ENV === 'staging' || process.env.RAILWAY_ENVIRONMENT === 'staging';

        res.status(500).json({
            success: false,
            message: 'Error durante la importación del archivo XML',
            error: error.message,
            code: error.code,
            details: (isStaging || process.env.NODE_ENV === 'development') ? {
                stack: error.stack,
                meta: error.meta,
                preview: xmlPreview?.substring(0, 200)
            } : undefined
        });
    }
}

/**
 * Get billing statistics
 */
export async function getStats(req, res) {
    try {
        const { getImportStats } = await import('../services/import-koinor-service.legacy.js');
        const stats = await getImportStats();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('[billing-controller] Get stats error:', error);
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
}

/**
 * Get XML import statistics
 * Obtiene estadísticas detalladas de las últimas importaciones XML
 */
export async function getXMLImportStats(req, res) {
    try {
        const { getXMLImportStats: getStats } = await import('../services/import-koinor-xml-service.js');
        const data = await getStats();

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('[billing-controller] Get XML import stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas de importación'
        });
    }
}

/**
 * Get list of clients with balances
 * 🔒 OWASP Security: Migrated from $queryRaw to Prisma.sql with safe parametrization
 */
export async function getClients(req, res) {
    try {
        // ✅ SECURITY: Parameters are validated by Zod middleware before reaching here
        const { page, limit, search, hasDebt } = req.query;
        const skip = (page - 1) * limit;
        const take = limit;

        // 🔒 SECURITY FIX: Use Prisma.sql with proper placeholders instead of string concatenation
        // This prevents SQL injection attacks
        const searchPattern = search ? `%${search}%` : null;

        // Build WHERE clause safely
        const whereClause = search
            ? Prisma.sql`WHERE i."clientName" ILIKE ${searchPattern} OR i."clientTaxId" LIKE ${searchPattern}`
            : Prisma.empty;

        // Build HAVING clause safely
        const havingClause = hasDebt === 'true'
            ? Prisma.sql`HAVING SUM(i."totalAmount") - COALESCE(SUM(p.paid), 0) > 0`
            : Prisma.empty;

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
            ${whereClause}
            GROUP BY i."clientTaxId", i."clientName"
            ${havingClause}
            ORDER BY "balance" DESC
            LIMIT ${take} OFFSET ${skip}
        `;

        // Get total count with same WHERE condition
        const countWhereClause = search
            ? Prisma.sql`WHERE "clientName" ILIKE ${searchPattern} OR "clientTaxId" LIKE ${searchPattern}`
            : Prisma.empty;

        const countResult = await prisma.$queryRaw`
            SELECT COUNT(DISTINCT "clientTaxId") as count
            FROM invoices
            ${countWhereClause}
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
                page,
                limit,
                total: Number(countResult[0]?.count || 0),
                pages: Math.ceil(Number(countResult[0]?.count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('[billing-controller] Get clients error:', error);
        // 🔒 SECURITY: Never expose internal error details to client
        res.status(500).json({
            success: false,
            message: 'Error al obtener lista de clientes'
        });
    }
}

/**
 * Get balance for a specific client by tax ID
 * 🔒 OWASP Security: Added ownership validation to prevent IDOR attacks
 */
export async function getClientBalance(req, res) {
    try {
        // ✅ SECURITY: taxId is validated by Zod middleware before reaching here
        const { taxId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Get client invoices with payments
        const invoices = await prisma.invoice.findMany({
            where: { clientTaxId: taxId },
            include: {
                payments: true,
                document: {
                    select: {
                        id: true,
                        protocolNumber: true,
                        status: true,
                        assignedToId: true // 🔒 SECURITY: Need this for ownership check
                    }
                }
            },
            orderBy: { issueDate: 'desc' }
        });

        if (invoices.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontraron facturas para el cliente ${taxId}`
            });
        }

        // 🔒 SECURITY FIX: Check ownership - only ADMIN, CAJA, RECEPCION, or assigned user can view
        if (userRole !== 'ADMIN' && userRole !== 'CAJA' && userRole !== 'RECEPCION') {
            // For MATRIZADOR and ARCHIVO: verify they own at least one document for this client
            const hasAccess = invoices.some(inv => inv.document?.assignedToId === userId);
            if (!hasAccess) {
                console.warn(`[SECURITY] IDOR attempt: User ${userId} (${userRole}) tried to access client balance for ${taxId}`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para acceder a este cliente'
                });
            }
        }

        let totalInvoiced = 0;
        let totalPaid = 0;
        const invoiceDetails = [];

        for (const invoice of invoices) {
            const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Number(invoice.totalAmount) - paid;

            totalInvoiced += Number(invoice.totalAmount);
            totalPaid += paid;

            // Remove assignedToId from document (internal use only)
            const { assignedToId, ...documentData } = invoice.document || {};

            invoiceDetails.push({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                issueDate: invoice.issueDate,
                total: Number(invoice.totalAmount),
                paid,
                balance,
                status: invoice.status,
                document: documentData
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
        // 🔒 SECURITY: Never expose internal error details to client
        res.status(500).json({
            success: false,
            message: 'Error al obtener balance del cliente'
        });
    }
}

/**
 * Get payments for a specific invoice
 * 
 * IMPORTANTE: Soporta dos fuentes de datos de pagos:
 * 1. Tabla payments: Pagos registrados manualmente o por importación XML
 * 2. Campo paidAmount: Monto pagado sincronizado desde Koinor (Sync Agent)
 * 
 * Cuando no hay registros en payments pero sí hay paidAmount > 0,
 * se genera un "pago virtual" para mostrar en el historial.
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

        let totalPaid = 0;
        let payments = [];

        if (invoice.payments.length > 0) {
            // Caso 1: Hay pagos registrados en la tabla payments
            totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            payments = invoice.payments.map(p => ({
                ...p,
                amount: Number(p.amount),
                isVirtual: false
            }));
        } else if (Number(invoice.paidAmount) > 0) {
            // Caso 2: No hay pagos en tabla pero sí hay paidAmount (del Sync Agent)
            totalPaid = Number(invoice.paidAmount);

            // Generar pago virtual para mostrar en historial
            payments = [{
                id: `sync-${invoice.id}`,
                receiptNumber: 'Sincronizado desde Koinor',
                amount: totalPaid,
                paymentDate: invoice.fechaUltimoPago || invoice.lastSyncAt || invoice.issueDate,
                concept: invoice.condicionPago === 'E'
                    ? 'Pago al contado (sincronizado)'
                    : 'Pago sincronizado automáticamente',
                isVirtual: true,  // Marcador para indicar que viene del sync
                syncSource: invoice.syncSource || 'KOINOR_SYNC'
            }];
        }

        res.json({
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: Number(invoice.totalAmount),
            totalPaid,
            balance: Number(invoice.totalAmount) - totalPaid,
            payments
        });
    } catch (error) {
        console.error('[billing-controller] Get invoice payments error:', error);
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al obtener pagos de la factura'
        });
    }
}

/**
 * Get billing summary for a date range (for dashboard)
 * Calculates KPIs based on payment dates (not invoice issue dates)
 */
export async function getSummary(req, res) {
    try {
        const { dateFrom, dateTo } = req.query;

        console.log('[billing-controller] getSummary called with:', { dateFrom, dateTo });

        // Build where clause for payments based on date range
        const paymentWhere = {};
        if (dateFrom || dateTo) {
            paymentWhere.paymentDate = {};
            if (dateFrom) {
                // Parse date in local timezone (YYYY-MM-DD format from HTML date input)
                const fromDate = new Date(dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                paymentWhere.paymentDate.gte = fromDate;
                console.log('[billing-controller] From date:', fromDate.toISOString());
            }
            if (dateTo) {
                // Parse date in local timezone
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                paymentWhere.paymentDate.lte = toDate;
                console.log('[billing-controller] To date:', toDate.toISOString());
            }
        }

        console.log('[billing-controller] Payment where clause:', JSON.stringify(paymentWhere, null, 2));

        // Get payments in range
        const paymentsInRange = await prisma.payment.findMany({
            where: paymentWhere,
            select: {
                id: true,
                amount: true,
                paymentDate: true
            }
        });

        console.log(`[billing-controller] Found ${paymentsInRange.length} payments`);
        if (paymentsInRange.length > 0) {
            console.log('[billing-controller] Sample payment dates:',
                paymentsInRange.slice(0, 3).map(p => ({
                    id: p.id,
                    date: p.paymentDate,
                    amount: p.amount
                }))
            );
        }

        // Calculate totals for filtered payments
        const totalPayments = paymentsInRange.length;
        const totalCollected = paymentsInRange.reduce((sum, p) => sum + Number(p.amount), 0);

        console.log('[billing-controller] Totals:', { totalPayments, totalCollected });

        // Calculate today's payments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const paymentsToday = await prisma.payment.findMany({
            where: {
                paymentDate: {
                    gte: today,
                    lt: tomorrow
                }
            },
            select: {
                amount: true
            }
        });

        const paymentsCountToday = paymentsToday.length;
        const collectedToday = paymentsToday.reduce((sum, p) => sum + Number(p.amount), 0);

        // Get invoice stats (filtered by issue date)
        const invoiceWhere = {};
        if (dateFrom || dateTo) {
            invoiceWhere.issueDate = {};
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                invoiceWhere.issueDate.gte = fromDate;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                invoiceWhere.issueDate.lte = toDate;
            }
        }

        const invoices = await prisma.invoice.findMany({
            where: invoiceWhere,
            select: {
                totalAmount: true,
                subtotalAmount: true,
                paidAmount: true,
                status: true
            }
        });

        let totalInvoiced = 0;
        let totalSubtotalInvoiced = 0;
        let totalPaid = 0;
        let pendingCount = 0;
        let paidCount = 0;
        let partialCount = 0;

        for (const invoice of invoices) {
            totalInvoiced += Number(invoice.totalAmount);
            totalSubtotalInvoiced += Number(invoice.subtotalAmount || 0);
            totalPaid += Number(invoice.paidAmount || 0);

            if (invoice.status === 'PAID') paidCount++;
            else if (invoice.status === 'PARTIAL') partialCount++;
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
            // Payment-based KPIs (filtered by payment date)
            totalPayments,
            totalCollected,
            paymentsToday: paymentsCountToday,
            collectedToday,
            // Invoice-based totals (filtered by issue date)
            totals: {
                invoiced: totalInvoiced,
                subtotalInvoiced: totalSubtotalInvoiced,
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al obtener resumen de facturación'
        });
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
        const userRole = req.user.role;
        const { page = 1, limit = 50, status, groupByClient = 'true' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        console.log(`[billing-controller] getMyPortfolio for user ${userId} (role: ${userRole})`);

        // =====================================================================
        // FUENTE ÚNICA DE VERDAD: PendingReceivable (sincronizado desde Koinor)
        // La tabla PendingReceivable contiene los datos del informe CXC
        // sincronizados automáticamente por el sync-agent.
        // =====================================================================

        // Admin, CAJA and RECEPCION can see all receivables
        const isFullAccess = ['ADMIN', 'CAJA', 'RECEPCION'].includes(userRole);

        // For matrizadores, we need to filter by their assigned invoices
        let allowedInvoiceNumbers = null;

        if (!isFullAccess) {
            // Get user info to match with CXC matrizador name
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { firstName: true, lastName: true }
            });

            // Mapeo de usuarios a nombres CXC (codven mapeado)
            const USER_TO_CXC_MATRIZADOR = {
                'Mayra Cristina': 'Mayra Corella',
                'Mayra': 'Mayra Corella',
                'Karol Daniela': 'Karol Velastegui',
                'Karol': 'Karol Velastegui',
                'Jose Luis': 'Jose Zapata',
                'Jose': 'Jose Zapata',
                'Gissela Vanessa': 'Gissela Velastegui',
                'Gissela': 'Gissela Velastegui',
                'Maria Lucinda': 'Maria Diaz',
                'Maria': 'Maria Diaz',
                'Francisco Esteban': 'Esteban Proaño',
                'Francisco': 'Esteban Proaño',
                'Esteban': 'Esteban Proaño'
            };

            const cxcMatrizadorName = USER_TO_CXC_MATRIZADOR[user?.firstName] || user?.firstName;
            console.log(`[billing-controller] Filtering by matrizador: ${cxcMatrizadorName}`);

            // Find all invoice numbers assigned to this matrizador in Invoice table
            const assignedInvoices = await prisma.invoice.findMany({
                where: {
                    OR: [
                        { matrizador: cxcMatrizadorName },
                        { assignedToId: userId },
                        {
                            matrizador: null,
                            document: { is: { assignedToId: userId } }
                        }
                    ]
                },
                select: { invoiceNumberRaw: true }
            });

            allowedInvoiceNumbers = assignedInvoices.map(inv => inv.invoiceNumberRaw);
            console.log(`[billing-controller] Found ${allowedInvoiceNumbers.length} invoices assigned to matrizador`);
        }

        // Query PendingReceivable with optional filter for matrizador
        const whereClause = {
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            balance: { gt: 0 }
        };

        // If matrizador, filter by their allowed invoice numbers
        if (allowedInvoiceNumbers !== null) {
            whereClause.invoiceNumberRaw = { in: allowedInvoiceNumbers };
        }

        const receivables = await prisma.pendingReceivable.findMany({
            where: whereClause,
            orderBy: { issueDate: 'desc' }
        });

        console.log(`[billing-controller] Found ${receivables.length} pending receivables`);

        // Build client map grouped by clientTaxId
        const clientMap = new Map();
        let totalDebt = 0;
        let totalOverdue = 0;

        for (const receivable of receivables) {
            const balance = Number(receivable.balance) || 0;
            const totalAmount = Number(receivable.totalAmount) || 0;
            const totalPaid = Number(receivable.totalPaid) || 0;

            if (balance <= 0) continue;

            const isOverdue = receivable.daysOverdue > 0 ||
                (receivable.dueDate && new Date(receivable.dueDate) < new Date());

            if (isOverdue) totalOverdue += balance;
            totalDebt += balance;

            const clientTaxId = (receivable.clientTaxId || '').trim();
            const clientName = (receivable.clientName || '').trim();

            if (!clientMap.has(clientTaxId)) {
                clientMap.set(clientTaxId, {
                    clientTaxId,
                    clientName,
                    clientPhone: '',  // PendingReceivable doesn't have phone
                    totalDebt: 0,
                    overdueDebt: 0,
                    invoices: []
                });
            }

            const client = clientMap.get(clientTaxId);
            client.totalDebt += balance;
            if (isOverdue) client.overdueDebt += balance;

            const daysOverdue = receivable.daysOverdue ||
                (isOverdue && receivable.dueDate
                    ? Math.floor((new Date() - new Date(receivable.dueDate)) / (1000 * 60 * 60 * 24))
                    : 0);

            client.invoices.push({
                id: receivable.id,
                invoiceNumber: receivable.invoiceNumber || receivable.invoiceNumberRaw,
                documentId: null,
                protocolNumber: null,
                documentType: 'CXC',
                issueDate: receivable.issueDate,
                dueDate: receivable.dueDate,
                totalAmount,
                totalPaid,
                balance,
                isOverdue,
                daysOverdue,
                source: 'CXC',
                matrizador: 'Sin asignar',  // TODO: use receivable.matrizador after migration
                comentarioCaja: receivable.cashierComment || null,
                comentarioCajaUpdatedAt: receivable.cashierCommentUpdatedAt || null,
                comentarioCajaUpdatedBy: receivable.cashierCommentUpdatedByName || null
            });
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al obtener cartera de documentos'
        });
    }
}


/**
 * Update client phone number in all documents
 * Updates clientPhone for all documents with the given clientTaxId
 */
export async function updateClientPhone(req, res) {
    try {
        const { clientTaxId } = req.params;
        const { phone } = req.body;

        console.log(`[billing-controller] updateClientPhone for ${clientTaxId}: ${phone}`);

        // Validar que el teléfono no esté vacío
        if (!phone || !phone.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El número de teléfono es requerido'
            });
        }

        // Actualizar clientPhone en todos los documentos con ese clientTaxId
        const result = await prisma.document.updateMany({
            where: {
                clientId: clientTaxId
            },
            data: {
                clientPhone: phone.trim()
            }
        });

        console.log(`[billing-controller] Updated ${result.count} documents`);

        res.json({
            success: true,
            message: `Teléfono actualizado en ${result.count} documento(s)`,
            updatedCount: result.count
        });
    } catch (error) {
        console.error('[billing-controller] updateClientPhone error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar teléfono del cliente'
        });
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al generar recordatorio de cobro'
        });
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
 * FUENTE ÚNICA DE VERDAD: PendingReceivable (sincronizado desde Koinor)
 */
export async function getCarteraPorCobrar(req, res) {
    try {
        console.log('[billing-controller] getCarteraPorCobrar');

        // =====================================================================
        // FUENTE ÚNICA DE VERDAD: PendingReceivable (sincronizado desde Koinor)
        // La tabla PendingReceivable contiene los datos del informe CXC
        // sincronizados automáticamente por el sync-agent.
        // =====================================================================
        const receivables = await prisma.pendingReceivable.findMany({
            where: {
                status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
                balance: { gt: 0 }
            },
            orderBy: { issueDate: 'desc' }
        });

        console.log(`[billing-controller] Found ${receivables.length} pending receivables for report`);

        // Resolver matrizador real por factura (documento asignado -> asignacion directa -> matrizador de factura/CXC)
        const invoiceNumbers = [...new Set(receivables.map(r => r.invoiceNumber).filter(Boolean))];
        const invoiceNumbersRaw = [...new Set(receivables.map(r => r.invoiceNumberRaw).filter(Boolean))];

        const invoicesWithAssignment = (invoiceNumbers.length > 0 || invoiceNumbersRaw.length > 0)
            ? await prisma.invoice.findMany({
                where: {
                    OR: [
                        ...(invoiceNumbers.length > 0 ? [{ invoiceNumber: { in: invoiceNumbers } }] : []),
                        ...(invoiceNumbersRaw.length > 0 ? [{ invoiceNumberRaw: { in: invoiceNumbersRaw } }] : [])
                    ]
                },
                select: {
                    id: true,
                    invoiceNumber: true,
                    invoiceNumberRaw: true,
                    documentId: true,
                    matrizador: true,
                    assignedTo: {
                        select: { firstName: true, lastName: true }
                    },
                    document: {
                        select: {
                            assignedTo: {
                                select: { firstName: true, lastName: true }
                            }
                        }
                    }
                }
            })
            : [];

        const invoiceMatrizadorMap = new Map();

        for (const inv of invoicesWithAssignment) {
            const fromDocument = inv.document?.assignedTo
                ? `${inv.document.assignedTo.firstName} ${inv.document.assignedTo.lastName}`.trim()
                : null;
            const fromDirectAssignment = inv.assignedTo
                ? `${inv.assignedTo.firstName} ${inv.assignedTo.lastName}`.trim()
                : null;

            const resolved = normalizeMatrizadorName(
                fromDocument ||
                fromDirectAssignment ||
                inv.matrizador ||
                'Sin asignar'
            );

            if (inv.invoiceNumber) {
                invoiceMatrizadorMap.set(`N:${inv.invoiceNumber}`, {
                    matrizador: resolved,
                    documentId: inv.documentId || null
                });
            }
            if (inv.invoiceNumberRaw) {
                invoiceMatrizadorMap.set(`R:${inv.invoiceNumberRaw}`, {
                    matrizador: resolved,
                    documentId: inv.documentId || null
                });
            }
        }

        const resolveMatrizadorForReceivable = (receivable) => {
            const mappedEntry =
                (receivable.invoiceNumber && invoiceMatrizadorMap.get(`N:${receivable.invoiceNumber}`)) ||
                (receivable.invoiceNumberRaw && invoiceMatrizadorMap.get(`R:${receivable.invoiceNumberRaw}`));

            if (mappedEntry) return mappedEntry;

            return {
                matrizador: normalizeMatrizadorName(receivable.matrizador || 'Sin asignar'),
                documentId: null
            };
        };

        // Group by client
        const clientMap = new Map();

        for (const receivable of receivables) {
            const balance = Number(receivable.balance) || 0;
            const totalAmount = Number(receivable.totalAmount) || 0;
            const totalPaid = Number(receivable.totalPaid) || 0;

            if (balance <= 0) continue; // Skip fully paid

            const clientTaxId = (receivable.clientTaxId || '').trim();
            const clientName = (receivable.clientName || '').trim();

            if (!clientMap.has(clientTaxId)) {
                clientMap.set(clientTaxId, {
                    clientTaxId,
                    clientName,
                    invoiceCount: 0,
                    totalInvoiced: 0,
                    totalPaid: 0,
                    balance: 0,
                    matrizador: 'Sin asignar',
                    matrizadores: [],
                    canAssign: false,
                    invoices: []
                });
            }

            const client = clientMap.get(clientTaxId);
            client.invoiceCount++;
            client.totalInvoiced += totalAmount;
            client.totalPaid += totalPaid;
            client.balance += balance;

            const resolvedInvoiceContext = resolveMatrizadorForReceivable(receivable);
            const invoiceMatrizador = resolvedInvoiceContext.matrizador;

            // Add invoice detail
            client.invoices.push({
                id: receivable.id,
                invoiceNumber: receivable.invoiceNumber || receivable.invoiceNumberRaw,
                issueDate: receivable.issueDate,
                dueDate: receivable.dueDate,
                totalAmount,
                paidAmount: totalPaid,
                balance,
                status: receivable.status,
                hasDocument: !!resolvedInvoiceContext.documentId,
                documentId: resolvedInvoiceContext.documentId,
                canAssign: false,
                matrizador: invoiceMatrizador,
                comentarioCaja: receivable.cashierComment || null,
                comentarioCajaUpdatedAt: receivable.cashierCommentUpdatedAt || null,
                comentarioCajaUpdatedBy: receivable.cashierCommentUpdatedByName || null
            });
        }

        // Definir matrizador de cabecera por cliente (uno o multiples)
        for (const client of clientMap.values()) {
            const uniqueMatrizadores = Array.from(
                new Set(
                    client.invoices
                        .map(inv => inv.matrizador)
                        .filter(m => m && m !== 'Sin asignar')
                )
            );

            client.matrizadores = uniqueMatrizadores;

            if (uniqueMatrizadores.length === 0) {
                client.matrizador = 'Sin asignar';
            } else if (uniqueMatrizadores.length === 1) {
                client.matrizador = uniqueMatrizadores[0];
            } else {
                client.matrizador = `Multiples (${uniqueMatrizadores.length})`;
            }
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al generar reporte de cartera por cobrar'
        });
    }
}


/**
 * Report: Pagos del Periodo (Payments in Date Range)
 *
 * Combina dos fuentes de datos:
 * 1. Tabla Payment - pagos individuales importados via XML
 * 2. Tabla Invoice - facturas con fechaUltimoPago y pagos directos (sync Koinor)
 *    Solo incluye facturas que tienen pago registrado pero NO tienen registros en Payment
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

        const data = [];

        // Fuente 1: Registros individuales de Payment
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

        // Set de invoiceIds que ya tienen Payment registrado (para evitar duplicados)
        const invoiceIdsWithPayment = new Set(payments.map(p => p.invoiceId));

        for (const p of payments) {
            data.push({
                fecha: p.paymentDate,
                recibo: p.receiptNumber,
                cliente: p.invoice?.clientName || 'Sin nombre',
                cedula: p.invoice?.clientTaxId || '',
                factura: p.invoice?.invoiceNumber || '',
                monto: Number(p.amount),
                concepto: p.concept || 'Abono a factura'
            });
        }

        // Fuente 2: Facturas con fechaUltimoPago en el periodo (sync Koinor)
        // Solo incluye las que NO tienen registros en Payment (evitar duplicados)
        const invoicesWithPayment = await prisma.invoice.findMany({
            where: {
                fechaUltimoPago: {
                    gte: from,
                    lte: to
                },
                paidAmount: { gt: 0 }
            },
            select: {
                id: true,
                invoiceNumber: true,
                clientName: true,
                clientTaxId: true,
                fechaUltimoPago: true,
                paidAmount: true,
                pagoDirecto: true,
                montoPagadoCxc: true,
                condicionPago: true,
                concept: true,
                _count: { select: { payments: true } }
            },
            orderBy: { fechaUltimoPago: 'desc' }
        });

        for (const inv of invoicesWithPayment) {
            // Skip if this invoice already has Payment records (already included above)
            if (invoiceIdsWithPayment.has(inv.id)) continue;
            // Skip if it has Payment records not in the date range
            if (inv._count.payments > 0) continue;

            const monto = Number(inv.paidAmount) || 0;
            if (monto <= 0) continue;

            const concepto = inv.condicionPago === 'E'
                ? 'Pago al contado'
                : Number(inv.montoPagadoCxc) > 0
                    ? 'Pago via CxC'
                    : inv.concept || 'Pago registrado';

            data.push({
                fecha: inv.fechaUltimoPago,
                recibo: '-',
                cliente: inv.clientName || 'Sin nombre',
                cedula: inv.clientTaxId || '',
                factura: inv.invoiceNumber || '',
                monto,
                concepto
            });
        }

        // Ordenar por fecha descendente
        data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        // Calculate totals
        const totalMonto = data.reduce((sum, p) => sum + p.monto, 0);

        res.json({
            success: true,
            reportType: 'pagos-periodo',
            reportName: 'Pagos del Periodo',
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
        // SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al generar reporte de pagos del periodo'
        });
    }
}

/**
 * Report: Facturas Vencidas (Overdue Invoices)
 * FUENTE UNICA DE VERDAD: PendingReceivable (sincronizado desde Koinor)
 * Usa la misma fuente que Cartera por Cobrar para consistencia,
 * filtrada por daysOverdue > 0 (facturas con fecha de vencimiento pasada).
 */
export async function getFacturasVencidas(req, res) {
    try {
        console.log('[billing-controller] getFacturasVencidas');

        // Fuente: PendingReceivable con daysOverdue > 0 y saldo pendiente
        const receivables = await prisma.pendingReceivable.findMany({
            where: {
                status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
                balance: { gt: 0 },
                daysOverdue: { gt: 0 }
            },
            orderBy: { daysOverdue: 'desc' }
        });

        // Buscar telefono y matrizador asignado desde Invoice+Document
        const invoiceNumbers = receivables
            .map(r => r.invoiceNumber)
            .filter(Boolean);

        const invoicesWithDocs = invoiceNumbers.length > 0
            ? await prisma.invoice.findMany({
                where: { invoiceNumber: { in: invoiceNumbers } },
                select: {
                    invoiceNumber: true,
                    document: {
                        select: {
                            clientPhone: true,
                            assignedTo: {
                                select: { firstName: true, lastName: true }
                            }
                        }
                    }
                }
            })
            : [];

        // Mapa de invoiceNumber -> info del documento
        const docInfoMap = new Map();
        for (const inv of invoicesWithDocs) {
            if (inv.invoiceNumber) {
                docInfoMap.set(inv.invoiceNumber, {
                    telefono: inv.document?.clientPhone || '',
                    matrizador: inv.document?.assignedTo
                        ? `${inv.document.assignedTo.firstName} ${inv.document.assignedTo.lastName}`
                        : null
                });
            }
        }

        const data = receivables
            .map(r => {
                const balance = Number(r.balance) || 0;
                const totalAmount = Number(r.totalAmount) || 0;
                const totalPaid = Number(r.totalPaid) || 0;

                if (balance <= 0) return null;

                const docInfo = docInfoMap.get(r.invoiceNumber) || {};

                return {
                    receivableId: r.id,
                    factura: r.invoiceNumber || r.invoiceNumberRaw,
                    cliente: r.clientName,
                    cedula: r.clientTaxId,
                    telefono: docInfo.telefono || '',
                    emision: r.issueDate,
                    vencimiento: r.dueDate,
                    diasVencido: r.daysOverdue,
                    totalFactura: totalAmount,
                    pagado: totalPaid,
                    saldo: balance,
                    matrizador: docInfo.matrizador || r.matrizador || 'Sin asignar',
                    comentarioCaja: r.cashierComment || null,
                    comentarioCajaUpdatedAt: r.cashierCommentUpdatedAt || null,
                    comentarioCajaUpdatedBy: r.cashierCommentUpdatedByName || null
                };
            })
            .filter(Boolean);

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
        // SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al generar reporte de facturas vencidas'
        });
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
        // 🔒 SECURITY: Never expose internal error details
        res.status(500).json({
            success: false,
            message: 'Error al generar reporte de entregas con saldo pendiente'
        });
    }
}

/**
 * Import CXC (Cartera por Cobrar) from XML file
 * Requires multipart/form-data with 'file' field
 */
export async function importCxcFile(req, res) {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó archivo',
                message: 'Debe subir un archivo XML de CXC'
            });
        }

        const { file } = req;
        const userId = req.user?.id;

        // Validate file type
        const ext = file.originalname.toLowerCase().substring(
            file.originalname.lastIndexOf('.')
        );

        if (ext !== '.xml') {
            return res.status(400).json({
                success: false,
                error: 'Tipo de archivo no válido',
                message: 'Solo se permiten archivos XML (.xml)'
            });
        }

        // Validate file size (máximo 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: 'Archivo demasiado grande',
                message: 'El archivo no debe superar 50MB'
            });
        }

        console.log(`[billing-controller] Starting CXC import of ${file.originalname} (${file.size} bytes)`);

        // Import the service dynamically
        const { importCxcFile: importCxc } = await import('../services/cxc-import-service.js');

        // Process the file
        const result = await importCxc(
            file.buffer,
            file.originalname,
            userId
        );

        res.json({
            success: true,
            message: 'Importación de CXC completada',
            ...result
        });

    } catch (error) {
        console.error('[billing-controller] CXC import error:', error);
        res.status(500).json({
            success: false,
            message: 'Error durante la importación del archivo CXC',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Detecta el tipo de archivo XML basado en su contenido
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @returns {Object} - { type: 'MOV'|'PAGOS'|'CXC'|'UNKNOWN', preview: string }
 */
function detectXmlFileType(fileBuffer) {
    let xmlPreview;
    try {
        // Intentar leer como UTF-16LE primero
        xmlPreview = fileBuffer.toString('utf16le').substring(0, 1000);
        if (!xmlPreview.includes('<?xml')) {
            xmlPreview = fileBuffer.toString('utf8').substring(0, 1000);
        }
    } catch (e) {
        xmlPreview = fileBuffer.toString('utf8').substring(0, 1000);
    }

    // Detectar tipo por tags
    const hasMovTags = xmlPreview.includes('d_vc_i_diario_caja_detallado') ||
        xmlPreview.includes('<MOV_');
    const hasPagosTags = xmlPreview.includes('<d_vc_i_estado_cuenta') ||
        xmlPreview.includes('<E>') ||
        xmlPreview.includes('<E_group1>');
    const hasCxcTags = xmlPreview.includes('<cxc_');

    if (hasMovTags) return { type: 'MOV', preview: xmlPreview.substring(0, 200) };
    if (hasPagosTags) return { type: 'PAGOS', preview: xmlPreview.substring(0, 200) };
    if (hasCxcTags) return { type: 'CXC', preview: xmlPreview.substring(0, 200) };

    return { type: 'UNKNOWN', preview: xmlPreview.substring(0, 200) };
}

/**
 * Import MOV (Movimientos de Caja) from XML file
 * Importa facturas y marca como PAGADAS las que fueron pagadas en efectivo
 * Requires multipart/form-data with 'file' field
 */
export async function importMovFile(req, res) {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó archivo',
                message: 'Debe subir un archivo XML de Movimientos de Caja'
            });
        }

        const { file } = req;
        const userId = req.user?.id;

        // Validate file type
        const ext = file.originalname.toLowerCase().substring(
            file.originalname.lastIndexOf('.')
        );

        if (ext !== '.xml') {
            return res.status(400).json({
                success: false,
                error: 'Tipo de archivo no válido',
                message: 'Solo se permiten archivos XML (.xml)'
            });
        }

        // Validate file size (máximo 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: 'Archivo demasiado grande',
                message: 'El archivo no debe superar 50MB'
            });
        }

        // 🔍 DETECTAR TIPO DE ARCHIVO
        const detection = detectXmlFileType(file.buffer);
        console.log(`[billing-controller] Detected XML type: ${detection.type}`);

        // Si el archivo no es de tipo MOV, dar instrucciones claras
        if (detection.type === 'PAGOS') {
            return res.status(400).json({
                success: false,
                error: 'Tipo de archivo incorrecto',
                message: 'Este archivo es un Estado de Cuenta (contiene pagos AB/FC/NC). ' +
                    'Por favor use la pestaña "PAGOS" en lugar de "MOVIMIENTOS".'
            });
        }

        if (detection.type === 'CXC') {
            return res.status(400).json({
                success: false,
                error: 'Tipo de archivo incorrecto',
                message: 'Este archivo es de Cartera por Cobrar (CXC). ' +
                    'Por favor use la pestaña "CXC" en lugar de "MOVIMIENTOS".'
            });
        }

        console.log(`[billing-controller] Starting MOV import of ${file.originalname} (${file.size} bytes)`);

        // Import the service dynamically
        const { importMovFile: importMov } = await import('../services/import-mov-service.js');

        // Process the file
        const result = await importMov(
            file.buffer,
            file.originalname,
            userId
        );

        res.json({
            success: true,
            message: 'Importación de Movimientos completada',
            ...result
        });

    } catch (error) {
        console.error('[billing-controller] MOV import error:', error);
        res.status(500).json({
            success: false,
            message: 'Error durante la importación del archivo de Movimientos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Asignar matrizador a una factura (para facturas sin documento)
 * Solo CAJA y ADMIN pueden usar esta función
 */
export async function assignInvoiceMatrizador(req, res) {
    try {
        const { invoiceId } = req.params;
        const { matrizadorId } = req.body;

        console.log(`[billing-controller] Assigning matrizador ${matrizadorId} to invoice ${invoiceId}`);

        // Validar que la factura existe
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { document: true }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        // Si la factura tiene documento, no permitir asignación directa
        if (invoice.documentId) {
            return res.status(400).json({
                success: false,
                message: 'Esta factura está vinculada a un documento. Use la asignación del documento.'
            });
        }

        // Validar que el matrizador existe y tiene rol MATRIZADOR o ARCHIVO
        if (matrizadorId) {
            const matrizador = await prisma.user.findUnique({
                where: { id: parseInt(matrizadorId) }
            });

            if (!matrizador) {
                return res.status(404).json({
                    success: false,
                    message: 'Matrizador no encontrado'
                });
            }

            if (!['MATRIZADOR', 'ARCHIVO'].includes(matrizador.role)) {
                return res.status(400).json({
                    success: false,
                    message: 'El usuario seleccionado no tiene rol de Matrizador o Archivo'
                });
            }
        }

        // Actualizar la factura
        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                assignedToId: matrizadorId ? parseInt(matrizadorId) : null
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: matrizadorId
                ? `Factura asignada a ${updatedInvoice.assignedTo.firstName} ${updatedInvoice.assignedTo.lastName}`
                : 'Asignación de factura removida',
            invoice: {
                id: updatedInvoice.id,
                invoiceNumber: updatedInvoice.invoiceNumber,
                assignedTo: updatedInvoice.assignedTo
            }
        });

    } catch (error) {
        console.error('[billing-controller] assignInvoiceMatrizador error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al asignar matrizador a la factura'
        });
    }
}

/**
 * Obtener lista de matrizadores disponibles para asignación
 */
export async function getMatrizadoresForAssignment(req, res) {
    try {
        const matrizadores = await prisma.user.findMany({
            where: {
                role: { in: ['MATRIZADOR', 'ARCHIVO'] },
                isActive: true
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
            },
            orderBy: { firstName: 'asc' }
        });

        res.json({
            success: true,
            data: matrizadores
        });

    } catch (error) {
        console.error('[billing-controller] getMatrizadoresForAssignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener lista de matrizadores'
        });
    }
}

/**
 * ============================================================================
 * NUEVO MÓDULO CXC - CARTERA POR COBRAR (XLS/CSV)
 * ============================================================================
 */

/**
 * Importar archivo XLS/CSV de Cartera por Cobrar
 * Requires multipart/form-data with 'file' field
 * Acepta: .xls, .xlsx, .csv
 */
export async function importCxcXls(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó archivo',
                message: 'Debe subir un archivo Excel (.xls, .xlsx) o CSV (.csv)'
            });
        }

        const { file } = req;
        const userId = req.user?.id;

        const allowedExtensions = ['.xls', '.xlsx', '.csv'];
        const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

        if (!allowedExtensions.includes(ext)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de archivo no válido',
                message: `Solo se permiten archivos: ${allowedExtensions.join(', ')}`
            });
        }

        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: 'Archivo demasiado grande',
                message: 'El archivo no debe superar 50MB'
            });
        }

        console.log(`[billing-controller] Starting CXC XLS import of ${file.originalname} (${file.size} bytes)`);

        const { importCxcXlsFile } = await import('../services/cxc-xls-import-service.js');

        const result = await importCxcXlsFile(
            file.buffer,
            file.originalname,
            userId
        );

        res.json({
            success: true,
            message: 'Importación de Cartera por Cobrar completada',
            ...result
        });

    } catch (error) {
        console.error('[billing-controller] CXC XLS import error:', error);
        res.status(500).json({
            success: false,
            message: 'Error en la importación',
            error: error.message || 'Error al procesar el archivo. Verifique el formato.'
        });
    }
}

/**
 * Obtener cartera pendiente (detalle) - NUEVA VERSIÓN (Sync Agent)
 * GET /api/billing/cartera-pendiente
 *
 * Query params:
 *   page (default 1), limit (default 20, max 100),
 *   status (PENDING, PARTIAL, OVERDUE, PAID, CANCELLED),
 *   search (clientName or clientTaxId),
 *   sortBy (balance, daysOverdue, dueDate, clientName) default: balance,
 *   sortOrder (asc, desc) default: desc
 */
export async function getCarteraPendiente(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;
        const status = req.query.status || null;
        const search = req.query.search ? String(req.query.search).trim() : null;
        const sortBy = ['balance', 'daysOverdue', 'dueDate', 'clientName'].includes(req.query.sortBy)
            ? req.query.sortBy
            : 'balance';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

        // Build where clause
        const where = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { clientName: { contains: search, mode: 'insensitive' } },
                { clientTaxId: { contains: search } }
            ];
        }

        // Query data + count in parallel
        const [receivables, total, summaryAgg] = await Promise.all([
            prisma.pendingReceivable.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit
            }),
            prisma.pendingReceivable.count({ where }),
            prisma.pendingReceivable.aggregate({
                where: { balance: { gt: 0 } },
                _sum: { balance: true },
                _count: { id: true }
            })
        ]);

        // Compute summary breakdown
        const [countPending, countPartial, countOverdue, totalOverdueAgg] = await Promise.all([
            prisma.pendingReceivable.count({ where: { status: 'PENDING', balance: { gt: 0 } } }),
            prisma.pendingReceivable.count({ where: { status: 'PARTIAL' } }),
            prisma.pendingReceivable.count({ where: { status: 'OVERDUE' } }),
            prisma.pendingReceivable.aggregate({
                where: { status: 'OVERDUE' },
                _sum: { balance: true }
            })
        ]);

        res.json({
            success: true,
            data: {
                receivables,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                },
                summary: {
                    totalBalance: Number(summaryAgg._sum.balance || 0),
                    totalOverdue: Number(totalOverdueAgg._sum.balance || 0),
                    countPending,
                    countPartial,
                    countOverdue
                }
            }
        });

    } catch (error) {
        console.error('[billing-controller] getCarteraPendiente error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener cartera pendiente'
        });
    }
}

/**
 * Obtener resumen de cartera agrupado por cliente - NUEVA VERSIÓN (Sync Agent)
 * GET /api/billing/cartera-pendiente/resumen
 *
 * Query params:
 *   page (default 1), limit (default 20, max 100),
 *   search (clientName or clientTaxId),
 *   sortBy (totalBalance, invoicesCount, maxDaysOverdue) default: totalBalance,
 *   sortOrder (asc, desc) default: desc,
 *   detail (true to include invoices list)
 */
export async function getCarteraPendienteResumen(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const search = req.query.search ? String(req.query.search).trim() : null;
        const detail = req.query.detail === 'true';

        // Use raw SQL for groupBy with sorting and pagination
        // Build search filter
        const searchFilter = search
            ? `AND (LOWER("clientName") LIKE LOWER('%${search.replace(/'/g, "''")}%') OR "clientTaxId" LIKE '%${search.replace(/'/g, "''")}%')`
            : '';

        // Get grouped data via raw query for full control
        const clientsRaw = await prisma.$queryRawUnsafe(`
            SELECT
                "clientTaxId",
                MAX("clientName") AS "clientName",
                COUNT(*)::int AS "invoicesCount",
                SUM(balance)::float AS "totalBalance",
                MIN("dueDate") AS "oldestDueDate",
                MAX("daysOverdue")::int AS "maxDaysOverdue"
            FROM pending_receivables
            WHERE balance > 0 ${searchFilter}
            GROUP BY "clientTaxId"
            ORDER BY SUM(balance) DESC
            LIMIT ${limit}
            OFFSET ${(page - 1) * limit}
        `);

        // Get total distinct clients count
        const countResult = await prisma.$queryRawUnsafe(`
            SELECT COUNT(DISTINCT "clientTaxId")::int AS total
            FROM pending_receivables
            WHERE balance > 0 ${searchFilter}
        `);
        const totalClients = countResult[0]?.total || 0;

        // Get overall summary
        const overallSummary = await prisma.pendingReceivable.aggregate({
            where: { balance: { gt: 0 } },
            _sum: { balance: true }
        });
        const totalOverdueAgg = await prisma.pendingReceivable.aggregate({
            where: { status: 'OVERDUE' },
            _sum: { balance: true }
        });

        // Optionally include detail invoices per client
        let clients = clientsRaw.map(c => ({
            clientTaxId: c.clientTaxId,
            clientName: c.clientName,
            invoicesCount: c.invoicesCount,
            totalBalance: c.totalBalance,
            oldestDueDate: c.oldestDueDate,
            maxDaysOverdue: c.maxDaysOverdue
        }));

        if (detail && clients.length > 0) {
            const taxIds = clients.map(c => c.clientTaxId);
            const invoices = await prisma.pendingReceivable.findMany({
                where: {
                    clientTaxId: { in: taxIds },
                    balance: { gt: 0 }
                },
                orderBy: { balance: 'desc' }
            });

            // Group invoices by clientTaxId
            const invoicesByClient = {};
            for (const inv of invoices) {
                if (!invoicesByClient[inv.clientTaxId]) {
                    invoicesByClient[inv.clientTaxId] = [];
                }
                invoicesByClient[inv.clientTaxId].push(inv);
            }

            clients = clients.map(c => ({
                ...c,
                invoices: invoicesByClient[c.clientTaxId] || []
            }));
        }

        res.json({
            success: true,
            data: {
                clients,
                pagination: {
                    page,
                    limit,
                    total: totalClients,
                    totalPages: Math.ceil(totalClients / limit)
                },
                summary: {
                    totalClients,
                    totalBalance: Number(overallSummary._sum.balance || 0),
                    totalOverdue: Number(totalOverdueAgg._sum.balance || 0)
                }
            }
        });

    } catch (error) {
        console.error('[billing-controller] getCarteraPendienteResumen error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener resumen de cartera pendiente'
        });
    }
}

/**
 * Actualizar comentario operativo de Caja para un registro CXC
 * PUT /api/billing/cartera-pendiente/:id/comentario
 */
export async function updatePendingReceivableComment(req, res) {
    try {
        const { id } = req.params;
        const rawComment = req.body?.comentario;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'ID de cartera pendiente inválido'
            });
        }

        if (typeof rawComment !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'El campo comentario es obligatorio'
            });
        }

        const comentario = rawComment.trim();
        const MAX_COMMENT_LENGTH = 500;

        if (comentario.length > MAX_COMMENT_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `El comentario no puede superar ${MAX_COMMENT_LENGTH} caracteres`
            });
        }

        const updatedByName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Usuario caja';

        const updated = await prisma.pendingReceivable.update({
            where: { id },
            data: {
                cashierComment: comentario || null,
                cashierCommentUpdatedAt: new Date(),
                cashierCommentUpdatedById: req.user.id,
                cashierCommentUpdatedByName: updatedByName
            },
            select: {
                id: true,
                invoiceNumber: true,
                invoiceNumberRaw: true,
                cashierComment: true,
                cashierCommentUpdatedAt: true,
                cashierCommentUpdatedById: true,
                cashierCommentUpdatedByName: true
            }
        });

        res.json({
            success: true,
            message: comentario ? 'Comentario guardado exitosamente' : 'Comentario eliminado exitosamente',
            data: updated
        });
    } catch (error) {
        console.error('[billing-controller] updatePendingReceivableComment error:', error);

        if (error?.code === 'P2025') {
            return res.status(404).json({
                success: false,
                message: 'Registro de cartera no encontrado'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al guardar comentario de cartera'
        });
    }
}

/**
 * Estado de sync CXC
 * GET /api/billing/cartera-pendiente/sync-status
 */
export async function getCxcSyncStatus(req, res) {
    try {
        // Get latest sync timestamp
        const latest = await prisma.pendingReceivable.aggregate({
            _max: { lastSyncAt: true },
            _count: { id: true },
            _sum: { balance: true }
        });

        // Status breakdown
        const [pending, partial, overdue, paid] = await Promise.all([
            prisma.pendingReceivable.count({ where: { status: 'PENDING' } }),
            prisma.pendingReceivable.count({ where: { status: 'PARTIAL' } }),
            prisma.pendingReceivable.count({ where: { status: 'OVERDUE' } }),
            prisma.pendingReceivable.count({ where: { status: 'PAID' } })
        ]);

        res.json({
            success: true,
            data: {
                lastSyncAt: latest._max.lastSyncAt,
                totalRecords: latest._count.id,
                totalBalance: Number(latest._sum.balance || 0),
                breakdown: {
                    PENDING: pending,
                    PARTIAL: partial,
                    OVERDUE: overdue,
                    PAID: paid
                }
            }
        });
    } catch (error) {
        console.error('[billing-controller] getCxcSyncStatus error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado de sincronización CXC'
        });
    }
}

/**
 * Limpiar reportes antiguos de cartera
 * DELETE /api/billing/cartera-pendiente/limpiar
 */
export async function limpiarCarteraAntigua(req, res) {
    try {
        const daysToKeep = req.query.days ? parseInt(req.query.days) : 60;

        const { limpiarCarteraAntigua: limpiar } = await import('../services/cxc-xls-import-service.js');
        const result = await limpiar(daysToKeep);

        res.json({
            success: true,
            message: `Se eliminaron ${result.deletedCount} registros antiguos`,
            ...result
        });

    } catch (error) {
        console.error('[billing-controller] limpiarCarteraAntigua error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al limpiar reportes antiguos'
        });
    }
}

/**
 * Obtener fechas de reportes disponibles
 * GET /api/billing/cartera-pendiente/fechas
 */
export async function getAvailableReportDates(req, res) {
    try {
        const { getAvailableReportDates: getDates } = await import('../services/cxc-xls-import-service.js');
        const dates = await getDates();

        res.json({
            success: true,
            data: dates
        });

    } catch (error) {
        console.error('[billing-controller] getAvailableReportDates error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener fechas de reportes'
        });
    }
}
