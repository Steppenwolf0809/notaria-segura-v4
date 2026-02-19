import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { persistAuditLog } from '../utils/audit-log-store.js';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

function createAuthError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readRequestedNotaryId(req) {
  const fromHeader = typeof req.headers['x-notary-id'] === 'string'
    ? req.headers['x-notary-id'].trim()
    : '';
  const fromQuery = typeof req.query?.notaryId === 'string'
    ? req.query.notaryId.trim()
    : '';
  const fromBody = typeof req.body?.notaryId === 'string'
    ? req.body.notaryId.trim()
    : '';

  return fromHeader || fromQuery || fromBody || null;
}

function readRequestAuditInfo(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null
  };
}

async function auditSuperAdminTenantContextSwitch(req, user, tenantContext) {
  if (!tenantContext?.isSuperAdmin) {
    return;
  }

  if (tenantContext.resolutionSource !== 'request') {
    return;
  }

  if (!tenantContext.notaryId) {
    return;
  }

  const { ipAddress, userAgent } = readRequestAuditInfo(req);

  await persistAuditLog({
    prismaClient: prisma,
    tenantContext,
    notaryId: tenantContext.notaryId,
    actorUserId: user.id,
    actorRole: user.role,
    action: 'SUPER_ADMIN_TENANT_CONTEXT_SWITCH',
    resourceType: 'tenant_context',
    resourceId: tenantContext.notaryId,
    metadata: {
      requestedNotaryId: tenantContext.requestedNotaryId || null,
      notaryCode: tenantContext.notaryCode || null,
      notarySlug: tenantContext.notarySlug || null,
      resolutionSource: tenantContext.resolutionSource,
      method: req.method,
      path: req.originalUrl || req.url
    },
    ipAddress,
    userAgent,
    failOpen: false
  });
}

async function resolveTenantContext(user, req) {
  const isSuperAdmin = user.role === SUPER_ADMIN_ROLE;
  const requestedNotaryId = readRequestedNotaryId(req);
  let resolvedNotary = user.notary || null;

  if (isSuperAdmin && requestedNotaryId) {
    resolvedNotary = await prisma.notary.findFirst({
      where: {
        id: requestedNotaryId,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        code: true,
        slug: true
      }
    });

    if (!resolvedNotary) {
      throw createAuthError(403, 'No existe una notaria activa para el contexto solicitado');
    }
  }

  if (!isSuperAdmin) {
    if (!user.notaryId) {
      throw createAuthError(403, 'Usuario sin notaria asignada');
    }

    if (!resolvedNotary || !resolvedNotary.isActive || resolvedNotary.deletedAt) {
      throw createAuthError(403, 'La notaria asignada al usuario no esta activa');
    }
  }

  return {
    isSuperAdmin,
    requestedNotaryId,
    notaryId: resolvedNotary?.id || null,
    notaryCode: resolvedNotary?.code || null,
    notarySlug: resolvedNotary?.slug || null,
    resolutionSource: isSuperAdmin
      ? (requestedNotaryId ? 'request' : 'user-default')
      : 'user-assignment'
  };
}

/**
 * Middleware para verificar token JWT
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario existe y esta activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        deletedAt: true,
        notaryId: true,
        clerkUserId: true,
        notary: {
          select: {
            id: true,
            code: true,
            slug: true,
            isActive: true,
            deletedAt: true
          }
        }
      }
    });

    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Token invalido o usuario desactivado'
      });
    }

    const tenantContext = await resolveTenantContext(user, req);
    await auditSuperAdminTenantContextSwitch(req, user, tenantContext);

    // Agregar informacion del usuario al request (incluye nombres para auditoria)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      clerkUserId: user.clerkUserId,
      notaryId: user.notaryId,
      isSuperAdmin: tenantContext.isSuperAdmin,
      activeNotaryId: tenantContext.notaryId,
      activeNotaryCode: tenantContext.notaryCode,
      activeNotarySlug: tenantContext.notarySlug
    };

    req.tenantContext = tenantContext;

    if (tenantContext.notaryId) {
      res.setHeader('x-tenant-notary-id', tenantContext.notaryId);
    }

    next();

  } catch (error) {
    console.error('Error en autenticacion:', error);

    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Middleware para verificar roles especificos
 * @param {Array} allowedRoles - Roles permitidos
 * @returns {Function} Middleware function
 */
function requireRoles(allowedRoles) {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;

      if (userRole === SUPER_ADMIN_ROLE) {
        return next();
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso'
        });
      }

      next();

    } catch (error) {
      console.error('Error verificando roles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
}

/**
 * Middleware para verificar que el usuario es ADMIN
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireAdmin(req, res, next) {
  return requireRoles(['ADMIN', SUPER_ADMIN_ROLE])(req, res, next);
}

/**
 * Middleware para verificar que el usuario es ADMIN o CAJA
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireAdminOrCaja(req, res, next) {
  return requireRoles(['ADMIN', 'CAJA', SUPER_ADMIN_ROLE])(req, res, next);
}

/**
 * Middleware para verificar que el usuario es RECEPCION
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireRecepcion(req, res, next) {
  return requireRoles(['RECEPCION'])(req, res, next);
}

/**
 * Middleware para verificar que el usuario es MATRIZADOR
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireMatrizador(req, res, next) {
  return requireRoles(['MATRIZADOR'])(req, res, next);
}

/**
 * Middleware para verificar que el usuario es ARCHIVO
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireArchivo(req, res, next) {
  return requireRoles(['ARCHIVO'])(req, res, next);
}

export {
  authenticateToken,
  requireRoles,
  requireAdmin,
  requireAdminOrCaja,
  requireRecepcion,
  requireMatrizador,
  requireArchivo
};
