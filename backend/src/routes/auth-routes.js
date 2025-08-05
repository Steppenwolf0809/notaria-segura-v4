import express from 'express';
import { 
  register, 
  login, 
  getUserProfile, 
  refreshToken,
  initUsers
} from '../controllers/auth-controller.js';
import { 
  authenticateToken, 
  requireAdmin 
} from '../middleware/auth-middleware.js';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario (solo ADMIN)
 * @access Private (ADMIN only)
 */
router.post('/register', authenticateToken, requireAdmin, register);

/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', login);

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
 * @route POST /api/auth/init-users
 * @desc ENDPOINT TEMPORAL: Crear usuarios iniciales
 * @access Public (solo funciona si no hay usuarios)
 * ⚠️ Solo para configuración inicial
 */
router.post('/init-users', initUsers);

export default router; 