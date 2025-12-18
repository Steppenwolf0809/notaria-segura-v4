import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { validatePassword, sanitizePassword } from '../utils/password-validator.js';
import { sendSuccess, sendError, sendNotFound, sendConflict, sendPaginated, sanitizeResponse } from '../utils/http.js';
import {
  logAdminAction,
  logUserListAccess,
  extractRequestInfo,
  AuditEventTypes
} from '../utils/audit-logger.js';

/**
 * Roles válidos del sistema
 */
const validRoles = ['ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'];

/**
 * Obtiene todos los usuarios (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getAllUsers(req, res) {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const requestInfo = extractRequestInfo(req);

    // Log acceso a lista de usuarios
    logUserListAccess({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      filters: { page, limit, search, role, status }
    });

    // Construir filtros
    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role && validRoles.includes(role)) {
      where.role = role;
    }

    if (status !== undefined) {
      where.isActive = status === 'true';
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Obtener usuarios con paginación
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    return sendPaginated(res,
      sanitizeResponse(users, ['password']),
      {
        page: parseInt(page),
        limit: take,
        total: totalCount,
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    );

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return sendError(res);
  }
}

/**
 * Obtiene un usuario por ID (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const requestInfo = extractRequestInfo(req);

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Log acceso al usuario específico
    logAdminAction({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: user.id,
      targetEmail: user.email,
      action: AuditEventTypes.ADMIN_USER_VIEW,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Crea un nuevo usuario (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function createUser(req, res) {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const requestInfo = extractRequestInfo(req);

    // Validar campos obligatorios
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
        required: ['email', 'password', 'firstName', 'lastName', 'role']
      });
    }

    // Validar rol
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol no válido',
        validRoles
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email no válido'
      });
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      logAdminAction({
        adminUserId: req.user.id,
        adminEmail: req.user.email,
        targetUserId: null,
        targetEmail: email,
        action: AuditEventTypes.USER_CREATED,
        success: false,
        reason: 'Email ya existe',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      });

      return sendConflict(res, 'Ya existe un usuario con este email');
    }

    // Validar contraseña
    const sanitizedPassword = sanitizePassword(password);
    const passwordValidation = validatePassword(sanitizedPassword);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple los criterios de seguridad',
        errors: passwordValidation.errors,
        requirements: passwordValidation.requirements
      });
    }

    // hashear contraseña
    const hashedPassword = await bcrypt.hash(sanitizedPassword, 12);

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    // Log creación exitosa
    logAdminAction({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: newUser.id,
      targetEmail: newUser.email,
      action: AuditEventTypes.USER_CREATED,
      details: { role: newUser.role },
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: { user: newUser }
    });

  } catch (error) {
    console.error('Error creando usuario:', error);

    const requestInfo = extractRequestInfo(req);
    logAdminAction({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: null,
      targetEmail: req.body?.email || 'unknown',
      action: AuditEventTypes.USER_CREATED,
      success: false,
      reason: `Error interno: ${error.message}`,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Actualiza un usuario existente (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, password } = req.body;
    const requestInfo = extractRequestInfo(req);

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Preparar datos de actualización
    const updateData = {};

    if (email && email !== existingUser.email) {
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email no válido'
        });
      }

      // Verificar que el nuevo email no esté en uso
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un usuario con este email'
        });
      }

      updateData.email = email.toLowerCase();
    }

    if (firstName && firstName.trim() !== existingUser.firstName) {
      updateData.firstName = firstName.trim();
    }

    if (lastName && lastName.trim() !== existingUser.lastName) {
      updateData.lastName = lastName.trim();
    }

    if (role && role !== existingUser.role) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Rol no válido',
          validRoles
        });
      }
      updateData.role = role;
    }

    // Si se proporciona nueva contraseña
    if (password) {
      const sanitizedPassword = sanitizePassword(password);
      const passwordValidation = validatePassword(sanitizedPassword);

      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña no cumple los criterios de seguridad',
          errors: passwordValidation.errors
        });
      }

      updateData.password = await bcrypt.hash(sanitizedPassword, 12);
    }

    // Si no hay cambios
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay cambios para actualizar'
      });
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Log actualización
    logAdminAction({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: updatedUser.id,
      targetEmail: updatedUser.email,
      action: AuditEventTypes.USER_UPDATED,
      details: updateData,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { user: updatedUser, changes: updateData }
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Activa o desactiva un usuario (solo admin)
 * @param {Object} req - Request object  
 * @param {Object} res - Response object
 */
