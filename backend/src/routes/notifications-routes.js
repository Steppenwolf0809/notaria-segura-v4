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
 * @param {string} tab - 'pending' (LISTO con notificaciones PENDING) | 'reminders' (notificados hace +X días) | 'sent' (enviados)
 * @param {number} reminderDays - Días para considerar recordatorio (default: 3)
 */
router.get('/queue', authenticateToken, async (req, res) => {
  try {
    const { tab = 'pending', reminderDays = 3 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let documents = [];

    if (tab === 'pending') {
      // 📱 NUEVO: Por Notificar = Documentos LISTO con notificaciones en estado PENDING
      // Esto incluye notificaciones creadas automáticamente al marcar como LISTO

      // Primero obtener las notificaciones pendientes
      const pendingNotifications = await prisma.whatsAppNotification.findMany({
        where: {
          status: 'PENDING',
          messageType: 'DOCUMENTO_LISTO',
          document: {
            status: 'LISTO',
            // Filtro por rol
            ...(userRole === 'MATRIZADOR' || userRole === 'ARCHIVO'
              ? { assignedToId: userId }
              : {})
          }
        },
        include: {
          document: {
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
          }
        },
        orderBy: { createdAt: 'asc' } // FIFO: más antiguas primero
      });

      // Extraer documentos únicos (evitar duplicados si un documento tiene múltiples notificaciones)
      const seenDocIds = new Set();
      documents = pendingNotifications
        .filter(n => n.document && !seenDocIds.has(n.document.id))
        .map(n => {
          seenDocIds.add(n.document.id);
          return {
            ...n.document,
            notificacionId: n.id,
            notificacionStatus: n.status,
            notificacionCreatedAt: n.createdAt
          };
        });

      // También incluir documentos LISTO sin notificación (compatibilidad hacia atrás)
      const docIdsWithNotification = Array.from(seenDocIds);

      // Obtener IDs de documentos que tienen notificaciones DISMISSED (ya fueron ignorados)
      const dismissedNotifications = await prisma.whatsAppNotification.findMany({
        where: {
          status: 'DISMISSED',
          messageType: 'DOCUMENTO_LISTO'
        },
        select: { documentId: true }
      });
      const dismissedDocIds = dismissedNotifications.map(n => n.documentId).filter(Boolean);

      // Excluir tanto los que tienen notificación PENDING como los DISMISSED
      const excludeDocIds = [...docIdsWithNotification, ...dismissedDocIds];

      const docsWithoutNotification = await prisma.document.findMany({
        where: {
          status: 'LISTO',
          codigoRetiro: null, // Sin código = nunca notificado (flujo antiguo)
          id: { notIn: excludeDocIds },
          // Filtro por rol
          ...(userRole === 'MATRIZADOR' || userRole === 'ARCHIVO'
            ? { assignedToId: userId }
            : {})
        },
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
        },
        orderBy: { fechaListo: 'asc' }
      });

      documents = [...documents, ...docsWithoutNotification];

    } else if (tab === 'reminders') {
      // Para Recordar: LISTO + más de X días desde última notificación
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(reminderDays));

      documents = await prisma.document.findMany({
        where: {
          status: 'LISTO',
          codigoRetiro: { not: null },
          ultimoRecordatorio: { lt: cutoffDate },
          // Filtro por rol
          ...(userRole === 'MATRIZADOR' || userRole === 'ARCHIVO'
            ? { assignedToId: userId }
            : {})
        },
        orderBy: { ultimoRecordatorio: 'asc' },
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

    } else if (tab === 'sent') {
      // Enviados: Notificaciones marcadas como PREPARED o SENT recientemente
      const recentNotifications = await prisma.whatsAppNotification.findMany({
        where: {
          status: { in: ['PREPARED', 'SENT'] },
          messageType: 'DOCUMENTO_LISTO',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          },
          document: {
            status: { in: ['LISTO', 'ENTREGADO'] },
            // Filtro por rol
            ...(userRole === 'MATRIZADOR' || userRole === 'ARCHIVO'
              ? { assignedToId: userId }
              : {})
          }
        },
        include: {
          document: {
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
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Extraer documentos únicos
      const seenDocIds = new Set();
      documents = recentNotifications
        .filter(n => n.document && !seenDocIds.has(n.document.id))
        .map(n => {
          seenDocIds.add(n.document.id);
          return {
            ...n.document,
            notificacionId: n.id,
            notificacionStatus: n.status,
            notificacionSentAt: n.sentAt
          };
        });
    }

    console.log(`📱 Queue (${tab}): ${documents.length} documents found for ${userRole}`);

    // 🔄 NUEVO: Calcular estadísticas por cliente para mostrar totales
    const clientStats = {};
    if (tab === 'pending' && documents.length > 0) {
      // Extraer teléfonos únicos
      const clientPhones = [...new Set(documents.filter(d => d.clientPhone).map(d => d.clientPhone.trim()))];
      
      // Para cada cliente, contar documentos LISTO totales
      for (const phone of clientPhones) {
        const totalListo = await prisma.document.count({
          where: {
            clientPhone: phone,
            status: 'LISTO',
            // Filtro por rol
            ...(userRole === 'MATRIZADOR' || userRole === 'ARCHIVO'
              ? { assignedToId: userId }
              : {})
          }
        });
        
        const pendingCount = documents.filter(d => d.clientPhone === phone).length;
        
        clientStats[phone] = {
          totalListo,
          withPendingNotification: pendingCount,
          alreadyNotified: totalListo - pendingCount
        };
      }
    }

    res.json({
      success: true,
      data: documents,
      count: documents.length,
      tab,
      clientStats: Object.keys(clientStats).length > 0 ? clientStats : undefined
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
 * Ignorar/Descartar notificaciones pendientes
 * PUT /notifications/dismiss
 * @body {string[]} documentIds - IDs de documentos cuyas notificaciones se ignorarán
 * @body {string} reason - Razón opcional para ignorar (ej: "Cliente contactado por otro medio")
 *
 * Maneja dos casos:
 * 1. Documentos con WhatsAppNotification PENDING → actualiza status a DISMISSED
 * 2. Documentos sin notificación (flujo antiguo) → marca notificacionIgnorada en documento
 */
router.put('/dismiss', authenticateToken, async (req, res) => {
  try {
    const { documentIds, reason = 'Notificación ignorada manualmente' } = req.body;
    const userId = req.user.id;
    const userName = `${req.user.firstName} ${req.user.lastName}`;

    // Validaciones
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un ID de documento'
      });
    }

    // Verificar que los documentos existen
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, protocolNumber: true, clientName: true, codigoRetiro: true }
    });

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron documentos con los IDs proporcionados'
      });
    }

    let dismissedNotifications = 0;
    let dismissedDocuments = 0;

    // 1. Buscar y actualizar notificaciones PENDING existentes
    const pendingNotifications = await prisma.whatsAppNotification.findMany({
      where: {
        documentId: { in: documentIds },
        status: 'PENDING'
      },
      include: {
        document: {
          select: { protocolNumber: true, clientName: true }
        }
      }
    });

    if (pendingNotifications.length > 0) {
      const notificationIds = pendingNotifications.map(n => n.id);
      await prisma.whatsAppNotification.updateMany({
        where: { id: { in: notificationIds } },
        data: {
          status: 'DISMISSED',
          errorMessage: `${reason} - Por ${userName}`
        }
      });
      dismissedNotifications = pendingNotifications.length;

      // Registrar evento de auditoría para notificaciones
      for (const notification of pendingNotifications) {
        await prisma.documentEvent.create({
          data: {
            documentId: notification.documentId,
            userId: userId,
            eventType: 'NOTIFICATION_DISMISSED',
            description: `Notificación WhatsApp ignorada por ${userName}`,
            details: JSON.stringify({
              notificacionId: notification.id,
              razon: reason,
              codigoRetiro: notification.document?.codigoRetiro,
              timestamp: new Date().toISOString()
            })
          }
        });
      }
    }

    // 2. Para documentos sin notificación PENDING, crear una notificación DISMISSED
    // (para que no aparezcan más en la cola de "Por Notificar")
    const docIdsWithNotification = pendingNotifications.map(n => n.documentId);
    const docsWithoutNotification = documents.filter(d => !docIdsWithNotification.includes(d.id));

    if (docsWithoutNotification.length > 0) {
      // Obtener los teléfonos de los documentos
      const docsWithPhone = await prisma.document.findMany({
        where: { id: { in: docsWithoutNotification.map(d => d.id) } },
        select: { id: true, clientPhone: true }
      });
      const phoneMap = docsWithPhone.reduce((acc, d) => {
        acc[d.id] = d.clientPhone;
        return acc;
      }, {});

      for (const doc of docsWithoutNotification) {
        // Crear notificación DISMISSED para marcar que fue ignorado
        await prisma.whatsAppNotification.create({
          data: {
            documentId: doc.id,
            messageType: 'DOCUMENTO_LISTO',
            status: 'DISMISSED',
            errorMessage: `${reason} - Por ${userName}`,
            clientName: doc.clientName,
            clientPhone: phoneMap[doc.id] || 'N/A',
            messageBody: 'Notificación ignorada sin enviar'
          }
        });

        // Registrar evento de auditoría
        await prisma.documentEvent.create({
          data: {
            documentId: doc.id,
            userId: userId,
            eventType: 'NOTIFICATION_DISMISSED',
            description: `Notificación ignorada por ${userName} (sin enviar)`,
            details: JSON.stringify({
              razon: reason,
              codigoRetiro: doc.codigoRetiro,
              timestamp: new Date().toISOString()
            })
          }
        });
      }
      dismissedDocuments = docsWithoutNotification.length;
    }

    const totalDismissed = dismissedNotifications + dismissedDocuments;
    console.log(`🔕 Ignoradas: ${dismissedNotifications} notificaciones + ${dismissedDocuments} documentos sin notificación, por ${userName}`);

    res.json({
      success: true,
      message: `${totalDismissed} notificación(es) ignorada(s)`,
      data: {
        dismissedCount: totalDismissed,
        dismissedNotifications,
        dismissedDocuments,
        reason: reason
      }
    });

  } catch (error) {
    console.error('Error ignorando notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al ignorar notificaciones'
    });
  }
});

