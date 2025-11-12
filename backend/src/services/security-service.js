import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { log, logSecurity } from '../utils/logger.js';
import { sendSecurityAlert } from './email-service.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutos
const PASSWORD_HISTORY_COUNT = 5; // Número de contraseñas anteriores a recordar

/**
 * Registra un intento fallido de login
 * @param {number} userId - ID del usuario
 * @param {string} ipAddress - IP del intento
 * @param {string} userAgent - User agent
 */
export async function recordFailedLogin(userId, ipAddress, userAgent) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loginAttempts: true, lockedUntil: true, email: true, firstName: true }
    });

    if (!user) return;

    const loginAttempts = user.loginAttempts + 1;
    const shouldLock = loginAttempts >= MAX_LOGIN_ATTEMPTS;

    const updateData = {
      loginAttempts
    };

    if (shouldLock) {
      updateData.lockedUntil = new Date(Date.now() + LOCK_TIME);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    logSecurity('Failed login attempt', {
      userId,
      email: user.email,
      loginAttempts,
      locked: shouldLock,
      ipAddress,
      userAgent
    });

    // Crear alerta si se bloqueó la cuenta
    if (shouldLock) {
      await createSecurityAlert({
        userId,
        alertType: 'ACCOUNT_LOCKED',
        severity: 'high',
        message: `Cuenta bloqueada por ${MAX_LOGIN_ATTEMPTS} intentos fallidos de login`,
        ipAddress,
        userAgent
      });

      // Enviar email de alerta (opcional)
      try {
        await sendSecurityAlert(user.email, user.firstName, {
          alertType: 'Cuenta Bloqueada',
          message: `Tu cuenta ha sido bloqueada temporalmente por ${MAX_LOGIN_ATTEMPTS} intentos fallidos de inicio de sesión`,
          ipAddress,
          timestamp: new Date().toLocaleString('es-ES')
        });
      } catch (emailError) {
        log.error('Failed to send account locked email', emailError);
      }
    }

    return { loginAttempts, locked: shouldLock };
  } catch (error) {
    log.error('Failed to record failed login', error, { userId });
    throw error;
  }
}

/**
 * Resetea los intentos fallidos de login
 * @param {number} userId - ID del usuario
 */
export async function resetLoginAttempts(userId) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });

    log.info('Login attempts reset', { userId });
  } catch (error) {
    log.error('Failed to reset login attempts', error, { userId });
    throw error;
  }
}

/**
 * Verifica si una cuenta está bloqueada
 * @param {Object} user - Usuario a verificar
 * @returns {boolean} True si está bloqueada
 */
export function isAccountLocked(user) {
  if (!user.lockedUntil) return false;

  if (user.lockedUntil > new Date()) {
    return true;
  }

  // Si el bloqueo expiró, no está bloqueada
  return false;
}

/**
 * Agrega una contraseña al historial del usuario
 * @param {number} userId - ID del usuario
 * @param {string} passwordHash - Hash de la contraseña
 */
export async function addPasswordToHistory(userId, passwordHash) {
  try {
    // Agregar la contraseña actual al historial
    await prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash
      }
    });

    // Mantener solo las últimas N contraseñas
    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_COUNT + 10 // Margen extra
    });

    if (history.length > PASSWORD_HISTORY_COUNT) {
      const toDelete = history.slice(PASSWORD_HISTORY_COUNT);
      await prisma.passwordHistory.deleteMany({
        where: {
          id: { in: toDelete.map(h => h.id) }
        }
      });
    }

    log.info('Password added to history', { userId });
  } catch (error) {
    log.error('Failed to add password to history', error, { userId });
    throw error;
  }
}

/**
 * Verifica si una contraseña ha sido usada recientemente
 * @param {number} userId - ID del usuario
 * @param {string} password - Contraseña a verificar
 * @returns {Promise<boolean>} True si fue usada recientemente
 */
export async function isPasswordReused(userId, password) {
  try {
    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_COUNT
    });

    for (const entry of history) {
      const matches = await bcrypt.compare(password, entry.passwordHash);
      if (matches) {
        log.warn('Password reuse detected', { userId });
        return true;
      }
    }

    return false;
  } catch (error) {
    log.error('Failed to check password reuse', error, { userId });
    return false;
  }
}

