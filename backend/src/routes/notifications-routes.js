import express from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth-middleware.js';

const router = express.Router();

/**
 * Obtener historial de notificaciones WhatsApp
 * GET /notifications
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 0, limit = 25, search, status, type, documentId, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Construir filtros
    const where = {};

    // 🔒 CONTROL DE ACCESO POR ROL - Construir filtro base de documento
    let documentFilter = {};
    if (userRole === 'MATRIZADOR') {
      documentFilter.assignedToId = userId;
    } else if (userRole === 'ARCHIVO') {
      // ARCHIVO debe ver solo notificaciones de sus documentos (mismo criterio que matrizador)
      documentFilter.assignedToId = userId;
    } else if (userRole === 'CAJA') {
      documentFilter.createdById = userId;
    } else if (userRole === 'RECEPCION') {
      // 🔄 CONSERVADOR: Recepción puede ver notificaciones de documentos en cualquier estado
      // desde EN_PROCESO hacia adelante (cuando comienzan a ser relevantes para recepción)
      documentFilter.status = { in: ['EN_PROCESO', 'LISTO', 'ENTREGADO'] };
    }

    // Aplicar filtro de documento solo si hay restricciones por rol
    if (Object.keys(documentFilter).length > 0) {
      where.document = documentFilter;
    }

    console.log('🔍 DEBUG: Filtro aplicado para', userRole, ':', where);

    // Filtros adicionales
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search } },
        { messageBody: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.messageType = type;
    }

    // Filtro específico por documento
    if (documentId) {
      where.documentId = documentId;
    }

    // Filtros por fecha (createdAt)
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Obtener notificaciones con paginación
    // Mapear campo de orden permitido
    const mapSortField = (field) => {
      switch ((field || '').toString()) {
        case 'clientName': return 'clientName';
        case 'createdAt': return 'createdAt';
        case 'sentAt': return 'sentAt';
        default: return 'createdAt';
      }
    };
    const mappedSortField = mapSortField(sortBy);
    const mappedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [notifications, total] = await Promise.all([
      prisma.whatsAppNotification.findMany({
        where,
        orderBy: { [mappedSortField]: mappedSortOrder },
        skip: parseInt(page) * parseInt(limit),
        take: parseInt(limit),
        include: {
          document: {
            select: {
              id: true,
              protocolNumber: true,
              documentType: true,
              status: true,
              clientName: true,
              clientPhone: true,
              assignedToId: true,
              createdById: true
            }
          }
        }
      }),
      prisma.whatsAppNotification.count({ where })
    ]);

    // Estadísticas rápidas (con mismo filtro que las notificaciones)
    const stats = await prisma.whatsAppNotification.groupBy({
      by: ['status'],
      where,
      _count: true
    });

    const statsObject = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        stats: {
          total,
          sent: statsObject.SENT || 0,
          failed: statsObject.FAILED || 0,
          simulated: statsObject.SIMULATED || 0,
          pending: statsObject.PENDING || 0
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * Obtener cola de notificaciones pendientes (para Notification Center)
 * GET /notifications/queue
 * @param {string} tab - 'pending' (LISTO no notificados) | 'reminders' (notificados hace +X días) | 'sent' (enviados)
 * @param {number} reminderDays - Días para considerar recordatorio (default: 3)
 */
