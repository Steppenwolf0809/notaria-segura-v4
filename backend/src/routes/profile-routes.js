import express from 'express';
import {
  requestEmailChange,
  getProfileSecurity,
  revokeSessions
} from '../controllers/profile-controller.js';
import {
  verifyEmail,
  resendVerification,
  checkVerificationToken
} from '../controllers/email-verification-controller.js';
import { authenticateToken } from '../middleware/auth-middleware.js';
import { passwordChangeRateLimit } from '../middleware/rate-limiter.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route PUT /api/profile/update-email
 * @desc Solicitar cambio de email (envía email de verificación)
 * @access Private
 */
router.put('/update-email', passwordChangeRateLimit, requestEmailChange);

/**
 * @route POST /api/profile/verify-email
 * @desc Verificar nuevo email con token
 * @access Private
 */
router.post('/verify-email', verifyEmail);

/**
 * @route POST /api/profile/resend-verification
 * @desc Reenviar email de verificación
 * @access Private
 */
router.post('/resend-verification', resendVerification);

/**
 * @route GET /api/profile/verify-token/:token
 * @desc Verificar validez de token de verificación (para UX)
 * @access Private
 */
router.get('/verify-token/:token', checkVerificationToken);

/**
 * @route GET /api/profile/security
 * @desc Obtener información de seguridad del perfil
 * @access Private
 */
router.get('/security', getProfileSecurity);

/**
 * @route POST /api/profile/revoke-sessions
 * @desc Cerrar todas las sesiones (logout de todos los dispositivos)
 * @access Private
 */
router.post('/revoke-sessions', revokeSessions);

export default router;
