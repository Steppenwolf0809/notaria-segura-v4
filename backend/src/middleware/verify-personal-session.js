import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Middleware para verificar sesión de usuario personal
 *
 * Este middleware:
 * 1. Extrae el token de sesión de cookies o headers
 * 2. Valida que la sesión exista y no haya expirado
 * 3. Verifica que el usuario no esté bloqueado
 * 4. Extiende automáticamente la sesión (actualiza ultimaActividad)
 * 5. Agrega datos del usuario al request (req.personaVerificada)
 *
 * Si alguna validación falla, retorna 401 Unauthorized
 */
export async function verifyPersonalSession(req, res, next) {
  try {
    // Obtener token de cookie o header
    // Permite ambos métodos para flexibilidad frontend
    const sessionToken = req.cookies?.personal_session ||
                         req.headers['x-session-token'];

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Sesión no válida. Por favor inicia sesión nuevamente.'
      });
    }

    // Buscar sesión en base de datos con datos de persona
    const sesion = await prisma.sesionPersonal.findUnique({
      where: { token: sessionToken },
      include: {
        persona: {
          select: {
            id: true,
            numeroIdentificacion: true,
            tipoPersona: true,
            bloqueadoHasta: true
          }
        }
      }
    });

    if (!sesion) {
      return res.status(401).json({
        success: false,
        message: 'Sesión no encontrada o inválida.'
      });
    }

    // Verificar expiración
    if (sesion.expiraEn < new Date()) {
      // Limpiar sesión expirada de la base de datos
      await prisma.sesionPersonal.delete({
        where: { id: sesion.id }
      });

      return res.status(401).json({
        success: false,
        message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
      });
    }

    // Verificar si usuario está bloqueado
    if (sesion.persona.bloqueadoHasta && sesion.persona.bloqueadoHasta > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está temporalmente bloqueada. Intenta más tarde.'
      });
    }

    // Extender sesión actualizando ultimaActividad
    // Esto mantiene activa la sesión mientras el usuario esté trabajando
    await prisma.sesionPersonal.update({
      where: { id: sesion.id },
      data: { ultimaActividad: new Date() }
    });

    // Agregar datos de persona al request para uso en controladores
    // Otros endpoints pueden acceder a req.personaVerificada
    req.personaVerificada = {
      id: sesion.persona.id,
      numeroIdentificacion: sesion.persona.numeroIdentificacion,
      tipoPersona: sesion.persona.tipoPersona
    };

    next();
  } catch (error) {
    console.error('Error verificando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar sesión'
    });
  }
}
