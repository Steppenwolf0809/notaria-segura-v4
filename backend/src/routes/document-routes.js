import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth-middleware.js';
import { csrfProtection } from '../middleware/csrf-protection.js';
import { documentsRateLimit } from '../middleware/rate-limiter.js';
import {
  uploadXmlDocument,
  uploadXmlDocumentsBatch,
  getAllDocuments,
  assignDocument,
  getMyDocuments,
  updateDocumentStatus,
  getDocumentById,
  getAvailableMatrizadores,
  // Función de entrega completa
  deliverDocument,
  // Funciones de edición
  getEditableDocumentInfo,
  updateDocumentInfo,
  // 🔄 Sistema de confirmaciones y deshacer
  undoDocumentStatusChange,
  getUndoableChanges,
  // 📈 Sistema de historial universal
  getDocumentHistory,
  // 🔄 Reversión de estado
  revertDocumentStatus,

  // 🎯 NUEVA FUNCIONALIDAD: UI Activos/Entregados
  getDocumentsUnified,
  getDocumentsCounts,
  // 💳 NUEVA FUNCIONALIDAD: Nota de Crédito
  markAsNotaCredito,
  // 📊 NUEVA FUNCIONALIDAD: Estadísticas de CAJA
  getCajaStats,
  // 📱 NUEVA FUNCIONALIDAD: Notificaciones WhatsApp masivas
  bulkNotify
} from '../controllers/document-controller.js';

// 🔄 NUEVAS IMPORTACIONES: Operaciones masivas
import {
  bulkStatusChange
} from '../controllers/bulk-operations-controller.js';

const router = express.Router();

// Aplicar rate limiting a todas las rutas de documentos
router.use(documentsRateLimit);

// Configuración de multer para upload de archivos XML (individual)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' ||
      file.mimetype === 'application/xml' ||
      file.originalname.toLowerCase().endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos XML'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Máximo 5MB
    files: 1
  }
});

// Configuración de multer para upload de múltiples archivos XML (lote)
const uploadBatch = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' ||
      file.mimetype === 'application/xml' ||
      file.originalname.toLowerCase().endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos XML'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Máximo 5MB por archivo
    files: 20 // Máximo 20 archivos por lote
  }
});

/**
 * RUTAS PROTEGIDAS - Todas requieren autenticación
 */

// POST /api/documents/upload-xml - CAJA: Subir y procesar XML automáticamente (JWT only - M2M compatible)
router.post('/upload-xml', authenticateToken, upload.single('xmlFile'), uploadXmlDocument);

// POST /api/documents/upload-xml-batch - CAJA: Subir y procesar múltiples XML en lote (JWT only - M2M compatible)
router.post('/upload-xml-batch', authenticateToken, uploadBatch.array('xmlFiles', 20), uploadXmlDocumentsBatch);

// GET /api/documents/all - CAJA/ADMIN: Ver todos los documentos
router.get('/all', authenticateToken, getAllDocuments);

// 📊 GET /api/documents/counts - Conteos para badges (DEBE IR ANTES QUE /:id)
router.get('/counts', authenticateToken, getDocumentsCounts);

// 📊 GET /api/documents/caja-stats - Estadísticas completas para dashboard de CAJA
router.get('/caja-stats', authenticateToken, getCajaStats);

// GET /api/documents/my-documents - MATRIZADOR: Documentos del usuario
router.get('/my-documents', authenticateToken, getMyDocuments);

// 💳 PUT /api/documents/:id/nota-credito - CAJA: Marcar como Nota de Crédito (ANTES DE /:id/assign)
router.put('/:id/nota-credito', authenticateToken, markAsNotaCredito);

// PUT /api/documents/:id/assign - CAJA: Asignar documento a matrizador (CSRF Protected)
router.put('/:id/assign', authenticateToken, csrfProtection, assignDocument);


// PUT /api/documents/:id/status - MATRIZADOR: Actualizar estado (CSRF Protected)
router.put('/:id/status', authenticateToken, csrfProtection, updateDocumentStatus);

// 🔄 POST /api/documents/:id/revert - Revertir estado de documento con razón
router.post('/:id/revert', authenticateToken, revertDocumentStatus);


// POST /api/documents/:id/deliver - RECEPCION: Entregar documento con información completa
router.post('/:id/deliver', authenticateToken, deliverDocument);

// GET /api/documents/matrizadores - CAJA/ADMIN: Lista de matrizadores disponibles
router.get('/matrizadores', authenticateToken, getAvailableMatrizadores);

// GET /api/documents/:id - Detalle documento (según permisos por rol)
router.get('/:id', authenticateToken, getDocumentById);

// --- RUTAS DE EDICIÓN DE DOCUMENTOS ---
// CONSERVADOR: Funcionalidad nueva que extiende las capacidades sin romper lo existente

// GET /api/documents/:id/editable-info - Obtener información editable del documento
router.get('/:id/editable-info', authenticateToken, getEditableDocumentInfo);

// PUT /api/documents/:id/update-info - Actualizar información editable del documento
router.put('/:id/update-info', authenticateToken, updateDocumentInfo);


// --- RUTAS DEL SISTEMA DE CONFIRMACIONES Y DESHACER ---
// CONSERVADOR: Nuevas funcionalidades que mantienen compatibilidad total

// POST /api/documents/undo-status-change - Deshacer último cambio de estado
router.post('/undo-status-change', authenticateToken, undoDocumentStatusChange);

// GET /api/documents/:id/undoable-changes - Obtener cambios deshacibles de un documento
router.get('/:id/undoable-changes', authenticateToken, getUndoableChanges);

// 📈 GET /api/documents/:id/history - Obtener historial completo de un documento
router.get('/:id/history', authenticateToken, getDocumentHistory);


// 🔄 POST /api/documents/bulk-status-change - Cambio de estado masivo
router.post('/bulk-status-change', authenticateToken, bulkStatusChange);

// 📱 PUT /api/documents/bulk-notify - Notificación masiva WhatsApp (CSRF Protected)
router.put('/bulk-notify', authenticateToken, csrfProtection, bulkNotify);





// 🧪 Extracción avanzada (detrás de flag): actos y comparecientes desde texto
router.post('/:id/extract-acts', authenticateToken, async (req, res, next) => {
  // Cargar perezosamente para no impactar tiempo de arranque
  const { extractDocumentActs } = await import('../controllers/document-controller.js');
  return extractDocumentActs(req, res, next);
});

// Aplicar sugerencias del último snapshot al documento (no autocompleta)
router.post('/:id/apply-extraction', authenticateToken, async (req, res, next) => {
  const { applyExtractionSuggestions } = await import('../controllers/document-controller.js');
  return applyExtractionSuggestions(req, res, next);
});

// 🎯 NUEVAS RUTAS: UI Activos/Entregados con búsqueda global
// GET /api/documents - Endpoint principal para UI unificada con pestañas
router.get('/', authenticateToken, getDocumentsUnified);

/**
 * Middleware de manejo de errores para multer
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo XML es demasiado grande (máximo 5MB)'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos. Máximo 20 archivos por lote'
      });
    }
  }

  if (error.message === 'Solo se permiten archivos XML') {
    return res.status(400).json({
      success: false,
      message: 'Formato de archivo no válido. Solo se permiten archivos XML'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

export default router; 
