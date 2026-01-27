import prisma from '../db.js';

/**
 * CONTROLADOR DE MENSAJES INTERNOS
 * Sistema de comunicación interna entre Admin y trabajadores
 */

// Tipos de mensaje permitidos
const TIPOS_MENSAJE = ['SOLICITUD_ACTUALIZACION', 'PRIORIZAR', 'CLIENTE_ESPERANDO', 'COBRO', 'OTRO'];
const NIVELES_URGENCIA = ['NORMAL', 'URGENTE', 'CRITICO'];

/**
 * Enviar mensaje individual
 * POST /api/mensajes-internos
 */
export const enviarMensaje = async (req, res) => {
    try {
        const remitenteId = req.user.id;
        const { destinatarioId, documentoId, tipo, urgencia = 'NORMAL', mensaje } = req.body;

        // Validaciones
        if (!destinatarioId) {
            return res.status(400).json({
                success: false,
                error: 'El destinatario es requerido'
            });
        }

        if (!tipo || !TIPOS_MENSAJE.includes(tipo)) {
            return res.status(400).json({
                success: false,
                error: `Tipo de mensaje inválido. Tipos permitidos: ${TIPOS_MENSAJE.join(', ')}`
            });
        }

        if (!NIVELES_URGENCIA.includes(urgencia)) {
            return res.status(400).json({
                success: false,
                error: `Nivel de urgencia inválido. Niveles permitidos: ${NIVELES_URGENCIA.join(', ')}`
            });
        }

        // Verificar que el destinatario existe
        const destinatario = await prisma.user.findUnique({
            where: { id: parseInt(destinatarioId) },
            select: { id: true, firstName: true, lastName: true, role: true }
        });

        if (!destinatario) {
            return res.status(404).json({
                success: false,
                error: 'Destinatario no encontrado'
            });
        }

        // Si se especifica un documento, verificar que existe
        let documento = null;
        if (documentoId) {
            documento = await prisma.document.findUnique({
                where: { id: documentoId },
                select: { id: true, protocolNumber: true, clientName: true }
            });

            if (!documento) {
                return res.status(404).json({
                    success: false,
                    error: 'Documento no encontrado'
                });
            }
        }

        // Crear el mensaje
        const nuevoMensaje = await prisma.mensajeInterno.create({
            data: {
                remitenteId,
                destinatarioId: parseInt(destinatarioId),
                documentoId: documentoId || null,
                tipo,
                urgencia,
                mensaje: mensaje || null
            },
            include: {
                remitente: {
                    select: { id: true, firstName: true, lastName: true, role: true }
                },
                destinatario: {
                    select: { id: true, firstName: true, lastName: true, role: true }
                },
                documento: {
                    select: { id: true, protocolNumber: true, clientName: true }
                }
            }
        });

        console.log(`📨 Mensaje interno enviado: ${remitenteId} -> ${destinatarioId} [${tipo}]`);

        res.status(201).json({
            success: true,
            data: nuevoMensaje,
            message: 'Mensaje enviado exitosamente'
        });

    } catch (error) {
        console.error('Error al enviar mensaje interno:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar el mensaje'
        });
    }
};

/**
 * Enviar mensajes masivos (agrupa por matrizador automáticamente)
 * POST /api/mensajes-internos/masivo
 */
export const enviarMensajeMasivo = async (req, res) => {
    try {
        const remitenteId = req.user.id;
        const { documentoIds, tipo, urgencia = 'NORMAL', mensaje } = req.body;

        // Validaciones
        if (!documentoIds || !Array.isArray(documentoIds) || documentoIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere al menos un documento'
            });
        }

        if (!tipo || !TIPOS_MENSAJE.includes(tipo)) {
            return res.status(400).json({
                success: false,
                error: `Tipo de mensaje inválido. Tipos permitidos: ${TIPOS_MENSAJE.join(', ')}`
            });
        }

        // Obtener documentos con sus matrizadores asignados
        const documentos = await prisma.document.findMany({
            where: {
                id: { in: documentoIds }
            },
            select: {
                id: true,
                protocolNumber: true,
                assignedToId: true,
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });

        if (documentos.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron documentos válidos'
            });
        }

        // Agrupar por matrizador
        const mensajesPorMatrizador = {};
        const documentosSinAsignar = [];

        documentos.forEach(doc => {
            if (doc.assignedToId) {
                if (!mensajesPorMatrizador[doc.assignedToId]) {
                    mensajesPorMatrizador[doc.assignedToId] = {
                        matrizador: doc.assignedTo,
                        documentos: []
                    };
                }
                mensajesPorMatrizador[doc.assignedToId].documentos.push(doc);
            } else {
                documentosSinAsignar.push(doc);
            }
        });

        // Crear mensajes para cada matrizador
        const mensajesCreados = [];
        for (const [matrizadorId, data] of Object.entries(mensajesPorMatrizador)) {
            // Crear un mensaje por cada documento
            for (const doc of data.documentos) {
                const nuevoMensaje = await prisma.mensajeInterno.create({
                    data: {
                        remitenteId,
                        destinatarioId: parseInt(matrizadorId),
                        documentoId: doc.id,
                        tipo,
                        urgencia,
                        mensaje: mensaje || null
                    }
                });
                mensajesCreados.push(nuevoMensaje);
            }
        }

        console.log(`📨 Mensaje masivo enviado: ${mensajesCreados.length} mensajes a ${Object.keys(mensajesPorMatrizador).length} matrizadores`);

        res.status(201).json({
            success: true,
            data: {
                mensajesEnviados: mensajesCreados.length,
                matrizadoresNotificados: Object.keys(mensajesPorMatrizador).length,
                documentosSinAsignar: documentosSinAsignar.map(d => d.protocolNumber),
                resumen: Object.values(mensajesPorMatrizador).map(m => ({
                    matrizador: `${m.matrizador.firstName} ${m.matrizador.lastName}`,
                    documentos: m.documentos.length
                }))
            },
            message: `${mensajesCreados.length} mensajes enviados exitosamente`
        });

    } catch (error) {
        console.error('Error al enviar mensajes masivos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar los mensajes'
        });
    }
};

