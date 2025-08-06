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

export default router;