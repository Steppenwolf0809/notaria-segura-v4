/**
 * Sistema de logs de auditoría para acciones sensibles
 * Registra eventos de seguridad y cambios importantes
 */

/**
 * Tipos de eventos de auditoría
 */
const AuditEventTypes = {
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DELETED: 'USER_DELETED',
  ADMIN_USER_LIST: 'ADMIN_USER_LIST',
  ADMIN_USER_VIEW: 'ADMIN_USER_VIEW',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION'
};

/**
 * Niveles de severidad para logs de auditoría
 */
const AuditLevels = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * Registra un evento de auditoría
 * @param {Object} eventData - Datos del evento
 * @param {string} eventData.userId - ID del usuario que realiza la acción
 * @param {string} eventData.userEmail - Email del usuario
 * @param {string} eventData.eventType - Tipo de evento (AuditEventTypes)
 * @param {string} eventData.description - Description del evento
 * @param {string} eventData.ipAddress - Dirección IP del cliente
 * @param {string} eventData.userAgent - User agent del navegador
 * @param {string} eventData.level - Nivel de severidad (AuditLevels)
 * @param {Object} eventData.metadata - Datos adicionales del evento
 */
function logAuditEvent({
  userId,
  userEmail,
  eventType,
  description,
  ipAddress = null,
  userAgent = null,
  level = AuditLevels.INFO,
  metadata = {}
}) {
  const timestamp = new Date().toISOString();
  
  const auditLog = {
    timestamp,
    userId,
    userEmail,
    eventType,
    description,
    level,
    ipAddress,
    userAgent,
    metadata,
    sessionId: generateSessionId()
  };

  // Log a consola con formato estructurado
  console.log('=== AUDIT LOG ===');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Event: ${eventType} [${level}]`);
  console.log(`User: ${userEmail} (ID: ${userId})`);
  console.log(`Description: ${description}`);
  console.log(`IP: ${ipAddress || 'N/A'}`);
  console.log(`User-Agent: ${userAgent || 'N/A'}`);
  if (Object.keys(metadata).length > 0) {
    console.log(`Metadata: ${JSON.stringify(metadata, null, 2)}`);
  }
  console.log('================');

  // En producción, aquí se podría enviar a un servicio de logs
  // como Winston, Elasticsearch, o un servicio cloud
  
  return auditLog;
}

/**
 * Registra cambio de contraseña
 * @param {Object} eventData - Datos del evento
 */
function logPasswordChange({ userId, userEmail, ipAddress, userAgent, success = true, reason = null }) {
  return logAuditEvent({
    userId,
    userEmail,
    eventType: AuditEventTypes.PASSWORD_CHANGED,
    description: success 
      ? 'Usuario cambió su contraseña exitosamente'
      : `Intento fallido de cambio de contraseña: ${reason}`,
    level: success ? AuditLevels.INFO : AuditLevels.WARNING,
    ipAddress,
    userAgent,
    metadata: {
      success,
      reason: reason || 'N/A',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Registra intento de login
 * @param {Object} eventData - Datos del evento
 */
function logLoginAttempt({ userEmail, ipAddress, userAgent, success = true, reason = null, userId = null }) {
  return logAuditEvent({
    userId: userId || 'anonymous',
    userEmail,
    eventType: success ? AuditEventTypes.LOGIN_SUCCESS : AuditEventTypes.LOGIN_FAILED,
    description: success 
      ? 'Inicio de sesión exitoso'
      : `Intento fallido de inicio de sesión: ${reason}`,
    level: success ? AuditLevels.INFO : AuditLevels.WARNING,
    ipAddress,
    userAgent,
    metadata: {
      success,
      reason: reason || 'N/A',
      loginTimestamp: new Date().toISOString()
    }
  });
}

/**
 * Registra violación de seguridad
 * @param {Object} eventData - Datos del evento
 */
function logSecurityViolation({ userId, userEmail, ipAddress, userAgent, violation, severity = 'medium' }) {
  const level = severity === 'high' ? AuditLevels.CRITICAL : 
                severity === 'medium' ? AuditLevels.ERROR : AuditLevels.WARNING;

  return logAuditEvent({
    userId: userId || 'anonymous',
    userEmail: userEmail || 'unknown',
    eventType: AuditEventTypes.SECURITY_VIOLATION,
    description: `Violación de seguridad detectada: ${violation}`,
    level,
    ipAddress,
    userAgent,
    metadata: {
      violation,
      severity,
      needsInvestigation: severity === 'high'
    }
  });
}

/**
 * Extrae información del request para auditoría
 * @param {Object} req - Request object de Express
 * @returns {Object} Información extraída
 */
function extractRequestInfo(req) {
  return {
    ipAddress: req?.ip || req?.connection?.remoteAddress || req?.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown',
    method: req?.method || 'UNKNOWN',
    url: req?.originalUrl || req?.url || 'unknown',
    timestamp: new Date().toISOString()
  };
}

/**
 * Genera un ID de sesión único para trazabilidad
 * @returns {string} Session ID
 */
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida si un evento de auditoría es crítico y requiere atención inmediata
 * @param {string} eventType - Tipo de evento
 * @param {Object} metadata - Metadatos del evento
 * @returns {boolean} True si es crítico
 */
function isCriticalEvent(eventType, metadata = {}) {
  const criticalEvents = [
    AuditEventTypes.SECURITY_VIOLATION,
    AuditEventTypes.USER_DEACTIVATED
  ];

  if (criticalEvents.includes(eventType)) {
    return true;
  }

  // Múltiples intentos fallidos de login
  if (eventType === AuditEventTypes.LOGIN_FAILED && metadata.consecutiveFailures > 3) {
    return true;
  }

  return false;
}

/**
 * Registra acciones administrativas de usuarios
 * @param {Object} eventData - Datos del evento administrativo
 */
function logAdminAction({ adminUserId, adminEmail, targetUserId, targetEmail, action, details, ipAddress, userAgent, success = true, reason = null }) {
  return logAuditEvent({
    userId: adminUserId,
    userEmail: adminEmail,
    eventType: action,
    description: success 
      ? `Admin ${action.toLowerCase()}: ${targetEmail} (ID: ${targetUserId})`
      : `Admin ${action.toLowerCase()} fallido: ${targetEmail} - ${reason}`,
    level: success ? AuditLevels.INFO : AuditLevels.WARNING,
    ipAddress,
    userAgent,
    metadata: {
      success,
      reason: reason || 'N/A',
      targetUserId,
      targetEmail,
      adminAction: true,
      details: details || {},
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Registra acceso a lista de usuarios (solo admin)
 * @param {Object} eventData - Datos del evento
 */
function logUserListAccess({ adminUserId, adminEmail, ipAddress, userAgent, filters = null }) {
  return logAuditEvent({
    userId: adminUserId,
    userEmail: adminEmail,
    eventType: AuditEventTypes.ADMIN_USER_LIST,
    description: 'Admin accedió a lista de usuarios',
    level: AuditLevels.INFO,
    ipAddress,
    userAgent,
    metadata: {
      adminAction: true,
      filters: filters || {},
      timestamp: new Date().toISOString()
    }
  });
}

export {
  AuditEventTypes,
  AuditLevels,
  logAuditEvent,
  logPasswordChange,
  logLoginAttempt,
  logSecurityViolation,
  logAdminAction,
  logUserListAccess,
  extractRequestInfo,
  generateSessionId,
  isCriticalEvent
};
