/**
 * Helpers para respuestas HTTP consistentes y seguras
 * Estandariza respuestas de API y añade headers de seguridad
 */

/**
 * Envía respuesta de éxito estandarizada
 * @param {Object} res - Express response object
 * @param {Object} options - Opciones de respuesta
 */
export function sendSuccess(res, { 
  status = 200, 
  message = 'Operación exitosa', 
  data = {}, 
  meta = null,
  headers = {}
} = {}) {
  // Headers de seguridad estándar
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    ...headers
  };

  res.set(securityHeaders);

  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(status).json(response);
}

/**
 * Envía respuesta de error estandarizada
 * @param {Object} res - Express response object
 * @param {Object} options - Opciones de error
 */
export function sendError(res, { 
  status = 500, 
  message = 'Error interno del servidor', 
  error = null,
  details = null,
  headers = {}
} = {}) {
  // Headers de seguridad estándar
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    ...headers
  };

  res.set(securityHeaders);

  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  // Solo incluir error/details en desarrollo
  if (process.env.NODE_ENV === 'development') {
    if (error) response.error = error;
    if (details) response.details = details;
  }

  // En producción, sanitizar mensajes sensibles
  if (process.env.NODE_ENV === 'production' && status === 500) {
    response.message = 'Error interno del servidor';
  }

  return res.status(status).json(response);
}

/**
 * Respuesta de validación fallida
 * @param {Object} res - Express response object
 * @param {Object} validationErrors - Errores de validación
 */
export function sendValidationError(res, validationErrors, message = 'Datos de entrada inválidos') {
  return sendError(res, {
    status: 400,
    message,
    details: validationErrors
  });
}

/**
 * Respuesta de no autorizado
 * @param {Object} res - Express response object
 * @param {string} message - Mensaje personalizado
 */
export function sendUnauthorized(res, message = 'No autorizado') {
  return sendError(res, {
    status: 401,
    message,
    headers: {
      'WWW-Authenticate': 'Bearer'
    }
  });
}

/**
 * Respuesta de acceso denegado
 * @param {Object} res - Express response object
 * @param {string} message - Mensaje personalizado
 */
export function sendForbidden(res, message = 'Acceso denegado') {
  return sendError(res, {
    status: 403,
    message
  });
}

/**
 * Respuesta de recurso no encontrado
 * @param {Object} res - Express response object
 * @param {string} message - Mensaje personalizado
 */
export function sendNotFound(res, message = 'Recurso no encontrado') {
  return sendError(res, {
    status: 404,
    message
  });
}

/**
 * Respuesta de conflicto (recurso duplicado, etc.)
 * @param {Object} res - Express response object
 * @param {string} message - Mensaje personalizado
 */
export function sendConflict(res, message = 'Conflicto con el estado actual del recurso') {
  return sendError(res, {
    status: 409,
    message
  });
}

/**
 * Respuesta de rate limiting
 * @param {Object} res - Express response object
 * @param {string} retryAfter - Tiempo para reintentar
 */
export function sendRateLimit(res, retryAfter = '15 minutos') {
  return sendError(res, {
    status: 429,
    message: `Demasiadas peticiones. Intente nuevamente en ${retryAfter}`,
    headers: {
      'Retry-After': retryAfter
    }
  });
}

/**
 * Respuesta de respuesta paginada
 * @param {Object} res - Express response object
 * @param {Object} data - Datos paginados
 * @param {Object} pagination - Información de paginación
 */
export function sendPaginated(res, data, pagination = {}) {
  return sendSuccess(res, {
    data,
    meta: {
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 0,
        hasNextPage: pagination.hasNextPage || false,
        hasPrevPage: pagination.hasPrevPage || false
      }
    }
  });
}

/**
 * Sanitiza datos sensibles antes de enviar respuesta
 * @param {Object} data - Datos a sanitizar
 * @param {Array} sensitiveFields - Campos sensibles a remover
 */
export function sanitizeResponse(data, sensitiveFields = ['password', 'token', 'secret']) {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item, sensitiveFields));
  }

  const sanitized = { ...data };
  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
}

export default { 
  sendSuccess, 
  sendError, 
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendRateLimit,
  sendPaginated,
  sanitizeResponse
};