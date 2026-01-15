import prisma from '../db.js';
import bcrypt from 'bcryptjs';
import { generarTokenSesion } from '../utils/pin-validator.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import {
  drawHeader,
  drawDisclaimer,
  drawProtocolBox,
  drawSection,
  drawField,
  drawTextAreaField,
  drawSignature,
  drawFooter,
  getNombreCompleto,
  formatCurrency,
  formatDate,
  checkAndAddPage,
  drawFormasPago,
  drawBienesSection,
  COLORS,
  FONTS
} from '../utils/pdf-uafe-helpers.js';
import { generarEncabezado } from '../services/encabezado-generator-service.js';
import { generarComparecencia } from '../services/comparecencia-generator-service.js';
import { obtenerEstadoGeneralProtocolo } from '../services/completitud-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/**
 * Crear nuevo protocolo UAFE
 * POST /api/formulario-uafe/protocolo
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */
export async function crearProtocolo(req, res) {
  try {
    const {
      numeroProtocolo,
      fecha,
      actoContrato,
      tipoActoOtro,            // Para "OTROS" especificar
      bienInmuebleDescripcion, // Para transacciones de bienes raíces
      bienInmuebleUbicacion,
      vehiculoPlaca,            // Para venta de vehículos
      vehiculoMarca,
      vehiculoModelo,
      vehiculoAnio,
      avaluoMunicipal,
      valorContrato,
      formasPago
    } = req.body;

    // Validaciones
    if (!numeroProtocolo || !fecha || !actoContrato || !valorContrato) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: numeroProtocolo, fecha, actoContrato, valorContrato'
      });
    }

    // Validar que si es "OTROS" tenga especificación
    if (actoContrato === 'OTROS' && !tipoActoOtro?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar el tipo de acto cuando selecciona "Otros"'
      });
    }

    // Validar formasPago si se proporciona
    if (formasPago && !Array.isArray(formasPago)) {
      return res.status(400).json({
        success: false,
        message: 'formasPago debe ser un array'
      });
    }

    // Validar estructura de cada forma de pago
    if (formasPago && formasPago.length > 0) {
      for (const fp of formasPago) {
        if (!fp.tipo || !fp.monto || fp.monto <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Cada forma de pago debe tener tipo y monto válido'
          });
        }
        if (['CHEQUE', 'TRANSFERENCIA'].includes(fp.tipo) && !fp.banco) {
          return res.status(400).json({
            success: false,
            message: `El tipo de pago ${fp.tipo} requiere especificar el banco`
          });
        }
      }
    }

    // Verificar si ya existe
    const existente = await prisma.protocoloUAFE.findUnique({
      where: { numeroProtocolo }
    });

    if (existente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un protocolo con ese número'
      });
    }

    // Crear protocolo con todos los campos
    const protocolo = await prisma.protocoloUAFE.create({
      data: {
        numeroProtocolo,
        fecha: new Date(fecha),
        actoContrato,
        tipoActoOtro: tipoActoOtro || null,
        bienInmuebleDescripcion: bienInmuebleDescripcion || null,
        bienInmuebleUbicacion: bienInmuebleUbicacion || null,
        vehiculoPlaca: vehiculoPlaca || null,
        vehiculoMarca: vehiculoMarca || null,
        vehiculoModelo: vehiculoModelo || null,
        vehiculoAnio: vehiculoAnio || null,
        avaluoMunicipal: avaluoMunicipal ? parseFloat(avaluoMunicipal) : null,
        valorContrato: parseFloat(valorContrato),
        formasPago: formasPago || [],
        createdBy: req.user.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Protocolo creado exitosamente',
      data: protocolo
    });
  } catch (error) {
    console.error('Error creando protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear protocolo'
    });
  }
}

/**
 * Agregar persona a un protocolo
 * POST /api/formulario-uafe/protocolo/:protocoloId/persona
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */
export async function agregarPersonaAProtocolo(req, res) {
  try {
    const { protocoloId } = req.params;
    const { cedula, calidad, actuaPor, representadoId, datosRepresentado } = req.body;

    // Validaciones
    if (!cedula || !calidad || !actuaPor) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: cedula, calidad, actuaPor'
      });
    }

    // Verificar que el protocolo existe
    const protocolo = await prisma.protocoloUAFE.findUnique({
      where: { id: protocoloId }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    // Verificar que la persona existe en PersonaRegistrada
    const persona = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: cedula }
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Esta cédula no está registrada. La persona debe crear su cuenta primero en /registro-personal',
        registroUrl: '/registro-personal'
      });
    }

    // Verificar si ya existe EXACTAMENTE la misma entrada (Cedula + Calidad + ActuaPor)
    const existente = await prisma.personaProtocolo.findUnique({
      where: {
        protocoloId_personaCedula_calidad_actuaPor: {
          protocoloId,
          personaCedula: cedula,
          calidad,
          actuaPor
        }
      }
    });

    if (existente) {
      return res.status(409).json({
        success: false,
        message: 'Esta persona ya está agregada con esa misma calidad y rol.'
      });
    }

    // Preparar objeto data
    const dataToCreate = {
      protocoloId,
      personaCedula: cedula,
      calidad,
      actuaPor
    };

    // Agregar datos de representación si aplican
    if (actuaPor === 'REPRESENTANDO_A') {
      if (representadoId) {
        // Verificar que el representado existe
        const representado = await prisma.personaRegistrada.findUnique({
          where: { numeroIdentificacion: representadoId }
        });
        if (!representado) {
          return res.status(404).json({
            success: false,
            message: 'El representado indicado no se encuentra registrado'
          });
        }
        dataToCreate.representadoId = representadoId;
      }

      if (datosRepresentado) {
        dataToCreate.datosRepresentado = datosRepresentado;
      }
    }

    // Agregar persona al protocolo
    const personaProtocolo = await prisma.personaProtocolo.create({
      data: dataToCreate,
      include: {
        persona: {
          select: {
            numeroIdentificacion: true,
            tipoPersona: true,
            completado: true,
            datosPersonaNatural: true,
            datosPersonaJuridica: true
          }
        },
        representado: {
          select: {
            numeroIdentificacion: true,
            tipoPersona: true,
            datosPersonaNatural: true,
            datosPersonaJuridica: true
          }
        }
      }
    });

    // Extraer nombre de la persona
    let nombre = 'Sin nombre';
    if (personaProtocolo.persona.tipoPersona === 'NATURAL' && personaProtocolo.persona.datosPersonaNatural) {
      const datos = personaProtocolo.persona.datosPersonaNatural;
      if (datos.datosPersonales?.nombres && datos.datosPersonales?.apellidos) {
        nombre = `${datos.datosPersonales.nombres} ${datos.datosPersonales.apellidos}`.trim();
      }
    } else if (personaProtocolo.persona.tipoPersona === 'JURIDICA' && personaProtocolo.persona.datosPersonaJuridica) {
      const datos = personaProtocolo.persona.datosPersonaJuridica;
      if (datos.compania?.razonSocial) {
        nombre = datos.compania.razonSocial.trim();
      }
    }

    // Determinar nombre del representado para la respuesta
    let nombreRepresentado = null;
    if (personaProtocolo.representado) {
      if (personaProtocolo.representado.tipoPersona === 'NATURAL') {
        const d = personaProtocolo.representado.datosPersonaNatural;
        nombreRepresentado = `${d?.datosPersonales?.nombres || ''} ${d?.datosPersonales?.apellidos || ''}`.trim();
      } else {
        nombreRepresentado = personaProtocolo.representado.datosPersonaJuridica?.compania?.razonSocial;
      }
    } else if (personaProtocolo.datosRepresentado) {
      if (personaProtocolo.datosRepresentado.tipoPersona === 'NATURAL') {
        nombreRepresentado = `${personaProtocolo.datosRepresentado.nombres || ''} ${personaProtocolo.datosRepresentado.apellidos || ''}`.trim();
      } else {
        nombreRepresentado = personaProtocolo.datosRepresentado.razonSocial;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Persona agregada al protocolo exitosamente',
      data: {
        id: personaProtocolo.id,
        cedula: personaProtocolo.persona.numeroIdentificacion,
        nombre: nombre,
        tipoPersona: personaProtocolo.persona.tipoPersona,
        calidad: personaProtocolo.calidad,
        actuaPor: personaProtocolo.actuaPor,
        representado: nombreRepresentado ? { nombre: nombreRepresentado } : null,
        completado: personaProtocolo.completado,
        completadoAt: personaProtocolo.completadoAt,
        createdAt: personaProtocolo.createdAt
      }
    });
  } catch (error) {
    console.error('Error agregando persona al protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar persona',
      error: error.message
    });
  }
}

/**
 * Buscar persona para ser representado
 * GET /api/formulario-uafe/buscar-representado/:identificacion
 * Público - no requiere autenticación
 */
export async function buscarRepresentado(req, res) {
  try {
    const { identificacion } = req.params;

    // Validar que se proporcionó identificación
    if (!identificacion || identificacion.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Número de identificación requerido'
      });
    }

    // Buscar persona en la base de datos
    const persona = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: identificacion.trim() },
      select: {
        id: true,
        numeroIdentificacion: true,
        tipoPersona: true,
        datosPersonaNatural: true,
        datosPersonaJuridica: true,
        completado: true
      }
    });

    // Si no existe, retornar que no fue encontrado
    if (!persona) {
      return res.json({
        success: true,
        encontrado: false,
        message: 'Persona no encontrada en el sistema'
      });
    }

    // Extraer datos según el tipo de persona
    const datos = persona.tipoPersona === 'NATURAL'
      ? persona.datosPersonaNatural
      : persona.datosPersonaJuridica;

    // Determinar nombre completo
    let nombreCompleto = 'Sin nombre';
    if (persona.tipoPersona === 'NATURAL' && datos?.datosPersonales) {
      const { nombres, apellidos } = datos.datosPersonales;
      if (nombres && apellidos) {
        nombreCompleto = `${nombres} ${apellidos}`.trim();
      }
    } else if (persona.tipoPersona === 'JURIDICA' && datos?.compania?.razonSocial) {
      nombreCompleto = datos.compania.razonSocial.trim();
    }

    // Retornar datos básicos para pre-llenado
    res.json({
      success: true,
      encontrado: true,
      data: {
        id: persona.numeroIdentificacion, // Usamos numeroIdentificacion como id para la FK
        numeroIdentificacion: persona.numeroIdentificacion,
        tipoPersona: persona.tipoPersona,
        nombreCompleto: nombreCompleto,
        // Retornar datos completos solo si el formulario está completado
        datosCompletos: persona.completado ? datos : null,
        completado: persona.completado
      }
    });
  } catch (error) {
    console.error('Error buscando representado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar representado',
      error: error.message
    });
  }
}

