import rateLimit from 'express-rate-limit';
import { logSecurityViolation } from '../utils/audit-logger.js';

/**
 * Rate limiter para cambio de contraseñas
 * Límite más estricto para operaciones sensibles
 */
const passwordChangeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Máximo 3 intentos por ventana de tiempo
  message: {
    success: false,
    message: 'Demasiados intentos de cambio de contraseña. Intente nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Handler actualizado para express-rate-limit v7+
  handler: (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Log de violación de seguridad
    logSecurityViolation({
      userId: req.user?.id || null,
      userEmail: req.user?.email || 'unknown',
      ipAddress: clientIP,
      userAgent,
      violation: 'Excedido límite de intentos de cambio de contraseña',
      severity: 'medium'
    });
    
    console.warn(`Rate limit exceeded for password change - IP: ${clientIP}, User: ${req.user?.email || 'unknown'}`);
    
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de cambio de contraseña. Intente nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Rate limiter para intentos de login
 * Límite moderado para prevenir ataques de fuerza bruta
 */
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por IP
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  handler: (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const attemptedEmail = req.body?.email || 'unknown';
    
    logSecurityViolation({
      userId: null,
      userEmail: attemptedEmail,
      ipAddress: clientIP,
      userAgent,
      violation: 'Excedido límite de intentos de login',
      severity: 'high'
    });
    
    console.warn(`Login rate limit exceeded - IP: ${clientIP}, Email: ${attemptedEmail}`);
    
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Rate limiter general para rutas de autenticación
 * Límite general para todas las operaciones de auth
 */
const authGeneralRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Máximo 20 requests por IP por ventana
  message: {
    success: false,
    message: 'Demasiadas peticiones a servicios de autenticación. Intente nuevamente más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter muy estricto para registro de usuarios
 * Solo ADMIN puede registrar, pero limitamos para mayor seguridad
 */
const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 registros por hora por IP
  message: {
    success: false,
    message: 'Límite de registros de usuarios alcanzado. Intente nuevamente en 1 hora.',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Middleware para crear headers de información de rate limiting
 */
const addRateLimitHeaders = (req, res, next) => {
  // Agregar headers informativos sobre rate limiting
  res.set({
    'X-RateLimit-Policy': 'Notaria-Segura-Security-Policy',
    'X-Security-Info': 'Rate limiting active for security'
  });
  
  next();
};

export {
  passwordChangeRateLimit,
  loginRateLimit,
  authGeneralRateLimit,
  registerRateLimit,
  addRateLimitHeaders
};