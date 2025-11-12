import crypto from 'crypto';
import prisma from '../db.js';
import { log } from '../utils/logger.js';

/**
 * Genera un token aleatorio seguro
 * @param {number} length - Longitud del token
 * @returns {string} Token generado
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Crea un token de recuperación de contraseña
 * @param {number} userId - ID del usuario
 * @param {string} ipAddress - IP del solicitante
 * @param {string} userAgent - User agent del navegador
 * @returns {Promise<string>} Token generado
 */
export async function createPasswordResetToken(userId, ipAddress, userAgent) {
  try {
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalida tokens anteriores no usados del mismo usuario
    await prisma.passwordResetToken.updateMany({
      where: {
        userId,
        used: false,
        expiresAt: { gt: new Date() }
      },
      data: { used: true }
    });

    // Crea nuevo token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    log.info('Password reset token created', { userId, expiresAt });

    return token;
  } catch (error) {
    log.error('Failed to create password reset token', error, { userId });
    throw error;
  }
}

/**
 * Verifica y consume un token de recuperación de contraseña
 * @param {string} token - Token a verificar
 * @returns {Promise<Object|null>} Usuario asociado al token o null
 */
export async function verifyPasswordResetToken(token) {
  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      log.warn('Invalid password reset token attempted', { token: token.substring(0, 8) });
      return null;
    }

    if (resetToken.used) {
      log.warn('Already used password reset token attempted', { token: token.substring(0, 8) });
      return null;
    }

    if (resetToken.expiresAt < new Date()) {
      log.warn('Expired password reset token attempted', { token: token.substring(0, 8) });
      return null;
    }

    // Marca el token como usado
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    log.info('Password reset token verified and consumed', { userId: resetToken.userId });

    return resetToken.user;
  } catch (error) {
    log.error('Failed to verify password reset token', error);
    return null;
  }
}

/**
 * Crea un token de verificación de email
 * @param {number} userId - ID del usuario
 * @param {string} email - Email a verificar
 * @param {string} ipAddress - IP del solicitante
 * @param {string} userAgent - User agent del navegador
 * @returns {Promise<string>} Token generado
 */
export async function createEmailVerificationToken(userId, email, ipAddress, userAgent) {
  try {
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Invalida tokens anteriores no usados del mismo usuario
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        used: false,
        expiresAt: { gt: new Date() }
      },
      data: { used: true }
    });

    // Crea nuevo token
    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId,
        email,
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    log.info('Email verification token created', { userId, email, expiresAt });

    return token;
  } catch (error) {
    log.error('Failed to create email verification token', error, { userId, email });
    throw error;
  }
}

/**
 * Verifica y consume un token de verificación de email
 * @param {string} token - Token a verificar
 * @returns {Promise<Object|null>} Datos del token o null
 */
export async function verifyEmailVerificationToken(token) {
  try {
    const verifyToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!verifyToken) {
      log.warn('Invalid email verification token attempted', { token: token.substring(0, 8) });
      return null;
    }

    if (verifyToken.used) {
      log.warn('Already used email verification token attempted', { token: token.substring(0, 8) });
      return null;
    }

    if (verifyToken.expiresAt < new Date()) {
      log.warn('Expired email verification token attempted', { token: token.substring(0, 8) });
      return null;
    }

    // Marca el token como usado
    await prisma.emailVerificationToken.update({
      where: { id: verifyToken.id },
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    log.info('Email verification token verified and consumed', {
      userId: verifyToken.userId,
      email: verifyToken.email
    });

    return verifyToken;
  } catch (error) {
    log.error('Failed to verify email verification token', error);
    return null;
  }
}

/**
 * Crea un refresh token
 * @param {number} userId - ID del usuario
 * @param {string} ipAddress - IP del solicitante
 * @param {string} userAgent - User agent del navegador
 * @returns {Promise<string>} Token generado
 */
export async function createRefreshToken(userId, ipAddress, userAgent) {
  try {
    const token = generateToken(64);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Crea nuevo refresh token
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    log.info('Refresh token created', { userId, expiresAt });

    return token;
  } catch (error) {
    log.error('Failed to create refresh token', error, { userId });
    throw error;
  }
}

/**
 * Verifica un refresh token y lo rota (crea uno nuevo)
 * @param {string} token - Token a verificar
 * @param {string} ipAddress - IP del solicitante
 * @param {string} userAgent - User agent del navegador
 * @returns {Promise<Object|null>} { user, newToken } o null
 */
export async function verifyAndRotateRefreshToken(token, ipAddress, userAgent) {
  try {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!refreshToken) {
      log.warn('Invalid refresh token attempted', { token: token.substring(0, 8) });
      return null;
    }

    if (refreshToken.revoked) {
      log.warn('Revoked refresh token attempted - potential security breach', {
        token: token.substring(0, 8),
        userId: refreshToken.userId
      });
      // Revocar todos los tokens del usuario por seguridad
      await prisma.refreshToken.updateMany({
        where: { userId: refreshToken.userId },
        data: { revoked: true, revokedAt: new Date() }
      });
      return null;
    }

    if (refreshToken.expiresAt < new Date()) {
      log.warn('Expired refresh token attempted', { token: token.substring(0, 8) });
      return null;
    }

    // Crear nuevo token
    const newToken = await createRefreshToken(refreshToken.userId, ipAddress, userAgent);

    // Revocar el token actual
    await prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: {
        revoked: true,
        revokedAt: new Date(),
        replacedBy: newToken
      }
    });

    log.info('Refresh token rotated successfully', { userId: refreshToken.userId });

    return {
      user: refreshToken.user,
      newToken
    };
  } catch (error) {
    log.error('Failed to verify and rotate refresh token', error);
    return null;
  }
}

/**
 * Revoca todos los refresh tokens de un usuario
 * @param {number} userId - ID del usuario
 */
export async function revokeAllUserTokens(userId) {
  try {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false
      },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });

    log.info('All user refresh tokens revoked', { userId });
  } catch (error) {
    log.error('Failed to revoke user tokens', error, { userId });
    throw error;
  }
}

/**
 * Limpia tokens expirados (tarea de mantenimiento)
 */
export async function cleanupExpiredTokens() {
  try {
    const now = new Date();

    const [resetTokens, verifyTokens, refreshTokens] = await Promise.all([
      prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true, usedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          ]
        }
      }),
      prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true, usedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          ]
        }
      }),
      prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revoked: true, revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          ]
        }
      })
    ]);

    log.info('Expired tokens cleaned up', {
      resetTokens: resetTokens.count,
      verifyTokens: verifyTokens.count,
      refreshTokens: refreshTokens.count
    });

    return {
      resetTokens: resetTokens.count,
      verifyTokens: verifyTokens.count,
      refreshTokens: refreshTokens.count
    };
  } catch (error) {
    log.error('Failed to cleanup expired tokens', error);
    throw error;
  }
}

export default {
  generateToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  createRefreshToken,
  verifyAndRotateRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens
};
