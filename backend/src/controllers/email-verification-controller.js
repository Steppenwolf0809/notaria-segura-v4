import prisma from '../db.js';
import { sendSuccess, sendError, sendValidationError } from '../utils/http.js';
import { log, logSecurity } from '../utils/logger.js';
import { createEmailVerificationToken, verifyEmailVerificationToken } from '../services/token-service.js';
import { sendEmailVerification } from '../services/email-service.js';
import { extractRequestInfo } from '../utils/audit-logger.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Verificar email con token
 * POST /api/auth/verify-email
 */
export async function verifyEmail(req, res) {
  try {
    const { token } = req.body;
    const requestInfo = extractRequestInfo(req);

    if (!token) {
      return sendValidationError(res, 'Token no proporcionado');
    }

    // Verificar token
    const verifyToken = await verifyEmailVerificationToken(token);

    if (!verifyToken) {
      logSecurity('Invalid or expired email verification token used', {
        token: token.substring(0, 8),
        ipAddress: requestInfo.ipAddress
      });

      return sendValidationError(res, 'Token inválido o expirado');
    }

    const user = verifyToken.user;
    const emailToVerify = verifyToken.email;

    // Actualizar usuario
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: emailToVerify,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      }
    });

    log.info('Email verified successfully', {
      userId: user.id,
      email: emailToVerify,
      ipAddress: requestInfo.ipAddress
    });

    logSecurity('Email verified', {
      userId: user.id,
      email: emailToVerify,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    return sendSuccess(res, {
      message: 'Email verificado exitosamente',
      data: {
        user: {
          id: user.id,
          email: emailToVerify,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: true
        }
      }
    });

  } catch (error) {
    log.error('Error in verifyEmail', error);
    return sendError(res);
  }
}

/**
 * Reenviar email de verificación
 * POST /api/auth/resend-verification
 */
export async function resendVerification(req, res) {
  try {
    const userId = req.user.id;
    const requestInfo = extractRequestInfo(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        emailVerified: true,
        isActive: true
      }
    });

    if (!user) {
      return sendValidationError(res, 'Usuario no encontrado');
    }

    if (!user.isActive) {
      return sendValidationError(res, 'Usuario desactivado');
    }

    if (user.emailVerified) {
      return sendValidationError(res, 'El email ya está verificado');
    }

    // Crear nuevo token
    const verificationToken = await createEmailVerificationToken(
      user.id,
      user.email,
      requestInfo.ipAddress,
      requestInfo.userAgent
    );

    // Enviar email
    try {
      await sendEmailVerification(user.email, verificationToken, user.firstName);

      log.info('Verification email resent', {
        userId: user.id,
        email: user.email,
        ipAddress: requestInfo.ipAddress
      });

      return sendSuccess(res, {
        message: 'Email de verificación enviado',
        ...(isDevelopment && { debug: 'Email enviado exitosamente' })
      });

    } catch (emailError) {
      log.error('Failed to send verification email', emailError, {
        userId: user.id,
        email: user.email
      });

      if (isDevelopment) {
        return sendError(res, 'Error al enviar el email. Verifica la configuración SMTP.', 500);
      }

      return sendError(res, 'Error al enviar el email', 500);
    }

  } catch (error) {
    log.error('Error in resendVerification', error);
    return sendError(res);
  }
}

/**
 * Verificar un token sin consumirlo (para UX)
 * GET /api/auth/verify-email-token/:token
 */
export async function checkVerificationToken(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return sendValidationError(res, 'Token no proporcionado');
    }

    // Buscar token sin consumirlo
    const verifyToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, isActive: true }
        }
      }
    });

    if (!verifyToken) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Token no válido'
      });
    }

    if (verifyToken.used) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Este enlace ya fue utilizado'
      });
    }

    if (verifyToken.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Este enlace ha expirado'
      });
    }

    if (!verifyToken.user.isActive) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Usuario desactivado'
      });
    }

    return res.json({
      success: true,
      valid: true,
      message: 'Token válido',
      data: {
        email: verifyToken.email,
        firstName: verifyToken.user.firstName
      }
    });

  } catch (error) {
    log.error('Error in checkVerificationToken', error);
    return sendError(res);
  }
}

export default {
  verifyEmail,
  resendVerification,
  checkVerificationToken
};
