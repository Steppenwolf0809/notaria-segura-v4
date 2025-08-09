import jwt from 'jsonwebtoken';
import prisma from '../db.js';

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
    
    // Verificar que el usuario existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o usuario desactivado'
      });
    }

    // Agregar información del usuario al request (incluye nombres para auditoría)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();

  } catch (error) {
    console.error('Error en autenticación:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Middleware para verificar roles específicos
 * @param {Array} allowedRoles - Roles permitidos
 * @returns {Function} Middleware function
 */
function requireRoles(allowedRoles) {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      
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
  return requireRoles(['ADMIN'])(req, res, next);
}

/**
 * Middleware para verificar que el usuario es ADMIN o CAJA
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireAdminOrCaja(req, res, next) {
  return requireRoles(['ADMIN', 'CAJA'])(req, res, next);
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