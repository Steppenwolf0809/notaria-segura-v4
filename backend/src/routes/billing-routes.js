/**
 * Billing Routes
 * API routes for billing module - invoices, payments, and imports
 */
import express from 'express';
import multer from 'multer';
import * as billingController from '../controllers/billing-controller.js';
import { authenticateToken } from '../middleware/auth-middleware.js';

const router = express.Router();

// Configure multer for file uploads (memory storage)
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

// Health check (public)
router.get('/health', billingController.healthCheck);

// All other routes require authentication
router.use(authenticateToken);

// Dashboard & Summary
router.get('/stats', billingController.getStats);
router.get('/summary', billingController.getSummary);

// Invoice routes
router.get('/invoices', billingController.getInvoices);
router.get('/invoices/:id', billingController.getInvoiceById);
router.get('/invoices/:id/payments', billingController.getInvoicePayments);

// Payment routes
router.get('/payments', billingController.getPayments);

// Client routes
router.get('/clients', billingController.getClients);
router.get('/clients/:taxId/balance', billingController.getClientBalance);

// Import log routes
router.get('/import-logs', billingController.getImportLogs);

// Document payment status (for integration with document views)
router.get('/documents/:documentId/payment-status', billingController.getDocumentPaymentStatus);

// Import endpoint - requires file upload
router.post('/import', upload.single('file'), billingController.importFile);

// ============================================================================
// SPRINT 6: Cartera de Matrizadores
// ============================================================================

// My portfolio - for users to see invoices from their assigned documents
router.get('/my-portfolio', billingController.getMyPortfolio);

// Generate collection reminder message for a client
router.get('/collection-reminder/:clientTaxId', billingController.generateCollectionReminder);

// ============================================================================
// SPRINT 7: REPORTES
// ============================================================================

// Report: Cartera por Cobrar (Accounts Receivable)
router.get('/reports/cartera-por-cobrar', billingController.getCarteraPorCobrar);

// Report: Pagos del Período
router.get('/reports/pagos-periodo', billingController.getPagosDelPeriodo);

// Report: Facturas Vencidas
router.get('/reports/facturas-vencidas', billingController.getFacturasVencidas);

// Report: Entregas con Saldo Pendiente (Audit)
router.get('/reports/entregas-con-saldo', billingController.getEntregasConSaldo);

export default router;

