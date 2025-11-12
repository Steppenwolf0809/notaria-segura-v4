import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { log } from '../utils/logger.js';

/**
 * Middleware de sanitización contra NoSQL injection
 * Remueve caracteres $ y . de los datos del request
 */
export const noSqlSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    log.warn('NoSQL injection attempt detected', {
      path: req.path,
      key,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }
});

/**
 * Middleware contra HTTP Parameter Pollution
 * Previene múltiples valores para el mismo parámetro
 */
export const hppProtection = hpp({
  whitelist: [
    // Parámetros que pueden tener múltiples valores
    'status',
    'role',
    'documentType'
  ]
});

/**
 * Sanitización básica de XSS en strings
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
export function sanitizeXSS(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Middleware de sanitización XSS para todo el request
 * Sanitiza body, query y params
 */
export function xssSanitizer(req, res, next) {
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const original = obj[key];
        obj[key] = sanitizeXSS(obj[key]);

        // Log si se detectó y sanitizó XSS
        if (original !== obj[key]) {
          log.warn('XSS attempt detected and sanitized', {
            path: req.path,
            field: key,
            ip: req.ip,
            userAgent: req.get('user-agent')
          });
        }
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Validación de Content-Type para prevenir ataques
 */
export function validateContentType(req, res, next) {
  // Solo validar para requests con body (POST, PUT, PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');

    if (!contentType) {
      log.warn('Request without Content-Type header', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'Content-Type header requerido'
      });
    }

    // Permitir solo application/json y multipart/form-data
    const allowedTypes = ['application/json', 'multipart/form-data'];
    const isAllowed = allowedTypes.some(type => contentType.includes(type));

    if (!isAllowed) {
      log.warn('Invalid Content-Type header', {
        contentType,
        method: req.method,
        path: req.path,
        ip: req.ip
      });

      return res.status(415).json({
        success: false,
        message: 'Content-Type no soportado'
      });
    }
  }

  next();
}

/**
 * Sanitización de campos específicos sensibles
 * Ejemplo: emails, nombres de usuario, etc.
 */
export function sanitizeSensitiveFields(req, res, next) {
  if (req.body) {
    // Email: convertir a lowercase y trim
    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase().trim();
    }

    // Nombres: trim y capitalizar
    if (req.body.firstName) {
      req.body.firstName = req.body.firstName.trim();
    }

    if (req.body.lastName) {
      req.body.lastName = req.body.lastName.trim();
    }

    // Eliminar espacios de contraseñas (ya se hace en password-validator pero por seguridad)
    if (req.body.password) {
      req.body.password = req.body.password.trim();
    }

    if (req.body.newPassword) {
      req.body.newPassword = req.body.newPassword.trim();
    }

    if (req.body.currentPassword) {
      req.body.currentPassword = req.body.currentPassword.trim();
    }
  }

  next();
}

export default {
  noSqlSanitizer,
  hppProtection,
  xssSanitizer,
  validateContentType,
  sanitizeSensitiveFields,
  sanitizeXSS
};
