import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserStats
} from '../controllers/admin-controller.js';

import {
  getAllDocumentsOversight,
  getDocumentEvents,
  getBulkDocumentsInfo,
  executeBulkDocumentOperation,
  exportDocuments
} from '../controllers/admin-document-controller.js';
import { 
  authenticateToken, 
  requireAdmin 
} from '../middleware/auth-middleware.js';
import {
  adminRateLimit,
  addRateLimitHeaders
} from '../middleware/rate-limiter.js';

const router = express.Router();

// Aplicar headers de rate limiting a todas las rutas
router.use(addRateLimitHeaders);

// Aplicar autenticación y verificación de admin a todas las rutas
router.use(authenticateToken);
router.use(requireAdmin);

// Aplicar rate limiting a todas las rutas administrativas
router.use(adminRateLimit);

/**
 * @route GET /api/admin/users
 * @desc Obtener todos los usuarios con paginación y filtros
 * @access Private (ADMIN only)
 * @query page - Número de página (default: 1)
 * @query limit - Límite por página (default: 10)
 * @query search - Búsqueda por nombre, apellido o email
 * @query role - Filtrar por rol
 * @query status - Filtrar por estado (true/false)
 */
router.get('/users', getAllUsers);

/**
 * @route GET /api/admin/users/stats
 * @desc Obtener estadísticas de usuarios
 * @access Private (ADMIN only)
 */
router.get('/users/stats', getUserStats);

/**
 * @route GET /api/admin/users/:id
 * @desc Obtener un usuario específico por ID
 * @access Private (ADMIN only)
 */
router.get('/users/:id', getUserById);

/**
 * @route POST /api/admin/users
 * @desc Crear un nuevo usuario
 * @access Private (ADMIN only)
 * @body email, password, firstName, lastName, role
 */
router.post('/users', createUser);

/**
 * @route PUT /api/admin/users/:id
 * @desc Actualizar un usuario existente
 * @access Private (ADMIN only)
 * @body email?, firstName?, lastName?, role?, password?
 */
router.put('/users/:id', updateUser);

/**
 * @route PATCH /api/admin/users/:id/status
 * @desc Activar/desactivar un usuario
 * @access Private (ADMIN only)
 * @body isActive (boolean)
 */
router.patch('/users/:id/status', toggleUserStatus);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Eliminar un usuario (hard delete)
 * @access Private (ADMIN only)
 * @warning Esta acción es irreversible
 */
router.delete('/users/:id', deleteUser);

// ============================================================================
// RUTAS DE SUPERVISIÓN DE DOCUMENTOS - ADMIN OVERSIGHT
// ============================================================================

/**
 * @route GET /api/admin/documents/oversight
 * @desc Obtener todos los documentos con filtros avanzados para supervisión
 * @access Private (ADMIN only)
 * @query page - Número de página (default: 1)
 * @query limit - Límite por página (default: 10)
 * @query search - Búsqueda por número, cliente, tipo
 * @query status - Filtrar por estado
 * @query type - Filtrar por tipo de documento
 * @query matrizador - Filtrar por matrizador asignado
 * @query overdueOnly - Solo documentos vencidos
 * @query sortBy - Campo para ordenar
 * @query sortOrder - Orden (asc/desc)
 */
router.get('/documents/oversight', getAllDocumentsOversight);

/**
 * @route GET /api/admin/documents/:id/events
 * @desc Obtener timeline de eventos de un documento específico
 * @access Private (ADMIN only)
 */
router.get('/documents/:id/events', getDocumentEvents);

/**
 * @route POST /api/admin/documents/bulk-info
 * @desc Obtener información de múltiples documentos para operaciones en lote
 * @access Private (ADMIN only)
 * @body documentIds - Array de IDs de documentos
 */
router.post('/documents/bulk-info', getBulkDocumentsInfo);

/**
 * @route POST /api/admin/documents/bulk-operation
 * @desc Ejecutar operación en lote sobre múltiples documentos
 * @access Private (ADMIN only)
 * @body operation - Tipo de operación (reassign, changeStatus)
 * @body documentIds - Array de IDs de documentos
 * @body newMatrizadorId - ID del nuevo matrizador (si aplica)
 * @body newStatus - Nuevo estado (si aplica)
 */
router.post('/documents/bulk-operation', executeBulkDocumentOperation);

/**
 * @route GET /api/admin/documents/export
 * @desc Exportar documentos en formato Excel o CSV
 * @access Private (ADMIN only)
 * @query format - Formato de exportación (excel, csv)
 * @query Otros filtros como en oversight
 */
router.get('/documents/export', exportDocuments);


export default router;