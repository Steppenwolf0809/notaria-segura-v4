import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import tenantStorage from './tenant-context.js';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware para verificar token JWT propio y cargar usuario local
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no registrado en el sistema'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario desactivado'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      notaryId: user.notaryId || null,
      isOnboarded: user.isOnboarded
    };

    const notaryId = user.notaryId || null;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    tenantStorage.run({ notaryId, isSuperAdmin }, () => next());

  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Middleware para verificar que el usuario tiene rol asignado (onboarded)
 */
function requireOnboarded(req, res, next) {
  if (!req.user.isOnboarded || !req.user.role) {
    return res.status(403).json({
      success: false,
      message: 'Tu cuenta está pendiente de aprobación por el administrador',
      code: 'PENDING_APPROVAL'
    });
  }
  next();
}

/**
 * Middleware para verificar roles específicos
 * SUPER_ADMIN siempre tiene acceso
 */
function requireRoles(allowedRoles) {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;

      if (userRole === 'SUPER_ADMIN') {
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

function requireAdmin(req, res, next) {
  return requireRoles(['ADMIN'])(req, res, next);
}

function requireAdminOrCaja(req, res, next) {
  return requireRoles(['ADMIN', 'CAJA'])(req, res, next);
}

function requireRecepcion(req, res, next) {
  return requireRoles(['RECEPCION'])(req, res, next);
}

function requireMatrizador(req, res, next) {
  return requireRoles(['MATRIZADOR'])(req, res, next);
}

function requireArchivo(req, res, next) {
  return requireRoles(['ARCHIVO'])(req, res, next);
}

export {
  authenticateToken,
  requireOnboarded,
  requireRoles,
  requireAdmin,
  requireAdminOrCaja,
  requireRecepcion,
  requireMatrizador,
  requireArchivo
};
