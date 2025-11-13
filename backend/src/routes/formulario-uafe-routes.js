import express from 'express'
import { db } from '../db.js'
import { authenticateToken } from '../middleware/auth-middleware.js'
import { verifyPersonalSession } from '../middleware/verify-personal-session.js'
import crypto from 'crypto'

const router = express.Router()

// ============================================================================
// ENDPOINTS PARA MATRIZADORES
// ============================================================================

/**
 * POST /api/formulario-uafe/asignar
 * Crear asignación de formulario UAFE a una persona
 * Requiere: autenticación de matrizador
 */
router.post('/asignar', authenticateToken, async (req, res) => {
  try {
    const { numeroIdentificacion, numeroMatriz, actoContrato, calidadPersona, actuaPor, expiraEn } = req.body

    // Validar que el usuario sea matrizador
    if (req.user.role !== 'MATRIZADOR' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Solo los matrizadores pueden asignar formularios UAFE'
      })
    }

    // Validar campos requeridos
    if (!numeroIdentificacion || !numeroMatriz || !actoContrato || !calidadPersona || !actuaPor) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: numeroIdentificacion, numeroMatriz, actoContrato, calidadPersona, actuaPor'
      })
    }

    // Verificar que la persona existe
    const persona = await db.personaRegistrada.findUnique({
      where: { numeroIdentificacion }
    })

    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró una persona registrada con ese número de identificación'
      })
    }

    // Generar token único (8 caracteres alfanuméricos)
    const token = crypto.randomBytes(4).toString('hex')

    // Crear asignación
    const asignacion = await db.formularioUAFEAsignacion.create({
      data: {
        personaId: persona.id,
        numeroMatriz,
        actoContrato,
        calidadPersona,
        actuaPor,
        token,
        matrizadorId: req.user.id,
        expiraEn: expiraEn ? new Date(expiraEn) : null
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
    })

    // Generar link público
    const linkPublico = `${process.env.FRONTEND_URL || 'https://notaria18quito.com.ec'}/formulario-uafe/${token}`

    res.json({
      success: true,
      asignacion: {
        id: asignacion.id,
        numeroMatriz: asignacion.numeroMatriz,
        actoContrato: asignacion.actoContrato,
        calidadPersona: asignacion.calidadPersona,
        actuaPor: asignacion.actuaPor,
        token: asignacion.token,
        linkPublico,
        estado: asignacion.estado,
        persona: {
          numeroIdentificacion: asignacion.persona.numeroIdentificacion,
          tipoPersona: asignacion.persona.tipoPersona
        },
        createdAt: asignacion.createdAt,
        expiraEn: asignacion.expiraEn
      }
    })
  } catch (error) {
    console.error('❌ Error al asignar formulario UAFE:', error)
    res.status(500).json({
      success: false,
      error: 'Error al asignar formulario UAFE',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * GET /api/formulario-uafe/mis-asignaciones
 * Listar todas las asignaciones de formularios del matrizador
 */
router.get('/mis-asignaciones', authenticateToken, async (req, res) => {
  try {
    // Validar que el usuario sea matrizador
    if (req.user.role !== 'MATRIZADOR' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Solo los matrizadores pueden ver asignaciones'
      })
    }

    const { estado, numeroMatriz } = req.query

    const where = {
      matrizadorId: req.user.id
    }

    if (estado) {
      where.estado = estado
    }

    if (numeroMatriz) {
      where.numeroMatriz = { contains: numeroMatriz }
    }

    const asignaciones = await db.formularioUAFEAsignacion.findMany({
      where,
      include: {
        persona: {
          select: {
            numeroIdentificacion: true,
            tipoPersona: true,
            datosPersonaNatural: true,
            datosPersonaJuridica: true
          }
        },
        respuesta: {
          select: {
            id: true,
            completadoEn: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json({
      success: true,
      asignaciones: asignaciones.map(a => ({
        id: a.id,
        numeroMatriz: a.numeroMatriz,
        actoContrato: a.actoContrato,
        calidadPersona: a.calidadPersona,
        actuaPor: a.actuaPor,
        token: a.token,
        linkPublico: `${process.env.FRONTEND_URL || 'https://notaria18quito.com.ec'}/formulario-uafe/${a.token}`,
        estado: a.estado,
        persona: {
          numeroIdentificacion: a.persona.numeroIdentificacion,
          tipoPersona: a.persona.tipoPersona,
          nombre: a.persona.tipoPersona === 'NATURAL'
            ? `${a.persona.datosPersonaNatural?.nombres || ''} ${a.persona.datosPersonaNatural?.apellidos || ''}`.trim()
            : a.persona.datosPersonaJuridica?.razonSocial || 'N/A'
        },
        completado: !!a.respuesta,
        completadoEn: a.respuesta?.completadoEn,
        createdAt: a.createdAt,
        expiraEn: a.expiraEn
      }))
    })
  } catch (error) {
    console.error('❌ Error al listar asignaciones:', error)
    res.status(500).json({
      success: false,
      error: 'Error al listar asignaciones'
    })
  }
})

/**
 * GET /api/formulario-uafe/asignacion/:id
 * Ver detalles de una asignación específica con su respuesta
 */
router.get('/asignacion/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Validar que el usuario sea matrizador
    if (req.user.role !== 'MATRIZADOR' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Solo los matrizadores pueden ver asignaciones'
      })
    }

    const asignacion = await db.formularioUAFEAsignacion.findUnique({
      where: { id },
      include: {
        persona: {
          select: {
            numeroIdentificacion: true,
            tipoPersona: true,
            datosPersonaNatural: true,
            datosPersonaJuridica: true
          }
        },
        respuesta: true,
        matrizador: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!asignacion) {
      return res.status(404).json({
        success: false,
        error: 'Asignación no encontrada'
      })
    }

    // Verificar que la asignación pertenece al matrizador
    if (asignacion.matrizadorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver esta asignación'
      })
    }

    res.json({
      success: true,
      asignacion: {
        ...asignacion,
        linkPublico: `${process.env.FRONTEND_URL || 'https://notaria18quito.com.ec'}/formulario-uafe/${asignacion.token}`
      }
    })
  } catch (error) {
    console.error('❌ Error al obtener asignación:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener asignación'
    })
  }
})

// ============================================================================
// ENDPOINTS PÚBLICOS (con autenticación PIN)
// ============================================================================

/**
 * GET /api/formulario-uafe/public/:token
 * Obtener formulario asignado por token (requiere sesión activa de persona)
 */
router.get('/public/:token', verifyPersonalSession, async (req, res) => {
  try {
    const { token } = req.params

    const asignacion = await db.formularioUAFEAsignacion.findUnique({
      where: { token },
      include: {
        persona: {
          select: {
            numeroIdentificacion: true,
            tipoPersona: true,
            datosPersonaNatural: true,
            datosPersonaJuridica: true
          }
        },
        respuesta: true
      }
    })

    if (!asignacion) {
      return res.status(404).json({
        success: false,
        error: 'Formulario no encontrado'
      })
    }

    // Verificar que el formulario pertenece a la persona logueada
    if (asignacion.personaId !== req.personaVerificada.id) {
      return res.status(403).json({
        success: false,
        error: 'Este formulario no está asignado a tu cuenta'
      })
    }

    // Verificar expiración
    if (asignacion.expiraEn && new Date() > asignacion.expiraEn) {
      // Actualizar estado a expirado
      await db.formularioUAFEAsignacion.update({
        where: { id: asignacion.id },
        data: { estado: 'EXPIRADO' }
      })

      return res.status(410).json({
        success: false,
        error: 'Este formulario ha expirado'
      })
    }

    // Verificar si ya fue completado
    if (asignacion.estado === 'COMPLETADO') {
      return res.json({
        success: true,
        completado: true,
        asignacion: {
          numeroMatriz: asignacion.numeroMatriz,
          actoContrato: asignacion.actoContrato,
          calidadPersona: asignacion.calidadPersona,
          actuaPor: asignacion.actuaPor,
          estado: asignacion.estado,
          completadoEn: asignacion.completadoEn
        },
        respuesta: asignacion.respuesta
      })
    }

    res.json({
      success: true,
      completado: false,
      asignacion: {
        id: asignacion.id,
        numeroMatriz: asignacion.numeroMatriz,
        actoContrato: asignacion.actoContrato,
        calidadPersona: asignacion.calidadPersona,
        actuaPor: asignacion.actuaPor,
        estado: asignacion.estado,
        persona: asignacion.persona
      }
    })
  } catch (error) {
    console.error('❌ Error al obtener formulario público:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener formulario'
    })
  }
})

