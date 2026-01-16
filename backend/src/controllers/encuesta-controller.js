// Controlador para Encuestas de Satisfacción
import { db } from '../db.js';

/**
 * POST /api/encuesta
 * Registra una nueva encuesta de satisfacción (endpoint público)
 */
export const submitEncuesta = async (req, res) => {
    try {
        const { calificacion, infoClara, tratoCordial, tramiteId, sugerencia } = req.body;

        // Validación de calificación
        if (calificacion === undefined || calificacion === null) {
            return res.status(400).json({
                success: false,
                error: 'La calificación es requerida'
            });
        }

        const calificacionNum = parseInt(calificacion, 10);
        if (isNaN(calificacionNum) || calificacionNum < 1 || calificacionNum > 5) {
            return res.status(400).json({
                success: false,
                error: 'La calificación debe ser un número entre 1 y 5'
            });
        }

        // Validación de campos booleanos
        if (typeof infoClara !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El campo infoClara es requerido (true/false)'
            });
        }

        if (typeof tratoCordial !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El campo tratoCordial es requerido (true/false)'
            });
        }

        // Crear encuesta
        const encuesta = await db.encuestaSatisfaccion.create({
            data: {
                calificacion: calificacionNum,
                infoClara,
                tratoCordial,
                tramiteId: tramiteId || null,
                sugerencia: sugerencia || null
            }
        });

        console.log(`✅ Encuesta de satisfacción registrada: ID ${encuesta.id}, Calificación: ${calificacionNum}`);

        return res.status(201).json({
            success: true,
            message: '¡Gracias por su opinión! Su encuesta ha sido registrada.',
            data: { id: encuesta.id }
        });

    } catch (error) {
        console.error('❌ Error al registrar encuesta:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno al procesar la encuesta'
        });
    }
};

/**
 * GET /api/admin/encuestas
 * Lista encuestas con paginación y filtros (solo admin)
 */
export const getEncuestas = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 25,
            calificacion,
            fechaDesde,
            fechaHasta,
            orderBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
        const skip = (pageNum - 1) * limitNum;

        // Construir filtros
        const where = {};

        if (calificacion) {
            const cal = parseInt(calificacion, 10);
            if (cal >= 1 && cal <= 5) {
                where.calificacion = cal;
            }
        }

        if (fechaDesde || fechaHasta) {
            where.createdAt = {};
            if (fechaDesde) {
                where.createdAt.gte = new Date(fechaDesde);
            }
            if (fechaHasta) {
                const fecha = new Date(fechaHasta);
                fecha.setHours(23, 59, 59, 999);
                where.createdAt.lte = fecha;
            }
        }

        // Obtener encuestas
        const [encuestas, total] = await Promise.all([
            db.encuestaSatisfaccion.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { [orderBy]: order }
            }),
            db.encuestaSatisfaccion.count({ where })
        ]);

        const totalPages = Math.ceil(total / limitNum);

        return res.json({
            success: true,
            data: encuestas,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener encuestas:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno al obtener encuestas'
        });
    }
};

/**
 * GET /api/admin/encuestas/estadisticas
 * Obtiene estadísticas de las encuestas (solo admin)
 */
export const getEstadisticas = async (req, res) => {
    try {
        const { fechaDesde, fechaHasta } = req.query;

        // Construir filtros de fecha
        const where = {};
        if (fechaDesde || fechaHasta) {
            where.createdAt = {};
            if (fechaDesde) {
                where.createdAt.gte = new Date(fechaDesde);
            }
            if (fechaHasta) {
                const fecha = new Date(fechaHasta);
                fecha.setHours(23, 59, 59, 999);
                where.createdAt.lte = fecha;
            }
        }

        // Obtener estadísticas agregadas
        const [stats, distribucion, totalInfoClara, totalTratoCordial] = await Promise.all([
            // Promedio y total
            db.encuestaSatisfaccion.aggregate({
                where,
                _avg: { calificacion: true },
                _count: { id: true },
                _min: { calificacion: true },
                _max: { calificacion: true }
            }),
            // Distribución por calificación
            db.encuestaSatisfaccion.groupBy({
                by: ['calificacion'],
                where,
                _count: { id: true },
                orderBy: { calificacion: 'asc' }
            }),
            // Total con infoClara = true
            db.encuestaSatisfaccion.count({
                where: { ...where, infoClara: true }
            }),
            // Total con tratoCordial = true
            db.encuestaSatisfaccion.count({
                where: { ...where, tratoCordial: true }
            })
        ]);

        const total = stats._count.id;

        // Formatear distribución
        const distribucionFormateada = {};
        for (let i = 1; i <= 5; i++) {
            const found = distribucion.find(d => d.calificacion === i);
            distribucionFormateada[i] = found ? found._count.id : 0;
        }

        return res.json({
            success: true,
            data: {
                total,
                promedioCalificacion: stats._avg.calificacion ? parseFloat(stats._avg.calificacion.toFixed(2)) : 0,
                calificacionMinima: stats._min.calificacion || 0,
                calificacionMaxima: stats._max.calificacion || 0,
                distribucion: distribucionFormateada,
                porcentajeInfoClara: total > 0 ? parseFloat(((totalInfoClara / total) * 100).toFixed(1)) : 0,
                porcentajeTratoCordial: total > 0 ? parseFloat(((totalTratoCordial / total) * 100).toFixed(1)) : 0,
                totalInfoClara,
                totalTratoCordial
            }
        });

    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno al obtener estadísticas'
        });
    }
};
