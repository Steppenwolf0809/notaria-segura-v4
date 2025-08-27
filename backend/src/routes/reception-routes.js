import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import {
  getMatrizadores,
  listarTodosDocumentos,
  getDocumentosEnProceso,
  marcarComoListo,
  marcarGrupoListo,
  desagruparDocumentos,
  getDashboardStats,
  getAlertasRecepcion,
  revertirEstadoDocumento,
  getNotificationHistoryReception
} from '../controllers/reception-controller.js';
import { marcarVariosListos } from '../controllers/reception-bulk-controller.js';

const router = express.Router();

/**
 * MIDDLEWARE DE RECEPCIÓN
 * Todas las rutas requieren autenticación y rol RECEPCION
 */
const requireRecepcion = requireRoles(['RECEPCION']);

/**
 * RUTAS DE RECEPCIÓN - Gestión de entregas de documentos
 * Todas las rutas están protegidas y requieren rol RECEPCION
 */

/**
 * @route GET /api/reception/dashboard
 * @desc Obtener estadísticas del dashboard de recepción
 * @access Private (RECEPCION only)
 */
router.get('/dashboard', authenticateToken, requireRecepcion, getDashboardStats);

/**
 * @route GET /api/reception/documentos/todos
 * @desc Obtener todos los documentos para consultas de estado
 * @query search - Búsqueda por cliente, teléfono o protocolo
 * @query matrizador - Filtro por ID de matrizador
 * @query estado - Filtro por estado del documento
 * @query fechaDesde - Filtro por fecha desde
 * @query fechaHasta - Filtro por fecha hasta
 * @query page - Número de página (default: 1)
 * @query limit - Límite por página (default: 10)
 * @access Private (RECEPCION only)
 */
router.get('/documentos/todos', authenticateToken, requireRecepcion, listarTodosDocumentos);

/**
 * @route GET /api/reception/documentos/en-proceso
 * @desc Obtener documentos EN_PROCESO para marcar como listos
 * @query search - Búsqueda por cliente, teléfono o protocolo
 * @query matrizador - Filtro por ID de matrizador
 * @query page - Número de página (default: 1)
 * @query limit - Límite por página (default: 10)
 * @access Private (RECEPCION only)
 */
router.get('/documentos/en-proceso', authenticateToken, requireRecepcion, getDocumentosEnProceso);

/**
 * @route POST /api/reception/documentos/:id/marcar-listo
 * @desc Marcar documento individual como listo (EN_PROCESO → LISTO)
 * @param id - ID del documento a marcar como listo
 * @access Private (RECEPCION only)
 */
router.post('/documentos/:id/marcar-listo', authenticateToken, requireRecepcion, marcarComoListo);

/**
 * @route POST /api/reception/documentos/marcar-grupo-listo
 * @desc Marcar múltiples documentos del mismo cliente como listos con código compartido
 * @body documentIds - Array de IDs de documentos (obligatorio, mismo cliente)
 * @access Private (RECEPCION only)
 */
router.post('/documentos/marcar-grupo-listo', authenticateToken, requireRecepcion, marcarGrupoListo);

/**
 * @route POST /api/reception/documentos/marcar-listos
 * @desc Marcar múltiples documentos (de uno o varios clientes) como LISTO.
 *        Envío de WhatsApp: un mensaje por cada cliente.
 * @body { documentIds: string[], sendNotifications?: boolean }
 * @access Private (RECEPCION only)
 */
router.post('/documentos/marcar-listos', authenticateToken, requireRecepcion, marcarVariosListos);

/**
 * @route POST /api/reception/documentos/desagrupar
 * @desc Desagrupar documentos que están agrupados, asignando códigos individuales
 * @body documentIds - Array de IDs de documentos agrupados
 * @access Private (RECEPCION only)
 */
router.post('/documentos/desagrupar', authenticateToken, requireRecepcion, desagruparDocumentos);

/**
 * @route GET /api/reception/matrizadores
 * @desc Obtener lista de matrizadores para filtros
 * @access Private (RECEPCION only)
 */
router.get('/matrizadores', authenticateToken, requireRecepcion, getMatrizadores);

/**
 * @route GET /api/reception/alertas
 * @desc Obtener alertas de documentos LISTO sin entregar específicas de recepción
 * @access Private (RECEPCION only)
 */
router.get('/alertas', authenticateToken, requireRecepcion, getAlertasRecepcion);

/**
 * @route GET /api/reception/notificaciones
 * @desc Obtener historial de notificaciones WhatsApp para recepción
 * @access Private (RECEPCION only)
 */
router.get('/notificaciones', authenticateToken, requireRecepcion, getNotificationHistoryReception);

/**
 * @route POST /api/reception/documentos/:id/revertir-estado
 * @desc Revertir documento a estado anterior con razón obligatoria
 * @param id - ID del documento a revertir
 * @body newStatus - Nuevo estado (debe ser anterior al actual)
 * @body reversionReason - Razón obligatoria para la reversión
 * @access Private (RECEPCION only)
 */
router.post('/documentos/:id/revertir-estado', authenticateToken, requireRecepcion, revertirEstadoDocumento);

// Ruta de prueba simple para verificar conectividad
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Reception API funcionando correctamente', 
    timestamp: new Date(),
    service: 'reception-service'
  });
});

export default router;
