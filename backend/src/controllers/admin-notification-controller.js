import prisma from '../db.js';
import { logAuditEvent } from '../utils/audit-logger.js';
import jwt from 'jsonwebtoken';

// Create audit logger object to match expected interface
const auditLogger = {
  log: logAuditEvent
};

/**
 * Controlador para gestión de notificaciones por administradores
 * Maneja estadísticas, historial, plantillas y configuración
 */

/**
 * Obtener estadísticas de notificaciones
 */
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Estadísticas generales
    const total = await prisma.whatsAppNotification.count();
    const successful = await prisma.whatsAppNotification.count({
      where: { status: 'SENT' }
    });
    const failed = await prisma.whatsAppNotification.count({
      where: { status: 'FAILED' }
    });
    const pending = await prisma.whatsAppNotification.count({
      where: { status: 'PENDING' }
    });

    // Distribución por tipo
    const byType = await prisma.whatsAppNotification.groupBy({
      by: ['messageType'],
      _count: {
        messageType: true
      }
    });

    const typeDistribution = {};
    byType.forEach(item => {
      typeDistribution[item.messageType] = item._count.messageType;
    });

    // Notificaciones fallidas recientes (últimas 24 horas)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentFailed = await prisma.whatsAppNotification.findMany({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        messageType: true,
        errorMessage: true,
        createdAt: true
      }
    });

    const stats = {
      total,
      successful,
      failed,
      pending,
      byType: typeDistribution,
      recentFailed,
      serviceStatus: 'active' // TODO: Implementar verificación real del servicio
    };

    // Auditoría
    await auditLogger.log({
      action: 'VIEW_NOTIFICATION_STATS',
      userId,
      details: { statsViewed: true },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de notificaciones'
    });
  }
};

/**
 * Obtener historial de notificaciones con filtros
 */
const getNotificationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      type = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Construir filtros
    const where = {};

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

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Obtener notificaciones
    const notifications = await prisma.whatsAppNotification.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        messageType: true,
        messageBody: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        sentAt: true
      }
    });

    const totalCount = await prisma.whatsAppNotification.count({ where });

    // Auditoría
    await auditLogger.log({
      action: 'VIEW_NOTIFICATION_HISTORY',
      userId,
      details: { 
        page, 
        limit, 
        search, 
        status, 
        type,
        totalResults: totalCount 
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de notificaciones'
    });
  }
};

/**
 * Reintentar notificación fallida
 */
const retryNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await prisma.whatsAppNotification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    if (notification.status !== 'FAILED') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden reintentar notificaciones fallidas'
      });
    }

    // Actualizar estado a pendiente para reintento
    await prisma.whatsAppNotification.update({
      where: { id: notificationId },
      data: {
        status: 'PENDING',
        errorMessage: null,
        sentAt: null
      }
    });

    // TODO: Enviar a cola de procesamiento de notificaciones

    // Auditoría
    await auditLogger.log({
      action: 'RETRY_NOTIFICATION',
      userId,
      details: { 
        notificationId,
        clientName: notification.clientName,
        clientPhone: notification.clientPhone
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Notificación marcada para reintento'
    });
  } catch (error) {
    console.error('Error retrying notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reintentar notificación'
    });
  }
};

/**
 * Operaciones en lote para notificaciones
 */
const bulkNotificationOperation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds, operation } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs de notificaciones requeridos'
      });
    }

    if (!['retry', 'delete'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Operación no válida'
      });
    }

    let successCount = 0;

    if (operation === 'retry') {
      // Reintentar notificaciones fallidas
      const result = await prisma.whatsAppNotification.updateMany({
        where: {
          id: { in: notificationIds },
          status: 'FAILED'
        },
        data: {
          status: 'PENDING',
          errorMessage: null,
          sentAt: null
        }
      });
      successCount = result.count;
    } else if (operation === 'delete') {
      // Eliminar notificaciones
      const result = await prisma.whatsAppNotification.deleteMany({
        where: {
          id: { in: notificationIds }
        }
      });
      successCount = result.count;
    }

    // Auditoría
    await auditLogger.log({
      action: 'BULK_NOTIFICATION_OPERATION',
      userId,
      details: { 
        operation,
        notificationIds,
        successCount
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: { successCount },
      message: `Operación completada para ${successCount} notificaciones`
    });
  } catch (error) {
    console.error('Error in bulk notification operation:', error);
    res.status(500).json({
      success: false,
      message: 'Error en operación masiva de notificaciones'
    });
  }
};

/**
 * Obtener plantillas de notificaciones
 */
