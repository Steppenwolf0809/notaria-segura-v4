import express from 'express';
import prisma from '../db.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserStats,
  getDashboardStats,
  getPersonasRegistradas
} from '../controllers/admin-controller.js';

import {
  getAllDocumentsOversight,
  getDocumentEvents,
  getBulkDocumentsInfo,
  executeBulkDocumentOperation,
  exportDocuments,
  deleteDocument,
  bulkDeleteDocuments
} from '../controllers/admin-document-controller.js';

import {
  getNotificationStats,
  getNotificationHistory,
  retryNotification,
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  sendTestNotification,
  getFailedNotifications,
  retryAllFailedNotifications,
  getSimpleNotificationSettings,
  updateNotificationSettings
} from '../controllers/admin-notification-controller.js';

import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplate,
  previewTemplate,
  initializeDefaultTemplates
} from '../controllers/admin-whatsapp-templates-controller.js';
import {
  authenticateToken,
  requireAdmin
} from '../middleware/auth-middleware.js';
import {
  adminRateLimit,
  addRateLimitHeaders
} from '../middleware/rate-limiter.js';
import { csrfProtection } from '../middleware/csrf-protection.js';
import cache from '../services/cache-service.js';

const router = express.Router();

// Aplicar headers de rate limiting a todas las rutas
router.use(addRateLimitHeaders);

// Aplicar autenticación y verificación de admin a todas las rutas
router.use(authenticateToken);
router.use(requireAdmin);

// Aplicar rate limiting a todas las rutas administrativas
router.use(adminRateLimit);

/**
 * @route GET /api/admin/users
 * @desc Obtener todos los usuarios con paginación y filtros
 * @access Private (ADMIN only)
 * @query page - Número de página (default: 1)
 * @query limit - Límite por página (default: 10)
 * @query search - Búsqueda por nombre, apellido o email
 * @query role - Filtrar por rol
 * @query status - Filtrar por estado (true/false)
 */
router.get('/users', getAllUsers);

/**
 * @route GET /api/admin/users/stats
 * @desc Obtener estadísticas de usuarios
 * @access Private (ADMIN only)
 */
router.get('/users/stats', getUserStats);

/**
 * @route GET /api/admin/dashboard/stats
 * @desc Obtener estadísticas generales para el dashboard
 * @access Private (ADMIN only)
 */
router.get('/dashboard/stats', getDashboardStats);

/**
 * @route GET /api/admin/personas-registradas
 * @desc Obtener base de datos de usuarios externos (UAFE)
 * @access Private (ADMIN only)
 */
router.get('/personas-registradas', getPersonasRegistradas);

/**
 * @route GET /api/admin/users/:id
 * @desc Obtener un usuario específico por ID
 * @access Private (ADMIN only)
 */
router.get('/users/:id', getUserById);

/**
 * @route POST /api/admin/users
 * @desc Crear un nuevo usuario
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 * @body email, password, firstName, lastName, role
 */
router.post('/users', csrfProtection, createUser);

/**
 * @route PUT /api/admin/users/:id
 * @desc Actualizar un usuario existente
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 * @body email?, firstName?, lastName?, role?, password?
 */
router.put('/users/:id', csrfProtection, updateUser);

/**
 * @route PATCH /api/admin/users/:id/status
 * @desc Activar/desactivar un usuario
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 * @body isActive (boolean)
 */
router.patch('/users/:id/status', csrfProtection, toggleUserStatus);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Eliminar un usuario (hard delete)
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 * @warning Esta acción es irreversible
 */
router.delete('/users/:id', csrfProtection, deleteUser);

// ============================================================================
// RUTAS DE SUPERVISIÓN DE DOCUMENTOS - ADMIN OVERSIGHT
// ============================================================================

/**
 * @route GET /api/admin/documents/oversight
 * @desc Obtener todos los documentos con filtros avanzados para supervisión
 * @access Private (ADMIN only)
 * @query page - Número de página (default: 1)
 * @query limit - Límite por página (default: 10)
 * @query search - Búsqueda por número, cliente, tipo
 * @query status - Filtrar por estado
 * @query type - Filtrar por tipo de documento
 * @query matrizador - Filtrar por matrizador asignado
 * @query overdueOnly - Solo documentos vencidos
 * @query sortBy - Campo para ordenar
 * @query sortOrder - Orden (asc/desc)
 */
