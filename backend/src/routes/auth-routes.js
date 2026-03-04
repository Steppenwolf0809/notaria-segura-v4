import express from 'express';
import { authenticateToken } from '../middleware/auth-middleware.js';
import {
  authGeneralRateLimit,
  addRateLimitHeaders
} from '../middleware/rate-limiter.js';

const router = express.Router();

router.use(addRateLimitHeaders);
router.use(authGeneralRateLimit);

/**
 * @route GET /api/auth/me
 * @desc Obtener perfil del usuario autenticado (Clerk)
 * @access Private - No requiere onboarded (el frontend necesita saber el estado)
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

/**
 * @route GET /api/auth/profile
 * @desc Alias de /me para compatibilidad
 * @access Private
 */
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

/**
 * @route GET /api/auth/verify
 * @desc Verificar si el token de Clerk es válido
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

export default router;