/**
 * Obtener contador de mensajes no leídos
 * GET /api/mensajes-internos/no-leidos/count
 */
export const contarNoLeidos = async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await prisma.mensajeInterno.count({
            where: {
                destinatarioId: userId,
                leido: false
            }
        });

        res.json({
            success: true,
            data: { count }
        });

    } catch (error) {
        console.error('Error al contar mensajes no leídos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el contador'
        });
    }
};

/**
 * Listar mensajes del usuario con paginación
 * GET /api/mensajes-internos?page=1&limit=20&leido=false&resuelto=false&estado=pendientes
 */
export const listarMensajes = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Filtro por estado de lectura
        let leidoFilter = {};
        if (req.query.leido === 'false') {
            leidoFilter = { leido: false };
        } else if (req.query.leido === 'true') {
            leidoFilter = { leido: true };
        }

        // Filtro por estado de resolución
        let resueltoFilter = {};
        if (req.query.resuelto === 'false') {
            resueltoFilter = { resuelto: false };
        } else if (req.query.resuelto === 'true') {
            resueltoFilter = { resuelto: true };
        }

        // Filtro combinado por "estado" (shortcut)
        // pendientes = no resueltos, resueltos = resueltos, todos = sin filtro
        if (req.query.estado === 'pendientes') {
            resueltoFilter = { resuelto: false };
        } else if (req.query.estado === 'resueltos') {
            resueltoFilter = { resuelto: true };
        }

        const where = {
            destinatarioId: userId,
            ...leidoFilter,
            ...resueltoFilter
        };

        const [mensajes, total] = await Promise.all([
            prisma.mensajeInterno.findMany({
                where,
                include: {
                    remitente: {
                        select: { id: true, firstName: true, lastName: true, role: true }
                    },
                    documento: {
                        select: {
                            id: true,
                            protocolNumber: true,
                            clientName: true,
                            status: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.mensajeInterno.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                mensajes,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error al listar mensajes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los mensajes'
        });
    }
};

/**
 * Marcar un mensaje como leído
 * PUT /api/mensajes-internos/:id/leer
 */
export const marcarLeido = async (req, res) => {
    try {
        const userId = req.user.id;
        const mensajeId = parseInt(req.params.id);

        // Verificar que el mensaje existe y pertenece al usuario
        const mensaje = await prisma.mensajeInterno.findFirst({
            where: {
                id: mensajeId,
                destinatarioId: userId
            }
        });

        if (!mensaje) {
            return res.status(404).json({
                success: false,
                error: 'Mensaje no encontrado'
            });
        }

        // Actualizar
        const mensajeActualizado = await prisma.mensajeInterno.update({
            where: { id: mensajeId },
            data: {
                leido: true,
                leidoAt: new Date()
            }
        });

        res.json({
            success: true,
            data: mensajeActualizado,
            message: 'Mensaje marcado como leído'
        });

    } catch (error) {
        console.error('Error al marcar mensaje como leído:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el mensaje'
        });
    }
};

/**
 * Marcar todos los mensajes como leídos
 * PUT /api/mensajes-internos/leer-todos
 */
export const marcarTodosLeidos = async (req, res) => {
    try {
        const userId = req.user.id;

        const resultado = await prisma.mensajeInterno.updateMany({
            where: {
                destinatarioId: userId,
                leido: false
            },
            data: {
                leido: true,
                leidoAt: new Date()
            }
        });

        res.json({
            success: true,
            data: { actualizados: resultado.count },
            message: `${resultado.count} mensajes marcados como leídos`
        });

    } catch (error) {
        console.error('Error al marcar todos como leídos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar los mensajes'
        });
    }
};

/**
 * Marcar un mensaje como resuelto/procesado
 * PUT /api/mensajes-internos/:id/resolver
 * Body: { notaResolucion?: string }
 */
export const marcarResuelto = async (req, res) => {
    try {
        const userId = req.user.id;
        const mensajeId = parseInt(req.params.id);
        const { notaResolucion } = req.body;

        // Verificar que el mensaje existe y pertenece al usuario
        const mensaje = await prisma.mensajeInterno.findFirst({
            where: {
                id: mensajeId,
                destinatarioId: userId
            },
            include: {
                documento: {
                    select: { id: true, protocolNumber: true }
                }
            }
        });

        if (!mensaje) {
            return res.status(404).json({
                success: false,
                error: 'Mensaje no encontrado'
            });
        }

        // Actualizar mensaje como resuelto (y leído si no lo estaba)
        const mensajeActualizado = await prisma.mensajeInterno.update({
            where: { id: mensajeId },
            data: {
                resuelto: true,
                resueltoAt: new Date(),
                notaResolucion: notaResolucion || null,
                leido: true,
                leidoAt: mensaje.leidoAt || new Date()
            },
            include: {
                remitente: {
                    select: { id: true, firstName: true, lastName: true }
                },
                documento: {
                    select: { id: true, protocolNumber: true }
                }
            }
        });

        console.log(`✅ Mensaje ${mensajeId} marcado como resuelto por usuario ${userId}`);

        res.json({
            success: true,
            data: mensajeActualizado,
            message: 'Mensaje marcado como resuelto'
        });

    } catch (error) {
        console.error('Error al marcar mensaje como resuelto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el mensaje'
        });
    }
};