/**
 * Login al formulario UAFE con Protocolo + Cédula + PIN
 * POST /api/formulario-uafe/login
 * Público (sin autenticación previa)
 */
export async function loginFormularioUAFE(req, res) {
  try {
    const { numeroProtocolo, cedula, pin } = req.body;

    // Validaciones
    if (!numeroProtocolo || !cedula || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    if (pin.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'El PIN debe tener 6 dígitos'
      });
    }

    // 1. Buscar el protocolo
    const protocolo = await prisma.protocoloUAFE.findUnique({
      where: { numeroProtocolo }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Número de protocolo no encontrado. Verifica con la notaría.'
      });
    }

    // 2. Verificar que la persona esté en este protocolo
    // NOTA: Como ahora puede haber múltiples entradas (mismo ID pero diferente calidad),
    // buscamos la primera válida para permitir el login.
    // Idealmente se debería permitir seleccionar el rol al hacer login, pero por ahora
    // logueamos con el primero que encontremos.
    const personaEnProtocolo = await prisma.personaProtocolo.findFirst({
      where: {
        protocoloId: protocolo.id,
        personaCedula: cedula
      },
      include: {
        persona: {
          select: {
            id: true,
            numeroIdentificacion: true,
            tipoPersona: true,
            pinHash: true,
            pinCreado: true,
            bloqueadoHasta: true,
            datosPersonaNatural: true,
            datosPersonaJuridica: true,
            completado: true
          }
        },
        protocolo: true
      }
    });

    if (!personaEnProtocolo) {
      return res.status(404).json({
        success: false,
        message: 'Tu cédula no está registrada en este protocolo. Contacta con la notaría.'
      });
    }

    // 3. Verificar si está bloqueado
    if (personaEnProtocolo.persona.bloqueadoHasta &&
      personaEnProtocolo.persona.bloqueadoHasta > new Date()) {
      const minutosRestantes = Math.ceil(
        (personaEnProtocolo.persona.bloqueadoHasta - new Date()) / 60000
      );
      return res.status(403).json({
        success: false,
        message: `Tu cuenta está bloqueada temporalmente. Intenta en ${minutosRestantes} minutos.`
      });
    }

    // 3.5. Verificar si el PIN fue reseteado
    if (!personaEnProtocolo.persona.pinCreado || !personaEnProtocolo.persona.pinHash) {
      return res.status(403).json({
        success: false,
        message: 'Tu PIN ha sido reseteado. Por favor crea un nuevo PIN en https://notaria18quito.com.ec/registro-personal/',
        pinReseteado: true
      });
    }

    // 4. Verificar PIN
    const pinValido = await bcrypt.compare(pin, personaEnProtocolo.persona.pinHash);

    if (!pinValido) {
      return res.status(401).json({
        success: false,
        message: 'PIN incorrecto. Verifica e intenta nuevamente.'
      });
    }

    // 5. Crear sesión temporal (30 minutos)
    const sessionToken = generarTokenSesion();
    const expiraEn = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.sesionFormularioUAFE.create({
      data: {
        personaProtocoloId: personaEnProtocolo.id,
        token: sessionToken,
        expiraEn,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // 6. Retornar datos completos
    res.json({
      success: true,
      message: 'Sesión iniciada correctamente',
      sessionToken,
      expiraEn: expiraEn.toISOString(),
      data: {
        protocolo: {
          numeroProtocolo: protocolo.numeroProtocolo,
          fecha: protocolo.fecha,
          actoContrato: protocolo.actoContrato,
          avaluoMunicipal: protocolo.avaluoMunicipal,
          valorContrato: protocolo.valorContrato,
          formasPago: protocolo.formasPago || []
        },
        tuRol: {
          calidad: personaEnProtocolo.calidad,
          actuaPor: personaEnProtocolo.actuaPor
        },
        tusDatos: personaEnProtocolo.persona.datosPersonaNatural ||
          personaEnProtocolo.persona.datosPersonaJuridica,
        completado: personaEnProtocolo.completado
      }
    });
  } catch (error) {
    console.error('Error login formulario UAFE:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
}

/**
 * Enviar respuesta del formulario UAFE
 * POST /api/formulario-uafe/responder
 * Requiere: middleware verifyFormularioUAFESession
 *
 * IMPORTANTE: Esta función implementa BIDIRECCIONALIDAD
 * - Actualiza PersonaProtocolo (respuesta específica del protocolo)
 * - Actualiza PersonaRegistrada (BD maestra para pre-carga en futuros protocolos)
 */
export async function responderFormulario(req, res) {
  try {
    const { representadoId, datosRepresentado, ...respuestaData } = req.body;

    // Preparar datos para actualizar PersonaProtocolo
    const dataToUpdate = {
      completado: true,
      completadoAt: new Date(),
      respuestaFormulario: respuestaData
    };

    // Si hay datos de representado, agregarlos
    if (representadoId) {
      dataToUpdate.representadoId = representadoId;
    }

    if (datosRepresentado) {
      dataToUpdate.datosRepresentado = datosRepresentado;
    }

    // PASO 1: Actualizar PersonaProtocolo con la respuesta
    const personaProtocolo = await prisma.personaProtocolo.update({
      where: { id: req.personaProtocoloVerificada.id },
      data: dataToUpdate,
      include: {
        persona: {
          select: {
            tipoPersona: true,
            numeroIdentificacion: true
          }
        }
      }
    });

    // PASO 2: BIDIRECCIONALIDAD - Actualizar PersonaRegistrada (BD maestra)
    // Esto permite que los datos se pre-carguen en futuros protocolos
    const actualizacionPersona = {
      completado: true,
      updatedAt: new Date()
    };

    // Actualizar según tipo de persona
    if (personaProtocolo.persona.tipoPersona === 'NATURAL') {
      actualizacionPersona.datosPersonaNatural = respuestaData;
    } else if (personaProtocolo.persona.tipoPersona === 'JURIDICA') {
      actualizacionPersona.datosPersonaJuridica = respuestaData;
    }

    await prisma.personaRegistrada.update({
      where: {
        numeroIdentificacion: personaProtocolo.persona.numeroIdentificacion
      },
      data: actualizacionPersona
    });

    console.log(`✅ [BIDIRECCIONALIDAD] Datos sincronizados: PersonaProtocolo + PersonaRegistrada (${personaProtocolo.persona.numeroIdentificacion})`);

    res.json({
      success: true,
      message: 'Formulario enviado exitosamente. Datos actualizados en BD maestra.',
      data: {
        completado: true,
        completadoAt: personaProtocolo.completadoAt,
        sincronizadoConBDMaestra: true
      }
    });
  } catch (error) {
    console.error('Error enviando formulario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar formulario',
      error: error.message
    });
  }
}

/**
 * Listar protocolos UAFE del matrizador
 * GET /api/formulario-uafe/protocolos
 * Requiere: authenticateToken
 */
export async function listarProtocolos(req, res) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const where = {
      createdBy: req.user.id,
      ...(search && {
        OR: [
          { numeroProtocolo: { contains: search, mode: 'insensitive' } },
          { actoContrato: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [protocolos, total] = await Promise.all([
      prisma.protocoloUAFE.findMany({
        where,
        include: {
          personas: {
            include: {
              persona: {
                select: {
                  numeroIdentificacion: true,
                  tipoPersona: true,
                  datosPersonaNatural: true,
                  datosPersonaJuridica: true,
                  completado: true
                }
              }
            }
          },
          _count: {
            select: { personas: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.protocoloUAFE.count({ where })
    ]);

    // Formatear protocolos con nombres extraídos
    const protocolosFormateados = protocolos.map(protocolo => {
      const personasFormateadas = protocolo.personas.map(pp => {
        let nombre = 'Sin nombre';

        // Extraer nombre según tipo de persona
        if (pp.persona.tipoPersona === 'NATURAL' && pp.persona.datosPersonaNatural) {
          const datos = pp.persona.datosPersonaNatural;
          if (datos.datosPersonales?.nombres && datos.datosPersonales?.apellidos) {
            nombre = `${datos.datosPersonales.nombres} ${datos.datosPersonales.apellidos}`.trim();
          }
        } else if (pp.persona.tipoPersona === 'JURIDICA' && pp.persona.datosPersonaJuridica) {
          const datos = pp.persona.datosPersonaJuridica;
          if (datos.compania?.razonSocial) {
            nombre = datos.compania.razonSocial.trim();
          }
        }

        // Determinar nombre del representado (Listar)
        let nombreRepresentado = null;
        if (pp.representado) {
          if (pp.representado.tipoPersona === 'NATURAL') {
            const d = pp.representado.datosPersonaNatural;
            nombreRepresentado = `${d?.datosPersonales?.nombres || ''} ${d?.datosPersonales?.apellidos || ''}`.trim();
          } else {
            nombreRepresentado = pp.representado.datosPersonaJuridica?.compania?.razonSocial;
          }
        } else if (pp.datosRepresentado) {
          if (pp.datosRepresentado.tipoPersona === 'NATURAL') {
            nombreRepresentado = `${pp.datosRepresentado.nombres || ''} ${pp.datosRepresentado.apellidos || ''}`.trim();
          } else {
            nombreRepresentado = pp.datosRepresentado.razonSocial;
          }
        }

        return {
          id: pp.id,
          cedula: pp.persona.numeroIdentificacion,
          nombre: nombre,
          tipoPersona: pp.persona.tipoPersona,
          calidad: pp.calidad,
          actuaPor: pp.actuaPor,
          representado: nombreRepresentado ? { nombre: nombreRepresentado } : null,
          completado: pp.completado,
          completadoAt: pp.completadoAt,
          createdAt: pp.createdAt
        };
      });

      // Calcular progreso
      const personasCompletadas = personasFormateadas.filter(p => p.completado).length;
      const totalPersonas = personasFormateadas.length;
      const progreso = totalPersonas > 0 ? Math.round((personasCompletadas / totalPersonas) * 100) : 0;

      return {
        id: protocolo.id,
        numeroProtocolo: protocolo.numeroProtocolo,
        fecha: protocolo.fecha,
        actoContrato: protocolo.actoContrato,
        valorContrato: protocolo.valorContrato,
        avaluoMunicipal: protocolo.avaluoMunicipal,
        formasPago: protocolo.formasPago || [],
        createdAt: protocolo.createdAt,
        updatedAt: protocolo.updatedAt,
        personas: personasFormateadas,
        _count: protocolo._count,
        progreso
      };
    });

    res.json({
      success: true,
      data: protocolosFormateados,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando protocolos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar protocolos'
    });
  }
}

/**
 * Obtener detalles de un protocolo específico
 * GET /api/formulario-uafe/protocolo/:protocoloId
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */
export async function obtenerProtocolo(req, res) {
  try {
    const { protocoloId } = req.params;

    const protocolo = await prisma.protocoloUAFE.findUnique({
      where: { id: protocoloId },
      include: {
        personas: {
          include: {
            persona: {
              select: {
                numeroIdentificacion: true,
                tipoPersona: true,
                datosPersonaNatural: true,
                datosPersonaJuridica: true,
                completado: true
              }
            },
            representado: {
              select: {
                numeroIdentificacion: true,
                tipoPersona: true,
                datosPersonaNatural: true,
                datosPersonaJuridica: true
              }
            }
          }
        },
        creador: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    // Verificar que el protocolo pertenece al usuario actual
    if (protocolo.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este protocolo'
      });
    }

    // Formatear personas con nombres extraídos
    const personasFormateadas = protocolo.personas.map(pp => {
      let nombre = 'Sin nombre';

      // Extraer nombre según tipo de persona
      if (pp.persona.tipoPersona === 'NATURAL' && pp.persona.datosPersonaNatural) {
        const datos = pp.persona.datosPersonaNatural;
        if (datos.datosPersonales?.nombres && datos.datosPersonales?.apellidos) {
          nombre = `${datos.datosPersonales.nombres} ${datos.datosPersonales.apellidos}`.trim();
        }
      } else if (pp.persona.tipoPersona === 'JURIDICA' && pp.persona.datosPersonaJuridica) {
        const datos = pp.persona.datosPersonaJuridica;
        if (datos.compania?.razonSocial) {
          nombre = datos.compania.razonSocial.trim();
        }
      }

      // Determinar nombre del representado
      let nombreRepresentado = null;
      if (pp.representado) {
        if (pp.representado.tipoPersona === 'NATURAL') {
          const d = pp.representado.datosPersonaNatural;
          nombreRepresentado = `${d?.datosPersonales?.nombres || ''} ${d?.datosPersonales?.apellidos || ''}`.trim();
        } else {
          nombreRepresentado = pp.representado.datosPersonaJuridica?.compania?.razonSocial;
        }
      } else if (pp.datosRepresentado) {
        if (pp.datosRepresentado.tipoPersona === 'NATURAL') {
          nombreRepresentado = `${pp.datosRepresentado.nombres || ''} ${pp.datosRepresentado.apellidos || ''}`.trim();
        } else {
          nombreRepresentado = pp.datosRepresentado.razonSocial;
        }
      }

      return {
        id: pp.id,
        cedula: pp.persona.numeroIdentificacion,
        nombre: nombre,
        tipoPersona: pp.persona.tipoPersona,
        calidad: pp.calidad,
        actuaPor: pp.actuaPor,
        representado: nombreRepresentado ? { nombre: nombreRepresentado } : null,
        completado: pp.completado,
        completadoAt: pp.completadoAt,
        respuestaFormulario: pp.respuestaFormulario,
        createdAt: pp.createdAt,
        updatedAt: pp.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        ...protocolo,
        personas: personasFormateadas
      }
    });
  } catch (error) {
    console.error('Error obteniendo protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener protocolo'
    });
  }
}

export async function actualizarProtocolo(req, res) {
  try {
    const { protocoloId } = req.params;
    const {
      numeroProtocolo,
      fecha,
      actoContrato,
      tipoActoOtro,
      bienInmuebleDescripcion,
      bienInmuebleUbicacion,
      vehiculoPlaca,
      vehiculoMarca,
      vehiculoModelo,
      vehiculoAnio,
      avaluoMunicipal,
      valorContrato,
      formasPago
    } = req.body;

    // Verificar que el protocolo existe
    const protocoloExistente = await prisma.protocoloUAFE.findUnique({
      where: { id: protocoloId }
    });

    if (!protocoloExistente) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    // Verificar permisos
    if (protocoloExistente.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para editar este protocolo'
      });
    }

    // Si se está cambiando el número de protocolo, verificar que no exista otro con ese número
    if (numeroProtocolo && numeroProtocolo !== protocoloExistente.numeroProtocolo) {
      const duplicado = await prisma.protocoloUAFE.findUnique({
        where: { numeroProtocolo }
      });

      if (duplicado) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un protocolo con ese número'
        });
      }
    }

    // Validar formasPago si se proporciona
    if (formasPago !== undefined) {
      if (!Array.isArray(formasPago)) {
        return res.status(400).json({
          success: false,
          message: 'formasPago debe ser un array'
        });
      }
      for (const fp of formasPago) {
        if (!fp.tipo || !fp.monto || fp.monto <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Cada forma de pago debe tener tipo y monto válido'
          });
        }
        if (['CHEQUE', 'TRANSFERENCIA'].includes(fp.tipo) && !fp.banco) {
          return res.status(400).json({
            success: false,
            message: `El tipo de pago ${fp.tipo} requiere especificar el banco`
          });
        }
      }
    }

    // Actualizar protocolo
    const protocoloActualizado = await prisma.protocoloUAFE.update({
      where: { id: protocoloId },
      data: {
        ...(numeroProtocolo && { numeroProtocolo }),
        ...(fecha && { fecha: new Date(fecha) }),
        ...(actoContrato && { actoContrato }),
        tipoActoOtro: tipoActoOtro || null,
        bienInmuebleDescripcion: bienInmuebleDescripcion || null,
        bienInmuebleUbicacion: bienInmuebleUbicacion || null,
        vehiculoPlaca: vehiculoPlaca || null,
        vehiculoMarca: vehiculoMarca || null,
        vehiculoModelo: vehiculoModelo || null,
        vehiculoAnio: vehiculoAnio || null,
        ...(avaluoMunicipal !== undefined && { avaluoMunicipal: parseFloat(avaluoMunicipal) }),
        ...(valorContrato !== undefined && { valorContrato: parseFloat(valorContrato) }),
        ...(formasPago !== undefined && { formasPago })
      }
    });

    res.json({
      success: true,
      message: 'Protocolo actualizado exitosamente',
      data: protocoloActualizado
    });
  } catch (error) {
    console.error('Error actualizando protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar protocolo'
    });
  }
}

/**
 * Actualizar datos de persona en protocolo (rol y calidad)
 * PUT /api/formulario-uafe/protocolo/:protocoloId/persona/:personaProtocoloId
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */
export async function actualizarPersonaEnProtocolo(req, res) {
  try {
    const { protocoloId, personaProtocoloId, personaId } = req.params;
    const personaIdFinal = personaProtocoloId || personaId; // Soportar ambos nombres
    const { calidad, actuaPor } = req.body;

    // Verificar que el protocolo existe y pertenece al usuario
    const protocolo = await prisma.protocoloUAFE.findUnique({
      where: { id: protocoloId }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    if (protocolo.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar este protocolo'
      });
    }

    // Verificar que la relación persona-protocolo existe
    const personaProtocolo = await prisma.personaProtocolo.findUnique({
      where: { id: personaIdFinal }
    });

    if (!personaProtocolo) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada en el protocolo'
      });
    }

    if (personaProtocolo.protocoloId !== protocoloId) {
      return res.status(400).json({
        success: false,
        message: 'La persona no pertenece a este protocolo'
      });
    }

    // Validar valores permitidos
    const calidadesPermitidas = ['COMPRADOR', 'VENDEDOR'];
    const actuaPorPermitidos = ['PROPIOS_DERECHOS', 'REPRESENTANDO_A'];

    if (calidad && !calidadesPermitidas.includes(calidad)) {
      return res.status(400).json({
        success: false,
        message: 'Calidad no válida'
      });
    }

    if (actuaPor && !actuaPorPermitidos.includes(actuaPor)) {
      return res.status(400).json({
        success: false,
        message: 'ActuaPor no válido'
      });
    }

    // Actualizar persona en protocolo
    const personaActualizada = await prisma.personaProtocolo.update({
      where: { id: personaIdFinal },
      data: {
        ...(calidad && { calidad }),
        ...(actuaPor && { actuaPor })
      },
      include: {
        persona: {
          select: {
            numeroIdentificacion: true,
            tipoPersona: true,
            datosPersonaNatural: true,
            datosPersonaJuridica: true
          }
        }
      }
    });

    // Extraer nombre
    let nombre = 'Sin nombre';
    if (personaActualizada.persona.tipoPersona === 'NATURAL' && personaActualizada.persona.datosPersonaNatural) {
      const datos = personaActualizada.persona.datosPersonaNatural;
      if (datos.datosPersonales?.nombres && datos.datosPersonales?.apellidos) {
        nombre = `${datos.datosPersonales.nombres} ${datos.datosPersonales.apellidos}`.trim();
      }
    } else if (personaActualizada.persona.tipoPersona === 'JURIDICA' && personaActualizada.persona.datosPersonaJuridica) {
      const datos = personaActualizada.persona.datosPersonaJuridica;
      if (datos.compania?.razonSocial) {
        nombre = datos.compania.razonSocial.trim();
      }
    }

    res.json({
      success: true,
      message: 'Datos de la persona actualizados exitosamente',
      data: {
        id: personaActualizada.id,
        cedula: personaActualizada.persona.numeroIdentificacion,
        nombre: nombre,
        tipoPersona: personaActualizada.persona.tipoPersona,
        calidad: personaActualizada.calidad,
        actuaPor: personaActualizada.actuaPor,
        completado: personaActualizada.completado,
        completadoAt: personaActualizada.completadoAt
      }
    });
  } catch (error) {
    console.error('Error actualizando persona en protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar persona en protocolo'
    });
  }
}

