import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../utils/http.js';
import { log, logSecurity } from '../utils/logger.js';
import { createPasswordResetToken, verifyPasswordResetToken } from '../services/token-service.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../services/email-service.js';
import { validatePassword, sanitizePassword } from '../utils/password-validator.js';
import { addPasswordToHistory, isPasswordReused } from '../services/security-service.js';
import { extractRequestInfo } from '../utils/audit-logger.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Solicitar recuperación de contraseña
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const requestInfo = extractRequestInfo(req);

    if (!email) {
      return sendValidationError(res, 'El email es obligatorio');
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, firstName: true, isActive: true }
    });

    // Por seguridad, siempre responder con éxito aunque el usuario no exista
    // Esto previene enumeration attacks
    if (!user || !user.isActive) {
      log.warn('Password reset requested for non-existent or inactive user', {
        email,
        ipAddress: requestInfo.ipAddress
      });

      // En desarrollo, dar feedback útil
      if (isDevelopment) {
        return sendSuccess(res, {
          message: 'Si el email existe, recibirás instrucciones de recuperación',
          debug: 'Usuario no encontrado o inactivo (solo visible en desarrollo)'
        });
      }

      return sendSuccess(res, {
        message: 'Si el email existe, recibirás instrucciones de recuperación'
      });
    }

    // Crear token de recuperación
    const resetToken = await createPasswordResetToken(
      user.id,
      requestInfo.ipAddress,
      requestInfo.userAgent
    );

    // Enviar email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.firstName);

      log.info('Password reset email sent', {
        userId: user.id,
        email: user.email,
        ipAddress: requestInfo.ipAddress
      });

      logSecurity('Password reset requested', {
        userId: user.id,
        email: user.email,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      });
    } catch (emailError) {
      log.error('Failed to send password reset email', emailError, {
        userId: user.id,
        email: user.email
      });

      // En desarrollo, informar del error
      if (isDevelopment) {
        return sendError(res, 'Error al enviar el email. Verifica la configuración SMTP.', 500);
      }

      // En producción, no revelar el error
      return sendSuccess(res, {
        message: 'Si el email existe, recibirás instrucciones de recuperación'
      });
    }

    return sendSuccess(res, {
      message: 'Si el email existe, recibirás instrucciones de recuperación',
      ...(isDevelopment && { debug: 'Email enviado exitosamente' })
    });

  } catch (error) {
    log.error('Error in forgotPassword', error);
    return sendError(res);
  }
}

/**
 * Resetear contraseña con token
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res) {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    const requestInfo = extractRequestInfo(req);

    // Validaciones
    if (!token || !newPassword || !confirmPassword) {
      return sendValidationError(res, 'Todos los campos son obligatorios');
    }

    if (newPassword !== confirmPassword) {
      return sendValidationError(res, 'Las contraseñas no coinciden');
    }

    // Verificar token
    const user = await verifyPasswordResetToken(token);

    if (!user) {
      logSecurity('Invalid or expired password reset token used', {
        token: token.substring(0, 8),
        ipAddress: requestInfo.ipAddress
      });

      return sendValidationError(res, 'Token inválido o expirado');
    }

    if (!user.isActive) {
      return sendValidationError(res, 'Usuario desactivado');
    }

    // Validar nueva contraseña
    const sanitizedPassword = sanitizePassword(newPassword);
    const passwordValidation = validatePassword(sanitizedPassword);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple los criterios de seguridad',
        errors: passwordValidation.errors,
        requirements: passwordValidation.requirements
      });
    }

    // Verificar que no reutilice contraseñas anteriores
    const isReused = await isPasswordReused(user.id, sanitizedPassword);
    if (isReused) {
      logSecurity('Password reuse attempted during reset', {
        userId: user.id,
        email: user.email,
        ipAddress: requestInfo.ipAddress
      });

      return sendValidationError(
        res,
        'No puedes usar una contraseña que hayas utilizado recientemente'
      );
    }

    // Guardar contraseña anterior en historial
    await addPasswordToHistory(user.id, user.password);

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(sanitizedPassword, 12);

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        loginAttempts: 0, // Resetear intentos fallidos
        lockedUntil: null, // Desbloquear cuenta si estaba bloqueada
        updatedAt: new Date()
      }
    });

    log.info('Password reset successful', {
      userId: user.id,
      email: user.email,
      ipAddress: requestInfo.ipAddress
    });

    logSecurity('Password reset completed', {
      userId: user.id,
      email: user.email,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    // Enviar email de confirmación
    try {
      await sendPasswordChangedEmail(
        user.email,
        user.firstName,
        requestInfo.ipAddress
      );
    } catch (emailError) {
      log.error('Failed to send password changed email', emailError);
      // No fallar la operación por error de email
    }

    return sendSuccess(res, {
      message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
      data: {
        passwordStrength: passwordValidation.strength
      }
    });

  } catch (error) {
    log.error('Error in resetPassword', error);
    return sendError(res);
  }
}

/**
 * Verificar validez de un token de reset (opcional, para UX)
 * GET /api/auth/verify-reset-token/:token
 */
export async function verifyResetToken(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return sendValidationError(res, 'Token no proporcionado');
    }

    // Buscar token sin consumirlo
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, isActive: true }
        }
      }
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Token no válido'
      });
    }

    if (resetToken.used) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Este enlace ya fue utilizado'
      });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Este enlace ha expirado'
      });
    }

    if (!resetToken.user.isActive) {
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
        email: resetToken.user.email,
        firstName: resetToken.user.firstName
      }
    });

  } catch (error) {
    log.error('Error in verifyResetToken', error);
    return sendError(res);
  }
}

export default {
  forgotPassword,
  resetPassword,
  verifyResetToken
};
