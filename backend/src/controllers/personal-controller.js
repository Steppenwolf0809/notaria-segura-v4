import { getPrismaClient } from '../db.js';
import bcrypt from 'bcrypt';
import { validarPIN, generarTokenSesion } from '../utils/pin-validator.js';

const prisma = getPrismaClient();

// Configuración de seguridad centralizada
const SECURITY_CONFIG = {
  maxIntentos: 5,                    // 5 intentos fallidos antes de bloquear
  tiempoBloqueo: 15 * 60 * 1000,     // 15 minutos en milisegundos
  duracionSesion: 30 * 60 * 1000     // 30 minutos en milisegundos
};

/**
 * Verificar si una cédula existe en el sistema
 * GET /api/personal/verificar-cedula/:cedula
 *
 * Caso de uso: Frontend verifica si debe mostrar "Crear cuenta" o "Iniciar sesión"
 */
export async function verificarCedula(req, res) {
  try {
    const { cedula } = req.params;

    const persona = await prisma.personaRegistrada.findUnique({
      where: { numeroIdentificacion: cedula },
      select: {
        id: true,
        tipoPersona: true
      }
    });

    res.json({
      success: true,
      existe: !!persona,  // Convierte a boolean
      tipoPersona: persona?.tipoPersona || null
    });
  } catch (error) {
    console.error('Error verificando cédula:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar cédula'
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
      if (!existente.pinCreado || !existente.pinHash) {
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
    console.error('Error registrando persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear cuenta'
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

    // Verificar si el PIN fue reseteado
    if (!persona.pinCreado || !persona.pinHash) {
      return res.status(403).json({
        success: false,
        message: 'Tu PIN ha sido reseteado. Por favor crea un nuevo PIN.',
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
    await prisma.personaRegistrada.update({
      where: { id: persona.id },
      data: {
        intentosFallidos: 0,
        ultimoAcceso: new Date()
      }
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
      expiraEn: expiraEn.toISOString()
    });
  } catch (error) {
    console.error('Error en login:', error);
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

    res.json({
      success: true,
      data: persona
    });
  } catch (error) {
    console.error('Error obteniendo información:', error);
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

    res.json({
      success: true,
      message: 'Información actualizada correctamente',
      data: {
        completado: personaActualizada.completado,
        updatedAt: personaActualizada.updatedAt
      }
    });
  } catch (error) {
    console.error('Error actualizando información:', error);
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
    console.error('Error en logout:', error);
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
    console.error('Error buscando persona:', error);
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
      await tx.personaRegistrada.update({
        where: { id: personaId },
        data: {
          pinCreado: false,              // Fuerza a crear nuevo PIN
          pinHash: '',                    // Elimina el hash anterior
          intentosFallidos: 0,            // Resetea intentos fallidos
          bloqueadoHasta: null,           // Desbloquea la cuenta
          pinResetCount: persona.pinResetCount + 1  // Incrementa contador
        }
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
    console.error('Error reseteando PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear PIN'
    });
  }
}