/**
 * Eliminar persona de un protocolo
 * DELETE /api/formulario-uafe/protocolo/:protocoloId/persona/:personaProtocoloId
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */
export async function eliminarPersonaDeProtocolo(req, res) {
  try {
    const { protocoloId, personaProtocoloId, personaId } = req.params;
    const personaIdFinal = personaProtocoloId || personaId; // Soportar ambos nombres

    // Verificar que el protocolo existe y pertenece al usuario
    const protocolo = await prisma.protocoloUAFE.findUnique({
      where: { id: protocoloId }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    if (protocolo.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar este protocolo'
      });
    }

    // Verificar que la relación persona-protocolo existe
    const personaProtocolo = await prisma.personaProtocolo.findUnique({
      where: { id: personaIdFinal }
    });

    if (!personaProtocolo) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada en el protocolo'
      });
    }

    if (personaProtocolo.protocoloId !== protocoloId) {
      return res.status(400).json({
        success: false,
        message: 'La persona no pertenece a este protocolo'
      });
    }

    // Eliminar la relación
    await prisma.personaProtocolo.delete({
      where: { id: personaIdFinal }
    });

    res.json({
      success: true,
      message: 'Persona eliminada del protocolo exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando persona del protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar persona del protocolo'
    });
  }
}

