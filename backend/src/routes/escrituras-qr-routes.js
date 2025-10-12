/**
 * Rutas para el módulo de escrituras QR
 * Endpoints para upload, gestión y verificación de escrituras notariales
 */

import express from 'express';
import multer from 'multer';
import { authenticateToken, requireMatrizador } from '../middleware/auth-middleware.js';
import {
  uploadEscritura,
  createEscrituraManual,
  getEscrituras,
  getEscritura,
  updateEscritura,
  getEscrituraQR,
  verifyEscritura,
  deleteEscritura,
  hardDeleteEscritura,
  uploadPDFToEscritura,
  getPDFPublic,
  getPDFPrivate,
  getPDFMetadata,
  updatePDFHiddenPages
} from '../controllers/escrituras-qr-controller.js';

const router = express.Router();

// Configuración de multer para upload de PDFs y fotos
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Verificar tipo según el nombre del campo
    if (file.fieldname === 'pdfFile') {
      // Para PDF
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
      }
    } else if (file.fieldname === 'foto') {
      // Para fotos
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (validImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
      }
    } else {
      cb(new Error('Campo de archivo no reconocido'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // Máximo 10MB por archivo
    files: 2 // Permitir PDF + foto
  }
});

/**
 * RUTAS PÚBLICAS (sin autenticación)
 */

// GET /api/verify/:token - Verificación pública de escritura
router.get('/verify/:token', verifyEscritura);

// GET /api/verify/:token/pdf/metadata - Obtener metadata del PDF (incluyendo páginas ocultas)
router.get('/verify/:token/pdf/metadata', getPDFMetadata);

// GET /api/verify/:token/pdf - Obtener PDF público de escritura
router.get('/verify/:token/pdf', getPDFPublic);

/**
 * RUTAS PROTEGIDAS (requieren autenticación)
 */

// POST /api/escrituras/upload - Subir PDF y generar QR (solo matrizadores)
// Acepta 'pdfFile' (obligatorio) y 'foto' (opcional)
router.post('/upload', 
  authenticateToken, 
  requireMatrizador, 
  upload.fields([
    { name: 'pdfFile', maxCount: 1 },
    { name: 'foto', maxCount: 1 }
  ]), 
  uploadEscritura
);

// POST /api/escrituras/manual - Crear escritura manualmente (solo matrizadores)
// Acepta 'data' (JSON con los datos) y 'foto' (opcional)
router.post('/manual',
  authenticateToken,
  requireMatrizador,
  upload.fields([
    { name: 'foto', maxCount: 1 }
  ]),
  createEscrituraManual
);

// GET /api/escrituras - Listar escrituras del usuario
router.get('/', 
  authenticateToken, 
  getEscrituras
);

// GET /api/escrituras/:id - Obtener escritura específica
router.get('/:id', 
  authenticateToken, 
  getEscritura
);

// PUT /api/escrituras/:id - Actualizar datos de escritura (soporta foto opcional)
router.put('/:id', 
  authenticateToken,
  upload.fields([
    { name: 'foto', maxCount: 1 }
  ]),
  updateEscritura
);

// GET /api/escrituras/:id/qr - Generar QR para escritura
router.get('/:id/qr', 
  authenticateToken, 
  getEscrituraQR
);

// DELETE /api/escrituras/:id - Desactivar escritura (soft delete)
router.delete('/:id', 
  authenticateToken, 
  deleteEscritura
);

// DELETE /api/escrituras/:id/hard-delete - Eliminar permanentemente escritura
router.delete('/:id/hard-delete',
  authenticateToken,
  requireMatrizador,
  hardDeleteEscritura
);

// POST /api/escrituras/:id/pdf - Subir PDF completo de escritura (protegido)
router.post('/:id/pdf',
  authenticateToken,
  upload.single('pdfFile'),
  uploadPDFToEscritura
);

// GET /api/escrituras/:id/pdf - Obtener PDF de escritura por ID (protegido)
router.get('/:id/pdf',
  authenticateToken,
  getPDFPrivate
);

// PUT /api/escrituras/:id/pdf-hidden-pages - Actualizar páginas ocultas (protegido)
router.put('/:id/pdf-hidden-pages',
  authenticateToken,
  updatePDFHiddenPages
);

/**
 * Middleware de manejo de errores para multer
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo PDF es demasiado grande (máximo 10MB)'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Solo se permite un archivo por vez'
      });
    }
  }
  
  if (error.message === 'Solo se permiten archivos PDF') {
    return res.status(400).json({
      success: false,
      message: 'Formato de archivo no válido. Solo se permiten archivos PDF'
    });
  }
  
  if (error.message === 'Solo se permiten imágenes JPG, PNG o WEBP') {
    return res.status(400).json({
      success: false,
      message: 'Formato de imagen no válido. Solo se permiten JPG, PNG o WEBP'
    });
  }

  // Error genérico
  console.error('Error en rutas de escrituras QR:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

export default router;