import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import { csrfProtection } from '../middleware/csrf-protection.js';
import {
  dashboardArchivo,
  listarMisDocumentos,
  cambiarEstadoDocumento,
  procesarEntregaDocumento,
  supervisionGeneral,
  resumenGeneral,
  obtenerMatrizadores,
  obtenerDetalleDocumento,
  revertirEstadoDocumentoArchivo
} from '../controllers/archivo-controller.js';
import { marcarVariosListosArchivo } from '../controllers/archivo-bulk-controller.js';

const router = express.Router();

/**
 * MIDDLEWARE DE ARCHIVO
 * Todas las rutas requieren autenticación y rol ARCHIVO
 */
const requireArchivo = requireRoles(['ARCHIVO']);

/**
 * ============================================================================
 * SECCIÓN 1: RUTAS PARA DOCUMENTOS PROPIOS (FUNCIONALIDAD MATRIZADOR)
 * ============================================================================
 */

/**
 * @route GET /api/archivo/dashboard
 * @desc Dashboard con documentos propios del archivo
 * @access Private (ARCHIVO only)
 */
router.get('/dashboard', authenticateToken, requireArchivo, dashboardArchivo);

/**
 * @route GET /api/archivo/mis-documentos
 * @desc Listar documentos asignados al archivo con filtros y paginación
 * @query search - Búsqueda por cliente, teléfono o protocolo
 * @query estado - Filtro por estado del documento
 * @query page - Número de página (default: 1)
 * @query limit - Límite por página (default: 10)
 * @access Private (ARCHIVO only)
 */
router.get('/mis-documentos', authenticateToken, requireArchivo, listarMisDocumentos);

/**
 * @route POST /api/archivo/documentos/:id/estado
 * @desc Cambiar estado de documento propio
 * @param id - ID del documento a actualizar
 * @body nuevoEstado - Nuevo estado del documento
 * @access Private (ARCHIVO only)
 * @csrf Protected - Requiere token CSRF
 */
router.post('/documentos/:id/estado', authenticateToken, requireArchivo, csrfProtection, cambiarEstadoDocumento);

/**
 * @route POST /api/archivo/documentos/marcar-listos
 * @desc Cambiar a LISTO varios documentos asignados (archivo) con WhatsApp por cliente
 * @access Private (ARCHIVO only)
 * @csrf Protected - Requiere token CSRF
 */
router.post('/documentos/marcar-listos', authenticateToken, requireArchivo, csrfProtection, marcarVariosListosArchivo);

/**
 * @route POST /api/archivo/documentos/:id/entregar
 * @desc Procesar entrega de documento propio del archivo (equivalente a recepción)
 * @param id - ID del documento a entregar
 * @body entregadoA - Nombre de quien retira el documento
 * @body cedulaReceptor - Cédula/ID de quien retira (opcional)
 * @body relacionTitular - Relación con el titular
 * @body codigoVerificacion - Código de verificación de 4 dígitos
 * @body verificacionManual - Si es verificación manual (sin código)
 * @body facturaPresenta - Si presentó factura
 * @body observaciones - Observaciones adicionales
 * @access Private (ARCHIVO only)
 * @csrf Protected - Requiere token CSRF
 */
router.post('/documentos/:id/entregar', authenticateToken, requireArchivo, csrfProtection, procesarEntregaDocumento);

/**
 * @route POST /api/archivo/documentos/:id/revertir-estado
 * @desc Revertir documento a un estado anterior con razón obligatoria (propaga a grupos)
 * @param id - ID del documento a revertir
 * @body newStatus - Nuevo estado (anterior al actual)
 * @body reversionReason - Razón obligatoria para la reversión
 * @access Private (ARCHIVO only)
 */
router.post('/documentos/:id/revertir-estado', authenticateToken, requireArchivo, revertirEstadoDocumentoArchivo);

/**
 * ============================================================================
 * SECCIÓN 2: RUTAS PARA SUPERVISIÓN GLOBAL (SOLO LECTURA)
 * ============================================================================
 */

/**
 * @route GET /api/archivo/supervision/todos
 * @desc Vista de supervisión global - todos los documentos del sistema
 * @query search - Búsqueda por cliente, teléfono o protocolo
 * @query matrizador - Filtro por ID de matrizador
 * @query estado - Filtro por estado del documento
 * @query alerta - Filtro por nivel de alerta (TODAS, ROJAS, AMARILLAS, NORMALES)
 * @query fechaDesde - Filtro por fecha desde
 * @query fechaHasta - Filtro por fecha hasta
 * @query page - Número de página (default: 1)
 * @query limit - Límite por página (default: 20)
 * @access Private (ARCHIVO only)
 */
router.get('/supervision/todos', authenticateToken, requireArchivo, supervisionGeneral);

/**
 * @route GET /api/archivo/supervision/resumen
 * @desc Resumen general del sistema con métricas y alertas
 * @access Private (ARCHIVO only)
 */
router.get('/supervision/resumen', authenticateToken, requireArchivo, resumenGeneral);

/**
 * @route GET /api/archivo/supervision/matrizadores
 * @desc Obtener lista de matrizadores para filtros de supervisión
 * @access Private (ARCHIVO only)
 */
router.get('/supervision/matrizadores', authenticateToken, requireArchivo, obtenerMatrizadores);

/**
 * ============================================================================
 * SECCIÓN 3: RUTAS COMPARTIDAS (DOCUMENTOS INDIVIDUALES)
 * ============================================================================
 */

/**
 * @route GET /api/archivo/documentos/:id
 * @desc Obtener detalle de documento (propio o ajeno)
 * @param id - ID del documento
 * @returns Documento con información de permisos (puedeModificar, soloLectura)
 * @access Private (ARCHIVO only)
 */
router.get('/documentos/:id', authenticateToken, requireArchivo, obtenerDetalleDocumento);

/**
 * ============================================================================
 * RUTA DE PRUEBA PARA VERIFICAR CONECTIVIDAD
 * ============================================================================
 */
router.get('/test', authenticateToken, requireArchivo, (req, res) => {
  res.json({
    success: true,
    message: 'Rutas de archivo funcionando correctamente',
    user: {
      id: req.user.id,
      role: req.user.role
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