/**
 * Generar PDFs de formularios UAFE
 * POST /api/formulario-uafe/protocolo/:protocoloId/generar-pdfs
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */

/**
 * Generar PDFs profesionales de formularios UAFE
 * GET /api/formulario-uafe/protocolo/:protocoloId/generar-pdfs
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */
export async function generarPDFs(req, res) {
  try {
    const { protocoloId } = req.params;

    // 1. Obtener protocolo con todas las personas
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
        },
        creador: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    // Verificar permisos
    if (protocolo.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para generar PDFs de este protocolo'
      });
    }

    // Verificar que haya personas con datos (no necesariamente completadas)
    const personasConDatos = protocolo.personas.filter(pp => {
      const p = pp.persona;
      return (p.tipoPersona === 'NATURAL' && p.datosPersonaNatural) ||
        (p.tipoPersona === 'JURIDICA' && p.datosPersonaJuridica);
    });

    if (personasConDatos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay personas con datos suficientes en este protocolo'
      });
    }

    const pdfsGenerados = [];

    // 2. Generar PDF para cada persona con datos
    for (const personaProtocolo of personasConDatos) {
      const persona = personaProtocolo.persona;
      const datos = persona.tipoPersona === 'NATURAL'
        ? persona.datosPersonaNatural
        : persona.datosPersonaJuridica;

      if (!datos) continue;

      // Crear PDF buffer
      const pdfBuffer = await new Promise(async (resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 30, bottom: 30, left: 40, right: 40 }
          });

          const chunks = [];
          doc.on('data', chunk => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', reject);

          // === GENERAR CONTENIDO DEL PDF ===

          // Ruta del logo (si existe)
          // const logoPath = path.join(__dirname, '../../assets/images/logo-notaria18.png');
          const logoPath = null;

          // HEADER
          let currentY = drawHeader(doc, logoPath);

          // DISCLAIMER
          currentY = drawDisclaimer(doc, currentY);

          // BOX DE PROTOCOLO
          currentY = drawProtocolBox(
            doc,
            currentY,
            protocolo,
            personaProtocolo.calidad,
            personaProtocolo.actuaPor
          );

          // FORMAS DE PAGO (si existen)
          if (protocolo.formasPago && protocolo.formasPago.length > 0) {
            currentY = checkAndAddPage(doc, currentY, 100);
            currentY = drawFormasPago(doc, currentY, protocolo.formasPago);
          }

          // SECCIÓN DE BIENES (inmueble o vehículo)
          currentY = drawBienesSection(doc, currentY, protocolo);

          // SECCIÓN DE REPRESENTADO (si aplica)
          // Soporta tanto "REPRESENTANDO_A" como "REPRESENTANDO" (legacy)
          if (personaProtocolo.actuaPor === 'REPRESENTANDO_A' || personaProtocolo.actuaPor === 'REPRESENTANDO') {
            currentY = await generateRepresentadoSection(doc, currentY, personaProtocolo);
          }

          // SOLO PARA PERSONAS NATURALES
          if (persona.tipoPersona === 'NATURAL') {
            currentY = generateNaturalPersonPDF(doc, currentY, datos, persona);
          } else {
            // TODO: Implementar para personas jurídicas
            currentY = generateJuridicalPersonPDF(doc, currentY, datos, persona);
          }

          // FIRMA - Posición relativa al contenido, agregar página si no hay espacio
          currentY = checkAndAddPage(doc, currentY, 100);
          const nombreCompleto = getNombreCompleto(datos);
          drawSignature(doc, currentY + 30, nombreCompleto, persona.numeroIdentificacion);

          // FOOTER
          drawFooter(doc);

          // Finalizar documento
          doc.end();
        } catch (error) {
          reject(error);
        }
      });

      // Crear filename
      const apellidos = datos.datosPersonales?.apellidos || datos.compania?.razonSocial || 'SinNombre';
      const filename = `UAFE_${persona.numeroIdentificacion}_${apellidos.replace(/\s+/g, '_')}.pdf`;

      pdfsGenerados.push({
        filename,
        buffer: pdfBuffer,
        persona: {
          nombres: getNombreCompleto(datos),
          cedula: persona.numeroIdentificacion
        }
      });
    }

    // 3. Enviar respuesta
    if (pdfsGenerados.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo generar ningún PDF'
      });
    }

    if (pdfsGenerados.length === 1) {
      // Un solo PDF - enviar directamente
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfsGenerados[0].filename}"`);
      return res.send(pdfsGenerados[0].buffer);
    }

    // Múltiples PDFs - crear ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="UAFE_Protocolo_${protocolo.numeroProtocolo}.zip"`);

    const archive = archiver('zip', {
      zlib: { level: 9 } // Máxima compresión
    });

    archive.pipe(res);

    // Agregar cada PDF al ZIP
    pdfsGenerados.forEach(pdf => {
      archive.append(pdf.buffer, { name: pdf.filename });
    });

    archive.finalize();

  } catch (error) {
    console.error('Error generando PDFs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDFs',
      error: error.message
    });
  }
}

/**
 * Generar PDF individual de una persona
 * GET /api/formulario-uafe/protocolos/:protocoloId/personas/:personaId/pdf
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */
export async function generarPDFIndividual(req, res) {
  try {
    const { protocoloId, personaId } = req.params;

    // 1. Obtener protocolo con la persona específica
    const protocolo = await prisma.protocoloUAFE.findUnique({
      where: { id: protocoloId },
      include: {
        creador: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    // Verificar permisos
    if (protocolo.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para generar PDFs de este protocolo'
      });
    }

    // 2. Obtener la persona específica del protocolo
    const personaProtocolo = await prisma.personaProtocolo.findUnique({
      where: { id: personaId },
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
    });

    if (!personaProtocolo) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada en el protocolo'
      });
    }

    // Verificar que la persona pertenece al protocolo
    if (personaProtocolo.protocoloId !== protocoloId) {
      return res.status(400).json({
        success: false,
        message: 'La persona no pertenece a este protocolo'
      });
    }

    // Verificar que el formulario tiene datos (no necesariamente completado)
    // if (!personaProtocolo.completado) { ... } // REMOVED: Permitir generar sin completar

    const persona = personaProtocolo.persona;
    const datos = persona.tipoPersona === 'NATURAL'
      ? persona.datosPersonaNatural
      : persona.datosPersonaJuridica;

    if (!datos) {
      return res.status(400).json({
        success: false,
        message: 'No hay datos disponibles para esta persona'
      });
    }

    // 3. Generar PDF
    const pdfBuffer = await new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 30, bottom: 30, left: 40, right: 40 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // === GENERAR CONTENIDO DEL PDF ===

        // Ruta del logo (si existe)
        // const logoPath = path.join(__dirname, '../../assets/images/logo-notaria18.png');
        const logoPath = null;

        // HEADER
        let currentY = drawHeader(doc, logoPath);

        // DISCLAIMER
        currentY = drawDisclaimer(doc, currentY);

        // BOX DE PROTOCOLO
        currentY = drawProtocolBox(
          doc,
          currentY,
          protocolo,
          personaProtocolo.calidad,
          personaProtocolo.actuaPor
        );

        // FORMAS DE PAGO (si existen)
        if (protocolo.formasPago && protocolo.formasPago.length > 0) {
          currentY = checkAndAddPage(doc, currentY, 100);
          currentY = drawFormasPago(doc, currentY, protocolo.formasPago);
        }

        // SECCIÓN DE BIENES (inmueble o vehículo)
        currentY = drawBienesSection(doc, currentY, protocolo);

        // SECCIÓN DE REPRESENTADO (si aplica)
        if (personaProtocolo.actuaPor === 'REPRESENTANDO_A' || personaProtocolo.actuaPor === 'REPRESENTANDO') {
          currentY = await generateRepresentadoSection(doc, currentY, personaProtocolo);
        }

        // GENERAR PDF SEGÚN TIPO DE PERSONA
        if (persona.tipoPersona === 'NATURAL') {
          currentY = generateNaturalPersonPDF(doc, currentY, datos, persona);
        } else {
          currentY = generateJuridicalPersonPDF(doc, currentY, datos, persona);
        }

        // FIRMA - Posición relativa al contenido, agregar página si no hay espacio
        currentY = checkAndAddPage(doc, currentY, 100);
        const nombreCompleto = getNombreCompleto(datos);
        drawSignature(doc, currentY + 10, nombreCompleto, persona.numeroIdentificacion);

        // FOOTER
        drawFooter(doc);

        // Finalizar documento
        doc.end();
      } catch (error) {
        reject(error);
      }
    });

    // 4. Validar que el buffer tenga contenido válido
    console.log(`[PDF] Buffer generado: ${pdfBuffer?.length || 0} bytes para persona ${persona.numeroIdentificacion}`);

    if (!pdfBuffer || pdfBuffer.length < 1000) {
      console.error(`[PDF] ERROR: Buffer demasiado pequeño (${pdfBuffer?.length || 0} bytes). El PDF no se generó correctamente.`);
      return res.status(500).json({
        success: false,
        message: 'Error: El PDF generado está vacío o corrupto. Verifique que la persona tiene datos completos.'
      });
    }

    // 5. Crear filename y enviar PDF
    const apellidos = datos.datosPersonales?.apellidos || datos.compania?.razonSocial || 'SinNombre';
    const filename = `UAFE_${persona.numeroIdentificacion}_${apellidos.replace(/\s+/g, '_')}.pdf`;

    console.log(`[PDF] Enviando PDF: ${filename} (${pdfBuffer.length} bytes)`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('[PDF] Error generando PDF individual:', error);
    console.error('[PDF] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDF individual',
      error: error.message
    });
  }
}

