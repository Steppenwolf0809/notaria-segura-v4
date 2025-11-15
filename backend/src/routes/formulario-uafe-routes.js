import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import { verifyFormularioUAFESession } from '../middleware/verify-formulario-uafe-session.js';
import {
  crearProtocolo,
  agregarPersonaAProtocolo,
  loginFormularioUAFE,
  responderFormulario,
  listarProtocolos,
  obtenerProtocolo,
  actualizarProtocolo,
  actualizarPersonaEnProtocolo,
  eliminarPersonaDeProtocolo,
  generarPDFs,
  descargarArchivo
} from '../controllers/formulario-uafe-controller.js';

const router = express.Router();

console.log('✅ Formulario UAFE routes loaded successfully (Sistema de Protocolos)');

// ========================================
// RUTAS PÚBLICAS (Sin autenticación)
// ========================================

/**
 * Login al formulario con Protocolo + Cédula + PIN
 * POST /api/formulario-uafe/login
 */
router.post('/login', loginFormularioUAFE);

// ========================================
// RUTAS PROTEGIDAS - Usuario con sesión de formulario
// ========================================

/**
 * Enviar respuesta del formulario
 * POST /api/formulario-uafe/responder
 * Requiere: x-session-token en headers
 */
router.post('/responder', verifyFormularioUAFESession, responderFormulario);

// ========================================
// RUTAS PROTEGIDAS - Matrizador/Admin
// ========================================

/**
 * Crear nuevo protocolo
 * POST /api/formulario-uafe/protocolo
 * Requiere: JWT + role MATRIZADOR o ADMIN
 */
router.post(
  '/protocolo',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  crearProtocolo
);

/**
 * Agregar persona a un protocolo
 * POST /api/formulario-uafe/protocolo/:protocoloId/persona
 * Requiere: JWT + role MATRIZADOR o ADMIN
 */
router.post(
  '/protocolo/:protocoloId/persona',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  agregarPersonaAProtocolo
);

/**
 * Obtener detalles de un protocolo específico
 * GET /api/formulario-uafe/protocolo/:protocoloId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 */
router.get(
  '/protocolo/:protocoloId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  obtenerProtocolo
);

/**
 * Actualizar protocolo
 * PUT /api/formulario-uafe/protocolo/:protocoloId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 */
router.put(
  '/protocolo/:protocoloId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  actualizarProtocolo
);

/**
 * Actualizar persona en protocolo (cambiar rol/calidad)
 * PUT /api/formulario-uafe/protocolo/:protocoloId/persona/:personaProtocoloId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 */
router.put(
  '/protocolo/:protocoloId/persona/:personaProtocoloId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  actualizarPersonaEnProtocolo
);

/**
 * Eliminar persona de un protocolo
 * DELETE /api/formulario-uafe/protocolo/:protocoloId/persona/:personaProtocoloId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 */
router.delete(
  '/protocolo/:protocoloId/persona/:personaProtocoloId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  eliminarPersonaDeProtocolo
);

/**
 * Listar protocolos del matrizador
 * GET /api/formulario-uafe/protocolos
 * Requiere: JWT
 */
router.get(
  '/protocolos',
  authenticateToken,
  listarProtocolos
);

/**
 * Generar PDFs profesionales de formularios UAFE
 * GET /api/formulario-uafe/protocolo/:protocoloId/generar-pdfs
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * Retorna: PDF individual o ZIP con múltiples PDFs
 */
router.get(
  '/protocolo/:protocoloId/generar-pdfs',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  generarPDFs
);

/**
 * Descargar archivo temporal (PDF o ZIP)
 * GET /api/formulario-uafe/download/:folder/:filename
 */
router.get(
  '/download/:folder/:filename',
  descargarArchivo
);

// ========================================
// HEALTH CHECK
// ========================================

/**
 * GET /api/formulario-uafe/health
 * Health check para verificar que las rutas están funcionando
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Formulario UAFE routes are working (Sistema de Protocolos)',
    timestamp: new Date().toISOString(),
    version: '2.0 - Protocolo + Cédula + PIN'
  });
});

export default router;