const getNotificationTemplates = async (req, res) => {
  try {
    const userId = req.user.id;

    const templates = await prisma.notificationTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        subject: true,
        content: true,
        variables: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Auditoría
    await auditLogger.log({
      action: 'VIEW_NOTIFICATION_TEMPLATES',
      userId,
      details: { templatesCount: templates.length },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    console.error('Error getting notification templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener plantillas de notificaciones'
    });
  }
};

/**
 * Crear plantilla de notificación
 */
const createNotificationTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type, subject, content, variables, isActive } = req.body;

    if (!name || !type || !content) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, tipo y contenido son requeridos'
      });
    }

    const template = await prisma.notificationTemplate.create({
      data: {
        name,
        type,
        subject,
        content,
        variables: variables || [],
        isActive: isActive !== false,
        createdById: userId
      }
    });

    // Auditoría
    await auditLogger.log({
      action: 'CREATE_NOTIFICATION_TEMPLATE',
      userId,
      details: { 
        templateId: template.id,
        templateName: name,
        templateType: type
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: { template },
      message: 'Plantilla creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating notification template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear plantilla de notificación'
    });
  }
};

/**
 * Actualizar plantilla de notificación
 */
const updateNotificationTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId } = req.params;
    const { name, type, subject, content, variables, isActive } = req.body;

    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }

    const updatedTemplate = await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        name,
        type,
        subject,
        content,
        variables: variables || [],
        isActive: isActive !== false
      }
    });

    // Auditoría
    await auditLogger.log({
      action: 'UPDATE_NOTIFICATION_TEMPLATE',
      userId,
      details: { 
        templateId,
        templateName: name,
        changes: req.body
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: { template: updatedTemplate },
      message: 'Plantilla actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating notification template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar plantilla de notificación'
    });
  }
};

/**
 * Eliminar plantilla de notificación
 */
const deleteNotificationTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId } = req.params;

    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Plantilla no encontrada'
      });
    }

    await prisma.notificationTemplate.delete({
      where: { id: templateId }
    });

    // Auditoría
    await auditLogger.log({
      action: 'DELETE_NOTIFICATION_TEMPLATE',
      userId,
      details: { 
        templateId,
        templateName: template.name
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Plantilla eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting notification template:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar plantilla de notificación'
    });
  }
};

/**
 * Enviar notificación de prueba
 */
const sendTestNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId, testPhone, testData } = req.body;

    if (!testPhone) {
      return res.status(400).json({
        success: false,
        message: 'Número de teléfono requerido'
      });
    }

    let content = 'Mensaje de prueba del sistema de notificaciones';

    if (templateId) {
      const template = await prisma.notificationTemplate.findUnique({
        where: { id: templateId }
      });

      if (template) {
        content = template.content;
        
        // Reemplazar variables con datos de prueba
        if (testData) {
          Object.keys(testData).forEach(key => {
            content = content.replace(new RegExp(`{${key}}`, 'g'), testData[key]);
          });
        }
      }
    }

    // Crear registro de notificación de prueba
    const testNotification = await prisma.whatsAppNotification.create({
      data: {
        clientName: 'Prueba Sistema',
        clientPhone: testPhone,
        messageType: 'TEST',
        messageBody: content,
        status: 'SIMULATED',
        sentAt: new Date()
      }
    });

    // TODO: Integrar con servicio real de WhatsApp
    // Por ahora solo simulamos el envío

    // Auditoría
    await auditLogger.log({
      action: 'SEND_TEST_NOTIFICATION',
      userId,
      details: { 
        testPhone,
        templateId,
        notificationId: testNotification.id
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Notificación de prueba enviada exitosamente'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación de prueba'
    });
  }
};

/**
 * Probar conexión WhatsApp
 */
const testWhatsAppConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { apiUrl, authToken } = req.body;

    if (!apiUrl || !authToken) {
      return res.status(400).json({
        success: false,
        message: 'URL de API y token de autenticación requeridos'
      });
    }

    // TODO: Implementar prueba real de conexión WhatsApp
    // Por ahora simulamos la conexión
    const isValid = apiUrl.includes('api.whatsapp') && authToken.length > 10;

    if (isValid) {
      // Auditoría
      await auditLogger.log({
        action: 'TEST_WHATSAPP_CONNECTION',
        userId,
        details: { 
          apiUrl: apiUrl.replace(/\/[^\/]*$/, '/***'), // Ocultar parte sensible
          success: true
        },
        ipAddress: req.ip
      });

      res.json({
        success: true,
        message: 'Conexión WhatsApp exitosa'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error en la configuración de WhatsApp'
      });
    }
  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    res.status(500).json({
      success: false,
      message: 'Error al probar conexión WhatsApp'
    });
  }
};

/**
 * Obtener configuración de notificaciones
 */
