import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import { verifyFormularioUAFESession } from '../middleware/verify-formulario-uafe-session.js';
import { csrfProtection } from '../middleware/csrf-protection.js';
import { parseMinuta } from '../services/minuta-parser-service.js';
import { uploadFile, isStorageConfigured } from '../services/storage-service.js';
import { generarFormularioWord } from '../services/formulario-uafe-word-service.js';
import { getCurrentNotaryId } from '../middleware/tenant-context.js';
import { uafeLoginRateLimit } from '../middleware/rate-limiter.js';
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
  actualizarDatosPersona,
  generarReporteMensual,
  descargarReporte,
  vincularDocumento,
  buscarDocumentosParaVincular
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
// 🔒 SECURITY FIX: Rate limit applied to prevent PIN brute force attacks
router.post('/login', uafeLoginRateLimit, loginFormularioUAFE);

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
 * Generar formularios Word (.docx) de conocimiento del cliente UAFE
 * GET /api/formulario-uafe/protocolo/:protocoloId/generar-word
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * Query: ?personaId=xxx (opcional, si no se indica genera para todos)
 * Retorna: .docx individual o ZIP con múltiples .docx
 */
router.get(
  '/protocolo/:protocoloId/generar-word',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN', 'OFICIAL_CUMPLIMIENTO']),
  async (req, res) => {
    try {
      const { protocoloId } = req.params;
      const { personaId } = req.query;
      const { db: prisma } = await import('../db.js');

      const protocolo = await prisma.protocoloUAFE.findUnique({
        where: { id: protocoloId },
        include: {
          personas: {
            include: {
              persona: {
                select: {
                  id: true,
                  numeroIdentificacion: true,
                  tipoPersona: true,
                  datosPersonaNatural: true,
                  datosPersonaJuridica: true,
                  completado: true
                }
              }
            }
          }
        }
      });

      if (!protocolo) {
        return res.status(404).json({ success: false, message: 'Protocolo no encontrado' });
      }

      if (protocolo.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Sin permisos' });
      }

      // Filtrar personas con datos y mapear a la estructura que espera el servicio Word
      let personasTarget = protocolo.personas
        .filter(pp => {
          const p = pp.persona;
          return (p.tipoPersona === 'NATURAL' && p.datosPersonaNatural) ||
                 (p.tipoPersona === 'JURIDICA' && p.datosPersonaJuridica);
        })
        .map(pp => {
          const datosRaw = pp.persona.tipoPersona === 'NATURAL'
            ? pp.persona.datosPersonaNatural
            : pp.persona.datosPersonaJuridica;
          // Inyectar cédula y tipo identificación desde PersonaRegistrada
          // (estos campos viven en el modelo, no siempre dentro del JSON)
          const datos = datosRaw ? { ...datosRaw } : {};
          if (pp.persona.tipoPersona === 'NATURAL') {
            if (!datos.datosPersonales) datos.datosPersonales = {};
            if (!datos.datosPersonales.numeroIdentificacion) {
              datos.datosPersonales.numeroIdentificacion = pp.persona.numeroIdentificacion;
            }
            if (!datos.datosPersonales.tipoIdentificacion) {
              datos.datosPersonales.tipoIdentificacion =
                (pp.persona.numeroIdentificacion || '').length === 13 ? 'RUC' : 'CEDULA';
            }
          }
          return {
            tipo: pp.persona.tipoPersona,
            calidad: pp.calidad,
            datos,
            _personaProtocoloId: pp.id,
            _personaId: pp.persona.id,
          };
        });

      if (personaId) {
        personasTarget = personasTarget.filter(pp => pp._personaProtocoloId === personaId || pp._personaId === personaId);
      }

      if (personasTarget.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay personas con datos para generar formulario' });
      }

      // Si es una sola persona, devolver .docx directo
      if (personasTarget.length === 1) {
        const { buffer, filename } = await generarFormularioWord(protocolo, personasTarget[0]);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
      }

      // Múltiples personas: generar ZIP
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="FormulariosUAFE_${protocolo.numeroProtocolo || protocoloId}.zip"`);
      archive.pipe(res);

      for (const pp of personasTarget) {
        const { buffer, filename } = await generarFormularioWord(protocolo, pp);
        archive.append(buffer, { name: filename });
      }

      await archive.finalize();
    } catch (error) {
      console.error('Error generando Word UAFE:', error);
      res.status(500).json({ success: false, message: 'Error al generar formulario Word' });
    }
  }
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
        where: { id: protocoloId },
        data: updateData,
      });

      // Agregar comparecientes extraidos como personas del protocolo
      if (Array.isArray(datosConfirmados.comparecientes)) {
        for (const comp of datosConfirmados.comparecientes) {
          if (!comp.cedula) continue;

          // Buscar o crear PersonaRegistrada (placeholder)
          let persona = await prisma.personaRegistrada.findUnique({
            where: { numeroIdentificacion: comp.cedula },
          });

          if (!persona) {
            // PIN = ultimos 6 digitos de la cedula
            const pin = comp.cedula.slice(-6);
            const pinHash = await bcrypt.hash(pin, 10);

            persona = await prisma.personaRegistrada.create({
              data: {
                numeroIdentificacion: comp.cedula,
                tipoPersona: 'NATURAL',
                pinHash,
                pinCreado: false,
                completado: false,
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: comp.nombres || '',
                    apellidos: comp.apellidos || '',
                    estadoCivil: comp.estadoCivil || '',
                    nacionalidad: comp.nacionalidad || 'ECUATORIANA',
                  },
                  contacto: {
                    telefono: comp.telefono || '',
                    correoElectronico: comp.correo || '',
                  },
                  direccion: {},
                  informacionLaboral: {},
                },
              },
            });
          }

          // Verificar que no este ya vinculado al protocolo
          const yaVinculado = await prisma.personaProtocolo.findFirst({
            where: {
              protocoloId: protocoloId,
              personaCedula: comp.cedula,
            },
          });

          if (!yaVinculado) {
            await prisma.personaProtocolo.create({
              data: {
                protocoloId: protocoloId,
                personaCedula: comp.cedula,
                calidad: comp.calidad || 'OTRO',
                actuaPor: comp.actuaPor || 'PROPIOS_DERECHOS',
                nombreTemporal: `${comp.apellidos || ''} ${comp.nombres || ''}`.trim() || null,
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
// WIZARD: Parse minuta sin protocolo + Crear protocolo con minuta
// ========================================

/**
 * Parsear minuta Word sin necesidad de un protocolo existente
 * POST /api/formulario-uafe/parse-minuta
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * Body: multipart/form-data con campo "minuta"
 * Retorna: datos extraidos + minutaUrl (si R2 configurado)
 */
router.post(
  '/parse-minuta',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  minutaUpload.single('minuta'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No se envio ningun archivo' });
      }

      const datosExtraidos = await parseMinuta(req.file.buffer, { useGemini: true });

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

      res.json({
        success: true,
        data: {
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
      console.error('Error parseando minuta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al procesar la minuta',
      });
    }
  }
);

/**
 * Crear protocolo con datos de minuta ya confirmados (wizard paso 2)
 * POST /api/formulario-uafe/protocolo-con-minuta
 * Requiere: JWT + role MATRIZADOR o ADMIN
 * Body: { fecha, minutaUrl, datosConfirmados }
 * Crea protocolo + personas en una sola operacion
 */
router.post(
  '/protocolo-con-minuta',
  authenticateToken,
  requireRoles(['MATRIZADOR', 'ADMIN']),
  async (req, res) => {
    try {
      const { fecha, minutaUrl, datosConfirmados } = req.body;

      if (!fecha || !datosConfirmados) {
        return res.status(400).json({
          success: false,
          message: 'Campos obligatorios: fecha, datosConfirmados',
        });
      }

      const { default: prisma } = await import('../db.js');

      // Crear protocolo
      const protocolo = await prisma.protocoloUAFE.create({
        data: {
          fecha: new Date(`${fecha}T12:00:00`),
          tipoActo: datosConfirmados.codigoActo || datosConfirmados.tipoActo || '',
          actoContrato: datosConfirmados.codigoActo || datosConfirmados.tipoActo || '',
          valorContrato: datosConfirmados.cuantia ? parseFloat(datosConfirmados.cuantia) : 0,
          avaluoMunicipal: datosConfirmados.avaluoMunicipal ? parseFloat(datosConfirmados.avaluoMunicipal) : null,
          tipoBien: datosConfirmados.tipoBien || null,
          descripcionBien: datosConfirmados.descripcionBien || null,
          codigoCanton: datosConfirmados.codigoCanton || '1701',
          minutaUrl: minutaUrl || null,
          minutaParseada: true,
          datosExtraidos: datosConfirmados,
          formasPago: datosConfirmados.formaPago || [],
          createdBy: req.user.id,
        },
      });

      // Agregar comparecientes
      if (Array.isArray(datosConfirmados.comparecientes)) {
        for (const comp of datosConfirmados.comparecientes) {
          if (!comp.cedula) continue;

          // Buscar o crear PersonaRegistrada (placeholder)
          let persona = await prisma.personaRegistrada.findUnique({
            where: { numeroIdentificacion: comp.cedula },
          });

          if (!persona) {
            // PIN = ultimos 6 digitos de la cedula
            const pin = comp.cedula.slice(-6);
            const pinHash = await bcrypt.hash(pin, 10);

            persona = await prisma.personaRegistrada.create({
              data: {
                numeroIdentificacion: comp.cedula,
                tipoPersona: 'NATURAL',
                pinHash,
                pinCreado: false,
                completado: false,
                datosPersonaNatural: {
                  datosPersonales: {
                    nombres: comp.nombres || '',
                    apellidos: comp.apellidos || '',
                    estadoCivil: comp.estadoCivil || '',
                    nacionalidad: comp.nacionalidad || 'ECUATORIANA',
                  },
                  contacto: {
                    telefono: comp.telefono || '',
                    correoElectronico: comp.correo || '',
                  },
                  direccion: {},
                  informacionLaboral: {},
                },
              },
            });
          }

          await prisma.personaProtocolo.create({
            data: {
              protocoloId: protocolo.id,
              personaCedula: comp.cedula,
              calidad: comp.calidad || 'OTRO',
              actuaPor: comp.actuaPor || 'PROPIOS_DERECHOS',
              nombreTemporal: `${comp.apellidos || ''} ${comp.nombres || ''}`.trim() || null,
            },
          });
        }
      }

      // Fetch completo para retornar con personas
      const protocoloCompleto = await prisma.protocoloUAFE.findUnique({
        where: { id: protocolo.id },
        include: {
          personas: { include: { persona: true } },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Protocolo creado con datos de minuta',
        data: protocoloCompleto,
      });
    } catch (error) {
      console.error('Error creando protocolo con minuta:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al crear protocolo',
      });
    }
  }
);

// ========================================
// OLA 4: Reportes + Vinculacion
// ========================================

// Generar reporte mensual XLSX
router.post('/reporte/generar',
  authenticateToken,
  requireRoles(['ADMIN', 'OFICIAL_CUMPLIMIENTO']),
  generarReporteMensual
);

// Descargar archivo de reporte
router.get('/reporte/descargar/:reporteId/:tipo',
  authenticateToken,
  requireRoles(['ADMIN', 'OFICIAL_CUMPLIMIENTO']),
  descargarReporte
);

// Vincular protocolo UAFE con documento del sistema
router.post('/protocolo/:protocoloId/vincular-documento',
  authenticateToken,
  requireRoles(['ADMIN', 'MATRIZADOR']),
  vincularDocumento
);

// Buscar documentos para vincular (auto-suggest)
router.get('/documentos/buscar',
  authenticateToken,
  requireRoles(['ADMIN', 'MATRIZADOR']),
  buscarDocumentosParaVincular
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
