/**
 * Billing Routes
 * API routes for billing module - invoices, payments, and imports
 * 🔒 OWASP Security Enhancement: Input validation added
 */
import express from 'express';
import multer from 'multer';
import * as billingController from '../controllers/billing-controller.js';
import { authenticateToken } from '../middleware/auth-middleware.js';
import { csrfProtection } from '../middleware/csrf-protection.js';
import {
    validateQuery,
    validateParams,
    invoiceQuerySchema,
    invoiceIdSchema,
    paymentQuerySchema,
    clientQuerySchema,
    taxIdSchema,
    documentIdParamSchema,
    portfolioQuerySchema,
    clientTaxIdParamSchema,
    billingReportQuerySchema
} from '../middleware/input-validation.js';

const router = express.Router();

// Configure multer for XLS file uploads (memory storage) - LEGACY
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/octet-stream' // Some browsers send .xls as this
        ];

        // Also check file extension
        const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        const allowedExts = ['.xls', '.xlsx', '.csv'];

        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo .xls, .xlsx, .csv'), false);
        }
    }
});

// Configure multer for XML file uploads (memory storage) - NUEVO SISTEMA
const xmlUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit para XMLs grandes (7000+ registros)
    },
    fileFilter: (req, file, cb) => {
        const ext = file.originalname.toLowerCase().substring(
            file.originalname.lastIndexOf('.')
        );
        
        if (ext === '.xml') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos XML (.xml)'), false);
        }
    }
});

// Health check (public)
router.get('/health', billingController.healthCheck);

// All other routes require authentication
router.use(authenticateToken);

// Dashboard & Summary
router.get('/stats', billingController.getStats);
router.get('/summary', billingController.getSummary);

// Invoice routes - 🔒 SECURITY: Input validation added
router.get('/invoices', validateQuery(invoiceQuerySchema), billingController.getInvoices);
router.get('/invoices/:id', validateParams(invoiceIdSchema), billingController.getInvoiceById);
router.get('/invoices/:id/payments', validateParams(invoiceIdSchema), billingController.getInvoicePayments);

// Payment routes - 🔒 SECURITY: Input validation added
router.get('/payments', validateQuery(paymentQuerySchema), billingController.getPayments);

// Client routes - 🔒 SECURITY: Input validation added
router.get('/clients', validateQuery(clientQuerySchema), billingController.getClients);
router.get('/clients/:taxId/balance', validateParams(taxIdSchema), billingController.getClientBalance);

// Import log routes
router.get('/import-logs', billingController.getImportLogs);

// Document payment status (for integration with document views) - 🔒 SECURITY: UUID validation
router.get('/documents/:documentId/payment-status', validateParams(documentIdParamSchema), billingController.getDocumentPaymentStatus);

// ============================================================================
// IMPORTACIÓN DE PAGOS
// ============================================================================

// Import XML endpoint (NUEVO - Sistema principal) - 🔒 SECURITY: CSRF protection
router.post('/import-xml', csrfProtection, xmlUpload.single('file'), billingController.importXmlFile);

// Import CXC endpoint (Cartera por Cobrar) - 🔒 SECURITY: CSRF protection
router.post('/import-cxc', csrfProtection, xmlUpload.single('file'), billingController.importCxcFile);

// Import XLS endpoint (LEGACY - Deprecado, mantener 1 mes)
// TODO: Comentar después del 28 de febrero de 2026
router.post('/import', csrfProtection, upload.single('file'), billingController.importFile);

// ============================================================================
// SPRINT 6: Cartera de Matrizadores
// ============================================================================

// My portfolio - for users to see invoices from their assigned documents - 🔒 SECURITY: Input validation
router.get('/my-portfolio', validateQuery(portfolioQuerySchema), billingController.getMyPortfolio);

// Generate collection reminder message for a client - 🔒 SECURITY: Input validation
router.get('/collection-reminder/:clientTaxId', validateParams(clientTaxIdParamSchema), billingController.generateCollectionReminder);

// ============================================================================
// SPRINT 7: REPORTES
// ============================================================================

// Report: Cartera por Cobrar (Accounts Receivable)
router.get('/reports/cartera-por-cobrar', billingController.getCarteraPorCobrar);

// Report: Pagos del Período - 🔒 SECURITY: Input validation for date filters
router.get('/reports/pagos-periodo', validateQuery(billingReportQuerySchema), billingController.getPagosDelPeriodo);

// Report: Facturas Vencidas
router.get('/reports/facturas-vencidas', billingController.getFacturasVencidas);

// Report: Entregas con Saldo Pendiente (Audit)
router.get('/reports/entregas-con-saldo', billingController.getEntregasConSaldo);

export default router;