/**
 * POST /api/formulario-uafe/public/:token/responder
 * Enviar respuesta al formulario UAFE (requiere sesión activa de persona)
 */
router.post('/public/:token/responder', verifyPersonalSession, async (req, res) => {
  try {
    const { token } = req.params
    const respuestaData = req.body

    const asignacion = await db.formularioUAFEAsignacion.findUnique({
      where: { token }
    })

    if (!asignacion) {
      return res.status(404).json({
        success: false,
        error: 'Formulario no encontrado'
      })
    }

    // Verificar que el formulario pertenece a la persona logueada
    if (asignacion.personaId !== req.personaVerificada.id) {
      return res.status(403).json({
        success: false,
        error: 'Este formulario no está asignado a tu cuenta'
      })
    }

    // Verificar que no esté completado
    if (asignacion.estado === 'COMPLETADO') {
      return res.status(400).json({
        success: false,
        error: 'Este formulario ya fue completado'
      })
    }

    // Verificar expiración
    if (asignacion.expiraEn && new Date() > asignacion.expiraEn) {
      return res.status(410).json({
        success: false,
        error: 'Este formulario ha expirado'
      })
    }

    // Crear respuesta
    const respuesta = await db.formularioUAFERespuesta.create({
      data: {
        personaId: asignacion.personaId,
        asignacionId: asignacion.id,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        ...respuestaData
      }
    })

    // Actualizar asignación
    await db.formularioUAFEAsignacion.update({
      where: { id: asignacion.id },
      data: {
        estado: 'COMPLETADO',
        completadoEn: new Date(),
        respuestaId: respuesta.id
      }
    })

    res.json({
      success: true,
      message: 'Formulario completado exitosamente',
      respuesta: {
        id: respuesta.id,
        completadoEn: respuesta.completadoEn
      }
    })
  } catch (error) {
    console.error('❌ Error al guardar respuesta:', error)
    res.status(500).json({
      success: false,
      error: 'Error al guardar respuesta',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

export default router
