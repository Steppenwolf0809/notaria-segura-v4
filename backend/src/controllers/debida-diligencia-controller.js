/**
 * Debida Diligencia Controller
 * Handles API requests for control list searches
 */
import prisma from '../db.js';
import { consultarTodasLasListas, generarPDFReporte } from '../services/debida-diligencia/debida-diligencia-orchestrator.js';
import { searchProvidencias } from '../services/debida-diligencia/listas-locales-service.js';

/**
 * POST /api/debida-diligencia/consultar
 * Search a person across all 10 control lists
 * Body: { identificacion: string, nombre?: string }
 * Auth: JWT (ADMIN, MATRIZADOR)
 */
export async function consultarListasControl(req, res) {
    try {
        const { identificacion, nombre } = req.body;

        if (!identificacion || identificacion.trim().length < 5) {
            return res.status(400).json({
                success: false,
                error: 'La identificación (CI/RUC/Pasaporte) es requerida y debe tener al menos 5 caracteres'
            });
        }

        const idClean = identificacion.trim();

        // Determine tipo
        let tipoIdentificacion = 'CI';
        if (idClean.length === 13) tipoIdentificacion = 'RUC';
        else if (/[A-Za-z]/.test(idClean)) tipoIdentificacion = 'PASAPORTE';

        console.log(`[DD] Consulta listas de control: ${idClean} (${tipoIdentificacion}) por usuario ${req.user?.id}`);

        // Run all list checks
        const resultadoBusqueda = await consultarTodasLasListas(idClean, nombre || '');

        // Save to audit log
        try {
            await prisma.consultaListaControl.create({
                data: {
                    identificacion: idClean,
                    tipoIdentificacion,
                    nombreCompleto: resultadoBusqueda.nombre || nombre || null,
                    resultadoResumen: resultadoBusqueda.resultados,
                    totalCoincidencias: resultadoBusqueda.totalCoincidencias,
                    consultadoPorId: req.user.id,
                    pdfGenerado: false
                }
            });
        } catch (auditErr) {
            console.error('[DD] Error saving audit log:', auditErr.message);
            // Don't fail the search if audit log fails
        }

        return res.json({
            success: true,
            data: {
                identificacion: idClean,
                tipoIdentificacion,
                nombre: resultadoBusqueda.nombre || nombre || '',
                resultados: resultadoBusqueda.resultados,
                totalCoincidencias: resultadoBusqueda.totalCoincidencias,
                fechaConsulta: resultadoBusqueda.fechaConsulta,
                tiempoMs: resultadoBusqueda.tiempoMs
            }
        });
    } catch (error) {
        console.error('[DD] Error en consulta:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al consultar listas de control',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * POST /api/debida-diligencia/providencias
 * Search providencias judiciales specifically
 * Body: { identificacion: string, nombre?: string }
 */
export async function consultarProvidencias(req, res) {
    try {
        const { identificacion, nombre } = req.body;

        if (!identificacion || identificacion.trim().length < 5) {
            return res.status(400).json({
                success: false,
                error: 'La identificación es requerida'
            });
        }

        const resultado = searchProvidencias(identificacion.trim(), nombre || '');

        return res.json({
            success: true,
            data: {
                identificacion: identificacion.trim(),
                nombre: nombre || '',
                resultado,
                fechaConsulta: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[DD] Error en consulta providencias:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al consultar providencias judiciales'
        });
    }
}

/**
 * GET /api/debida-diligencia/historial
 * Get search history (audit trail)
 * Query: page, limit, identificacion (optional filter)
 */
export async function obtenerHistorial(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const identificacionFilter = req.query.identificacion?.trim();

        const where = {};

        // Non-admins can only see their own searches
        if (req.user.role !== 'ADMIN') {
            where.consultadoPorId = req.user.id;
        }

        if (identificacionFilter) {
            where.identificacion = { contains: identificacionFilter };
        }

        const [consultas, total] = await Promise.all([
            prisma.consultaListaControl.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    consultadoPor: {
                        select: { id: true, firstName: true, lastName: true, role: true }
                    }
                }
            }),
            prisma.consultaListaControl.count({ where })
        ]);

        return res.json({
            success: true,
            data: {
                consultas: consultas.map(c => ({
                    id: c.id,
                    identificacion: c.identificacion,
                    tipoIdentificacion: c.tipoIdentificacion,
                    nombreCompleto: c.nombreCompleto,
                    totalCoincidencias: c.totalCoincidencias,
                    pdfGenerado: c.pdfGenerado,
                    consultadoPor: c.consultadoPor,
                    createdAt: c.createdAt,
                    // Include simplified results (just match status per list)
                    resultadoResumen: Object.fromEntries(
                        Object.entries(c.resultadoResumen || {}).map(([key, val]) => [key, { match: val?.match || false }])
                    )
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + limit < total
                }
            }
        });
    } catch (error) {
        console.error('[DD] Error en historial:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al obtener historial de consultas'
        });
    }
}

/**
 * GET /api/debida-diligencia/consulta/:id/pdf
 * Download PDF report for a specific search
 */
export async function descargarPDF(req, res) {
    try {
        const { id } = req.params;

        const consulta = await prisma.consultaListaControl.findUnique({
            where: { id }
        });

        if (!consulta) {
            return res.status(404).json({
                success: false,
                error: 'Consulta no encontrada'
            });
        }

        // Generate PDF
        const searchResult = {
            identificacion: consulta.identificacion,
            nombre: consulta.nombreCompleto || '',
            resultados: consulta.resultadoResumen,
            totalCoincidencias: consulta.totalCoincidencias,
            fechaConsulta: consulta.createdAt.toISOString()
        };

        const pdfBuffer = await generarPDFReporte(searchResult);

        // Mark as PDF generated
        await prisma.consultaListaControl.update({
            where: { id },
            data: { pdfGenerado: true }
        });

        const filename = `consulta_listas_${consulta.identificacion}_${consulta.createdAt.toISOString().split('T')[0]}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length
        });

        return res.send(pdfBuffer);
    } catch (error) {
        console.error('[DD] Error generando PDF:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al generar el reporte PDF'
        });
    }
}

/**
 * POST /api/debida-diligencia/consultar-y-pdf
 * Search + immediately return PDF (for "IMPRIMIR" button)
 * Body: { identificacion: string, nombre?: string }
 */
export async function consultarYGenerarPDF(req, res) {
    try {
        const { identificacion, nombre } = req.body;

        if (!identificacion || identificacion.trim().length < 5) {
            return res.status(400).json({
                success: false,
                error: 'La identificación es requerida'
            });
        }

        const idClean = identificacion.trim();
        let tipoIdentificacion = 'CI';
        if (idClean.length === 13) tipoIdentificacion = 'RUC';
        else if (/[A-Za-z]/.test(idClean)) tipoIdentificacion = 'PASAPORTE';

        // Run search
        const resultadoBusqueda = await consultarTodasLasListas(idClean, nombre || '');

        // Save audit log
        try {
            await prisma.consultaListaControl.create({
                data: {
                    identificacion: idClean,
                    tipoIdentificacion,
                    nombreCompleto: resultadoBusqueda.nombre || nombre || null,
                    resultadoResumen: resultadoBusqueda.resultados,
                    totalCoincidencias: resultadoBusqueda.totalCoincidencias,
                    consultadoPorId: req.user.id,
                    pdfGenerado: true
                }
            });
        } catch (e) {
            console.error('[DD] Audit log error:', e.message);
        }

        // Generate PDF
        const pdfBuffer = await generarPDFReporte(resultadoBusqueda);

        const filename = `consulta_listas_${idClean}_${new Date().toISOString().split('T')[0]}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length
        });

        return res.send(pdfBuffer);
    } catch (error) {
        console.error('[DD] Error en consulta+PDF:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al consultar y generar PDF'
        });
    }
}

export default {
    consultarListasControl,
    consultarProvidencias,
    obtenerHistorial,
    descargarPDF,
    consultarYGenerarPDF
};
