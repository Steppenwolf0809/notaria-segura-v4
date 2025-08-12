import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth-middleware.js';
import {
  uploadXmlDocument,
  uploadXmlDocumentsBatch,
  getAllDocuments,
  assignDocument,
  getMyDocuments,
  updateDocumentStatus,
  getDocumentById,
  getAvailableMatrizadores,
  detectGroupableDocuments,
  createDocumentGroup,
  deliverDocumentGroup,
  // Función de entrega completa
  deliverDocument,
  // Funciones de edición
  getEditableDocumentInfo,
  updateDocumentInfo,
  // 🔗 Nueva función para agrupación inteligente
  createSmartDocumentGroup,
  // 🔄 Sistema de confirmaciones y deshacer
  undoDocumentStatusChange,
  getUndoableChanges,
  // 📈 Sistema de historial universal
  getDocumentHistory,
  // 🔗 Funciones de grupos
  updateDocumentGroupStatus,
  updateDocumentGroupInfo,
  markDocumentGroupAsReady,
  // 🔓 Desagrupar documento
  ungroupDocument
} from '../controllers/document-controller.js';

const router = express.Router();

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

// POST /api/documents/upload-xml - CAJA: Subir y procesar XML automáticamente
router.post('/upload-xml', authenticateToken, upload.single('xmlFile'), uploadXmlDocument);

// POST /api/documents/upload-xml-batch - CAJA: Subir y procesar múltiples XML en lote
router.post('/upload-xml-batch', authenticateToken, uploadBatch.array('xmlFiles', 20), uploadXmlDocumentsBatch);

// GET /api/documents/all - CAJA/ADMIN: Ver todos los documentos
router.get('/all', authenticateToken, getAllDocuments);

// PUT /api/documents/:id/assign - CAJA: Asignar documento a matrizador
router.put('/:id/assign', authenticateToken, assignDocument);

// GET /api/documents/my-documents - MATRIZADOR: Documentos del usuario
router.get('/my-documents', authenticateToken, getMyDocuments);

// 🔗 PUT /api/documents/group/status - Actualizar estado de grupo de documentos (DEBE IR ANTES QUE /:id/status)
router.put('/group/status', authenticateToken, updateDocumentGroupStatus);

// PUT /api/documents/:id/status - MATRIZADOR: Actualizar estado
router.put('/:id/status', authenticateToken, updateDocumentStatus);

// 🔓 PUT /api/documents/:id/ungroup - Desagrupar documento del grupo
router.put('/:id/ungroup', authenticateToken, ungroupDocument);

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

// --- RUTAS DE AGRUPACIÓN DE DOCUMENTOS ---

// Detectar documentos agrupables para un cliente específico
router.post('/detect-groupable', authenticateToken, detectGroupableDocuments);

// Crear un nuevo grupo de documentos
router.post('/create-group', authenticateToken, createDocumentGroup);

// Entregar un grupo completo de documentos
router.post('/deliver-group', authenticateToken, deliverDocumentGroup);

// 🔗 NUEVA RUTA: Crear grupo inteligente basado en detección automática
router.post('/create-smart-group', authenticateToken, createSmartDocumentGroup);

// --- RUTAS DEL SISTEMA DE CONFIRMACIONES Y DESHACER ---
// CONSERVADOR: Nuevas funcionalidades que mantienen compatibilidad total

// POST /api/documents/undo-status-change - Deshacer último cambio de estado
router.post('/undo-status-change', authenticateToken, undoDocumentStatusChange);

// GET /api/documents/:id/undoable-changes - Obtener cambios deshacibles de un documento
router.get('/:id/undoable-changes', authenticateToken, getUndoableChanges);

// 📈 GET /api/documents/:id/history - Obtener historial completo de un documento
router.get('/:id/history', authenticateToken, getDocumentHistory);

// 🔗 PUT /api/documents/group/info - Actualizar información compartida de grupo
router.put('/group/info', authenticateToken, updateDocumentGroupInfo);

// 🆕 POST /api/documents/group/mark-ready - Marcar grupo como listo para entrega
router.post('/group/mark-ready', authenticateToken, markDocumentGroupAsReady);

// Obtener información detallada de un grupo
// TODO: Implementar el método getGroupDetails en document-controller.js
/*
router.get('/group/:groupId',
  authenticateToken,
  getGroupDetails
);
*/


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