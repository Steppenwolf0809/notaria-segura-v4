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
    const { page = 0, limit = 25, search, status, type, documentId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Construir filtros
    const where = {};
    
    // 🔒 CONTROL DE ACCESO POR ROL - Construir filtro base de documento
    let documentFilter = {};
    if (userRole === 'MATRIZADOR') {
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

    // Obtener notificaciones con paginación
    const [notifications, total] = await Promise.all([
      prisma.whatsAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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