/**
 * Generar sección de representado en el PDF
 */
async function generateRepresentadoSection(doc, startY, personaProtocolo) {
  let y = checkAndAddPage(doc, startY, 120);
  y = drawSection(doc, y, 'DATOS DEL REPRESENTADO', 100);

  try {
    if (personaProtocolo.representadoId) {
      // Representado existe en BD - buscar sus datos completos
      const representado = await prisma.personaRegistrada.findUnique({
        where: { numeroIdentificacion: personaProtocolo.representadoId },
        select: {
          numeroIdentificacion: true,
          tipoPersona: true,
          datosPersonaNatural: true,
          datosPersonaJuridica: true
        }
      });

      if (representado) {
        if (representado.tipoPersona === 'NATURAL') {
          const datosRep = representado.datosPersonaNatural;

          // Información Personal
          drawField(doc, 60, y, 'Apellidos', datosRep?.datosPersonales?.apellidos || 'N/A', 240);
          drawField(doc, 320, y, 'Nombres', datosRep?.datosPersonales?.nombres || 'N/A', 220);

          y += 50;
          drawField(doc, 60, y, 'Tipo Identificación', datosRep?.identificacion?.tipo || 'N/A', 140);
          drawField(doc, 220, y, 'Identificación', representado.numeroIdentificacion, 160);
          drawField(doc, 400, y, 'Nacionalidad', datosRep?.identificacion?.nacionalidad || 'N/A', 140);

          y += 50;
          drawField(doc, 60, y, 'Género', datosRep?.datosPersonales?.genero || 'N/A', 140);
          drawField(doc, 220, y, 'Estado Civil', datosRep?.datosPersonales?.estadoCivil || 'N/A', 160);
          drawField(doc, 400, y, 'Nivel Estudio', datosRep?.datosPersonales?.nivelEstudio || 'N/A', 140);

          y += 50;
          drawField(doc, 60, y, 'Profesión', datosRep?.informacionLaboral?.profesionOcupacion || 'N/A', 480);

          // Información de Contacto
          y += 60;
          y = checkAndAddPage(doc, y, 100);
          drawField(doc, 60, y, 'Email', datosRep?.contacto?.email || 'N/A', 200);
          drawField(doc, 280, y, 'Teléfono', datosRep?.contacto?.telefono || 'N/A', 130);
          drawField(doc, 430, y, 'Celular', datosRep?.contacto?.celular || 'N/A', 110);

          // Dirección
          y += 50;
          const direccionCompleta = datosRep?.direccion
            ? `${datosRep.direccion.callePrincipal || ''} ${datosRep.direccion.numero || ''} y ${datosRep.direccion.calleSecundaria || ''}`.trim()
            : 'N/A';
          drawTextAreaField(doc, 60, y, 'Dirección', direccionCompleta, 480, 40);

          y += 50;
          drawField(doc, 60, y, 'Provincia', datosRep?.direccion?.provincia || 'N/A', 160);
          drawField(doc, 240, y, 'Cantón', datosRep?.direccion?.canton || 'N/A', 160);
          drawField(doc, 420, y, 'Parroquia', datosRep?.direccion?.parroquia || 'N/A', 120);

        } else if (representado.tipoPersona === 'JURIDICA') {
          const datosRep = representado.datosPersonaJuridica;

          drawField(doc, 60, y, 'Razón Social', datosRep?.compania?.razonSocial || 'N/A', 300);
          drawField(doc, 380, y, 'RUC', representado.numeroIdentificacion, 160);

          y += 50;
          drawField(doc, 60, y, 'País Constitución', datosRep?.compania?.paisConstitucion || 'N/A', 480);

          y += 50;
          drawField(doc, 60, y, 'Email', datosRep?.contacto?.email || 'N/A', 240);
          drawField(doc, 320, y, 'Teléfono', datosRep?.contacto?.telefono || 'N/A', 220);

          y += 50;
          drawTextAreaField(doc, 60, y, 'Dirección', datosRep?.direccion?.direccionCompleta || 'N/A', 480, 40);
        }
      }
    } else if (personaProtocolo.datosRepresentado) {
      // Datos manuales del representado
      const datosRep = personaProtocolo.datosRepresentado;

      if (datosRep.tipoPersona === 'NATURAL') {
        // Información Personal
        drawField(doc, 60, y, 'Apellidos', datosRep.apellidos || 'N/A', 240);
        drawField(doc, 320, y, 'Nombres', datosRep.nombres || 'N/A', 220);

        y += 50;
        drawField(doc, 60, y, 'Tipo Identificación', datosRep.tipoIdentificacion || 'N/A', 140);
        drawField(doc, 220, y, 'Identificación', datosRep.identificacion || 'N/A', 160);
        drawField(doc, 400, y, 'Nacionalidad', datosRep.nacionalidad || 'N/A', 140);

        y += 50;
        drawField(doc, 60, y, 'Género', datosRep.genero || 'N/A', 140);
        drawField(doc, 220, y, 'Estado Civil', datosRep.estadoCivil || 'N/A', 160);
        drawField(doc, 400, y, 'Nivel Estudio', datosRep.nivelEstudio || 'N/A', 140);

        y += 50;
        drawField(doc, 60, y, 'Profesión', datosRep.profesion || 'N/A', 480);

        // Información de Contacto
        y += 60;
        y = checkAndAddPage(doc, y, 100);
        drawField(doc, 60, y, 'Email', datosRep.email || 'N/A', 200);
        drawField(doc, 280, y, 'Teléfono', datosRep.telefono || 'N/A', 130);
        drawField(doc, 430, y, 'Celular', datosRep.celular || 'N/A', 110);

        // Dirección
        y += 50;
        drawTextAreaField(doc, 60, y, 'Dirección', datosRep.direccion || 'N/A', 480, 40);

        y += 50;
        drawField(doc, 60, y, 'Provincia', datosRep.provincia || 'N/A', 160);
        drawField(doc, 240, y, 'Cantón', datosRep.canton || 'N/A', 160);
        drawField(doc, 420, y, 'Parroquia', datosRep.parroquia || 'N/A', 120);

      } else if (datosRep.tipoPersona === 'JURIDICA') {
        drawField(doc, 60, y, 'Razón Social', datosRep.razonSocial || 'N/A', 300);
        drawField(doc, 380, y, 'RUC', datosRep.ruc || 'N/A', 160);

        y += 50;
        drawField(doc, 60, y, 'País Constitución', datosRep.paisConstitucion || 'N/A', 480);

        y += 50;
        drawField(doc, 60, y, 'Email', datosRep.email || 'N/A', 240);
        drawField(doc, 320, y, 'Teléfono', datosRep.telefono || 'N/A', 220);

        y += 50;
        drawTextAreaField(doc, 60, y, 'Dirección', datosRep.direccion || 'N/A', 480, 40);
      }
    }

    y += 70;
  } catch (error) {
    console.error('Error generando sección de representado:', error);
    drawTextAreaField(doc, 60, y, 'Error', 'No se pudieron cargar los datos del representado', 480, 40);
    y += 70;
  }

  return y;
}

/**
 * Generar contenido del PDF para persona natural
 */
