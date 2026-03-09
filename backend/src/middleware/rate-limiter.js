import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { logSecurityViolation } from '../utils/audit-logger.js';

/**
 * Configuración base de trust proxy
 * IMPORTANTE: Debe estar consistente en toda la aplicación
 */
const TRUST_PROXY = process.env.NODE_ENV === 'production';

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
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: TRUST_PROXY,

  handler: (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

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
 * Límite por combinación email+IP para entornos de oficina
 * Configurable via variables de entorno para pruebas
 */
const loginRateLimit = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW || '900000'), // Default: 15 minutos (15 * 60 * 1000)
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '100'), // Default: 100 intentos (DUPLICADO para pruebas)
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión para esta cuenta. Intente nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: process.env.NODE_ENV === 'production', // Solo confiar en proxy en producción

  // Generar key única por combinación email+IP con soporte IPv6
  keyGenerator: (req) => {
    const clientIP = ipKeyGenerator(req); // Helper oficial para IPv4/IPv6
    const email = req.body?.email || 'no-email';
    return `${email}:${clientIP}`;
  },

  handler: (req, res) => {
    const clientIP = ipKeyGenerator(req); // Usar helper oficial para consistencia
    const userAgent = req.headers['user-agent'] || 'unknown';
    const attemptedEmail = req.body?.email || 'unknown';

    logSecurityViolation({
      userId: null,
      userEmail: attemptedEmail,
      ipAddress: clientIP,
      userAgent,
      violation: 'Excedido límite de intentos de login por email+IP',
      severity: 'high'
    });

    console.warn(`Login rate limit exceeded - Email: ${attemptedEmail}, IP: ${clientIP}`);

    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de inicio de sesión para esta cuenta. Intente nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Rate limiter general para rutas de autenticación
 * Límite general para todas las operaciones de auth
 * Configurable via variables de entorno para pruebas
 */
const authGeneralRateLimit = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW || '900000'), // Default: 15 minutos
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '200'), // Default: 200 requests (DUPLICADO para pruebas)
  message: {
    success: false,
    message: 'Demasiadas peticiones a servicios de autenticación. Intente nuevamente más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: TRUST_PROXY
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
  legacyHeaders: false,
  trustProxy: TRUST_PROXY
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

/**
 * Rate limiter para operaciones administrativas
 * Límite por hora como solicitado en Sprint 1
 */
const adminRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 200, // Máximo 200 requests por hora por IP (DUPLICADO para pruebas)
  message: {
    success: false,
    message: 'Demasiadas operaciones administrativas. Intente nuevamente en 1 hora.',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: process.env.NODE_ENV === 'production', // Solo confiar en proxy en producción

  handler: (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    logSecurityViolation({
      userId: req.user?.id || null,
      userEmail: req.user?.email || 'unknown',
      ipAddress: clientIP,
      userAgent,
      violation: 'Excedido límite de operaciones administrativas',
      severity: 'medium'
    });

    console.warn(`Admin rate limit exceeded - IP: ${clientIP}, User: ${req.user?.email || 'unknown'}`);

    res.status(429).json({
      success: false,
      message: 'Demasiadas operaciones administrativas. Intente nuevamente en 1 hora.',
      retryAfter: '1 hora'
    });
  }
});

/**
 * Rate limiter para endpoints de documentos
 * Límite razonable para operaciones de lectura/escritura
 */
const documentsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 400, // 400 requests por 15 minutos (DUPLICADO para pruebas)
  message: {
    success: false,
    message: 'Demasiadas operaciones de documentos. Intente nuevamente en unos minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: TRUST_PROXY,

  handler: (req, res) => {
    const clientIP = req.ip || 'unknown';

    logSecurityViolation({
      userId: req.user?.id || null,
      userEmail: req.user?.email || 'unknown',
      ipAddress: clientIP,
      userAgent: req.headers['user-agent'] || 'unknown',
      violation: 'Excedido límite de operaciones de documentos',
      severity: 'low'
    });

    res.status(429).json({
      success: false,
      message: 'Demasiadas operaciones de documentos. Intente nuevamente en unos minutos.'
    });
  }
});

/**
 * Rate limiter para endpoints de recepción
 * Límite para operaciones de entrega
 * Aumentado a 500 para permitir operaciones intensivas de recepción
 */
const receptionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requests por 15 minutos (DUPLICADO para pruebas)
  message: {
    success: false,
    message: 'Demasiadas operaciones de recepción. Intente nuevamente en unos minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: TRUST_PROXY,

  handler: (req, res) => {
    const clientIP = req.ip || 'unknown';

    logSecurityViolation({
      userId: req.user?.id || null,
      userEmail: req.user?.email || 'unknown',
      ipAddress: clientIP,
      userAgent: req.headers['user-agent'] || 'unknown',
      violation: 'Excedido límite de operaciones de recepción',
      severity: 'low'
    });

    res.status(429).json({
      success: false,
      message: 'Demasiadas operaciones de recepción. Intente nuevamente en unos minutos.'
    });
  }
});

/**
 * Rate limiter para endpoints de archivo
 * Límite para operaciones de archivo
 */
const archivoRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requests por 15 minutos (DUPLICADO para pruebas)
  message: {
    success: false,
    message: 'Demasiadas operaciones de archivo. Intente nuevamente en unos minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: TRUST_PROXY,

  handler: (req, res) => {
    const clientIP = req.ip || 'unknown';

    logSecurityViolation({
      userId: req.user?.id || null,
      userEmail: req.user?.email || 'unknown',
      ipAddress: clientIP,
      userAgent: req.headers['user-agent'] || 'unknown',
      violation: 'Excedido límite de operaciones de archivo',
      severity: 'low'
    });

    res.status(429).json({
      success: false,
      message: 'Demasiadas operaciones de archivo. Intente nuevamente en unos minutos.'
    });
  }
});

/**
 * 🔒 SECURITY FIX: Rate limiter for UAFE form login (public endpoint)
 * Strict limit by IP + cedula to prevent PIN brute force attacks
 */
const uafeLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per 15 minutes per IP+cedula
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: TRUST_PROXY,
  keyGenerator: (req) => {
    const clientIP = ipKeyGenerator(req);
    const cedula = req.body?.cedula || 'no-cedula';
    return `uafe:${cedula}:${clientIP}`;
  },
  handler: (req, res) => {
    const clientIP = ipKeyGenerator(req);
    logSecurityViolation({
      userId: null,
      userEmail: req.body?.cedula || 'unknown',
      ipAddress: clientIP,
      userAgent: req.headers['user-agent'] || 'unknown',
      violation: 'Excedido límite de intentos de login UAFE por cedula+IP',
      severity: 'high'
    });
    console.warn(`[SECURITY] UAFE login rate limit exceeded - Cedula: ${req.body?.cedula || 'unknown'}, IP: ${clientIP}`);
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * 🔒 SECURITY FIX: Rate limiter for personal login (public endpoint)
 * Strict limit by IP + cedula to prevent PIN brute force attacks
 */
const personalLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per 15 minutes per IP+cedula
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: TRUST_PROXY,
  keyGenerator: (req) => {
    const clientIP = ipKeyGenerator(req);
    const cedula = req.body?.cedula || 'no-cedula';
    return `personal:${cedula}:${clientIP}`;
  },
  handler: (req, res) => {
    const clientIP = ipKeyGenerator(req);
    logSecurityViolation({
      userId: null,
      userEmail: req.body?.cedula || 'unknown',
      ipAddress: clientIP,
      userAgent: req.headers['user-agent'] || 'unknown',
      violation: 'Excedido límite de intentos de login personal por cedula+IP',
      severity: 'high'
    });
    console.warn(`[SECURITY] Personal login rate limit exceeded - Cedula: ${req.body?.cedula || 'unknown'}, IP: ${clientIP}`);
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * 🔒 SECURITY FIX: Rate limiter for personal registration (public endpoint)
 */
const personalRegisterRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 registrations per hour per IP
  message: {
    success: false,
    message: 'Demasiados intentos de registro. Intente nuevamente en 1 hora.',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: TRUST_PROXY
});

export {
  passwordChangeRateLimit,
  loginRateLimit,
  authGeneralRateLimit,
  registerRateLimit,
  adminRateLimit,
  documentsRateLimit,
  receptionRateLimit,
  archivoRateLimit,
  addRateLimitHeaders,
  uafeLoginRateLimit,
  personalLoginRateLimit,
  personalRegisterRateLimit
};