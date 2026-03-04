import { clerkClient, verifyToken } from '@clerk/express';
import prisma from '../db.js';

async function resolveUserNotaryId(userId) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT "notary_id"::text AS "notaryId"
      FROM "users"
      WHERE "id" = ${userId}
      LIMIT 1
    `;
    return rows?.[0]?.notaryId || null;
  } catch {
    return null;
  }
}

/**
 * Middleware para verificar token JWT de Clerk y cargar usuario local
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

    // Verificar token con Clerk
    let clerkPayload;
    try {
      clerkPayload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    const clerkUserId = clerkPayload.sub;

    // Buscar usuario local por clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId }
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

    // Agregar información del usuario al request
    const notaryId = await resolveUserNotaryId(user.id);
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperAdmin,
      notaryId,
      activeNotaryId: notaryId,
      isOnboarded: user.isOnboarded
    };

    next();

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

      // SUPER_ADMIN siempre tiene acceso
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
