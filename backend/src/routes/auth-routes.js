import express from 'express';
import { 
  register, 
  login, 
  getUserProfile, 
  refreshToken,
  initUsers,
  changePassword
} from '../controllers/auth-controller.js';
import { 
  authenticateToken, 
  requireAdmin 
} from '../middleware/auth-middleware.js';
import {
  passwordChangeRateLimit,
  loginRateLimit,
  authGeneralRateLimit,
  registerRateLimit,
  addRateLimitHeaders
} from '../middleware/rate-limiter.js';
import { csrfProtection } from '../middleware/csrf-protection.js';

const router = express.Router();

// Aplicar headers de rate limiting a todas las rutas
router.use(addRateLimitHeaders);

// Aplicar rate limiting general a todas las rutas de auth
router.use(authGeneralRateLimit);

/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario (solo ADMIN)
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 */
router.post('/register', registerRateLimit, csrfProtection, authenticateToken, requireAdmin, register);

/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', loginRateLimit, login);

/**
 * @route GET /api/auth/profile
 * @desc Obtener perfil del usuario autenticado
 * @access Private
 */
router.get('/profile', authenticateToken, getUserProfile);

/**
 * @route POST /api/auth/refresh
 * @desc Refrescar token JWT
 * @access Private
 */
router.post('/refresh', authenticateToken, refreshToken);

/**
 * @route GET /api/auth/verify
 * @desc Verificar si el token es válido
 * @access Private
 */
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    data: {
      user: req.user
    }
  });
});

/**
 * @route PUT /api/auth/change-password
 * @desc Cambiar contraseña del usuario autenticado
 * @access Private
 * @csrf Protected - Requiere token CSRF
 */
router.put('/change-password', passwordChangeRateLimit, csrfProtection, authenticateToken, changePassword);

/**
 * @route POST /api/auth/init-users
 * @desc ENDPOINT TEMPORAL: Crear usuarios iniciales
 * @access Public (solo funciona si no hay usuarios)
 * ⚠️ Solo para configuración inicial
 */
router.post('/init-users', initUsers);

export default router; 