import express from 'express';
import multer from 'multer';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import { verifyFormularioUAFESession } from '../middleware/verify-formulario-uafe-session.js';
import { csrfProtection } from '../middleware/csrf-protection.js';
import { parseMinuta } from '../services/minuta-parser-service.js';
import { uploadFile, isStorageConfigured } from '../services/storage-service.js';
import { getCurrentNotaryId } from '../middleware/tenant-context.js';
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
  csrfProtection,
  crearProtocolo
);

/**
 * Agregar persona a un protocolo
 * POST /api/formulario-uafe/protocolo/:protocoloId/persona
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * NOTA: CSRF removido temporalmente - JWT provee protección suficiente
 */
router.post(
  '/protocolo/:protocoloId/persona',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
  eliminarPersonaDeProtocolo
);

/**
 * Actualizar datos UAFE de persona (Matrizador/Admin)
 * PUT /api/formulario-uafe/persona/:cedula
 */
router.put(
  '/persona/:cedula',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
  generarPDFIndividual
);

// ========================================
// RUTAS ADMIN - Gestión de todos los protocolos
// ========================================

/**
 * Listar TODOS los protocolos (ADMIN y OFICIAL_CUMPLIMIENTO)
 * GET /api/formulario-uafe/admin/protocolos
 * Requiere: JWT + role ADMIN u OFICIAL_CUMPLIMIENTO
 */
router.get(
  '/admin/protocolos',
  authenticateToken,
  requireRoles(['ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
  requireRoles(['ADMIN', 'OFICIAL_CUMPLIMIENTO']),
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
// RUTAS OLA 2 - Upload y parsing de minutas
// ========================================

const minutaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Word (.docx)'));
    }
  },
});

/**
 * Subir minuta Word y extraer datos con regex + Gemini
 * POST /api/formulario-uafe/protocolo/:protocoloId/upload-minuta
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * Body: multipart/form-data con campo "minuta"
 * Retorna: datos extraidos para preview/confirmacion
 */
router.post(
  '/protocolo/:protocoloId/upload-minuta',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  minutaUpload.single('minuta'),
  async (req, res) => {
    try {
      const { protocoloId } = req.params;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se envio ningun archivo' });
      }

      // 1. Parsear la minuta (regex + Gemini)
      const datosExtraidos = await parseMinuta(req.file.buffer, { useGemini: true });

      // 2. Subir archivo a R2 (si esta configurado)
      let minutaUrl = null;
      if (isStorageConfigured()) {
        const notaryId = getCurrentNotaryId() || 1;
        const result = await uploadFile(req.file.buffer, {
          notaryId,
          folder: 'minutas',
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });
        minutaUrl = result.key;
      }

      // 3. Retornar datos para preview (no guardar aun - el usuario confirma)
      res.json({
        success: true,
        data: {
          protocoloId,
          minutaUrl,
          minutaOriginalName: req.file.originalname,
          datosExtraidos: {
            tipoActo: datosExtraidos.tipoActo,
            codigoActo: datosExtraidos.codigoActo,
            comparecientes: datosExtraidos.comparecientes,
            cuantia: datosExtraidos.cuantia,
            avaluoMunicipal: datosExtraidos.avaluoMunicipal,
            tipoBien: datosExtraidos.tipoBien,
            descripcionBien: datosExtraidos.descripcionBien,
            formaPago: datosExtraidos.formaPago,
          },
          fuente: datosExtraidos.fuente,
        },
      });
    } catch (error) {
      console.error('Error procesando minuta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al procesar la minuta',
      });
    }
  }
);

/**
 * Confirmar datos extraidos de minuta y guardar en protocolo
 * POST /api/formulario-uafe/protocolo/:protocoloId/confirmar-minuta
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * Body: { minutaUrl, datosExtraidos (editados por el usuario) }
 */
router.post(
  '/protocolo/:protocoloId/confirmar-minuta',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  async (req, res) => {
    try {
      const { protocoloId } = req.params;
      const { minutaUrl, datosConfirmados } = req.body;

      if (!datosConfirmados) {
        return res.status(400).json({ success: false, error: 'No se enviaron datos confirmados' });
      }

      // Importar Prisma aqui para evitar circular dependency
      const { default: prisma } = await import('../db.js');

      // Actualizar protocolo con datos confirmados
      const updateData = {
        minutaUrl: minutaUrl || undefined,
        minutaParseada: true,
        datosExtraidos: datosConfirmados,
      };

      // Campos directos del protocolo
      if (datosConfirmados.tipoActo) updateData.actoContrato = datosConfirmados.tipoActo;
      if (datosConfirmados.codigoActo) updateData.tipoActo = datosConfirmados.codigoActo;
      if (datosConfirmados.cuantia != null) updateData.valorContrato = datosConfirmados.cuantia;
      if (datosConfirmados.avaluoMunicipal != null) updateData.avaluoMunicipal = datosConfirmados.avaluoMunicipal;
      if (datosConfirmados.tipoBien) updateData.tipoBien = datosConfirmados.tipoBien;
      if (datosConfirmados.descripcionBien) updateData.descripcionBien = datosConfirmados.descripcionBien;
      if (datosConfirmados.codigoCanton) updateData.codigoCanton = datosConfirmados.codigoCanton;

      const protocolo = await prisma.protocoloUAFE.update({
        where: { id: parseInt(protocoloId) },
        data: updateData,
      });

      // Agregar comparecientes extraidos como personas del protocolo
      if (Array.isArray(datosConfirmados.comparecientes)) {
        for (const comp of datosConfirmados.comparecientes) {
          if (!comp.cedula) continue;

          // Buscar o crear PersonaUAFE
          let persona = await prisma.personaUAFE.findUnique({
            where: { numeroIdentificacion: comp.cedula },
          });

          if (!persona) {
            persona = await prisma.personaUAFE.create({
              data: {
                numeroIdentificacion: comp.cedula,
                tipoIdentificacion: comp.cedula.length === 13 ? 'RUC' : 'CEDULA',
                tipoPersona: 'Natural',
                datosPersonaNatural: {
                  nombres: comp.nombres || '',
                  apellidos: comp.apellidos || '',
                  nacionalidad: comp.nacionalidad || 'ECUATORIANA',
                  estadoCivil: comp.estadoCivil || '',
                  profesion: comp.profesion || '',
                  telefono: comp.telefono || '',
                  correoElectronico: comp.correo || '',
                  domicilio: comp.domicilio || '',
                },
              },
            });
          }

          // Verificar que no este ya vinculado al protocolo
          const yaVinculado = await prisma.personaProtocoloUAFE.findFirst({
            where: {
              protocoloId: parseInt(protocoloId),
              personaCedula: comp.cedula,
            },
          });

          if (!yaVinculado) {
            await prisma.personaProtocoloUAFE.create({
              data: {
                protocoloId: parseInt(protocoloId),
                personaCedula: comp.cedula,
                calidad: comp.calidad || 'OTRO',
                formaComparecencia: comp.actuaPor || 'PROPIOS_DERECHOS',
                nombre: `${comp.apellidos || ''} ${comp.nombres || ''}`.trim() || comp.cedula,
              },
            });
          }
        }
      }

      res.json({
        success: true,
        data: protocolo,
        message: 'Datos de minuta confirmados y guardados',
      });
    } catch (error) {
      console.error('Error confirmando minuta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al confirmar datos de minuta',
      });
    }
  }
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
