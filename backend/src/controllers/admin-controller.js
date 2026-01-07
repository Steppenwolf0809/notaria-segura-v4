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
 * Obtiene estadísticas de supervisión del dashboard (Modo Supervisión)
 * Soporta filtros: thresholdDays, matrixerId, startDate, endDate
 */
async function getDashboardStats(req, res) {
  try {
    const {
      thresholdDays = 15,
      matrixerId,
      startDate,
      endDate,
      status, // Nuevo filtro de estado
      page = 1, // Paginación
      limit = 20, // Paginación
      billedTimeRange = 'current_month' // Filtro para KPI de facturación
    } = req.query;

    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() - parseInt(thresholdDays));

    // Filtros de fecha base
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Filtro de matrizador
    const matrixerFilter = matrixerId ? { assignedToId: parseInt(matrixerId) } : {};

    // 1. KPIs Generales
    // Total Activos (No entregados ni anulados)
    const activeCount = await prisma.document.count({
      where: {
        status: { notIn: ['ENTREGADO', 'ANULADO_NOTA_CREDITO'] },
        ...dateFilter,
        ...matrixerFilter
      }
    });

    // Críticos (> threshold días)
    const criticalCount = await prisma.document.count({
      where: {
        status: { notIn: ['ENTREGADO', 'ANULADO_NOTA_CREDITO'] },
        createdAt: { lt: thresholdDate },
        ...matrixerFilter
      }
    });

    // KPI: Total Facturado
    // Definir rango de tiempo para facturación
    const billedDateFilter = {};
    const now = new Date();
    let startBilledDate = new Date();

    switch (billedTimeRange) {
      case 'current_month':
        startBilledDate = new Date(now.getFullYear(), now.getMonth(), 1);
        billedDateFilter.createdAt = { gte: startBilledDate };
        break;
      case 'last_month':
        startBilledDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endBilledDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        billedDateFilter.createdAt = { gte: startBilledDate, lte: endBilledDate };
        break;
      case 'year_to_date':
        startBilledDate = new Date(now.getFullYear(), 0, 1);
        billedDateFilter.createdAt = { gte: startBilledDate };
        break;
      case 'all_time':
        // No filter
        break;
      default: // current_month default
        startBilledDate = new Date(now.getFullYear(), now.getMonth(), 1);
        billedDateFilter.createdAt = { gte: startBilledDate };
    }

    // Calcular suma de totalFactura (excluyendo anulados)
    const billedAggregate = await prisma.document.aggregate({
      _sum: {
        totalFactura: true
      },
      where: {
        status: { not: 'ANULADO_NOTA_CREDITO' },
        ...billedDateFilter,
        ...matrixerFilter // Aplicar filtro de matrizador si está seleccionado
      }
    });

    const totalBilled = billedAggregate._sum.totalFactura || 0;


    // Eficiencia Semanal (Entregados vs Ingresados esta semana)
    const startOfWeek = new Date();
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const createdThisWeek = await prisma.document.count({
      where: {
        createdAt: { gte: startOfWeek },
        ...matrixerFilter
      }
    });

    const deliveredThisWeek = await prisma.document.count({
      where: {
        status: 'ENTREGADO',
        updatedAt: { gte: startOfWeek },
        ...matrixerFilter
      }
    });

    const weeklyEfficiency = createdThisWeek > 0
      ? Math.round((deliveredThisWeek / createdThisWeek) * 100)
      : 0;

    // 2. Lista de Alertas / Documentos con filtros
    // Filtro base: activos (no entregados, no anulados) y warnngThreshold para atrás
    // PERO el usuario pidió filtro por ESTADO, así que si hay status param, respetamos ese status
    // Si NO hay status, mantenemos la lógica de alertas (antiguos)

    const docWhere = { ...matrixerFilter };

    // Si el usuario filtra por estado específico
    if (status && status !== '') {
      docWhere.status = status;
    } else {
      // Comportamiento por defecto: Mostrar alertas (no entregados, no anulados)
      docWhere.status = { notIn: ['ENTREGADO', 'ANULADO_NOTA_CREDITO'] };

      // Si estamos en modo "Alertas Críticas" (sin filtro de estado explícito), 
      // ¿deberíamos filtrar solo los viejos?
      // El requerimiento dice "agregar un filtro por estado".
      // Y también "no muestre tantos documentos de golpe".
      // Mantengamos la vista de "Alertas" por defecto mostrando SOLO los retrasados si no hay filtro activo.
      // Si hay filtro activo, mostramos todos los de ese estado.

      const warningThresholdDate = new Date();
      warningThresholdDate.setDate(today.getDate() - 10);
      docWhere.createdAt = { lt: warningThresholdDate };
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [criticalDocs, totalDocs] = await Promise.all([
      prisma.document.findMany({
        where: docWhere,
        include: {
          assignedTo: {
            select: { firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'asc' }, // Los más antiguos primero (prioridad atención)
        skip,
        take
      }),
      prisma.document.count({ where: docWhere })
    ]);

    const hasMore = skip + take < totalDocs;

    // 3. Rendimiento de Equipo
    const teamWhere = { role: 'MATRIZADOR', isActive: true };
    if (matrixerId) teamWhere.id = parseInt(matrixerId);

    const matrizadores = await prisma.user.findMany({
      where: teamWhere,
      select: { id: true, firstName: true, lastName: true }
    });

    const loadGroup = await prisma.document.groupBy({
      by: ['assignedToId'],
      where: {
        status: { notIn: ['ENTREGADO', 'ANULADO_NOTA_CREDITO'] },
        assignedToId: { in: matrizadores.map(m => m.id) }
      },
      _count: { _all: true }
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const teamPerformance = await Promise.all(matrizadores.map(async (m) => {
      const load = loadGroup.find(g => g.assignedToId === m.id)?._count._all || 0;

      const criticals = await prisma.document.count({
        where: {
          assignedToId: m.id,
          status: { notIn: ['ENTREGADO', 'ANULADO_NOTA_CREDITO'] },
          createdAt: { lt: thresholdDate }
        }
      });

      const deliveredMonth = await prisma.document.count({
        where: {
          assignedToId: m.id,
          status: 'ENTREGADO',
          updatedAt: { gte: startOfMonth }
        }
      });

      const recentDeliveries = await prisma.document.findMany({
        where: {
          assignedToId: m.id,
          status: 'ENTREGADO',
          updatedAt: { gte: startOfMonth }
        },
        select: { createdAt: true, updatedAt: true },
        take: 10,
        orderBy: { updatedAt: 'desc' }
      });

      let avgDays = 0;
      if (recentDeliveries.length > 0) {
        const totalTime = recentDeliveries.reduce((acc, doc) => {
          return acc + (new Date(doc.updatedAt) - new Date(doc.createdAt));
        }, 0);
        avgDays = Math.round(totalTime / recentDeliveries.length / (1000 * 60 * 60 * 24));
      }

      return {
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        activeLoad: load,
        criticalCount: criticals,
        deliveredMonth,
        avgVelocityDays: avgDays
      };
    }));

    console.log('Dashboard Stats Debug:', {
      activeCount,
      criticalCount,
      totalBilled,
      teamPerformanceLength: teamPerformance.length,
      matrizadoresLength: matrizadores.length,
      filters: {
        dateFilter,
        matrixerFilter,
        billedDateFilter
      }
    });

    res.json({
      success: true,
      data: {
        kpis: {
          activeCount,
          criticalCount,
          weeklyEfficiency,
          totalBilled // Nuevo KPI
        },
        criticalList: criticalDocs.map(doc => ({
          id: doc.id,
          protocol: doc.protocolNumber,
          client: doc.clientName,
          type: doc.documentType,
          matrixer: doc.assignedTo ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}` : 'Sin asignar',
          createdAt: doc.createdAt,
          daysDelayed: Math.floor((new Date() - new Date(doc.createdAt)) / (1000 * 60 * 60 * 24)),
          status: doc.status
        })),
        pagination: {
          page: parseInt(page),
          hasMore,
          total: totalDocs
        },
        teamPerformance
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al obtener estadísticas de supervisión'
    });
  }
}


/**
 * Obtener lista completa de Personas Registradas (Base de datos UAFE)
 * GET /api/admin/personas-registradas
 * Requiere: Role ADMIN
 */
async function getPersonasRegistradas(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const where = {};
    if (search) {
      where.OR = [
        { cedula: { contains: search } }
      ];
    }

    const total = await prisma.personaRegistrada.count({ where });
    const personas = await prisma.personaRegistrada.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Mapear para facilitar lectura en frontend
    const personasMapped = personas.map(p => {
      let nombre = 'Sin Nombre';
      if (p.tipoPersona === 'NATURAL' && p.datosPersonaNatural) {
        const d = p.datosPersonaNatural;
        if (d && d.datosPersonales) {
          nombre = `${d.datosPersonales.nombres || ''} ${d.datosPersonales.apellidos || ''}`.trim();
        }
      } else if (p.tipoPersona === 'JURIDICA' && p.datosPersonaJuridica) {
        const d = p.datosPersonaJuridica;
        if (d && d.compania) {
          nombre = d.compania.razonSocial || 'Sin Razón Social';
        }
      }
      return { ...p, nombre };
    });

    sendPaginated(res, personasMapped, page, limit, total);
  } catch (error) {
    console.error('Error getting personas registradas:', error);
    sendError(res, error, 'Error al listar personas registradas');
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
  getDashboardStats,
  getPersonasRegistradas
};