async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const requestInfo = extractRequestInfo(req);

    // Validar parámetros
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo isActive debe ser true o false'
      });
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Prevenir que admin se desactive a sí mismo
    if (user.id === req.user.id && !isActive) {
      logAdminAction({
        adminUserId: req.user.id,
        adminEmail: req.user.email,
        targetUserId: user.id,
        targetEmail: user.email,
        action: AuditEventTypes.USER_DEACTIVATED,
        success: false,
        reason: 'Admin intentó desactivarse a sí mismo',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      });

      return res.status(403).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    // Actualizar estado
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Log acción
    logAdminAction({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: updatedUser.id,
      targetEmail: updatedUser.email,
      action: isActive ? AuditEventTypes.USER_ACTIVATED : AuditEventTypes.USER_DEACTIVATED,
      details: { previousStatus: user.isActive, newStatus: isActive },
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    res.json({
      success: true,
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Error cambiando estado del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Elimina un usuario (solo admin) - HARD DELETE
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const requestInfo = extractRequestInfo(req);

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Prevenir que admin se elimine a sí mismo
    if (user.id === req.user.id) {
      logAdminAction({
        adminUserId: req.user.id,
        adminEmail: req.user.email,
        targetUserId: user.id,
        targetEmail: user.email,
        action: AuditEventTypes.USER_DELETED,
        success: false,
        reason: 'Admin intentó eliminarse a sí mismo',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      });

      return res.status(403).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    // Eliminar usuario
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    // Log eliminación
    logAdminAction({
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: user.id,
      targetEmail: user.email,
      action: AuditEventTypes.USER_DELETED,
      details: { deletedUser: { id: user.id, email: user.email, role: user.role } },
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent
    });

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: { deletedUserId: user.id, deletedUserEmail: user.email }
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene estadísticas de usuarios (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getUserStats(req, res) {
  try {
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    // Formatear estadísticas por rol
    const roleStats = {};
    validRoles.forEach(role => {
      const roleData = usersByRole.find(r => r.role === role);
      roleStats[role] = roleData ? roleData._count.role : 0;
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        roleStats,
        recentUsers
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

/**
 * Obtiene estadísticas generales del dashboard (solo admin)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDashboardStats(req, res) {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Definición de umbrales para alertas
    const stagnantThreshold = new Date(today);
    stagnantThreshold.setHours(today.getHours() - 48); // 48 horas sin procesar

    const uncollectedThreshold = new Date(today);
    uncollectedThreshold.setDate(today.getDate() - 7); // 7 días sin retirar

    const [
      totalDocuments,
      documentsByStatus,
      documentsByType,
      totalFacturado,
      creditNotesCount,
      recentActivity,
      stagnantDocuments,
      uncollectedDocuments
    ] = await Promise.all([
      // Total documentos
      prisma.document.count(),

      // Agrupados por estado
      prisma.document.groupBy({
        by: ['status'],
        _count: { status: true }
      }),

      // Agrupados por tipo
      prisma.document.groupBy({
        by: ['documentType'],
        _count: { documentType: true }
      }),

      // Total facturado (suma de totalFactura)
      prisma.document.aggregate({
        _sum: {
          totalFactura: true
        }
      }),

      // Notas de crédito (status = ANULADO_NOTA_CREDITO)
      prisma.document.count({
        where: { status: 'ANULADO_NOTA_CREDITO' }
      }),

      // Actividad reciente (últimos 7 días) - Simple conteo diario
      prisma.document.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        },
        select: {
          createdAt: true,
          status: true
        }
      }),

      // Alertas: Trámites estancados (>48h en PENDIENTE o EN_PROCESO)
      prisma.document.findMany({
        where: {
          status: { in: ['PENDIENTE', 'EN_PROCESO'] },
          createdAt: { lt: stagnantThreshold }
        },
        select: {
          id: true,
          protocolNumber: true,
          clientName: true,
          status: true,
          createdAt: true,
          documentType: true
        },
        orderBy: { createdAt: 'asc' },
        take: 20
      }),

      // Alertas: Trámites no retirados (>7 días en LISTO)
      prisma.document.findMany({
        where: {
          status: 'LISTO',
          updatedAt: { lt: uncollectedThreshold }
        },
        select: {
          id: true,
          protocolNumber: true,
          clientName: true,
          clientPhone: true,
          status: true,
          updatedAt: true, // Fecha en que pasó a LISTO
          documentType: true
        },
        orderBy: { updatedAt: 'asc' },
        take: 20
      })
    ]);

    // Procesar datos para gráficos
    const statsByStatus = {};
    documentsByStatus.forEach(d => {
      statsByStatus[d.status] = d._count.status;
    });

    const statsByType = {};
    documentsByType.forEach(d => {
      statsByType[d.documentType] = d._count.documentType;
    });

    // Procesar timeline de últimos 7 días
    const last7Days = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7Days[dateStr] = 0;
    }

    recentActivity.forEach(doc => {
      const dateStr = doc.createdAt.toISOString().split('T')[0];
      if (last7Days[dateStr] !== undefined) {
        last7Days[dateStr]++;
      }
    });

    const timelineData = Object.entries(last7Days)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: {
        kpis: {
          totalDocuments,
          totalFacturado: totalFacturado._sum.totalFactura || 0,
          creditNotesCount,
          pendingCount: (statsByStatus['PENDIENTE'] || 0) + (statsByStatus['EN_PROCESO'] || 0),
          readyCount: statsByStatus['LISTO'] || 0
        },
        charts: {
          byStatus: statsByStatus,
          byType: statsByType,
          timeline: timelineData
        },
        alerts: {
          stagnant: stagnantDocuments,
          uncollected: uncollectedDocuments
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener estadísticas'
    });
  }
}

export {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserStats,
  getDashboardStats
};