function generateNaturalPersonPDF(doc, startY, datos, persona) {
  let y = startY;

  // === SECCIÓN 1: IDENTIFICACIÓN ===
  y = checkAndAddPage(doc, y, 100);
  y = drawSection(doc, y, '1. Identificación', 75);

  drawField(doc, 60, y, 'Tipo de Identificación', datos.identificacion?.tipo, 140);
  drawField(doc, 220, y, 'Número de Identificación', datos.identificacion?.numero, 160);
  drawField(doc, 400, y, 'Nacionalidad', datos.identificacion?.nacionalidad, 140);

  y += 45; // Reducido de 60 a 45

  // === SECCIÓN 2: DATOS PERSONALES ===
  y = checkAndAddPage(doc, y, 130);
  y = drawSection(doc, y, '2. Datos Personales', 120);

  drawField(doc, 60, y, 'Apellidos', datos.datosPersonales?.apellidos, 230);
  drawField(doc, 310, y, 'Nombres', datos.datosPersonales?.nombres, 230);

  y += 40; // Reducido de 50 a 40
  drawField(doc, 60, y, 'Género', datos.datosPersonales?.genero, 140);
  drawField(doc, 220, y, 'Estado Civil', datos.datosPersonales?.estadoCivil, 160);
  drawField(doc, 400, y, 'Nivel de Estudio', datos.datosPersonales?.nivelEstudio, 140);

  y += 40; // Reducido de 50 a 40
  drawField(doc, 60, y, 'Correo Electrónico', datos.contacto?.email, 240);
  drawField(doc, 320, y, 'Teléfono', datos.contacto?.telefono, 110);
  drawField(doc, 450, y, 'Celular', datos.contacto?.celular, 90);

  y += 55; // Reducido de 70 a 55

  // === SECCIÓN 3: DIRECCIÓN ===
  y = checkAndAddPage(doc, y, 120);
  y = drawSection(doc, y, '3. Dirección de Domicilio', 110);

  drawField(doc, 60, y, 'Calle Principal', datos.direccion?.callePrincipal, 200);
  drawField(doc, 280, y, 'Número', datos.direccion?.numero, 100);
  drawField(doc, 400, y, 'Calle Secundaria', datos.direccion?.calleSecundaria, 140);

  y += 40; // Reducido de 50 a 40
  drawField(doc, 60, y, 'Provincia', datos.direccion?.provincia, 150);
  drawField(doc, 230, y, 'Cantón', datos.direccion?.canton, 150);
  drawField(doc, 400, y, 'Parroquia', datos.direccion?.parroquia, 140);

  y += 55; // Reducido de 70 a 55

  // === SECCIÓN 4: INFORMACIÓN LABORAL ===
  y = checkAndAddPage(doc, y, 170);
  y = drawSection(doc, y, '4. Información Laboral', 160);

  drawField(doc, 60, y, 'Situación Laboral', datos.informacionLaboral?.situacion, 200);
  drawField(doc, 280, y, 'Relación de Dependencia', datos.informacionLaboral?.relacionDependencia ? 'SÍ' : 'NO', 100);
  drawField(doc, 400, y, 'Ingreso Mensual', formatCurrency(datos.informacionLaboral?.ingresoMensual), 140);

  y += 40; // Reducido de 50 a 40
  drawField(doc, 60, y, 'Nombre de la Entidad', datos.informacionLaboral?.nombreEntidad, 240);
  drawField(doc, 320, y, 'Cargo', datos.informacionLaboral?.cargo, 220);

  y += 40; // Reducido de 50 a 40
  drawField(doc, 60, y, 'Profesión/Ocupación', datos.informacionLaboral?.profesionOcupacion, 480);

  y += 40; // Reducido de 50 a 40

  // Dirección laboral completa
  const direccionLaboral = datos.informacionLaboral?.direccionEmpresa
    ? `${datos.informacionLaboral.direccionEmpresa}, ${datos.informacionLaboral.canton || ''}, ${datos.informacionLaboral.provincia || ''}`.replace(/,\s*,/g, ',').trim()
    : null;
  drawTextAreaField(doc, 60, y, 'Dirección Laboral', direccionLaboral, 480, 36);

  y += 65; // Reducido de 80 a 65

  // === SECCIÓN 5: INFORMACIÓN DEL CÓNYUGE (si aplica) ===
  const tieneConyuge = datos.conyuge?.nombres && datos.conyuge?.apellidos;
  if (tieneConyuge) {
    y = checkAndAddPage(doc, y, 150);
    y = drawSection(doc, y, '5. Información del Cónyuge', 140);

    drawField(doc, 60, y, 'Apellidos', datos.conyuge?.apellidos, 230);
    drawField(doc, 310, y, 'Nombres', datos.conyuge?.nombres, 230);

    y += 40; // Reducido de 50 a 40
    drawField(doc, 60, y, 'Tipo ID', datos.conyuge?.tipoIdentificacion, 100);
    drawField(doc, 180, y, 'Número de Identificación', datos.conyuge?.numeroIdentificacion, 180);
    drawField(doc, 380, y, 'Nacionalidad', datos.conyuge?.nacionalidad, 160);

    y += 40; // Reducido de 50 a 40
    drawField(doc, 60, y, 'Correo Electrónico', datos.conyuge?.email, 240);
    drawField(doc, 320, y, 'Celular', datos.conyuge?.celular, 220);

    y += 40; // Reducido de 50 a 40
    // Soportar múltiples nombres del campo profesión (profesion, profesionOcupacion)
    const profesionConyuge = datos.conyuge?.profesion || datos.conyuge?.profesionOcupacion || datos.informacionConyuge?.profesion || datos.informacionConyuge?.profesionOcupacion;
    drawField(doc, 60, y, 'Profesión', profesionConyuge, 240);
    drawField(doc, 320, y, 'Situación Laboral', datos.conyuge?.situacionLaboral, 220);

    y += 55; // Reducido de 70 a 55
  }

  // === SECCIÓN 6: PERSONA POLÍTICAMENTE EXPUESTA (PEP) - FORMATO INLINE COMPACTO ===
  y = checkAndAddPage(doc, y, 60);

  // Título de sección PEP
  doc.fillColor(COLORS.primary)
    .fontSize(9)
    .font(FONTS.title)
    .text('6. PERSONA POLÍTICAMENTE EXPUESTA (PEP)', 60, y);

  y += 16;

  // Obtener valores PEP
  const esPEP = datos.pep?.esPersonaExpuesta ? 'SÍ' : 'NO';
  const esFamiliarPEP = datos.pep?.esFamiliarPEP ? 'SÍ' : 'NO';
  const esColaboradorPEP = datos.pep?.esColaboradorPEP ? 'SÍ' : 'NO';

  // Formato inline compacto - tres columnas
  doc.fillColor(COLORS.textDark)
    .fontSize(8)
    .font(FONTS.normal);

  // Columna 1: ¿Es PEP?
  doc.font(FONTS.title).text('¿Es PEP?: ', 60, y, { continued: true })
    .font(FONTS.normal).text(esPEP, { bold: esPEP === 'SÍ' });

  // Columna 2: ¿Familiar PEP?
  doc.font(FONTS.title).text('¿Familiar PEP?: ', 220, y, { continued: true })
    .font(FONTS.normal).text(esFamiliarPEP, { bold: esFamiliarPEP === 'SÍ' });

  // Columna 3: ¿Colaborador PEP?
  doc.font(FONTS.title).text('¿Colaborador PEP?: ', 400, y, { continued: true })
    .font(FONTS.normal).text(esColaboradorPEP, { bold: esColaboradorPEP === 'SÍ' });

  y += 18;

  // Si hay detalles adicionales (relación o tipo colaborador), mostrarlos en línea adicional
  if ((datos.pep?.esFamiliarPEP && datos.pep?.relacionPEP) || (datos.pep?.esColaboradorPEP && datos.pep?.tipoColaborador)) {
    doc.fontSize(7).font(FONTS.italic).fillColor(COLORS.textMedium);
    let detalles = [];
    if (datos.pep?.esFamiliarPEP && datos.pep?.relacionPEP) {
      detalles.push(`Relación: ${datos.pep.relacionPEP}`);
    }
    if (datos.pep?.esColaboradorPEP && datos.pep?.tipoColaborador) {
      detalles.push(`Tipo: ${datos.pep.tipoColaborador}`);
    }
    doc.text(detalles.join(' | '), 60, y, { width: 480 });
    y += 15;
  }

  return y + 20;
}

/**
 * Generar contenido del PDF para persona jurídica
 */