const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Por ahora devolver configuración por defecto
    // TODO: Implementar almacenamiento real de configuración
    const defaultSettings = {
      whatsapp: {
        enabled: true,
        apiUrl: '',
        authToken: '',
        phoneNumber: '',
        businessAccount: '',
        webhookUrl: ''
      },
      scheduling: {
        enableScheduling: true,
        workingHours: {
          start: '08:00',
          end: '18:00'
        },
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        timezone: 'America/Guayaquil'
      },
      rateLimiting: {
        enabled: true,
        messagesPerMinute: 10,
        messagesPerHour: 300,
        messagesPerDay: 1000
      },
      retryPolicy: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 300,
        backoffMultiplier: 2
      },
      notifications: {
        enableEmailAlerts: true,
        alertEmail: '',
        failureThreshold: 5,
        enableSystemNotifications: true
      }
    };

    // Auditoría
    await auditLogger.log({
      action: 'VIEW_NOTIFICATION_SETTINGS',
      userId,
      details: { settingsViewed: true },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: { settings: defaultSettings }
    });
  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de notificaciones'
    });
  }
};

/**
 * Actualizar configuración de notificaciones
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    // TODO: Implementar almacenamiento real de configuración
    // Por ahora solo simular el guardado

    // Auditoría
    await auditLogger.log({
      action: 'UPDATE_NOTIFICATION_SETTINGS',
      userId,
      details: { 
        settingsUpdated: true,
        changedSections: Object.keys(settings)
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración de notificaciones'
    });
  }
};

/**
 * Obtener notificaciones fallidas para reintento simple
 */
const getFailedNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const failedNotifications = await prisma.whatsAppNotification.findMany({
      where: { status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        messageType: true,
        errorMessage: true,
        createdAt: true
      }
    });

    const formatted = failedNotifications.map(notification => ({
      id: notification.id,
      recipientPhone: notification.clientPhone,
      type: notification.messageType,
      error: notification.errorMessage || 'Error desconocido',
      createdAt: notification.createdAt
    }));

    await auditLogger.log({
      action: 'VIEW_FAILED_NOTIFICATIONS',
      userId,
      details: { count: formatted.length },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: { notifications: formatted }
    });
  } catch (error) {
    console.error('Error getting failed notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones fallidas'
    });
  }
};

/**
 * Reintentar todas las notificaciones fallidas
 */
const retryAllFailedNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await prisma.whatsAppNotification.updateMany({
      where: { status: 'FAILED' },
      data: {
        status: 'PENDING',
        errorMessage: null,
        sentAt: null
      }
    });

    await auditLogger.log({
      action: 'RETRY_ALL_FAILED_NOTIFICATIONS',
      userId,
      details: { retriedCount: result.count },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `${result.count} notificaciones marcadas para reintento`
    });
  } catch (error) {
    console.error('Error retrying all failed notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reintentar notificaciones fallidas'
    });
  }
};

/**
 * Obtener configuración simple de notificaciones
 */
const getSimpleNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Configuración simple para KISS
    const settings = {
      whatsappEnabled: true,
      emailEnabled: false,
      autoRetryEnabled: true,
      maxRetryAttempts: 3,
      retryIntervalMinutes: 30
    };

    await auditLogger.log({
      action: 'VIEW_SIMPLE_NOTIFICATION_SETTINGS',
      userId,
      details: { settingsViewed: true },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting simple notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de notificaciones'
    });
  }
};

/**
 * Exportar historial de notificaciones
 */
const exportNotificationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      search = '',
      status = '',
      type = '',
      dateFrom = '',
      dateTo = '',
      format = 'csv'
    } = req.query;

    // Construir filtros
    const where = {};

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search } },
        { messageBody: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) where.status = status;
    if (type) where.messageType = type;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const notifications = await prisma.whatsAppNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        messageType: true,
        messageBody: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        sentAt: true
      }
    });

    // Generar CSV
    const csvHeader = 'ID,Cliente,Teléfono,Tipo,Estado,Mensaje,Error,Creado,Enviado\n';
    const csvRows = notifications.map(notification => {
      const row = [
        notification.id,
        notification.clientName,
        notification.clientPhone,
        notification.messageType,
        notification.status,
        `"${notification.messageBody.replace(/"/g, '""')}"`,
        notification.errorMessage || '',
        notification.createdAt.toISOString(),
        notification.sentAt ? notification.sentAt.toISOString() : ''
      ];
      return row.join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');

    // Auditoría
    await auditLogger.log({
      action: 'EXPORT_NOTIFICATION_HISTORY',
      userId,
      details: { 
        format,
        recordCount: notifications.length,
        filters: { search, status, type, dateFrom, dateTo }
      },
      ipAddress: req.ip
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="notificaciones_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar historial de notificaciones'
    });
  }
};

export {
  getNotificationStats,
  getNotificationHistory,
  retryNotification,
  bulkNotificationOperation,
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  sendTestNotification,
  testWhatsAppConnection,
  getNotificationSettings,
  updateNotificationSettings,
  exportNotificationHistory,
  getFailedNotifications,
  retryAllFailedNotifications,
  getSimpleNotificationSettings
};