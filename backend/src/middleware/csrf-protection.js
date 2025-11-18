import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';

/**
 * Configuración de CSRF Protection con csrf-csrf (moderna alternativa a csurf)
 *
 * Protege contra ataques Cross-Site Request Forgery donde un sitio malicioso
 * intenta ejecutar acciones no autorizadas en nombre de un usuario autenticado.
 *
 * Usa el patrón "Double Submit Cookie" más seguro que el viejo csurf.
 */

const CSRF_SECRET = process.env.CSRF_SECRET || 'notaria-segura-csrf-secret-change-in-production';
const COOKIE_NAME = '__Host-csrf';
const HEADER_NAME = 'x-csrf-token';

// Configurar doubleCsrf con opciones de seguridad
const {
  generateCsrfToken,     // Genera token CSRF para enviar al cliente
  doubleCsrfProtection, // Middleware para validar token
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  cookieName: COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production', // HTTPS en producción
    path: '/',
    maxAge: 3600000 // 1 hora
  },
  size: 64, // Tamaño del token en bytes
  getTokenFromRequest: (req) => {
    // Buscar token en header personalizado o en body
    return req.headers[HEADER_NAME] || req.body?._csrf;
  },
  getSessionIdentifier: (req) => {
    // Usar siempre la IP como identificador de sesión para mantener consistencia
    // entre la generación del token (sin auth) y la validación (con auth)
    return req.ip || 'anonymous';
  },
});

/**
 * Middleware para generar y enviar token CSRF al cliente
 * Se aplica a rutas que necesitan enviar formularios protegidos
 */
export const csrfTokenGenerator = (req, res, next) => {
  try {
    const token = generateCsrfToken(req, res);

    // Agregar token al objeto de request para acceso en controladores
    req.csrfToken = () => token;

    next();
  } catch (error) {
    console.error('Error generando token CSRF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando token de seguridad'
    });
  }
};

/**
 * Middleware para validar token CSRF en requests
 * Se aplica a rutas sensibles que modifican datos
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Middleware de cookie-parser requerido por csrf-csrf
 */
export const csrfCookieParser = cookieParser();

/**
 * Helper para crear mensaje de error CSRF personalizado
 */
export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('CSRF')) {
    console.warn(`⚠️ CSRF token inválido: ${req.method} ${req.path} desde IP ${req.ip}`);

    return res.status(403).json({
      success: false,
      message: 'Token de seguridad inválido o expirado. Por favor recarga la página.',
      code: 'CSRF_VALIDATION_FAILED',
      action: 'refresh_page'
    });
  }

  next(err);
};

/**
 * Lista de rutas que requieren protección CSRF
 * Solo rutas que modifican datos (POST, PUT, DELETE, PATCH)
 */
export const protectedRoutes = [
  // Autenticación crítica
  '/api/auth/change-password',
  '/api/auth/register',

  // Admin - Operaciones críticas
  '/api/admin/users/:id/status',
  '/api/admin/users',
  '/api/admin/templates',

  // Documentos - Operaciones de escritura
  '/api/documents/upload-xml',
  '/api/documents/assign',
  '/api/documents/:id/status',
  '/api/documents/bulk-delete',

  // Recepción - Entrega de documentos
  '/api/reception/entregar',
  '/api/archivo/entregar',

  // Formularios UAFE - Envío de datos
  '/api/formulario-uafe/protocolo',
  '/api/formulario-uafe/responder',
];

/**
 * Rutas excluidas de protección CSRF (solo lectura o públicas)
 */
export const excludedRoutes = [
  '/api/auth/login',           // Login no necesita CSRF (usa rate limiting)
  '/api/auth/verify',          // Solo verificación de token
  '/api/csrf-token',           // Endpoint para obtener token
  '/api/health',               // Health checks
  '/api/verify/*',             // Verificación pública de QR
  '/api/personal/verificar-cedula', // Verificación pública
];

export default {
  csrfProtection,
  csrfTokenGenerator,
  csrfCookieParser,
  csrfErrorHandler,
  protectedRoutes,
  excludedRoutes
};
