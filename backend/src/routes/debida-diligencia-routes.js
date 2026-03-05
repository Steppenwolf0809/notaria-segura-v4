/**
 * Debida Diligencia Routes
 * Routes for the control list search system (UAFE due diligence)
 */
import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import {
    consultarListasControl,
    consultarProvidencias,
    obtenerHistorial,
    descargarPDF,
    consultarYGenerarPDF
} from '../controllers/debida-diligencia-controller.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Authorized roles: ADMIN and MATRIZADOR
const authorizedRoles = requireRoles(['ADMIN', 'MATRIZADOR']);

// POST /api/debida-diligencia/consultar — Search all 10 control lists
router.post('/consultar', authorizedRoles, consultarListasControl);

// POST /api/debida-diligencia/providencias — Search providencias judiciales
router.post('/providencias', authorizedRoles, consultarProvidencias);

// GET /api/debida-diligencia/historial — Search history (audit trail)
router.get('/historial', authorizedRoles, obtenerHistorial);

// GET /api/debida-diligencia/consulta/:id/pdf — Download PDF report
router.get('/consulta/:id/pdf', authorizedRoles, descargarPDF);

// POST /api/debida-diligencia/consultar-y-pdf — Search + download PDF in one call
router.post('/consultar-y-pdf', authorizedRoles, consultarYGenerarPDF);

export default router;
