import prisma from '../db.js';
import bcrypt from 'bcrypt';
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
  checkAndAddPage
} from '../utils/pdf-uafe-helpers.js';

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
      avaluoMunicipal,
      valorContrato,
      formaPago
    } = req.body;

    // Validaciones
    if (!numeroProtocolo || !fecha || !actoContrato || !valorContrato) {
      return res.status(400).json({
        success: false,
        message: 'Campos obligatorios: numeroProtocolo, fecha, actoContrato, valorContrato'
      });
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

    // Crear protocolo
    const protocolo = await prisma.protocoloUAFE.create({
      data: {
        numeroProtocolo,
        fecha: new Date(fecha),
        actoContrato,
        avaluoMunicipal: avaluoMunicipal ? parseFloat(avaluoMunicipal) : null,
        valorContrato: parseFloat(valorContrato),
        formaPago: formaPago || {},
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
    const { cedula, calidad, actuaPor } = req.body;

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

    // Verificar que no esté ya en el protocolo
    const existente = await prisma.personaProtocolo.findUnique({
      where: {
        protocoloId_personaCedula: {
          protocoloId,
          personaCedula: cedula
        }
      }
    });

    if (existente) {
      return res.status(409).json({
        success: false,
        message: 'Esta persona ya está agregada a este protocolo'
      });
    }

    // Agregar persona al protocolo
    const personaProtocolo = await prisma.personaProtocolo.create({
      data: {
        protocoloId,
        personaCedula: cedula,
        calidad,
        actuaPor
      },
      include: {
        persona: {
          select: {
            numeroIdentificacion: true,
            tipoPersona: true,
            completado: true,
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
        completado: personaProtocolo.completado,
        completadoAt: personaProtocolo.completadoAt,
        createdAt: personaProtocolo.createdAt
      }
    });
  } catch (error) {
    console.error('Error agregando persona al protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar persona'
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
    const personaEnProtocolo = await prisma.personaProtocolo.findUnique({
      where: {
        protocoloId_personaCedula: {
          protocoloId: protocolo.id,
          personaCedula: cedula
        }
      },
      include: {
        persona: {
          select: {
            id: true,
            numeroIdentificacion: true,
            tipoPersona: true,
            pinHash: true,
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
          formaPago: protocolo.formaPago
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
 */
export async function responderFormulario(req, res) {
  try {
    const { representadoId, datosRepresentado, ...respuestaData } = req.body;

    // Preparar datos para actualizar
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

    // Actualizar PersonaProtocolo con la respuesta
    const personaProtocolo = await prisma.personaProtocolo.update({
      where: { id: req.personaProtocoloVerificada.id },
      data: dataToUpdate
    });

    res.json({
      success: true,
      message: 'Formulario enviado exitosamente',
      data: {
        completado: true,
        completadoAt: personaProtocolo.completadoAt
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

        return {
          id: pp.id,
          cedula: pp.persona.numeroIdentificacion,
          nombre: nombre,
          tipoPersona: pp.persona.tipoPersona,
          calidad: pp.calidad,
          actuaPor: pp.actuaPor,
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
        formaPago: protocolo.formaPago,
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

      return {
        id: pp.id,
        cedula: pp.persona.numeroIdentificacion,
        nombre: nombre,
        tipoPersona: pp.persona.tipoPersona,
        calidad: pp.calidad,
        actuaPor: pp.actuaPor,
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
      avaluoMunicipal,
      valorContrato,
      formaPago
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

    // Actualizar protocolo
    const protocoloActualizado = await prisma.protocoloUAFE.update({
      where: { id: protocoloId },
      data: {
        ...(numeroProtocolo && { numeroProtocolo }),
        ...(fecha && { fecha: new Date(fecha) }),
        ...(actoContrato && { actoContrato }),
        ...(avaluoMunicipal !== undefined && { avaluoMunicipal: parseFloat(avaluoMunicipal) }),
        ...(valorContrato !== undefined && { valorContrato: parseFloat(valorContrato) }),
        ...(formaPago && { formaPago })
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

    // Verificar que haya personas completadas
    const personasCompletadas = protocolo.personas.filter(pp => pp.completado);
    if (personasCompletadas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay personas con formularios completados en este protocolo'
      });
    }

    const pdfsGenerados = [];

    // 2. Generar PDF para cada persona completada
    for (const personaProtocolo of personasCompletadas) {
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
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
          });

          const chunks = [];
          doc.on('data', chunk => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', reject);

          // === GENERAR CONTENIDO DEL PDF ===

          // Ruta del logo (si existe)
          const logoPath = path.join(__dirname, '../../assets/images/logo-notaria.png');

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

          // FIRMA
          const nombreCompleto = getNombreCompleto(datos);
          drawSignature(doc, 650, nombreCompleto, persona.numeroIdentificacion);

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

    // Verificar que el formulario está completado
    if (!personaProtocolo.completado) {
      return res.status(400).json({
        success: false,
        message: 'El formulario de esta persona no ha sido completado'
      });
    }

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
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // === GENERAR CONTENIDO DEL PDF ===

        // Ruta del logo (si existe)
        const logoPath = path.join(__dirname, '../../assets/images/logo-notaria.png');

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

        // FIRMA
        const nombreCompleto = getNombreCompleto(datos);
        drawSignature(doc, 650, nombreCompleto, persona.numeroIdentificacion);

        // FOOTER
        drawFooter(doc);

        // Finalizar documento
        doc.end();
      } catch (error) {
        reject(error);
      }
    });

    // 4. Crear filename y enviar PDF
    const apellidos = datos.datosPersonales?.apellidos || datos.compania?.razonSocial || 'SinNombre';
    const filename = `UAFE_${persona.numeroIdentificacion}_${apellidos.replace(/\s+/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generando PDF individual:', error);
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
  y = checkAndAddPage(doc, y, 120);
  y = drawSection(doc, y, '1. Identificación', 90);

  drawField(doc, 60, y, 'Tipo de Identificación', datos.identificacion?.tipo, 140);
  drawField(doc, 220, y, 'Número de Identificación', datos.identificacion?.numero, 160);
  drawField(doc, 400, y, 'Nacionalidad', datos.identificacion?.nacionalidad, 140);

  y += 60;

  // === SECCIÓN 2: DATOS PERSONALES ===
  y = checkAndAddPage(doc, y, 150);
  y = drawSection(doc, y, '2. Datos Personales', 140);

  drawField(doc, 60, y, 'Apellidos', datos.datosPersonales?.apellidos, 230);
  drawField(doc, 310, y, 'Nombres', datos.datosPersonales?.nombres, 230);

  y += 50;
  drawField(doc, 60, y, 'Género', datos.datosPersonales?.genero, 140);
  drawField(doc, 220, y, 'Estado Civil', datos.datosPersonales?.estadoCivil, 160);
  drawField(doc, 400, y, 'Nivel de Estudio', datos.datosPersonales?.nivelEstudio, 140);

  y += 50;
  drawField(doc, 60, y, 'Correo Electrónico', datos.contacto?.email, 240);
  drawField(doc, 320, y, 'Teléfono', datos.contacto?.telefono, 110);
  drawField(doc, 450, y, 'Celular', datos.contacto?.celular, 90);

  y += 70;

  // === SECCIÓN 3: DIRECCIÓN ===
  y = checkAndAddPage(doc, y, 150);
  y = drawSection(doc, y, '3. Dirección de Domicilio', 140);

  drawField(doc, 60, y, 'Calle Principal', datos.direccion?.callePrincipal, 200);
  drawField(doc, 280, y, 'Número', datos.direccion?.numero, 100);
  drawField(doc, 400, y, 'Calle Secundaria', datos.direccion?.calleSecundaria, 140);

  y += 50;
  drawField(doc, 60, y, 'Provincia', datos.direccion?.provincia, 150);
  drawField(doc, 230, y, 'Cantón', datos.direccion?.canton, 150);
  drawField(doc, 400, y, 'Parroquia', datos.direccion?.parroquia, 140);

  y += 70;

  // === SECCIÓN 4: INFORMACIÓN LABORAL ===
  y = checkAndAddPage(doc, y, 200);
  y = drawSection(doc, y, '4. Información Laboral', 190);

  drawField(doc, 60, y, 'Situación Laboral', datos.informacionLaboral?.situacion, 200);
  drawField(doc, 280, y, 'Relación de Dependencia', datos.informacionLaboral?.relacionDependencia ? 'SÍ' : 'NO', 100);
  drawField(doc, 400, y, 'Ingreso Mensual', formatCurrency(datos.informacionLaboral?.ingresoMensual), 140);

  y += 50;
  drawField(doc, 60, y, 'Nombre de la Entidad', datos.informacionLaboral?.nombreEntidad, 240);
  drawField(doc, 320, y, 'Cargo', datos.informacionLaboral?.cargo, 220);

  y += 50;
  drawField(doc, 60, y, 'Profesión/Ocupación', datos.informacionLaboral?.profesionOcupacion, 480);

  y += 50;

  // Dirección laboral completa
  const direccionLaboral = datos.informacionLaboral?.direccionEmpresa
    ? `${datos.informacionLaboral.direccionEmpresa}, ${datos.informacionLaboral.canton || ''}, ${datos.informacionLaboral.provincia || ''}`.replace(/,\s*,/g, ',').trim()
    : null;
  drawTextAreaField(doc, 60, y, 'Dirección Laboral', direccionLaboral, 480, 40);

  y += 80;

  // === SECCIÓN 5: INFORMACIÓN DEL CÓNYUGE (si aplica) ===
  const tieneConyuge = datos.conyuge?.nombres && datos.conyuge?.apellidos;
  if (tieneConyuge) {
    y = checkAndAddPage(doc, y, 180);
    y = drawSection(doc, y, '5. Información del Cónyuge', 170);

    drawField(doc, 60, y, 'Apellidos', datos.conyuge?.apellidos, 230);
    drawField(doc, 310, y, 'Nombres', datos.conyuge?.nombres, 230);

    y += 50;
    drawField(doc, 60, y, 'Tipo ID', datos.conyuge?.tipoIdentificacion, 100);
    drawField(doc, 180, y, 'Número de Identificación', datos.conyuge?.numeroIdentificacion, 180);
    drawField(doc, 380, y, 'Nacionalidad', datos.conyuge?.nacionalidad, 160);

    y += 50;
    drawField(doc, 60, y, 'Correo Electrónico', datos.conyuge?.email, 240);
    drawField(doc, 320, y, 'Celular', datos.conyuge?.celular, 220);

    y += 50;
    drawField(doc, 60, y, 'Profesión', datos.conyuge?.profesion, 240);
    drawField(doc, 320, y, 'Situación Laboral', datos.conyuge?.situacionLaboral, 220);

    y += 70;
  }

  // === SECCIÓN 6: PERSONA POLÍTICAMENTE EXPUESTA (PEP) ===
  y = checkAndAddPage(doc, y, 120);
  y = drawSection(doc, y, '6. Persona Políticamente Expuesta (PEP)', 110);

  drawField(doc, 60, y, '¿Es Persona Expuesta Políticamente?', datos.pep?.esPersonaExpuesta ? 'SÍ' : 'NO', 200);
  drawField(doc, 280, y, '¿Es Familiar de PEP?', datos.pep?.esFamiliarPEP ? 'SÍ' : 'NO', 130);
  drawField(doc, 430, y, '¿Es Colaborador de PEP?', datos.pep?.esColaboradorPEP ? 'SÍ' : 'NO', 110);

  y += 50;
  if (datos.pep?.esFamiliarPEP && datos.pep?.relacionPEP) {
    drawField(doc, 60, y, 'Relación con PEP', datos.pep.relacionPEP, 240);
  }
  if (datos.pep?.esColaboradorPEP && datos.pep?.tipoColaborador) {
    drawField(doc, 320, y, 'Tipo de Colaborador', datos.pep.tipoColaborador, 220);
  }

  return y + 100;
}

/**
 * Generar contenido del PDF para persona jurídica
 * TODO: Implementar cuando se agregue soporte para personas jurídicas
 */
function generateJuridicalPersonPDF(doc, startY, datos, persona) {
  let y = startY;

  y = checkAndAddPage(doc, y, 100);
  y = drawSection(doc, y, 'Información de Persona Jurídica', 80);

  drawField(doc, 60, y, 'Razón Social', datos.compania?.razonSocial, 480);

  y += 50;
  drawTextAreaField(doc, 60, y, 'Nota', 'El formulario completo para personas jurídicas estará disponible próximamente.', 480, 40);

  return y + 100;
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
        formaPago: protocolo.formaPago,
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
 * Eliminar un protocolo completo (solo para ADMIN)
 * DELETE /api/formulario-uafe/admin/protocolo/:protocoloId
 * Requiere: authenticateToken + role ADMIN
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

    // Eliminar protocolo (cascade eliminará las personas asociadas)
    await prisma.protocoloUAFE.delete({
      where: { id: protocoloId }
    });

    res.json({
      success: true,
      message: 'Protocolo eliminado exitosamente',
      data: {
        protocoloId,
        numeroProtocolo: protocolo.numeroProtocolo,
        personasEliminadas: protocolo.personas.length,
        creador: `${protocolo.creador.firstName} ${protocolo.creador.lastName}`
      }
    });

  } catch (error) {
    console.error('Error al eliminar protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar protocolo'
    });
  }
}