router.get('/documents/oversight', getAllDocumentsOversight);

/**
 * @route GET /api/admin/documents/:id/events
 * @desc Obtener timeline de eventos de un documento específico
 * @access Private (ADMIN only)
 */
router.get('/documents/:id/events', getDocumentEvents);

/**
 * @route POST /api/admin/documents/bulk-info
 * @desc Obtener información de múltiples documentos para operaciones en lote
 * @access Private (ADMIN only)
 * @body documentIds - Array de IDs de documentos
 */
router.post('/documents/bulk-info', getBulkDocumentsInfo);

/**
 * @route POST /api/admin/documents/bulk-operation
 * @desc Ejecutar operación en lote sobre múltiples documentos
 * @access Private (ADMIN only)
 * @body operation - Tipo de operación (reassign, changeStatus)
 * @body documentIds - Array de IDs de documentos
 * @body newMatrizadorId - ID del nuevo matrizador (si aplica)
 * @body newStatus - Nuevo estado (si aplica)
 */
router.post('/documents/bulk-operation', executeBulkDocumentOperation);

/**
 * @route GET /api/admin/documents/export
 * @desc Exportar documentos en formato Excel o CSV
 * @access Private (ADMIN only)
 * @query format - Formato de exportación (excel, csv)
 * @query Otros filtros como en oversight
 */
router.get('/documents/export', exportDocuments);

/**
 * @route DELETE /api/admin/documents/:id
 * @desc Eliminar un documento específico (hard delete)
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 * @warning Esta acción es irreversible y eliminará el documento y todos sus eventos asociados
 */
router.delete('/documents/:id', csrfProtection, deleteDocument);

/**
 * @route POST /api/admin/documents/bulk-delete
 * @desc Eliminar múltiples documentos en lote
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 * @body documentIds - Array de IDs de documentos a eliminar
 * @warning Esta acción es irreversible
 */
router.post('/documents/bulk-delete', csrfProtection, bulkDeleteDocuments);

// ============================================================================
// RUTAS DE GESTIÓN DE NOTIFICACIONES - ADMIN
// ============================================================================

/**
 * @route GET /api/admin/notifications/stats
 * @desc Obtener estadísticas de notificaciones
 * @access Private (ADMIN only)
 */
router.get('/notifications/stats', getNotificationStats);

/**
 * @route GET /api/admin/notifications/history
 * @desc Obtener historial de notificaciones con filtros
 * @access Private (ADMIN only)
 */
router.get('/notifications/history', getNotificationHistory);

/**
 * @route GET /api/admin/notifications/templates
 * @desc Obtener plantillas de notificaciones
 * @access Private (ADMIN only)
 */
router.get('/notifications/templates', getNotificationTemplates);

/**
 * @route POST /api/admin/notifications/templates
 * @desc Crear plantilla de notificación
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 */
router.post('/notifications/templates', csrfProtection, createNotificationTemplate);

/**
 * @route PUT /api/admin/notifications/templates/:templateId
 * @desc Actualizar plantilla de notificación
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 */
router.put('/notifications/templates/:templateId', csrfProtection, updateNotificationTemplate);

/**
 * @route DELETE /api/admin/notifications/templates/:templateId
 * @desc Eliminar plantilla de notificación
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 */
router.delete('/notifications/templates/:templateId', csrfProtection, deleteNotificationTemplate);

/**
 * @route POST /api/admin/notifications/test
 * @desc Enviar notificación de prueba
 * @access Private (ADMIN only)
 */
router.post('/notifications/test', sendTestNotification);

/**
 * @route GET /api/admin/notifications/settings
 * @desc Obtener configuración simple de notificaciones
 * @access Private (ADMIN only)
 */
router.get('/notifications/settings', getSimpleNotificationSettings);

/**
 * @route PUT /api/admin/notifications/settings
 * @desc Actualizar configuración de notificaciones
 * @access Private (ADMIN only)
 */
router.put('/notifications/settings', updateNotificationSettings);

/**
 * @route GET /api/admin/notifications/failed
 * @desc Obtener notificaciones fallidas
 * @access Private (ADMIN only)
 */