/**
 * Crea una alerta de seguridad
 * @param {Object} alertData - Datos de la alerta
 * @returns {Promise<Object>} Alerta creada
 */
export async function createSecurityAlert(alertData) {
  try {
    const {
      userId,
      alertType,
      severity,
      message,
      details,
      ipAddress,
      userAgent
    } = alertData;

    const alert = await prisma.securityAlert.create({
      data: {
        userId,
        alertType,
        severity,
        message,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent
      }
    });

    logSecurity('Security alert created', {
      alertId: alert.id,
      userId,
      alertType,
      severity
    });

    return alert;
  } catch (error) {
    log.error('Failed to create security alert', error);
    throw error;
  }
}

/**
 * Obtiene alertas de seguridad no resueltas
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} Alertas encontradas
 */
export async function getSecurityAlerts(filters = {}) {
  try {
    const {
      userId,
      severity,
      resolved = false,
      limit = 50,
      offset = 0
    } = filters;

    const where = { resolved };

    if (userId) where.userId = userId;
    if (severity) where.severity = severity;

    const alerts = await prisma.securityAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    return alerts;
  } catch (error) {
    log.error('Failed to get security alerts', error);
    throw error;
  }
}

/**
 * Resuelve una alerta de seguridad
 * @param {string} alertId - ID de la alerta
 * @param {number} resolvedBy - ID del admin que resuelve
 */
export async function resolveSecurityAlert(alertId, resolvedBy) {
  try {
    await prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy
      }
    });

    log.info('Security alert resolved', { alertId, resolvedBy });
  } catch (error) {
    log.error('Failed to resolve security alert', error, { alertId });
    throw error;
  }
}

/**
 * Detecta y crea alertas para actividad sospechosa
 * @param {number} userId - ID del usuario
 * @param {string} ipAddress - IP del usuario
 * @param {string} action - Acción realizada
 */
export async function detectSuspiciousActivity(userId, ipAddress, action) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginIp: true, email: true, firstName: true }
    });

    if (!user) return;

    // Detectar cambio de IP sospechoso
    if (user.lastLoginIp && user.lastLoginIp !== ipAddress) {
      const suspiciousActions = ['PASSWORD_CHANGE', 'EMAIL_CHANGE', 'PROFILE_UPDATE'];

      if (suspiciousActions.includes(action)) {
        await createSecurityAlert({
          userId,
          alertType: 'SUSPICIOUS_IP_CHANGE',
          severity: 'medium',
          message: `Acción sensible (${action}) realizada desde nueva IP`,
          details: { action, oldIp: user.lastLoginIp, newIp: ipAddress },
          ipAddress
        });

        // Enviar alerta por email
        try {
          await sendSecurityAlert(user.email, user.firstName, {
            alertType: 'Cambio de IP Sospechoso',
            message: `Se detectó una acción sensible desde una nueva dirección IP`,
            ipAddress,
            timestamp: new Date().toLocaleString('es-ES')
          });
        } catch (emailError) {
          log.error('Failed to send suspicious activity email', emailError);
        }
      }
    }

    // Actualizar última IP conocida
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginIp: ipAddress }
    });
  } catch (error) {
    log.error('Failed to detect suspicious activity', error, { userId });
  }
}

/**
 * Limpia alertas antiguas resueltas (tarea de mantenimiento)
 * @param {number} daysOld - Días de antigüedad
 */
export async function cleanupOldAlerts(daysOld = 90) {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await prisma.securityAlert.deleteMany({
      where: {
        resolved: true,
        resolvedAt: {
          lt: cutoffDate
        }
      }
    });

    log.info('Old security alerts cleaned up', {
      deleted: result.count,
      olderThan: cutoffDate
    });

    return result.count;
  } catch (error) {
    log.error('Failed to cleanup old alerts', error);
    throw error;
  }
}

export default {
  recordFailedLogin,
  resetLoginAttempts,
  isAccountLocked,
  addPasswordToHistory,
  isPasswordReused,
  createSecurityAlert,
  getSecurityAlerts,
  resolveSecurityAlert,
  detectSuspiciousActivity,
  cleanupOldAlerts,
  MAX_LOGIN_ATTEMPTS,
  LOCK_TIME,
  PASSWORD_HISTORY_COUNT
};