function generateJuridicalPersonPDF(doc, startY, datos, persona) {
  let y = startY;

  // === SECCIÓN 1: IDENTIFICACIÓN DE LA COMPAÑÍA ===
  y = checkAndAddPage(doc, y, 120);
  y = drawSection(doc, y, '1. Identificación de la Compañía', 110);

  drawField(doc, 60, y, 'Razón Social', datos.compania?.razonSocial, 480);

  y += 40;
  drawField(doc, 60, y, 'RUC', datos.compania?.ruc || persona.numeroIdentificacion, 160);
  drawField(doc, 240, y, 'Objeto Social', datos.compania?.objetoSocial, 300);

  y += 55;

  // === SECCIÓN 2: DIRECCIÓN DE LA COMPAÑÍA ===
  y = checkAndAddPage(doc, y, 100);
  y = drawSection(doc, y, '2. Dirección de la Compañía', 90);

  drawField(doc, 60, y, 'Calle Principal', datos.direccionCompania?.callePrincipal, 200);
  drawField(doc, 280, y, 'Número', datos.direccionCompania?.numero, 100);
  drawField(doc, 400, y, 'Calle Secundaria', datos.direccionCompania?.calleSecundaria, 140);

  y += 40;
  drawField(doc, 60, y, 'Provincia', datos.direccionCompania?.provincia, 150);
  drawField(doc, 230, y, 'Cantón', datos.direccionCompania?.canton, 150);
  drawField(doc, 400, y, 'Parroquia', datos.direccionCompania?.parroquia, 140);

  y += 55;

  // === SECCIÓN 3: CONTACTO DE LA COMPAÑÍA ===
  y = checkAndAddPage(doc, y, 80);
  y = drawSection(doc, y, '3. Contacto de la Compañía', 70);

  drawField(doc, 60, y, 'Email', datos.contactoCompania?.email, 200);
  drawField(doc, 280, y, 'Teléfono', datos.contactoCompania?.telefono, 130);
  drawField(doc, 430, y, 'Celular', datos.contactoCompania?.celular, 110);

  y += 55;

  // === SECCIÓN 4: REPRESENTANTE LEGAL ===
  y = checkAndAddPage(doc, y, 200);
  y = drawSection(doc, y, '4. Representante Legal', 190);

  const rep = datos.representanteLegal || {};

  drawField(doc, 60, y, 'Apellidos', rep.apellidos, 230);
  drawField(doc, 310, y, 'Nombres', rep.nombres, 230);

  y += 40;
  drawField(doc, 60, y, 'Tipo ID', rep.tipoIdentificacion, 100);
  drawField(doc, 180, y, 'Número ID', rep.numeroIdentificacion, 160);
  drawField(doc, 360, y, 'Nacionalidad', rep.nacionalidad, 180);

  y += 40;
  drawField(doc, 60, y, 'Género', rep.genero, 140);
  drawField(doc, 220, y, 'Estado Civil', rep.estadoCivil, 160);
  drawField(doc, 400, y, 'Nivel Estudio', rep.nivelEstudio, 140);

  y += 40;
  drawField(doc, 60, y, 'Email', rep.email, 200);
  drawField(doc, 280, y, 'Teléfono', rep.telefono, 130);
  drawField(doc, 430, y, 'Celular', rep.celular, 110);

  // Dirección del representante
  if (rep.direccion) {
    y += 40;
    const direccionRep = `${rep.direccion.callePrincipal || ''} ${rep.direccion.numero || ''} y ${rep.direccion.calleSecundaria || ''}`.trim();
    drawTextAreaField(doc, 60, y, 'Dirección Domiciliaria', direccionRep, 480, 36);
  }

  // Información laboral del representante
  if (rep.informacionLaboral) {
    y += 50;
    y = checkAndAddPage(doc, y, 80);
    drawField(doc, 60, y, 'Situación Laboral', rep.informacionLaboral.situacion, 160);
    drawField(doc, 240, y, 'Rel. Dependencia', rep.informacionLaboral.relacionDependencia ? 'SÍ' : 'NO', 100);
    drawField(doc, 360, y, 'Ingreso Mensual', formatCurrency(rep.informacionLaboral.ingresoMensual), 180);

    y += 40;
    drawField(doc, 60, y, 'Profesión/Ocupación', rep.informacionLaboral.profesionOcupacion, 480);
  }

  y += 55;

  // === SECCIÓN 5: CÓNYUGE DEL REPRESENTANTE (si aplica) ===
  const conyuge = datos.conyugeRepresentante || {};
  const tieneConyuge = conyuge.nombres && conyuge.apellidos;

  if (tieneConyuge) {
    y = checkAndAddPage(doc, y, 150);
    y = drawSection(doc, y, '5. Cónyuge del Representante Legal', 140);

    drawField(doc, 60, y, 'Apellidos', conyuge.apellidos, 230);
    drawField(doc, 310, y, 'Nombres', conyuge.nombres, 230);

    y += 40;
    drawField(doc, 60, y, 'Tipo ID', conyuge.tipoIdentificacion, 100);
    drawField(doc, 180, y, 'Número ID', conyuge.numeroIdentificacion, 160);
    drawField(doc, 360, y, 'Nacionalidad', conyuge.nacionalidad, 180);

    y += 40;
    drawField(doc, 60, y, 'Email', conyuge.email, 240);
    drawField(doc, 320, y, 'Celular', conyuge.celular, 220);

    y += 40;
    drawField(doc, 60, y, 'Profesión', conyuge.profesionOcupacion, 480);

    y += 55;
  }

  // === SECCIÓN 6: SOCIOS/ACCIONISTAS ===
  const socios = datos.socios || [];
  if (socios.length > 0) {
    y = checkAndAddPage(doc, y, 80 + (socios.length * 35));
    y = drawSection(doc, y, `${tieneConyuge ? '6' : '5'}. Socios / Accionistas`, 70 + (socios.length * 35));

    // Header de tabla
    doc.fillColor(COLORS.primary).fontSize(8).font(FONTS.title);
    doc.text('Nombres y Apellidos', 60, y, { width: 200 });
    doc.text('Identificación', 270, y, { width: 100 });
    doc.text('Teléfono', 380, y, { width: 80 });
    doc.text('Celular', 470, y, { width: 70 });

    y += 18;

    socios.forEach((socio, index) => {
      doc.fillColor(COLORS.textDark).fontSize(8).font(FONTS.normal);
      doc.text(socio.nombresApellidos || 'N/A', 60, y, { width: 200 });
      doc.text(socio.identificacion || 'N/A', 270, y, { width: 100 });
      doc.text(socio.telefono || 'N/A', 380, y, { width: 80 });
      doc.text(socio.celular || 'N/A', 470, y, { width: 70 });
      y += 18;
    });

    y += 35;
  }

  // === SECCIÓN 7: PEP ===
  y = checkAndAddPage(doc, y, 60);

  const pepSectionNum = tieneConyuge ? (socios.length > 0 ? '7' : '6') : (socios.length > 0 ? '6' : '5');
  doc.fillColor(COLORS.primary)
    .fontSize(9)
    .font(FONTS.title)
    .text(`${pepSectionNum}. PERSONA POLÍTICAMENTE EXPUESTA (PEP)`, 60, y);

  y += 16;

  const pep = datos.pep || {};
  const esPEP = pep.esPersonaExpuesta ? 'SÍ' : 'NO';
  const esFamiliarPEP = pep.esFamiliarPEP ? 'SÍ' : 'NO';
  const esColaboradorPEP = pep.esColaboradorPEP ? 'SÍ' : 'NO';

  doc.fillColor(COLORS.textDark).fontSize(8).font(FONTS.normal);

  doc.font(FONTS.title).text('¿Es PEP?: ', 60, y, { continued: true })
    .font(FONTS.normal).text(esPEP, { bold: esPEP === 'SÍ' });

  doc.font(FONTS.title).text('¿Familiar PEP?: ', 220, y, { continued: true })
    .font(FONTS.normal).text(esFamiliarPEP, { bold: esFamiliarPEP === 'SÍ' });

  doc.font(FONTS.title).text('¿Colaborador PEP?: ', 400, y, { continued: true })
    .font(FONTS.normal).text(esColaboradorPEP, { bold: esColaboradorPEP === 'SÍ' });

  y += 25;

  // === SECCIÓN 8: BENEFICIARIO FINAL (si aplica) ===
  const beneficiario = datos.beneficiarioFinal || {};
  const tieneBeneficiario = beneficiario.nombres || beneficiario.apellidos;

  if (tieneBeneficiario) {
    y = checkAndAddPage(doc, y, 80);
    const benefSectionNum = parseInt(pepSectionNum) + 1;
    y = drawSection(doc, y, `${benefSectionNum}. Beneficiario Final`, 70);

    drawField(doc, 60, y, 'Apellidos', beneficiario.apellidos, 230);
    drawField(doc, 310, y, 'Nombres', beneficiario.nombres, 230);

    y += 40;
    drawField(doc, 60, y, 'Tipo ID', beneficiario.tipoIdentificacion, 140);
    drawField(doc, 220, y, 'Número ID', beneficiario.numeroIdentificacion, 320);
  }

  return y + 30;
}
export async function descargarArchivo(req, res) {
  try {
    const { folder, filename } = req.params;

    const filePath = path.join(__dirname, '../../temp', folder, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar archivo'
    });
  }
}

/**
 * Listar TODOS los protocolos (solo para ADMIN)
 * GET /api/formulario-uafe/admin/protocolos
 * Requiere: authenticateToken + role ADMIN
 */
