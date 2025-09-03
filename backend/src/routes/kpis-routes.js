import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware.js';
import {
  getGeneralKpis,
  getProductivityKpis,
  getFinancialKpis,
  getAlertsKpis,
} from '../controllers/kpis-controller.js';

const router = express.Router();

// Seguridad: solo ADMIN
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/kpis/general
router.get('/general', getGeneralKpis);

// GET /api/admin/kpis/productivity
router.get('/productivity', getProductivityKpis);

// GET /api/admin/kpis/financial
router.get('/financial', getFinancialKpis);

// GET /api/admin/kpis/alerts
router.get('/alerts', getAlertsKpis);

export default router;