router.get('/notifications/failed', getFailedNotifications);

/**
 * @route POST /api/admin/notifications/retry/:notificationId
 * @desc Reintentar notificación específica
 * @access Private (ADMIN only)
 */
router.post('/notifications/retry/:notificationId', retryNotification);

/**
 * @route POST /api/admin/notifications/retry-all
 * @desc Reintentar todas las notificaciones fallidas
 * @access Private (ADMIN only)
 */
router.post('/notifications/retry-all', retryAllFailedNotifications);

/**
 * @route GET /api/admin/notificaciones
 * @desc Obtener notificaciones WhatsApp reales del sistema
 * @access Private (ADMIN only)
 */
router.get('/notificaciones', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query directo a la base de datos para obtener notificaciones reales
    const [notifications, total] = await Promise.all([
      prisma.whatsAppNotification.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          document: {
            select: {
              protocolNumber: true,
              documentType: true
            }
          },
          group: {
            select: {
              id: true,
              verificationCode: true
            }
          }
        }
      }),
      prisma.whatsAppNotification.count()
    ]);

    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => ({
          id: n.id,
          cliente: n.clientName,
          telefono: n.clientPhone,
          tipo: n.messageType,
          mensaje: n.messageBody,
          estado: n.status,
          fecha: n.createdAt,
          enviado: n.sentAt,
          error: n.errorMessage,
          messageId: n.messageId,
          documento: n.document ? {
            numero: n.document.protocolNumber,
            tipo: n.document.documentType
          } : null,
          esGrupo: !!n.groupId
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones reales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones'
    });
  }
});

// ============================================================================
// RUTAS DE TEMPLATES WHATSAPP - ADMIN
// ============================================================================

/**
 * @route GET /api/admin/whatsapp-templates
 * @desc Obtener todos los templates WhatsApp
 * @access Private (ADMIN only)
 */
router.get('/whatsapp-templates', getTemplates);

/**
 * @route GET /api/admin/whatsapp-templates/:id
 * @desc Obtener template específico por ID
 * @access Private (ADMIN only)
 */
router.get('/whatsapp-templates/:id', getTemplate);

/**
 * @route POST /api/admin/whatsapp-templates
 * @desc Crear nuevo template WhatsApp
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 * @body tipo, titulo, mensaje, activo?
 */
router.post('/whatsapp-templates', csrfProtection, createTemplate);

/**
 * @route PUT /api/admin/whatsapp-templates/:id
 * @desc Actualizar template WhatsApp existente
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 * @body titulo?, mensaje?, activo?
 */
router.put('/whatsapp-templates/:id', csrfProtection, updateTemplate);

/**
 * @route DELETE /api/admin/whatsapp-templates/:id
 * @desc Eliminar template WhatsApp
 * @access Private (ADMIN only)
 * @csrf Protected - Requiere token CSRF
 */
router.delete('/whatsapp-templates/:id', csrfProtection, deleteTemplate);

/**
 * @route PATCH /api/admin/whatsapp-templates/:id/toggle
 * @desc Activar/desactivar template WhatsApp
 * @access Private (ADMIN only)
 * @body activo (boolean)
 */
router.patch('/whatsapp-templates/:id/toggle', toggleTemplate);

/**
 * @route POST /api/admin/whatsapp-templates/preview
 * @desc Generar preview de template con datos ejemplo
 * @access Private (ADMIN only)
 * @body mensaje
 */
router.post('/whatsapp-templates/preview', previewTemplate);

/**
 * @route POST /api/admin/whatsapp-templates/initialize
 * @desc Crear templates por defecto (setup inicial)
 * @access Private (ADMIN only)
 */
router.post('/whatsapp-templates/initialize', initializeDefaultTemplates);

/**
 * @route GET /api/admin/cache/metrics
 * @desc Métricas del sistema de caché (hit rate, backend, claves)
 * @access Private (ADMIN only)
 */
router.get('/cache/metrics', (req, res) => {
  try {
    const stats = cache.getStats();
    res.json({ success: true, data: stats });
  } catch (e) {
    res.status(500).json({ success: false, error: 'No se pudieron obtener métricas de caché' });
  }
});

export default router;