export async function listarTodosProtocolos(req, res) {
  try {
    const { page = 1, limit = 20, search = '', matrizador = '' } = req.query;

    const where = {
      ...(search && {
        OR: [
          { numeroProtocolo: { contains: search, mode: 'insensitive' } },
          { actoContrato: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(matrizador && {
        createdBy: parseInt(matrizador)
      })
    };

    const [protocolos, total] = await Promise.all([
      prisma.protocoloUAFE.findMany({
        where,
        include: {
          personas: {
            include: {
              persona: {
                select: {
                  numeroIdentificacion: true,
                  tipoPersona: true,
                  datosPersonaNatural: true,
                  datosPersonaJuridica: true,
                  completado: true
                }
              }
            }
          },
          creador: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.protocoloUAFE.count({ where })
    ]);

    // Formatear protocolos con nombres de personas
    const protocolosFormateados = protocolos.map(protocolo => {
      const personasFormateadas = protocolo.personas.map(pp => {
        let nombre = 'Sin nombre';

        if (pp.persona.tipoPersona === 'NATURAL' && pp.persona.datosPersonaNatural) {
          const datos = pp.persona.datosPersonaNatural;
          if (datos.datosPersonales?.nombres && datos.datosPersonales?.apellidos) {
            nombre = `${datos.datosPersonales.nombres} ${datos.datosPersonales.apellidos}`.trim();
          }
        } else if (pp.persona.tipoPersona === 'JURIDICA' && pp.persona.datosPersonaJuridica) {
          const datos = pp.persona.datosPersonaJuridica;
          if (datos.compania?.razonSocial) {
            nombre = datos.compania.razonSocial.trim();
          }
        }

        return {
          id: pp.id,
          cedula: pp.personaCedula,
          nombre,
          calidad: pp.calidad,
          actuaPor: pp.actuaPor,
          completado: pp.completado,
          completadoAt: pp.completadoAt
        };
      });

      return {
        id: protocolo.id,
        numeroProtocolo: protocolo.numeroProtocolo,
        fecha: protocolo.fecha,
        actoContrato: protocolo.actoContrato,
        avaluoMunicipal: protocolo.avaluoMunicipal,
        valorContrato: protocolo.valorContrato,
        formasPago: protocolo.formasPago || [],
        createdAt: protocolo.createdAt,
        updatedAt: protocolo.updatedAt,
        creador: {
          id: protocolo.creador.id,
          nombre: `${protocolo.creador.firstName} ${protocolo.creador.lastName}`,
          email: protocolo.creador.email,
          role: protocolo.creador.role
        },
        personas: personasFormateadas,
        totalPersonas: personasFormateadas.length,
        personasCompletadas: personasFormateadas.filter(p => p.completado).length
      };
    });

    res.json({
      success: true,
      data: protocolosFormateados,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al listar todos los protocolos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar protocolos'
    });
  }
}

/**
 * Eliminar un protocolo completo
 * DELETE /api/formulario-uafe/admin/protocolo/:protocoloId
 * (Ahora permite también al creador eliminar su propio protocolo)
 */
export async function eliminarProtocolo(req, res) {
  try {
    const { protocoloId } = req.params;

    // Verificar que el protocolo existe
    const protocolo = await prisma.protocoloUAFE.findUnique({
      where: { id: protocoloId },
      include: {
        personas: true,
        creador: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    // Verificar permisos: Admin o Creador
    if (req.user.role !== 'ADMIN' && protocolo.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para eliminar este protocolo'
      });
    }

    // Eliminar protocolo (cascade eliminará las personas asociadas)
    await prisma.protocoloUAFE.delete({
      where: { id: protocoloId }
    });

    res.json({
      success: true,
      message: 'Protocolo eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar protocolo'
    });
  }
}

/**
 * Listar todas las personas registradas con estadísticas de actividad
 * GET /api/formulario-uafe/admin/personas-registradas
 * Requiere: authenticateToken + role ADMIN
 * 
 * Funcionalidad de análisis UAFE:
 * - Muestra todas las personas registradas
 * - Incluye conteo de protocolos y montos totales
 * - Indicadores de alerta para actividad inusual
 */
export async function listarPersonasRegistradas(req, res) {
  try {
    const { page = 1, limit = 20, search = '', soloAlertas = 'false' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtro de búsqueda
    const where = search ? {
      OR: [
        { numeroIdentificacion: { contains: search, mode: 'insensitive' } },
        { datosPersonaNatural: { path: ['datosPersonales', 'nombres'], string_contains: search } },
        { datosPersonaNatural: { path: ['datosPersonales', 'apellidos'], string_contains: search } }
      ]
    } : {};

    // Obtener personas con sus protocolos
    const personas = await prisma.personaRegistrada.findMany({
      where,
      include: {
        protocolos: {
          include: {
            protocolo: {
              select: {
                id: true,
                numeroProtocolo: true,
                actoContrato: true,
                valorContrato: true,
                fecha: true,
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: parseInt(limit)
    });

    // Procesar datos y calcular estadísticas
    const personasConStats = personas.map(persona => {
      const protocolosData = persona.protocolos || [];
      const totalProtocolos = protocolosData.length;

      // Calcular monto total de todos los protocolos
      const montoTotal = protocolosData.reduce((sum, pp) => {
        const valor = parseFloat(pp.protocolo?.valorContrato) || 0;
        return sum + valor;
      }, 0);

      // Obtener última actividad
      const ultimaActividad = protocolosData.length > 0
        ? protocolosData.sort((a, b) => new Date(b.protocolo?.createdAt) - new Date(a.protocolo?.createdAt))[0]?.protocolo?.createdAt
        : persona.createdAt;

      // Extraer datos personales
      const datosNatural = persona.datosPersonaNatural || {};
      const datosJuridica = persona.datosPersonaJuridica || {};

      let nombre = 'Sin nombre';
      let email = 'N/A';
      let telefono = 'N/A';
      let ingresoMensual = 0;
      let profesion = 'N/A';

      if (persona.tipoPersona === 'NATURAL') {
        const dp = datosNatural.datosPersonales || datosNatural || {};
        const contacto = datosNatural.contacto || {};
        const laboral = datosNatural.informacionLaboral || {};

        // Intentar varias rutas para obtener nombre
        const nombres = dp.nombres || datosNatural.nombres || '';
        const apellidos = dp.apellidos || datosNatural.apellidos || '';
        nombre = `${nombres} ${apellidos}`.trim();

        if (!nombre) nombre = 'Sin nombre';

        email = contacto.email || datosNatural.email || 'N/A';
        telefono = contacto.celular || contacto.telefono || datosNatural.telefono || datosNatural.celular || 'N/A';
        ingresoMensual = parseFloat(laboral.ingresoMensual || datosNatural.ingresoMensual) || 0;
        profesion = laboral.profesionOcupacion || laboral.profesion || datosNatural.profesion || 'N/A';
      } else {
        const comp = datosJuridica.compania || {};
        const contacto = datosJuridica.contacto || {};

        nombre = comp.razonSocial || 'Sin nombre';
        email = contacto.email || 'N/A';
        telefono = contacto.telefono || 'N/A';
      }

      // Determinar si tiene alerta (>3 protocolos o monto alto vs ingreso)
      const tieneAlertaProtocolos = totalProtocolos > 3;
      const tieneAlertaMonto = ingresoMensual > 0 && montoTotal > (ingresoMensual * 12); // Monto mayor a ingreso anual
      const tieneAlerta = tieneAlertaProtocolos || tieneAlertaMonto;

      return {
        id: persona.id,
        numeroIdentificacion: persona.numeroIdentificacion,
        tipoPersona: persona.tipoPersona,
        nombre,
        email,
        telefono,
        profesion,
        ingresoMensual,
        totalProtocolos,
        montoTotal,
        ultimaActividad,
        fechaRegistro: persona.createdAt,
        completado: persona.completado,
        tieneAlerta,
        motivoAlerta: tieneAlerta
          ? (tieneAlertaProtocolos ? `${totalProtocolos} protocolos` : 'Monto alto vs ingreso')
          : null,
        // Lista resumida de protocolos para detalle
        protocolosResumen: protocolosData.slice(0, 10).map(pp => ({
          id: pp.protocolo?.id,
          numeroProtocolo: pp.protocolo?.numeroProtocolo,
          actoContrato: pp.protocolo?.actoContrato,
          valorContrato: pp.protocolo?.valorContrato,
          fecha: pp.protocolo?.fecha,
          calidad: pp.calidad
        }))
      };
    });

    // Filtrar solo alertas si se solicita
    const personasFiltradas = soloAlertas === 'true'
      ? personasConStats.filter(p => p.tieneAlerta)
      : personasConStats;

    // Obtener total para paginación
    const total = await prisma.personaRegistrada.count({ where });

    // Calcular KPIs
    const kpis = {
      totalPersonas: total,
      personasConAlerta: personasConStats.filter(p => p.tieneAlerta).length,
      montoTotalProcesado: personasConStats.reduce((sum, p) => sum + p.montoTotal, 0)
    };

    res.json({
      success: true,
      data: personasFiltradas,
      kpis,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: offset + personasFiltradas.length < total
      }
    });

  } catch (error) {
    console.error('Error listando personas registradas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener personas registradas',
      error: error.message
    });
  }
}

/**
 * Eliminar una persona registrada (solo ADMIN)
 * DELETE /api/formulario-uafe/admin/personas-registradas/:cedula
 * Requiere: JWT + role ADMIN
 * 
 * NOTA: Primero elimina las relaciones en PersonaProtocolo, luego la persona.
 * Si la persona tiene protocolos activos, se puede forzar la eliminación con ?force=true
 */
export async function eliminarPersonaRegistrada(req, res) {
  try {
    const { cedula } = req.params;
    const { force } = req.query;

    if (!cedula) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el número de identificación'
      });
    }

    // Verificar que la persona existe
    const persona = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: cedula },
      include: {
        protocolos: {
          select: { id: true, protocoloId: true }
        }
      }
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    // Si tiene protocolos asociados y no se fuerza, advertir
    if (persona.protocolos.length > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Esta persona está asociada a ${persona.protocolos.length} protocolo(s). Use ?force=true para eliminar igualmente.`,
        protocolosCount: persona.protocolos.length
      });
    }

    // Eliminar en transacción: primero relaciones, luego persona
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar relaciones con protocolos
      if (persona.protocolos.length > 0) {
        await tx.personaProtocolo.deleteMany({
          where: { personaCedula: cedula }
        });
      }

      // 2. Eliminar la persona
      await tx.personaRegistrada.delete({
        where: { numeroIdentificacion: cedula }
      });
    });

    console.log(`[ADMIN] Persona eliminada: ${cedula} por ${req.user.email}`);

    res.json({
      success: true,
      message: 'Persona eliminada exitosamente',
      cedula
    });

  } catch (error) {
    console.error('Error eliminando persona registrada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar persona',
      error: error.message
    });
  }
}

/**
 * Generar textos notariales (encabezado y comparecencia)
 * POST /api/formulario-uafe/protocolo/:protocoloId/generar-textos
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 * 
 * Genera el encabezado estructurado y la comparecencia con negritas HTML.
 * Guarda los textos en cache de BD y retorna ambos.
 */
export async function generarTextos(req, res) {
  try {
    const { protocoloId } = req.params;
    const { forzar = false } = req.body; // Si true, regenera aunque ya exista

    // 1. Obtener el protocolo con todos los participantes
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
          },
          orderBy: { orden: 'asc' }
        }
      }
    });

    if (!protocolo) {
      return res.status(404).json({
        success: false,
        message: 'Protocolo no encontrado'
      });
    }

    // Verificar permisos: solo el creador o ADMIN
    if (protocolo.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para generar textos de este protocolo'
      });
    }

    // 2. Verificar completitud de todos los participantes
    const estadoGeneral = await obtenerEstadoGeneralProtocolo(protocoloId);

    if (!estadoGeneral.puedeGenerar) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden generar textos. Hay participantes con datos incompletos.',
        estadoGeneral,
        participantesIncompletos: estadoGeneral.participantes
          .filter(p => p.estado !== 'completo')
          .map(p => ({
            cedula: p.cedulaRuc,
            nombre: p.nombreCompleto || p.nombreTemporal,
            estado: p.estado,
            porcentaje: p.porcentaje,
            faltantes: p.camposFaltantes
          }))
      });
    }

    // 3. Verificar si ya hay textos en cache y no se fuerza regeneración
    if (!forzar && protocolo.textoEncabezadoGenerado && protocolo.textoComparecenciaGenerado) {
      return res.json({
        success: true,
        message: 'Textos recuperados de cache',
        fromCache: true,
        fechaGeneracion: protocolo.fechaUltimaGeneracion,
        data: {
          encabezado: protocolo.textoEncabezadoGenerado,
          comparecencia: protocolo.textoComparecenciaGenerado
        }
      });
    }

    // 4. Generar encabezado
    const resultadoEncabezado = generarEncabezado(protocolo, protocolo.personas);

    if (!resultadoEncabezado.success) {
      return res.status(400).json({
        success: false,
        message: 'Error generando encabezado',
        error: resultadoEncabezado.error
      });
    }

    // 5. Generar comparecencia
    const resultadoComparecencia = generarComparecencia(protocolo, protocolo.personas, { formatoHtml: true });

    if (!resultadoComparecencia.success) {
      return res.status(400).json({
        success: false,
        message: 'Error generando comparecencia',
        error: resultadoComparecencia.error
      });
    }

    // 6. Guardar en cache
    await prisma.protocoloUAFE.update({
      where: { id: protocoloId },
      data: {
        textoEncabezadoGenerado: resultadoEncabezado.encabezado,
        textoComparecenciaGenerado: resultadoComparecencia.comparecenciaHtml,
        fechaUltimaGeneracion: new Date()
      }
    });

    console.log(`[UAFE] Textos generados para protocolo ${protocolo.numeroProtocolo || protocolo.identificadorTemporal}`);

    // 7. Retornar textos
    res.json({
      success: true,
      message: 'Textos generados exitosamente',
      fromCache: false,
      fechaGeneracion: new Date().toISOString(),
      data: {
        encabezado: resultadoEncabezado.encabezado,
        comparecencia: resultadoComparecencia.comparecencia,
        comparecenciaHtml: resultadoComparecencia.comparecenciaHtml
      }
    });

  } catch (error) {
    console.error('Error generando textos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar textos notariales',
      error: error.message
    });
  }
}

