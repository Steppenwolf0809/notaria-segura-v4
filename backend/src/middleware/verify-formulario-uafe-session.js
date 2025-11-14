import prisma from '../db.js';

/**
 * Middleware para verificar sesión de formulario UAFE
 * Verifica que el token de sesión sea válido y no haya expirado
 *
 * Este middleware:
 * 1. Extrae el token de sesión del header x-session-token
 * 2. Valida que la sesión exista y no haya expirado
 * 3. Extiende automáticamente la sesión (actualiza ultimaActividad)
 * 4. Agrega datos completos del protocolo y persona al request
 *
 * Si alguna validación falla, retorna 401 Unauthorized
 */
export async function verifyFormularioUAFESession(req, res, next) {
  try {
    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Token de sesión requerido'
      });
    }

    // Buscar sesión con todos los datos relacionados
    const sesion = await prisma.sesionFormularioUAFE.findUnique({
      where: { token: sessionToken },
      include: {
        personaProtocolo: {
          include: {
            protocolo: true,
            persona: {
              select: {
                id: true,
                numeroIdentificacion: true,
                tipoPersona: true,
                datosPersonaNatural: true,
                datosPersonaJuridica: true,
                bloqueadoHasta: true
              }
            }
          }
        }
      }
    });

    if (!sesion) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida'
      });
    }

    // Verificar si expiró
    if (sesion.expiraEn < new Date()) {
      // Eliminar sesión expirada
      await prisma.sesionFormularioUAFE.delete({
        where: { id: sesion.id }
      });

      return res.status(401).json({
        success: false,
        message: 'Sesión expirada. Por favor inicia sesión nuevamente.'
      });
    }

    // Verificar si la persona está bloqueada
    if (sesion.personaProtocolo.persona.bloqueadoHasta &&
        sesion.personaProtocolo.persona.bloqueadoHasta > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está temporalmente bloqueada. Intenta más tarde.'
      });
    }

    // Extender sesión (actualizar ultimaActividad)
    await prisma.sesionFormularioUAFE.update({
      where: { id: sesion.id },
      data: { ultimaActividad: new Date() }
    });

    // Agregar datos al request para uso en controladores
    req.personaProtocoloVerificada = sesion.personaProtocolo;
    req.sesion = sesion;

    next();
  } catch (error) {
    console.error('Error verificando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar sesión'
    });
  }
}
