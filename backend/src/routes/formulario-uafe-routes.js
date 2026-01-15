import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import { verifyFormularioUAFESession } from '../middleware/verify-formulario-uafe-session.js';
import { csrfProtection } from '../middleware/csrf-protection.js';
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
  generarPDFIndividual,
  descargarArchivo,
  buscarRepresentado,
  listarTodosProtocolos,
  eliminarProtocolo,
  listarPersonasRegistradas,
  eliminarPersonaRegistrada,
  generarTextos,
  actualizarDatosPersona
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

/**
 * Buscar persona para ser representado (por cédula/RUC)
 * GET /api/formulario-uafe/buscar-representado/:identificacion
 * Público - no requiere autenticación (para pre-llenar datos)
 */
router.get('/buscar-representado/:identificacion', buscarRepresentado);

// ========================================
// RUTAS PROTEGIDAS - Usuario con sesión de formulario
// ========================================

/**
 * Enviar respuesta del formulario
 * POST /api/formulario-uafe/responder
 * Requiere: x-session-token en headers
 * CSRF Protected - Requiere token CSRF
 */
router.post('/responder', verifyFormularioUAFESession, responderFormulario);

// ========================================
// RUTAS PROTEGIDAS - Matrizador/Admin
// ========================================

/**
 * Crear nuevo protocolo
 * POST /api/formulario-uafe/protocolo
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * CSRF Protected - Requiere token CSRF
 */
router.post(
  '/protocolo',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  csrfProtection,
  crearProtocolo
);

/**
 * Agregar persona a un protocolo
 * POST /api/formulario-uafe/protocolo/:protocoloId/persona
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * CSRF Protected - Requiere token CSRF
 */
router.post(
  '/protocolo/:protocoloId/persona',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  csrfProtection,
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
 * CSRF Protected - Requiere token CSRF
 */
router.put(
  '/protocolo/:protocoloId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  csrfProtection,
  actualizarProtocolo
);

/**
 * Eliminar protocolo
 * DELETE /api/formulario-uafe/protocolo/:protocoloId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * CSRF Protected - Requiere token CSRF
 */
router.delete(
  '/protocolo/:protocoloId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  csrfProtection,
  eliminarProtocolo
);

/**
 * Actualizar persona en protocolo (cambiar rol/calidad)
 * PUT /api/formulario-uafe/protocolo/:protocoloId/persona/:personaProtocoloId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * CSRF Protected - Requiere token CSRF
 */
router.put(
  '/protocolo/:protocoloId/persona/:personaProtocoloId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  csrfProtection,
  actualizarPersonaEnProtocolo
);

/**
 * Eliminar persona de un protocolo
 * DELETE /api/formulario-uafe/protocolo/:protocoloId/persona/:personaProtocoloId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * CSRF Protected - Requiere token CSRF
 */
router.delete(
  '/protocolo/:protocoloId/persona/:personaProtocoloId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  csrfProtection,
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
 * Generar textos notariales (encabezado y comparecencia)
 * POST /api/formulario-uafe/protocolo/:protocoloId/generar-textos
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * Body: { forzar: boolean } - Si true, regenera aunque ya exista en cache
 */
router.post(
  '/protocolo/:protocoloId/generar-textos',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  generarTextos
);

/**
 * Descargar archivo temporal (PDF o ZIP)
 * GET /api/formulario-uafe/download/:folder/:filename
 */
router.get(
  '/download/:folder/:filename',
  descargarArchivo
);

/**
 * Actualizar persona en protocolo (PATCH - alternativa path)
 * PATCH /api/formulario-uafe/protocolos/:protocoloId/personas/:personaId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 */
router.patch(
  '/protocolos/:protocoloId/personas/:personaId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  actualizarPersonaEnProtocolo
);

/**
 * Eliminar persona de protocolo (DELETE - alternativa path)
 * DELETE /api/formulario-uafe/protocolos/:protocoloId/personas/:personaId
 * Requiere: JWT + role MATRIZADOR o ADMIN
 */
router.delete(
  '/protocolos/:protocoloId/personas/:personaId',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  eliminarPersonaDeProtocolo
);

/**
 * Actualizar datos UAFE de persona (Matrizador/Admin)
 * PUT /api/formulario-uafe/persona/:cedula
 */
router.put(
  '/persona/:cedula',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  csrfProtection,
  actualizarDatosPersona
);

/**
 * Generar PDF individual de una persona
 * GET /api/formulario-uafe/protocolos/:protocoloId/personas/:personaId/pdf
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * Retorna: PDF individual de la persona
 */
router.get(
  '/protocolos/:protocoloId/personas/:personaId/pdf',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  generarPDFIndividual
);

// ========================================
// RUTAS ADMIN - Gestión de todos los protocolos
// ========================================

/**
 * Listar TODOS los protocolos (solo para ADMIN)
 * GET /api/formulario-uafe/admin/protocolos
 * Requiere: JWT + role ADMIN
 */
router.get(
  '/admin/protocolos',
  authenticateToken,
  requireRoles(['ADMIN']),
  listarTodosProtocolos
);

/**
 * Eliminar un protocolo completo (solo para ADMIN)
 * DELETE /api/formulario-uafe/admin/protocolo/:protocoloId
 * Requiere: JWT + role ADMIN
 * CSRF Protected - Requiere token CSRF
 */
router.delete(
  '/admin/protocolo/:protocoloId',
  authenticateToken,
  requireRoles(['ADMIN']),
  csrfProtection,
  eliminarProtocolo
);

/**
 * Listar personas registradas con estadísticas de actividad (Análisis UAFE)
 * GET /api/formulario-uafe/admin/personas-registradas
 * Requiere: JWT + role ADMIN
 * 
 * Query params:
 * - page: número de página (default: 1)
 * - limit: registros por página (default: 20)
 * - search: búsqueda por cédula o nombre
 * - soloAlertas: 'true' para filtrar solo personas con alertas
 */
router.get(
  '/admin/personas-registradas',
  authenticateToken,
  requireRoles(['ADMIN']),
  listarPersonasRegistradas
);

/**
 * Eliminar una persona registrada (solo ADMIN)
 * DELETE /api/formulario-uafe/admin/personas-registradas/:cedula
 * Requiere: JWT + role ADMIN
 * CSRF Protected
 * Query params:
 * - force: 'true' para forzar eliminación aunque tenga protocolos asociados
 */
router.delete(
  '/admin/personas-registradas/:cedula',
  authenticateToken,
  requireRoles(['ADMIN']),
  csrfProtection,
  eliminarPersonaRegistrada
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
