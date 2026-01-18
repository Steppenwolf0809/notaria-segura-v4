/**
 * Billing Routes
 * API routes for billing module - invoices, payments, and imports
 */
import express from 'express';
import * as billingController from '../controllers/billing-controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Health check (public)
router.get('/health', billingController.healthCheck);

// All other routes require authentication
router.use(authenticateToken);

// Invoice routes
router.get('/invoices', billingController.getInvoices);
router.get('/invoices/:id', billingController.getInvoiceById);

// Payment routes
router.get('/payments', billingController.getPayments);

// Import log routes
router.get('/import-logs', billingController.getImportLogs);

// Document payment status (for integration with document views)
router.get('/documents/:documentId/payment-status', billingController.getDocumentPaymentStatus);

// Import endpoint placeholder (to be implemented in Sprint 2)
router.post('/import', (req, res) => {
    res.status(501).json({
        error: 'Not Implemented',
        message: 'Import functionality will be available in Sprint 2'
    });
});

export default router;
