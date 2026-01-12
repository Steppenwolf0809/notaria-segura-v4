// Rutas para Encuestas de Satisfacción
import express from 'express';
import { submitEncuesta, getEncuestas, getEstadisticas } from '../controllers/encuesta-controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// RUTA PÚBLICA - No requiere autenticación
// ============================================================================

/**
 * POST /api/encuesta
 * Registra una nueva encuesta de satisfacción
 * Acceso: Público (clientes desde cPanel)
 */
router.post('/', submitEncuesta);

// ============================================================================
// RUTAS ADMIN - Requieren autenticación y rol ADMIN
// ============================================================================

/**
 * GET /api/encuesta/admin
 * Lista todas las encuestas con paginación
 * Acceso: Solo ADMIN
 */
router.get('/admin', authenticateToken, requireRole(['ADMIN']), getEncuestas);

/**
 * GET /api/encuesta/admin/estadisticas
 * Obtiene estadísticas agregadas de las encuestas
 * Acceso: Solo ADMIN
 */
router.get('/admin/estadisticas', authenticateToken, requireRole(['ADMIN']), getEstadisticas);

export default router;
