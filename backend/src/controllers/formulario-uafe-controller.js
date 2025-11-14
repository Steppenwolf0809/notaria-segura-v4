import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generarTokenSesion } from '../utils/pin-validator.js';

const prisma = new PrismaClient();

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

    res.status(201).json({
      success: true,
      message: 'Persona agregada al protocolo exitosamente',
      data: personaProtocolo
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
    const respuestaData = req.body;

    // Actualizar PersonaProtocolo con la respuesta
    const personaProtocolo = await prisma.personaProtocolo.update({
      where: { id: req.personaProtocoloVerificada.id },
      data: {
        completado: true,
        completadoAt: new Date(),
        respuestaFormulario: respuestaData
      }
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
                  datosPersonaJuridica: true
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

    res.json({
      success: true,
      data: protocolos,
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

    res.json({
      success: true,
      data: protocolo
    });
  } catch (error) {
    console.error('Error obteniendo protocolo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener protocolo'
    });
  }
}