/**
 * Marcar notificación como enviada (después de abrir WhatsApp)
 * PUT /notifications/mark-sent
 * @body {string[]} documentIds - IDs de documentos cuyas notificaciones se marcarán como enviadas
 */
router.put('/mark-sent', authenticateToken, async (req, res) => {
  try {
    const { documentIds } = req.body;
    const userId = req.user.id;
    const userName = `${req.user.firstName} ${req.user.lastName}`;
    const now = new Date();

    // Validaciones
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un ID de documento'
      });
    }

    // Obtener notificaciones pendientes de estos documentos
    const pendingNotifications = await prisma.whatsAppNotification.findMany({
      where: {
        documentId: { in: documentIds },
        status: { in: ['PENDING', 'PREPARED'] }
      }
    });

    if (pendingNotifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron notificaciones pendientes para estos documentos'
      });
    }

    // Actualizar notificaciones a SENT
    const notificationIds = pendingNotifications.map(n => n.id);
    await prisma.whatsAppNotification.updateMany({
      where: { id: { in: notificationIds } },
      data: {
        status: 'PREPARED', // PREPARED = WhatsApp abierto pero no confirmado
        sentAt: now
      }
    });

    // Actualizar ultimoRecordatorio en los documentos
    await prisma.document.updateMany({
      where: { id: { in: documentIds } },
      data: { ultimoRecordatorio: now }
    });

    // Registrar evento de auditoría para cada documento
    for (const notification of pendingNotifications) {
      await prisma.documentEvent.create({
        data: {
          documentId: notification.documentId,
          userId: userId,
          eventType: 'WHATSAPP_SENT',
          description: `Notificación WhatsApp enviada por ${userName}`,
          details: JSON.stringify({
            notificacionId: notification.id,
            timestamp: now.toISOString()
          })
        }
      });
    }

    console.log(`📤 ${pendingNotifications.length} notificaciones marcadas como enviadas por ${userName}`);

    res.json({
      success: true,
      message: `${pendingNotifications.length} notificación(es) marcada(s) como enviada(s)`,
      data: {
        sentCount: pendingNotifications.length
      }
    });

  } catch (error) {
    console.error('Error marcando notificaciones como enviadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones como enviadas'
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
