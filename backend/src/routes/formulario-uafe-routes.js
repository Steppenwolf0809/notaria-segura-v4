import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import { verifyFormularioUAFESession } from '../middleware/verify-formulario-uafe-session.js';
import {
  crearProtocolo,
  agregarPersonaAProtocolo,
  loginFormularioUAFE,
  responderFormulario,
  listarProtocolos,
  obtenerProtocolo
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
 * Listar protocolos del matrizador
 * GET /api/formulario-uafe/protocolos
 * Requiere: JWT
 */
router.get(
  '/protocolos',
  authenticateToken,
  listarProtocolos
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