/**
 * Obtener estadísticas de mensajes del usuario
 * GET /api/mensajes-internos/estadisticas
 */
export const obtenerEstadisticas = async (req, res) => {
    try {
        const userId = req.user.id;

        const [noLeidos, pendientes, resueltos, total] = await Promise.all([
            prisma.mensajeInterno.count({
                where: { destinatarioId: userId, leido: false }
            }),
            prisma.mensajeInterno.count({
                where: { destinatarioId: userId, resuelto: false }
            }),
            prisma.mensajeInterno.count({
                where: { destinatarioId: userId, resuelto: true }
            }),
            prisma.mensajeInterno.count({
                where: { destinatarioId: userId }
            })
        ]);

        res.json({
            success: true,
            data: {
                noLeidos,
                pendientes,
                resueltos,
                total
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas'
        });
    }
};

/**
 * Listar mensajes ENVIADOS por el usuario (para seguimiento del Admin)
 * GET /api/mensajes-internos/enviados?page=1&limit=20&resuelto=false
 */
export const listarMensajesEnviados = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Filtro por estado de resolución
        let resueltoFilter = {};
        if (req.query.resuelto === 'false') {
            resueltoFilter = { resuelto: false };
        } else if (req.query.resuelto === 'true') {
            resueltoFilter = { resuelto: true };
        }

        // Filtro por estado
        if (req.query.estado === 'pendientes') {
            resueltoFilter = { resuelto: false };
        } else if (req.query.estado === 'resueltos') {
            resueltoFilter = { resuelto: true };
        }

        const where = {
            remitenteId: userId,
            ...resueltoFilter
        };

        const [mensajes, total] = await Promise.all([
            prisma.mensajeInterno.findMany({
                where,
                include: {
                    destinatario: {
                        select: { id: true, firstName: true, lastName: true, role: true }
                    },
                    documento: {
                        select: {
                            id: true,
                            protocolNumber: true,
                            clientName: true,
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.mensajeInterno.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                mensajes,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error al listar mensajes enviados:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los mensajes'
        });
    }
};

/**
 * Obtener estadísticas de mensajes enviados (para Admin)
 * GET /api/mensajes-internos/enviados/estadisticas
 */
export const obtenerEstadisticasEnviados = async (req, res) => {
    try {
        const userId = req.user.id;

        const [pendientes, resueltos, total] = await Promise.all([
            prisma.mensajeInterno.count({
                where: { remitenteId: userId, resuelto: false }
            }),
            prisma.mensajeInterno.count({
                where: { remitenteId: userId, resuelto: true }
            }),
            prisma.mensajeInterno.count({
                where: { remitenteId: userId }
            })
        ]);

        // Tasa de resolución
        const tasaResolucion = total > 0 ? Math.round((resueltos / total) * 100) : 0;

        res.json({
            success: true,
            data: {
                pendientes,
                resueltos,
                total,
                tasaResolucion
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de enviados:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas'
        });
    }
};

export default {
    enviarMensaje,
    enviarMensajeMasivo,
    contarNoLeidos,
    listarMensajes,
    marcarLeido,
    marcarTodosLeidos,
    marcarResuelto,
    obtenerEstadisticas,
    listarMensajesEnviados,
    obtenerEstadisticasEnviados
};
