import { getPrismaClient } from '../db.js';
import bcrypt from 'bcryptjs';
import { validarPIN, generarTokenSesion } from '../utils/pin-validator.js';
import { sincronizarCompletitudProtocolo } from '../services/completitud-service.js';
import logger from '../utils/logger.js';

const prisma = getPrismaClient();

// Configuración de seguridad centralizada
const SECURITY_CONFIG = {
  maxIntentos: 5,                    // 5 intentos fallidos antes de bloquear
  tiempoBloqueo: 15 * 60 * 1000,     // 15 minutos en milisegundos
  duracionSesion: 30 * 60 * 1000     // 30 minutos en milisegundos
};

// 🔒 SECURITY: Debug endpoint removed - exposed PIN hashes without authentication

/**
 * Verificar si una cédula existe en el sistema
 * GET /api/personal/verificar-cedula/:cedula
 *
 * Caso de uso: Frontend verifica si debe mostrar "Crear cuenta" o "Iniciar sesión"
 * También usado por matrizador para buscar personas antes de agregarlas a protocolos
 */
export async function verificarCedula(req, res) {
  try {
    const { cedula } = req.params;

    const persona = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: cedula },
      select: {
        id: true,
        tipoPersona: true,
        pinCreado: true,
        pinHash: true,
        datosPersonaNatural: true,
        datosPersonaJuridica: true
      }
    });

    // Log para debugging
    logger.info('🔍 verificarCedula - Resultado:', {
      cedula,
      existe: !!persona,
      pinCreado: persona?.pinCreado,
      pinHashLength: persona?.pinHash?.length || 0,
      pinHashType: typeof persona?.pinHash
    });

    res.json({
      success: true,
      existe: !!persona,  // Convierte a boolean
      tipoPersona: persona?.tipoPersona || null,
      pinCreado: persona?.pinCreado ?? false,  // Indica si tiene PIN creado o si necesita crearlo
      datosPersonaNatural: persona?.datosPersonaNatural || null,
      datosPersonaJuridica: persona?.datosPersonaJuridica || null
    });
  } catch (error) {
    logger.error('Error verificando cédula:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar cédula',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
}


/**
 * Registrar nueva persona con PIN
 * POST /api/personal/registrar
 * Body: { cedula, tipoPersona, pin, pinConfirmacion }
 *
 * Flujo completo de registro:
 * 1. Validar todos los campos
 * 2. Validar formato de PIN (seguridad)
 * 3. Verificar que cédula no exista (unique constraint)
 * 4. Hashear PIN con bcrypt
 * 5. Crear persona en BD
 * 6. Crear sesión automáticamente (auto-login)
 * 7. Registrar auditoría
 * 8. Retornar token de sesión
 */
export async function registrarPersona(req, res) {
  try {
    const { cedula, tipoPersona, pin, pinConfirmacion } = req.body;

    // Validación de campos obligatorios
    if (!cedula || !tipoPersona || !pin || !pinConfirmacion) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    // Validar tipo de persona
    if (!['NATURAL', 'JURIDICA'].includes(tipoPersona)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de persona inválido. Debe ser NATURAL o JURIDICA'
      });
    }

    // Validar que PINs coincidan
    if (pin !== pinConfirmacion) {
      return res.status(400).json({
        success: false,
        message: 'Los PINs no coinciden'
      });
    }

    // Validar formato y seguridad del PIN
    const validacionPIN = validarPIN(pin);
    if (!validacionPIN.valid) {
      return res.status(400).json({
        success: false,
        message: validacionPIN.error
      });
    }

    // Verificar si cédula ya existe
    const existente = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: cedula }
    });

    let persona;

    if (existente) {
      // Si la persona existe pero su PIN fue reseteado, permitir re-creación de PIN
      // Verificar si NO tiene PIN creado O si el hash está vacío/nulo
      logger.info('🔍 DEBUG - Persona existente encontrada:', {
        cedula,
        pinCreado: existente.pinCreado,
        pinHashExists: !!existente.pinHash,
        pinHashLength: existente.pinHash ? existente.pinHash.length : 0,
        pinHashValue: existente.pinHash ? `[${existente.pinHash.substring(0, 10)}...]` : 'null/undefined',
        pinHashType: typeof existente.pinHash
      });

      // Verificar si el PIN fue reseteado
      // Un PIN está reseteado si:
      // 1. pinCreado es false, O
      // 2. pinHash no existe (null/undefined), O
      // 3. pinHash es una cadena vacía o solo espacios
      const pinEstaReseteado = !existente.pinCreado ||
        !existente.pinHash ||
        (typeof existente.pinHash === 'string' && existente.pinHash.trim().length === 0);

      logger.info('🔍 DEBUG - Verificación PIN reseteado:', {
        pinEstaReseteado,
        check1_pinCreado: !existente.pinCreado,
        check2_pinHashFalsy: !existente.pinHash,
        check3_pinHashEmpty: typeof existente.pinHash === 'string' ? existente.pinHash.trim().length === 0 : 'N/A'
      });

      if (pinEstaReseteado) {
        // Hash del nuevo PIN
        const pinHash = await bcrypt.hash(pin, 10);

        // Actualizar PIN y reactivar cuenta
        persona = await prisma.personaRegistrada.update({
          where: { id: existente.id },
          data: {
            pinHash,
            pinCreado: true,
            intentosFallidos: 0,      // Resetear intentos fallidos
            bloqueadoHasta: null       // Desbloquear si estaba bloqueado
          }
        });

        // Registrar en auditoría
        await prisma.auditoriaPersona.create({
          data: {
            personaId: persona.id,
            tipo: 'PIN_RECREADO',
            descripcion: 'Usuario re-creó su PIN después de reseteo',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        });
      } else {
        // PIN ya existe y está activo
        return res.status(409).json({
          success: false,
          message: 'Esta cédula ya está registrada. Usa "Iniciar sesión" en su lugar.'
        });
      }
    } else {
      // Hash del PIN usando bcrypt (10 salt rounds = buen balance seguridad/performance)
      const pinHash = await bcrypt.hash(pin, 10);

      // Crear persona nueva en base de datos
      persona = await prisma.personaRegistrada.create({
        data: {
          numeroIdentificacion: cedula,
          tipoPersona,
          pinHash,
          pinCreado: true
        }
      });

      // Registrar en auditoría
      await prisma.auditoriaPersona.create({
        data: {
          personaId: persona.id,
          tipo: 'REGISTRO',
          descripcion: 'Usuario creó su cuenta',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }

    // Crear sesión automáticamente (auto-login después de registro/re-creación)
    const tokenSesion = generarTokenSesion();
    const expiraEn = new Date(Date.now() + SECURITY_CONFIG.duracionSesion);

    await prisma.sesionPersonal.create({
      data: {
        personaId: persona.id,
        token: tokenSesion,
        expiraEn,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      success: true,
      message: existente && !existente.pinCreado
        ? 'PIN re-creado exitosamente'
        : 'Cuenta creada exitosamente',
      sessionToken: tokenSesion,
      expiraEn: expiraEn.toISOString()
    });
  } catch (error) {
    logger.error('Error registrando persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear cuenta',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
}

/**
 * Login con PIN
 * POST /api/personal/login
 * Body: { cedula, pin }
 *
 * Sistema de seguridad implementado:
 * - Contador de intentos fallidos
 * - Bloqueo automático después de 5 intentos
 * - Bloqueo temporal de 15 minutos
 * - Reset automático de contador tras login exitoso
 */
export async function loginPersona(req, res) {
  try {
    const { cedula, pin } = req.body;

    if (!cedula || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Cédula y PIN son obligatorios'
      });
    }

    // Buscar persona
    const persona = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: cedula }
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Cédula no registrada. Por favor crea una cuenta primero.'
      });
    }

    // Verificar si está bloqueado
    if (persona.bloqueadoHasta && persona.bloqueadoHasta > new Date()) {
      const minutosRestantes = Math.ceil(
        (persona.bloqueadoHasta - new Date()) / 60000
      );

      return res.status(403).json({
        success: false,
        message: `Cuenta bloqueada temporalmente. Intenta en ${minutosRestantes} minutos.`,
        bloqueadoHasta: persona.bloqueadoHasta.toISOString()
      });
    }

    // Verificar si no tiene PIN hash (persona sin PIN asignado)
    if (!persona.pinHash) {
      return res.status(403).json({
        success: false,
        message: 'No tiene un PIN asignado. Contacte a la notaria.',
        pinReseteado: true
      });
    }

    // Verificar PIN usando bcrypt.compare
    const pinValido = await bcrypt.compare(pin, persona.pinHash);

    if (!pinValido) {
      // PIN INCORRECTO - Incrementar contador de intentos fallidos
      const nuevosIntentos = persona.intentosFallidos + 1;
      const actualizacion = {
        intentosFallidos: nuevosIntentos,
        ultimoIntentoFallido: new Date()
      };

      // Bloquear si llegó al límite
      if (nuevosIntentos >= SECURITY_CONFIG.maxIntentos) {
        actualizacion.bloqueadoHasta = new Date(
          Date.now() + SECURITY_CONFIG.tiempoBloqueo
        );
      }

      await prisma.personaRegistrada.update({
        where: { id: persona.id },
        data: actualizacion
      });

      // Registrar intento fallido en auditoría
      await prisma.auditoriaPersona.create({
        data: {
          personaId: persona.id,
          tipo: 'PIN_FALLIDO',
          descripcion: `Intento fallido ${nuevosIntentos}/${SECURITY_CONFIG.maxIntentos}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      const intentosRestantes = SECURITY_CONFIG.maxIntentos - nuevosIntentos;

      if (intentosRestantes > 0) {
        return res.status(401).json({
          success: false,
          message: `PIN incorrecto. Te quedan ${intentosRestantes} intentos antes de que tu cuenta sea bloqueada.`,
          intentosRestantes
        });
      } else {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta ha sido bloqueada temporalmente por 15 minutos debido a múltiples intentos fallidos.',
          bloqueadoHasta: actualizacion.bloqueadoHasta.toISOString()
        });
      }
    }

    // PIN CORRECTO - Resetear intentos fallidos y crear sesión
    // Si es primer login (pinCreado=false), marcar como creado
    const updateData = {
      intentosFallidos: 0,
      ultimoAcceso: new Date(),
    };
    if (!persona.pinCreado) {
      updateData.pinCreado = true;
    }
    await prisma.personaRegistrada.update({
      where: { id: persona.id },
      data: updateData,
    });

    // Crear nueva sesión
    const tokenSesion = generarTokenSesion();
    const expiraEn = new Date(Date.now() + SECURITY_CONFIG.duracionSesion);

    await prisma.sesionPersonal.create({
      data: {
        personaId: persona.id,
        token: tokenSesion,
        expiraEn,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Registrar login exitoso en auditoría
    await prisma.auditoriaPersona.create({
      data: {
        personaId: persona.id,
        tipo: 'LOGIN',
        descripcion: 'Inicio de sesión exitoso',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      message: 'Sesión iniciada correctamente',
      sessionToken: tokenSesion,
      tipoPersona: persona.tipoPersona,
      expiraEn: expiraEn.toISOString()
    });
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
}

/**
 * Obtener información de la persona autenticada
 * GET /api/personal/mi-informacion
 * Requiere: middleware verifyPersonalSession
 *
 * Retorna toda la información de la persona
 * Usado por frontend para mostrar formulario pre-llenado
 */
export async function obtenerMiInformacion(req, res) {
  try {
    const persona = await prisma.personaRegistrada.findUnique({
      where: { id: req.personaVerificada.id },
      select: {
        id: true,
        numeroIdentificacion: true,
        tipoPersona: true,
        datosPersonaNatural: true,
        datosPersonaJuridica: true,
        completado: true,
        updatedAt: true,
        createdAt: true
      }
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    // AUTO-POPULATION LOGIC:
    // Si la persona NO tiene datos completados (datosPersonaNatural es null o vacío)
    // Buscamos si existe como cónyuge en otro registro para precargar sus datos.
    if (!persona.datosPersonaNatural && persona.tipoPersona === 'NATURAL') {
      try {
        // Buscar registros donde esta persona aparezca como cónyuge
        // Nota: Prisma Json filters pueden ser limitados en versiones antiguas, 
        // pero intentaremos busqueda directa o raw query si es necesario.
        // Por ahora, asumimos que podemos buscar en el path del JSON.
        const esposo = await prisma.personaRegistrada.findFirst({
          where: {
            datosPersonaNatural: {
              path: ['conyuge', 'numeroIdentificacion'],
              equals: persona.numeroIdentificacion
            }
          }
        });

        if (esposo && esposo.datosPersonaNatural && esposo.datosPersonaNatural.conyuge) {
          const datosConyuge = esposo.datosPersonaNatural.conyuge;
          logger.info(`✨ Auto-populando datos para ${persona.numeroIdentificacion} desde el registro de ${esposo.numeroIdentificacion}`);

          // Construimos el objeto datosPersonaNatural con la información disponible
          persona.datosPersonaNatural = {
            identificacion: {
              tipo: 'CEDULA',
              numero: persona.numeroIdentificacion,
              nacionalidad: datosConyuge.nacionalidad || 'ECUATORIANA'
            },
            datosPersonales: {
              nombres: datosConyuge.nombres || '',
              apellidos: datosConyuge.apellidos || '',
              // Intentar inferir o mapear otros campos si es posible, pero nombre es lo crítico
              // El formulario pedirá el resto.
              genero: datosConyuge.genero || '',
              estadoCivil: datosConyuge.estadoCivil || 'CASADO', // Asumimos casado si aparece como cónyuge
            },
            contacto: {
              email: datosConyuge.email || '',
              celular: datosConyuge.celular || ''
            },
            informacionLaboral: {
              profesionOcupacion: datosConyuge.profesionOcupacion || '',
              situacion: datosConyuge.situacionLaboral || ''
            },
            // Heredar dirección del esposo (asunción razonable para autocompletado)
            direccion: esposo.datosPersonaNatural.direccion || {},
            // Importante: No marcamos como 'completado' para obligar a verificar/guardar
          };
        }
      } catch (err) {
        logger.warn('Error intentando auto-popular datos de cónyuge:', err);
        // No fallamos el request, simplemente no autocompletamos
      }
    }

    res.json({
      success: true,
      data: persona
    });
  } catch (error) {
    logger.error('Error obteniendo información:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información'
    });
  }
}

/**
 * Actualizar información de la persona
 * PUT /api/personal/mi-informacion
 * Requiere: middleware verifyPersonalSession
 * Body: { datosPersonaNatural } O { datosPersonaJuridica }
 *
 * Importante: Solo se puede actualizar el tipo de datos correspondiente
 * al tipoPersona registrado
 */
export async function actualizarMiInformacion(req, res) {
  try {
    const { datosPersonaNatural, datosPersonaJuridica } = req.body;
    const tipoPersona = req.personaVerificada.tipoPersona;

    // Validar que se envíen los datos correctos según tipo
    if (tipoPersona === 'NATURAL' && !datosPersonaNatural) {
      return res.status(400).json({
        success: false,
        message: 'Datos de persona natural son requeridos'
      });
    }

    if (tipoPersona === 'JURIDICA' && !datosPersonaJuridica) {
      return res.status(400).json({
        success: false,
        message: 'Datos de persona jurídica son requeridos'
      });
    }

    // Preparar actualización según tipo
    const dataActualizacion = tipoPersona === 'NATURAL'
      ? { datosPersonaNatural, completado: true }
      : { datosPersonaJuridica, completado: true };

    const personaActualizada = await prisma.personaRegistrada.update({
      where: { id: req.personaVerificada.id },
      data: dataActualizacion
    });

    // Registrar en auditoría
    await prisma.auditoriaPersona.create({
      data: {
        personaId: req.personaVerificada.id,
        tipo: 'ACTUALIZACION',
        descripcion: 'Usuario actualizó su información',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Recalcular completitud en TODOS los protocolos donde participa
    try {
      const participaciones = await prisma.personaProtocolo.findMany({
        where: { personaCedula: req.personaVerificada.cedula },
        select: { protocoloId: true },
      });
      const protocoloIds = [...new Set(participaciones.map(p => p.protocoloId))];
      await Promise.all(protocoloIds.map(id => sincronizarCompletitudProtocolo(id)));
      logger.info(`Completitud recalculada para ${protocoloIds.length} protocolos de cedula ${req.personaVerificada.cedula}`);
    } catch (err) {
      logger.error('Error recalculando completitud tras actualización:', err);
      // No fallar la respuesta por esto
    }

    res.json({
      success: true,
      message: 'Información actualizada correctamente',
      data: {
        completado: personaActualizada.completado,
        updatedAt: personaActualizada.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error actualizando información:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar información'
    });
  }
}

/**
 * Cerrar sesión
 * POST /api/personal/logout
 * Requiere: middleware verifyPersonalSession
 *
 * Elimina la sesión de la base de datos
 */
export async function logoutPersona(req, res) {
  try {
    const sessionToken = req.cookies?.personal_session ||
      req.headers['x-session-token'];

    if (sessionToken) {
      await prisma.sesionPersonal.deleteMany({
        where: { token: sessionToken }
      });
    }

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });
  } catch (error) {
    logger.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión'
    });
  }
}

/**
 * Buscar persona por cédula (para matrizadores)
 * GET /api/personal/buscar/:cedula
 * Requiere: middleware verifyToken + rol MATRIZADOR o ADMIN
 *
 * Retorna información básica de la persona para permitir resetear PIN
 */
export async function buscarPersonaPorCedula(req, res) {
  try {
    const { cedula } = req.params;

    const persona = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: cedula },
      select: {
        id: true,
        numeroIdentificacion: true,
        tipoPersona: true,
        pinCreado: true,
        intentosFallidos: true,
        bloqueadoHasta: true,
        ultimoAcceso: true,
        pinResetCount: true,
        completado: true,
        createdAt: true,
        datosPersonaNatural: true,
        datosPersonaJuridica: true
      }
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ninguna persona con esta cédula'
      });
    }

    // Determinar si está bloqueado actualmente
    const bloqueado = persona.bloqueadoHasta && persona.bloqueadoHasta > new Date();

    res.json({
      success: true,
      data: {
        ...persona,
        bloqueado,
        nombreCompleto: persona.tipoPersona === 'NATURAL'
          ? `${persona.datosPersonaNatural?.nombres || ''} ${persona.datosPersonaNatural?.apellidos || ''}`.trim()
          : persona.datosPersonaJuridica?.razonSocial || 'N/A'
      }
    });
  } catch (error) {
    logger.error('Error buscando persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar persona'
    });
  }
}

/**
 * Resetear PIN de un usuario
 * POST /api/personal/:personaId/resetear-pin
 * Requiere: middleware verifyToken + rol MATRIZADOR o ADMIN
 * Body: { motivo }
 *
 * Funcionalidad:
 * - Resetea el PIN del usuario (fuerza a crear uno nuevo)
 * - Desbloquea la cuenta si estaba bloqueada
 * - Cierra todas las sesiones activas del usuario
 * - Registra auditoría con el matrizador que hizo el reset
 *
 * Caso de uso: Usuario olvidó su PIN y se presenta en notaría con cédula física
 */
export async function resetearPIN(req, res) {
  try {
    const { personaId } = req.params;
    const { motivo } = req.body;

    // Validar que se proporcione un motivo
    if (!motivo || motivo.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un motivo para el reseteo de PIN'
      });
    }

    // Verificar que la persona existe
    const persona = await prisma.personaRegistrada.findUnique({
      where: { id: personaId },
      select: {
        id: true,
        numeroIdentificacion: true,
        tipoPersona: true,
        pinResetCount: true
      }
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    // Realizar el reseteo del PIN en una transacción
    await prisma.$transaction(async (tx) => {
      // 1. Resetear PIN y desbloquear cuenta
      // Establecemos pinHash como cadena vacía (no puede ser null por el schema)
      // y pinCreado en false para forzar la creación de un nuevo PIN
      logger.info('🔄 DEBUG - Reseteando PIN para:', {
        personaId,
        cedula: persona.numeroIdentificacion,
        pinCreado_antes: persona.pinCreado,
        pinHash_antes: persona.pinHash ? `[${persona.pinHash.substring(0, 10)}...]` : 'null/undefined'
      });

      const personaActualizada = await tx.personaRegistrada.update({
        where: { id: personaId },
        data: {
          pinCreado: false,                            // Fuerza a crear nuevo PIN
          pinHash: '',                                  // Elimina el hash anterior (cadena vacía)
          intentosFallidos: 0,                          // Resetea intentos fallidos
          bloqueadoHasta: null,                         // Desbloquea la cuenta
          pinResetCount: persona.pinResetCount + 1     // Incrementa contador de resets
        }
      });

      logger.info('✅ DEBUG - PIN reseteado exitosamente:', {
        personaId,
        cedula: personaActualizada.numeroIdentificacion,
        pinCreado_despues: personaActualizada.pinCreado,
        pinHash_despues: personaActualizada.pinHash ? `[${personaActualizada.pinHash}]` : 'null/undefined',
        pinHashLength: personaActualizada.pinHash ? personaActualizada.pinHash.length : 0
      });

      // 2. Cerrar todas las sesiones activas del usuario (seguridad)
      await tx.sesionPersonal.deleteMany({
        where: { personaId }
      });

      // 3. Cerrar sesiones de formularios UAFE de esta persona
      // Primero obtenemos los IDs de PersonaProtocolo para esta persona
      const personasProtocolo = await tx.personaProtocolo.findMany({
        where: { personaCedula: persona.numeroIdentificacion },
        select: { id: true }
      });

      if (personasProtocolo.length > 0) {
        const personaProtocoloIds = personasProtocolo.map(pp => pp.id);
        await tx.sesionFormularioUAFE.deleteMany({
          where: {
            personaProtocoloId: { in: personaProtocoloIds }
          }
        });
      }

      // 4. Registrar en auditoría
      await tx.auditoriaPersona.create({
        data: {
          personaId,
          tipo: 'PIN_RESET',
          descripcion: `PIN reseteado por ${req.user.firstName} ${req.user.lastName}. Motivo: ${motivo}`,
          matrizadorId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    });

    res.json({
      success: true,
      message: 'PIN reseteado exitosamente. El usuario debe crear un nuevo PIN en su próximo acceso.',
      data: {
        personaId,
        cedula: persona.numeroIdentificacion,
        resetCount: persona.pinResetCount + 1
      }
    });
  } catch (error) {
    logger.error('Error reseteando PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear PIN'
    });
  }
}

/**
 * Crear PIN propio (cambio obligatorio desde PIN temporal)
 * POST /api/personal/crear-pin
 * Body: { cedula, pinTemporal, nuevoPin, confirmacionPin }
 *
 * Flujo: el usuario tiene pinCreado=false (PIN temporal = ultimos 6 de cedula).
 * Valida el PIN temporal y lo reemplaza por uno elegido por el usuario.
 * Auto-login tras crear el PIN.
 */
export async function crearPinPropio(req, res) {
  try {
    const { cedula, pinTemporal, nuevoPin, confirmacionPin } = req.body;

    if (!cedula || !pinTemporal || !nuevoPin || !confirmacionPin) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    if (nuevoPin !== confirmacionPin) {
      return res.status(400).json({
        success: false,
        message: 'El nuevo PIN y su confirmacion no coinciden'
      });
    }

    // Validar formato del nuevo PIN
    const validacion = validarPIN(nuevoPin);
    if (!validacion.valido) {
      return res.status(400).json({
        success: false,
        message: validacion.mensaje || 'PIN no cumple requisitos de seguridad'
      });
    }

    const persona = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: cedula }
    });

    if (!persona) {
      return res.status(404).json({
        success: false,
        message: 'Cedula no encontrada'
      });
    }

    // Solo permitir si pinCreado es false (PIN temporal)
    if (persona.pinCreado) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes un PIN personal. Usa el login normal.'
      });
    }

    // Verificar bloqueo
    if (persona.bloqueadoHasta && persona.bloqueadoHasta > new Date()) {
      const minutosRestantes = Math.ceil(
        (persona.bloqueadoHasta - new Date()) / 60000
      );
      return res.status(403).json({
        success: false,
        message: `Cuenta bloqueada. Intenta en ${minutosRestantes} minutos.`
      });
    }

    // Verificar PIN temporal
    const pinTemporalValido = await bcrypt.compare(pinTemporal, persona.pinHash);

    if (!pinTemporalValido) {
      const nuevosIntentos = persona.intentosFallidos + 1;
      const actualizacion = {
        intentosFallidos: nuevosIntentos,
        ultimoIntentoFallido: new Date()
      };
      if (nuevosIntentos >= SECURITY_CONFIG.maxIntentos) {
        actualizacion.bloqueadoHasta = new Date(
          Date.now() + SECURITY_CONFIG.tiempoBloqueo
        );
      }
      await prisma.personaRegistrada.update({
        where: { id: persona.id },
        data: actualizacion
      });

      const intentosRestantes = SECURITY_CONFIG.maxIntentos - nuevosIntentos;
      return res.status(401).json({
        success: false,
        message: intentosRestantes > 0
          ? `PIN temporal incorrecto. Te quedan ${intentosRestantes} intentos.`
          : 'Cuenta bloqueada temporalmente por multiples intentos fallidos.',
        intentosRestantes: Math.max(0, intentosRestantes)
      });
    }

    // PIN temporal correcto - crear nuevo PIN
    const nuevoHash = await bcrypt.hash(nuevoPin, 10);
    const sessionToken = generarTokenSesion();
    const sessionExpiry = new Date(Date.now() + SECURITY_CONFIG.duracionSesion);

    await prisma.personaRegistrada.update({
      where: { id: persona.id },
      data: {
        pinHash: nuevoHash,
        pinCreado: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      }
    });

    // Crear sesion en tabla sesionPersonal (requerida por middleware)
    await prisma.sesionPersonal.create({
      data: {
        personaId: persona.id,
        token: sessionToken,
        expiraEn: sessionExpiry,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Auditoria
    await prisma.auditoriaPersona.create({
      data: {
        personaId: persona.id,
        tipo: 'PIN_CREADO',
        descripcion: 'PIN personal creado (reemplazo de PIN temporal)',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    logger.info(`PIN propio creado para cedula ${cedula}`);

    res.json({
      success: true,
      message: 'PIN creado exitosamente',
      sessionToken,
      sessionExpiry: sessionExpiry.toISOString(),
      tipoPersona: persona.tipoPersona
    });
  } catch (error) {
    logger.error('Error creando PIN propio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear PIN'
    });
  }
}