router.get('/queue', authenticateToken, async (req, res) => {
  try {
    const { tab = 'pending', reminderDays = 3 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Construir filtro base
    let whereClause = {};

    if (tab === 'pending') {
      // Por Notificar: LISTO o LISTO_ENTREGA (nunca notificados o sin código)
      whereClause.status = { in: ['LISTO', 'LISTO_ENTREGA'] };
      whereClause.codigoRetiro = null; // Sin código = nunca notificado
    } else if (tab === 'reminders') {
      // Para Recordar: CLIENTE_NOTIFICADO + más de X días desde última notificación
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(reminderDays));

      whereClause.status = 'CLIENTE_NOTIFICADO';
      whereClause.ultimoRecordatorio = { lt: cutoffDate };
    } else if (tab === 'sent') {
      // Enviados: Documentos con código de retiro generado (notificados recientemente)
      whereClause.status = { in: ['LISTO', 'EN_PROCESO', 'CLIENTE_NOTIFICADO'] };
      whereClause.codigoRetiro = { isNot: null };
      whereClause.ultimoRecordatorio = { isNot: null };
    }

    // Filtro por rol: MATRIZADOR y ARCHIVO solo ven sus documentos
    if (userRole === 'MATRIZADOR' || userRole === 'ARCHIVO') {
      whereClause.assignedToId = userId;
    }
    // ADMIN y RECEPCION ven todos
    // CAJA no debería acceder a esta ruta (handled by frontend)

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: tab === 'sent'
        ? { ultimoRecordatorio: 'desc' } // Más recientes primero para enviados
        : { fechaListo: 'asc' }, // FIFO: más antiguos primero para pendientes
      select: {
        id: true,
        protocolNumber: true,
        documentType: true,
        actoPrincipalDescripcion: true,
        status: true,
        clientName: true,
        clientPhone: true,
        clientId: true,
        clientEmail: true,
        codigoRetiro: true,
        fechaListo: true,
        ultimoRecordatorio: true,
        createdAt: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log(`📱 Queue (${tab}): ${documents.length} documents found for ${userRole}`);

    res.json({
      success: true,
      data: documents,
      count: documents.length,
      tab
    });

  } catch (error) {
    console.error('Error obteniendo cola de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cargar cola de notificaciones'
    });
  }
});

/**
 * Actualizar teléfono de cliente en documentos
 * PUT /notifications/update-phone
 * @body {string[]} documentIds - IDs de documentos a actualizar
 * @body {string} clientPhone - Nuevo teléfono
 */
router.put('/update-phone', authenticateToken, async (req, res) => {
  try {
    const { documentIds, clientPhone } = req.body;
    const userId = req.user.id;
    const userName = `${req.user.firstName} ${req.user.lastName}`;

    // Validaciones
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un ID de documento'
      });
    }

    if (!clientPhone || !clientPhone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono es obligatorio'
      });
    }

    const cleanPhone = clientPhone.trim();

    // Obtener documentos antes de actualizar (para auditoría)
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, clientPhone: true, protocolNumber: true }
    });

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron documentos'
      });
    }

    // Actualizar teléfono
    await prisma.document.updateMany({
      where: { id: { in: documentIds } },
      data: { clientPhone: cleanPhone }
    });

    // Registrar evento de auditoría para cada documento
    for (const doc of documents) {
      await prisma.documentEvent.create({
        data: {
          documentId: doc.id,
          userId: userId,
          eventType: 'PHONE_UPDATED',
          description: `Teléfono actualizado por ${userName}`,
          details: JSON.stringify({
            telefonoAnterior: doc.clientPhone || '(vacío)',
            telefonoNuevo: cleanPhone,
            timestamp: new Date().toISOString()
          })
        }
      });
    }

    console.log(`📱 Teléfono actualizado para ${documents.length} documentos: ${cleanPhone}`);

    res.json({
      success: true,
      message: `Teléfono actualizado para ${documents.length} documento(s)`,
      data: {
        updatedCount: documents.length,
        newPhone: cleanPhone
      }
    });

  } catch (error) {
    console.error('Error actualizando teléfono:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar teléfono'
    });
  }
});

/**
 * Obtener estadísticas de notificaciones
 * GET /notifications/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await prisma.whatsAppNotification.groupBy({
      by: ['status', 'messageType'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });

    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(createdAt) as date,
        status,
        COUNT(*) as count
      FROM whatsapp_notifications 
      WHERE createdAt >= ${startDate.toISOString()}
      GROUP BY DATE(createdAt), status
      ORDER BY date DESC
    `;

    res.json({
      success: true,
      data: {
        byStatus: stats,
        daily: dailyStats,
        period: { days: parseInt(days), from: startDate }
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;
