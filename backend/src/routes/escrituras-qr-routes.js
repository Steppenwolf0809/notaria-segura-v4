/**
 * Rutas para el módulo de escrituras QR
 * Endpoints para upload, gestión y verificación de escrituras notariales
 */

import express from 'express';
import multer from 'multer';
import { authenticateToken, requireMatrizador } from '../middleware/auth-middleware.js';
import {
  uploadEscritura,
  getEscrituras,
  getEscritura,
  updateEscritura,
  getEscrituraQR,
  verifyEscritura,
  deleteEscritura
} from '../controllers/escrituras-qr-controller.js';

const router = express.Router();

// Configuración de multer para upload de PDFs
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Verificar tipo MIME
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // Máximo 10MB
    files: 1
  }
});

/**
 * RUTAS PÚBLICAS (sin autenticación)
 */

// GET /api/verify/:token - Verificación pública de escritura
router.get('/verify/:token', verifyEscritura);

/**
 * RUTAS PROTEGIDAS (requieren autenticación)
 */

// POST /api/escrituras/upload - Subir PDF y generar QR (solo matrizadores)
router.post('/upload', 
  authenticateToken, 
  requireMatrizador, 
  upload.single('pdfFile'), 
  uploadEscritura
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

// PUT /api/escrituras/:id - Actualizar datos de escritura
router.put('/:id', 
  authenticateToken, 
  updateEscritura
);

// GET /api/escrituras/:id/qr - Generar QR para escritura
router.get('/:id/qr', 
  authenticateToken, 
  getEscrituraQR
);

// DELETE /api/escrituras/:id - Desactivar escritura
router.delete('/:id', 
  authenticateToken, 
  deleteEscritura
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

  // Error genérico
  console.error('Error en rutas de escrituras QR:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

export default router;