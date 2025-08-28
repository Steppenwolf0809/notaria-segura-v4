import express from 'express'
import multer from 'multer'
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js'
import { uploadPdf, extractData, previewConcuerdo, generateDocuments, applyAutoFixes, getOcrHealth } from '../controllers/concuerdo-controller.js'

const router = express.Router()

// Solo MATRIZADOR (y ARCHIVO opcionalmente en futuro). Por ahora: MATRIZADOR
const requireMatrizador = requireRoles(['MATRIZADOR'])

// Multer configuración segura para PDFs hasta 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
    if (!isPdf) return cb(new Error('Solo se permiten archivos PDF'))
    cb(null, true)
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
})

// POST /api/concuerdos/upload-pdf
router.post('/upload-pdf', authenticateToken, requireMatrizador, upload.single('pdfFile'), uploadPdf)

// POST /api/concuerdos/extract-data
router.post('/extract-data', authenticateToken, requireMatrizador, extractData)

// POST /api/concuerdos/preview (opcional Sprint 1)
router.post('/preview', authenticateToken, requireMatrizador, previewConcuerdo)

// POST /api/concuerdos/generate-documents
router.post('/generate-documents', authenticateToken, requireMatrizador, generateDocuments)

// POST /api/concuerdos/apply-fixes
router.post('/apply-fixes', authenticateToken, requireMatrizador, applyAutoFixes)

// GET /api/concuerdos/ocr-health
router.get('/ocr-health', authenticateToken, requireMatrizador, getOcrHealth)

// Manejo de errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'El archivo PDF es demasiado grande (máximo 10MB)' })
    }
  }
  if (error && error.message === 'Solo se permiten archivos PDF') {
    return res.status(400).json({ success: false, message: 'Formato de archivo no válido. Solo PDF' })
  }
  next(error)
})

export default router


