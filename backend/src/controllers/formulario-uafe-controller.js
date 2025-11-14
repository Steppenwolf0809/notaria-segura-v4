import prisma from '../db.js';
import bcrypt from 'bcrypt';
import { generarTokenSesion } from '../utils/pin-validator.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

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
    const { datosPersonaNatural, datosPersonaJuridica } = req.body;

    const personaProtocolo = req.personaProtocoloVerificada;
    const tipoPersona = personaProtocolo.persona.tipoPersona;

    // Validar que se envíen los datos correctos según el tipo de persona
    if (tipoPersona === 'NATURAL' && !datosPersonaNatural) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren datosPersonaNatural para persona natural'
      });
    }

    if (tipoPersona === 'JURIDICA' && !datosPersonaJuridica) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren datosPersonaJuridica para persona jurídica'
      });
    }

    // Usar transacción para actualizar ambas tablas
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar PersonaRegistrada con los nuevos datos
      const updateData = tipoPersona === 'NATURAL'
        ? { datosPersonaNatural: datosPersonaNatural }
        : { datosPersonaJuridica: datosPersonaJuridica };

      await tx.personaRegistrada.update({
        where: { id: personaProtocolo.persona.id },
        data: updateData
      });

      // 2. Marcar PersonaProtocolo como completado y guardar respuesta
      const personaProtocoloActualizado = await tx.personaProtocolo.update({
        where: { id: personaProtocolo.id },
        data: {
          completado: true,
          completadoAt: new Date(),
          respuestaFormulario: {
            datosActualizados: tipoPersona === 'NATURAL' ? datosPersonaNatural : datosPersonaJuridica,
            fechaRespuesta: new Date().toISOString(),
            ipAddress: req.ip
          }
        }
      });

      return personaProtocoloActualizado;
    });

    res.json({
      success: true,
      message: 'Formulario enviado exitosamente. Tus datos han sido actualizados.',
      data: {
        completado: true,
        completadoAt: resultado.completadoAt
      }
    });
  } catch (error) {
    console.error('Error enviando formulario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar formulario'
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

/**
 * Actualizar datos del protocolo UAFE
 * PUT /api/formulario-uafe/protocolo/:protocoloId
 * Requiere: authenticateToken + role MATRIZADOR o ADMIN
 */
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
    const { protocoloId, personaProtocoloId } = req.params;
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
      where: { id: personaProtocoloId }
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
    const calidadesPermitidas = ['COMPRADOR', 'VENDEDOR', 'COMPARECIENTE', 'BENEFICIARIO', 'TESTIGO'];
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
      where: { id: personaProtocoloId },
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
    const { protocoloId, personaProtocoloId } = req.params;

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
      where: { id: personaProtocoloId }
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
      where: { id: personaProtocoloId }
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
export async function generarPDFsProtocolo(req, res) {
  try {
    const { protocoloId } = req.params;

    // Verificar que el protocolo existe y pertenece al usuario
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
                datosPersonaJuridica: true
              }
            }
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

    if (protocolo.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para este protocolo'
      });
    }

    // Verificar que todas las personas completaron el formulario
    const personasIncompletas = protocolo.personas.filter(p => !p.completado);
    if (personasIncompletas.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${personasIncompletas.length} persona(s) aún no ha(n) completado el formulario`,
        personasIncompletas: personasIncompletas.map(p => ({
          cedula: p.persona.numeroIdentificacion,
          calidad: p.calidad
        }))
      });
    }

    // Crear carpeta temporal para PDFs
    const timestamp = Date.now();
    const tempDir = path.join(__dirname, '../../temp', `protocolo_${protocolo.numeroProtocolo}_${timestamp}`);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pdfsGenerados = [];

    // Generar PDF por cada persona
    for (const personaProtocolo of protocolo.personas) {
      const persona = personaProtocolo.persona;
      const datos = persona.tipoPersona === 'NATURAL'
        ? persona.datosPersonaNatural
        : persona.datosPersonaJuridica;

      // Extraer nombre
      let nombre = 'Sin_nombre';
      if (persona.tipoPersona === 'NATURAL' && datos?.datosPersonales) {
        nombre = `${datos.datosPersonales.apellidos || ''}_${datos.datosPersonales.nombres || ''}`.replace(/\s+/g, '_');
      } else if (persona.tipoPersona === 'JURIDICA' && datos?.compania) {
        nombre = (datos.compania.razonSocial || 'Sin_nombre').replace(/\s+/g, '_');
      }

      const pdfFileName = `UAFE_${persona.numeroIdentificacion}_${nombre}_${timestamp}.pdf`;
      const pdfPath = path.join(tempDir, pdfFileName);

      // Generar PDF
      await generarPDFFormulario(protocolo, personaProtocolo, persona, datos, pdfPath);

      pdfsGenerados.push({
        personaId: persona.numeroIdentificacion,
        nombre: nombre.replace(/_/g, ' '),
        cedula: persona.numeroIdentificacion,
        archivo: pdfFileName,
        rutaCompleta: pdfPath
      });
    }

    // Crear ZIP con todos los PDFs
    const zipFileName = `Protocolo_${protocolo.numeroProtocolo}_UAFE_${timestamp}.zip`;
    const zipPath = path.join(tempDir, zipFileName);

    await crearZIP(tempDir, zipPath, pdfsGenerados.map(p => p.rutaCompleta));

    res.json({
      success: true,
      message: `Se generaron ${pdfsGenerados.length} PDF(s) exitosamente`,
      data: {
        protocolo: protocolo.numeroProtocolo,
        totalPDFs: pdfsGenerados.length,
        pdfs: pdfsGenerados.map(p => ({
          nombre: p.nombre,
          cedula: p.cedula,
          archivo: p.archivo
        })),
        zipUrl: `/api/formulario-uafe/download/${path.basename(tempDir)}/${zipFileName}`,
        carpetaTemporal: path.basename(tempDir)
      }
    });
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
 * Función helper para generar un PDF individual
 */
async function generarPDFFormulario(protocolo, personaProtocolo, persona, datos, pdfPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      const stream = fs.createWriteStream(pdfPath);

      doc.pipe(stream);

      // ENCABEZADO
      doc.fontSize(18).font('Helvetica-Bold').text('FORMULARIO DE DEBIDA DILIGENCIA', { align: 'center' });
      doc.fontSize(14).text('CONOZCA A SU USUARIO - UAFE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text('Notaría Décima Octava del Cantón Quito', { align: 'center' });
      doc.moveDown(2);

      // INFORMACIÓN DEL TRÁMITE
      doc.fontSize(14).font('Helvetica-Bold').text('INFORMACIÓN DEL TRÁMITE');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Nº Protocolo: ${protocolo.numeroProtocolo}`);
      doc.text(`Fecha: ${new Date(protocolo.fecha).toLocaleDateString('es-EC')}`);
      doc.text(`Acto/Contrato: ${protocolo.actoContrato}`);
      doc.text(`Valor del Contrato: $${protocolo.valorContrato.toFixed(2)}`);
      if (protocolo.avaluoMunicipal) {
        doc.text(`Avalúo Municipal: $${protocolo.avaluoMunicipal.toFixed(2)}`);
      }
      doc.text(`Rol: ${personaProtocolo.calidad} - ${personaProtocolo.actuaPor.replace('_', ' ')}`);
      doc.moveDown(1.5);

      if (persona.tipoPersona === 'NATURAL' && datos) {
        // DATOS DE PERSONA NATURAL

        // 1. IDENTIFICACIÓN
        doc.fontSize(12).font('Helvetica-Bold').text('1. IDENTIFICACIÓN');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        if (datos.identificacion) {
          doc.text(`Tipo: ${datos.identificacion.tipo || 'N/A'}`);
          doc.text(`Número: ${datos.identificacion.numero || persona.numeroIdentificacion}`);
          doc.text(`Nacionalidad: ${datos.identificacion.nacionalidad || 'N/A'}`);
        }
        doc.moveDown();

        // 2. DATOS PERSONALES
        doc.fontSize(12).font('Helvetica-Bold').text('2. DATOS PERSONALES');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        if (datos.datosPersonales) {
          doc.text(`Apellidos: ${datos.datosPersonales.apellidos || 'N/A'}`);
          doc.text(`Nombres: ${datos.datosPersonales.nombres || 'N/A'}`);
          doc.text(`Género: ${datos.datosPersonales.genero || 'N/A'}`);
          doc.text(`Estado Civil: ${datos.datosPersonales.estadoCivil || 'N/A'}`);
          doc.text(`Nivel de Estudio: ${datos.datosPersonales.nivelEstudio || 'N/A'}`);
        }
        doc.moveDown();

        // 3. CONTACTO
        doc.fontSize(12).font('Helvetica-Bold').text('3. CONTACTO');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        if (datos.contacto) {
          doc.text(`Email: ${datos.contacto.email || 'N/A'}`);
          doc.text(`Teléfono: ${datos.contacto.telefono || 'N/A'}`);
          doc.text(`Celular: ${datos.contacto.celular || 'N/A'}`);
        }
        doc.moveDown();

        // 4. DIRECCIÓN
        doc.fontSize(12).font('Helvetica-Bold').text('4. DIRECCIÓN DOMICILIARIA');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        if (datos.direccion) {
          doc.text(`Calle Principal: ${datos.direccion.callePrincipal || 'N/A'}`);
          doc.text(`Número: ${datos.direccion.numero || 'N/A'}`);
          doc.text(`Calle Secundaria: ${datos.direccion.calleSecundaria || 'N/A'}`);
          doc.text(`Provincia: ${datos.direccion.provincia || 'N/A'}`);
          doc.text(`Cantón: ${datos.direccion.canton || 'N/A'}`);
          doc.text(`Parroquia: ${datos.direccion.parroquia || 'N/A'}`);
        }
        doc.moveDown();

        // 5. INFORMACIÓN LABORAL
        doc.fontSize(12).font('Helvetica-Bold').text('5. INFORMACIÓN LABORAL');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        if (datos.informacionLaboral) {
          doc.text(`Situación Laboral: ${datos.informacionLaboral.situacion || 'N/A'}`);
          doc.text(`Relación de Dependencia: ${datos.informacionLaboral.relacionDependencia ? 'Sí' : 'No'}`);
          doc.text(`Entidad: ${datos.informacionLaboral.nombreEntidad || 'N/A'}`);
          doc.text(`Profesión/Ocupación: ${datos.informacionLaboral.profesionOcupacion || 'N/A'}`);
          doc.text(`Cargo: ${datos.informacionLaboral.cargo || 'N/A'}`);
          doc.text(`Ingreso Mensual: $${datos.informacionLaboral.ingresoMensual || '0.00'}`);
        }
        doc.moveDown();

        // 6. CÓNYUGE (si aplica)
        if (datos.conyuge && (datos.datosPersonales?.estadoCivil === 'CASADO' || datos.datosPersonales?.estadoCivil === 'UNION_LIBRE')) {
          doc.fontSize(12).font('Helvetica-Bold').text('6. DATOS DEL CÓNYUGE');
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica');
          doc.text(`Apellidos: ${datos.conyuge.apellidos || 'N/A'}`);
          doc.text(`Nombres: ${datos.conyuge.nombres || 'N/A'}`);
          doc.text(`Identificación: ${datos.conyuge.numeroIdentificacion || 'N/A'}`);
          doc.text(`Nacionalidad: ${datos.conyuge.nacionalidad || 'N/A'}`);
          doc.text(`Profesión: ${datos.conyuge.profesion || 'N/A'}`);
          doc.moveDown();
        }

        // 7. PEP
        doc.fontSize(12).font('Helvetica-Bold').text('7. PERSONAS EXPUESTAS POLÍTICAMENTE (PEP)');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        if (datos.pep) {
          doc.text(`¿Es PEP?: ${datos.pep.esPersonaExpuesta ? 'Sí' : 'No'}`);
          doc.text(`¿Es familiar de PEP?: ${datos.pep.esFamiliarPEP ? 'Sí' : 'No'}`);
          doc.text(`¿Es colaborador de PEP?: ${datos.pep.esColaboradorPEP ? 'Sí' : 'No'}`);
        }
        doc.moveDown(2);

      } else if (persona.tipoPersona === 'JURIDICA' && datos) {
        // DATOS DE PERSONA JURÍDICA
        doc.fontSize(12).font('Helvetica-Bold').text('DATOS DE LA COMPAÑÍA');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        if (datos.compania) {
          doc.text(`RUC: ${datos.compania.ruc || persona.numeroIdentificacion}`);
          doc.text(`Razón Social: ${datos.compania.razonSocial || 'N/A'}`);
          doc.text(`Nombre Comercial: ${datos.compania.nombreComercial || 'N/A'}`);
          doc.text(`Tipo de Sociedad: ${datos.compania.tipoSociedad || 'N/A'}`);
        }
        doc.moveDown(2);
      }

      // FIRMA
      doc.moveDown(3);
      doc.fontSize(10).font('Helvetica');
      doc.text('_______________________________', { align: 'center' });
      doc.text('Firma del Compareciente', { align: 'center' });
      doc.moveDown(2);
      doc.text('_______________________________', { align: 'center' });
      doc.text('Firma del Notario', { align: 'center' });
      doc.moveDown();
      doc.fontSize(8).text(`Generado el: ${new Date().toLocaleString('es-EC')}`, { align: 'right' });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Función helper para crear ZIP
 */
async function crearZIP(tempDir, zipPath, pdfPaths) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(zipPath));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // Agregar cada PDF al ZIP
    pdfPaths.forEach(pdfPath => {
      archive.file(pdfPath, { name: path.basename(pdfPath) });
    });

    archive.finalize();
  });
}

/**
 * Descargar archivo temporal (PDF o ZIP)
 * GET /api/formulario-uafe/download/:folder/:filename
 */
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
