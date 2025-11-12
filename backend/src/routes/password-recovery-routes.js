import express from 'express';
import {
  forgotPassword,
  resetPassword,
  verifyResetToken
} from '../controllers/password-recovery-controller.js';
import { loginRateLimit } from '../middleware/rate-limiter.js';

const router = express.Router();

/**
 * @route POST /api/password-recovery/forgot-password
 * @desc Solicitar recuperación de contraseña
 * @access Public
 */
router.post('/forgot-password', loginRateLimit, forgotPassword);

/**
 * @route POST /api/password-recovery/reset-password
 * @desc Resetear contraseña con token
 * @access Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route GET /api/password-recovery/verify-token/:token
 * @desc Verificar validez de un token de reset (para UX)
 * @access Public
 */
router.get('/verify-token/:token', verifyResetToken);

export default router;
