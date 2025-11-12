import prisma from '../db.js';
import { sendSuccess, sendError, sendValidationError } from '../utils/http.js';
import { log, logSecurity } from '../utils/logger.js';
import { createEmailVerificationToken } from '../services/token-service.js';
import { sendEmailVerification } from '../services/email-service.js';
import { detectSuspiciousActivity, getSecurityAlerts } from '../services/security-service.js';
import { extractRequestInfo } from '../utils/audit-logger.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Solicitar cambio de email
 * PUT /api/auth/profile/update-email
 */
export async function requestEmailChange(req, res) {
  try {
    const userId = req.user.id;
    const { newEmail } = req.body;
    const requestInfo = extractRequestInfo(req);

    if (!newEmail) {
      return sendValidationError(res, 'El nuevo email es obligatorio');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return sendValidationError(res, 'Email no válido');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return sendValidationError(res, 'Usuario no encontrado');
    }

    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      return sendValidationError(res, 'El nuevo email es igual al actual');
    }

    // Verificar que el nuevo email no esté en uso
    const emailExists = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() }
    });

    if (emailExists) {
      return sendValidationError(res, 'Este email ya está en uso');
    }

    // Detectar actividad sospechosa
    await detectSuspiciousActivity(userId, requestInfo.ipAddress, 'EMAIL_CHANGE');

    // Crear token de verificación para el nuevo email
    const verificationToken = await createEmailVerificationToken(
      user.id,
      newEmail.toLowerCase(),
      requestInfo.ipAddress,
      requestInfo.userAgent
    );

    // Enviar email de verificación al nuevo email
    try {
      await sendEmailVerification(newEmail, verificationToken, user.firstName);

      log.info('Email change verification sent', {
        userId: user.id,
        oldEmail: user.email,
        newEmail: newEmail.toLowerCase(),
        ipAddress: requestInfo.ipAddress
      });

      logSecurity('Email change requested', {
        userId: user.id,
        oldEmail: user.email,
        newEmail: newEmail.toLowerCase(),
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      });

      return sendSuccess(res, {
        message: `Email de verificación enviado a ${newEmail}. Por favor verifica tu nuevo email para completar el cambio.`,
        ...(isDevelopment && { debug: 'Email enviado exitosamente' })
      });

    } catch (emailError) {
      log.error('Failed to send email change verification', emailError, {
        userId: user.id,
        newEmail
      });

      if (isDevelopment) {
        return sendError(res, 'Error al enviar el email. Verifica la configuración SMTP.', 500);
      }

      return sendError(res, 'Error al enviar el email', 500);
    }

  } catch (error) {
    log.error('Error in requestEmailChange', error);
    return sendError(res);
  }
}

/**
 * Obtener información de seguridad del perfil
 * GET /api/auth/profile/security
 */
export async function getProfileSecurity(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        lastLogin: true,
        lastLoginIp: true,
        loginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return sendValidationError(res, 'Usuario no encontrado');
    }

    // Obtener alertas de seguridad del usuario
    const alerts = await getSecurityAlerts({
      userId,
      resolved: false,
      limit: 10
    });

    // Obtener sesiones activas (refresh tokens)
    const activeSessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true
      },
      orderBy: { lastUsedAt: 'desc' },
      take: 10
    });

    // Últimos cambios de contraseña (basados en historial)
    const passwordHistory = await prisma.passwordHistory.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    log.info('Profile security info retrieved', { userId });

    return sendSuccess(res, {
      data: {
        user: {
          email: user.email,
          emailVerified: user.emailVerified,
          emailVerifiedAt: user.emailVerifiedAt,
          twoFactorEnabled: user.twoFactorEnabled,
          lastLogin: user.lastLogin,
          lastLoginIp: user.lastLoginIp,
          accountCreated: user.createdAt
        },
        security: {
          isLocked: user.lockedUntil && user.lockedUntil > new Date(),
          lockedUntil: user.lockedUntil,
          loginAttempts: user.loginAttempts,
          passwordChanges: passwordHistory.map(ph => ph.createdAt)
        },
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          createdAt: alert.createdAt,
          ipAddress: alert.ipAddress
        })),
        activeSessions: activeSessions.map(session => ({
          id: session.id,
          createdAt: session.createdAt,
          lastUsedAt: session.lastUsedAt,
          ipAddress: session.ipAddress,
          device: session.userAgent?.match(/(Mobile|Tablet|iPad|iPhone|Android)/i) ? 'Mobile' : 'Desktop',
          expiresAt: session.expiresAt
        }))
      }
    });

  } catch (error) {
    log.error('Error in getProfileSecurity', error);
    return sendError(res);
  }
}

/**
 * Cerrar todas las sesiones (excepto la actual)
 * POST /api/auth/profile/revoke-sessions
 */
export async function revokeSessions(req, res) {
  try {
    const userId = req.user.id;
    const { currentSessionOnly = false } = req.body;
    const requestInfo = extractRequestInfo(req);

    if (currentSessionOnly) {
      // Solo cerrar la sesión actual (logout)
      // Esto se manejará en el frontend eliminando el token
      log.info('Current session logout', { userId });

      return sendSuccess(res, {
        message: 'Sesión cerrada exitosamente'
      });
    }

    // Revocar todas las sesiones (refresh tokens)
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false
      },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });

    log.info('All user sessions revoked', {
      userId,
      revokedCount: result.count,
      ipAddress: requestInfo.ipAddress
    });

    logSecurity('All sessions revoked by user', {
      userId,
      email: req.user.email,
      sessionsRevoked: result.count,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    return sendSuccess(res, {
      message: `${result.count} sesiones cerradas exitosamente. Deberás volver a iniciar sesión en todos tus dispositivos.`,
      data: {
        sessionsRevoked: result.count
      }
    });

  } catch (error) {
    log.error('Error in revokeSessions', error);
    return sendError(res);
  }
}

export default {
  requestEmailChange,
  getProfileSecurity,
  revokeSessions
};
