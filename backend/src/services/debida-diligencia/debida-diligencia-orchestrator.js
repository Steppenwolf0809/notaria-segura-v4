/**
 * Debida Diligencia Orchestrator
 * Coordinates searches across all 10 control lists in parallel
 * and generates unified results + PDF reports
 */
import { searchOFAC } from './ofac-service.js';
import { searchONU } from './onu-service.js';
import { searchINTERPOL } from './interpol-service.js';
import {
    searchPEPs,
    searchSentenciados,
    searchObservados,
    searchProvidencias,
    searchEmpresasFantasmas,
    searchMasBuscados,
    searchHomonimos
} from './listas-locales-service.js';
import PDFDocument from 'pdfkit';

/**
 * Run all 10 list checks in parallel
 * @param {string} identificacion - CI/RUC/Passport
 * @param {string} nombre - Person's full name (optional, improves matching)
 * @returns {Object} - Unified results for all lists
 */
export async function consultarTodasLasListas(identificacion, nombre = '') {
    const startTime = Date.now();

    // Run all searches in parallel
    const [
        homonimosResult,
        pepsResult,
        sentenciadosResult,
        observadosResult,
        ofacResult,
        onuResult,
        providenciasResult,
        empresasFantasmasResult,
        interpolResult,
        masBuscadosResult
    ] = await Promise.allSettled([
        Promise.resolve(searchHomonimos(identificacion, nombre)),
        Promise.resolve(searchPEPs(identificacion, nombre)),
        Promise.resolve(searchSentenciados(identificacion, nombre)),
        Promise.resolve(searchObservados(identificacion, nombre)),
        searchOFAC(identificacion, nombre),
        searchONU(identificacion, nombre),
        Promise.resolve(searchProvidencias(identificacion, nombre)),
        Promise.resolve(searchEmpresasFantasmas(identificacion, nombre)),
        searchINTERPOL(identificacion, nombre),
        Promise.resolve(searchMasBuscados(identificacion, nombre))
    ]);

    // Helper to safely extract result
    const extract = (settled) => {
        if (settled.status === 'fulfilled') return settled.value;
        console.error('[DD-ORCHESTRATOR] List check failed:', settled.reason?.message);
        return { match: false, detalles: [], error: settled.reason?.message || 'Error desconocido' };
    };

    const resultados = {
        homonimos: extract(homonimosResult),
        peps: extract(pepsResult),
        sentenciados: extract(sentenciadosResult),
        observados: extract(observadosResult),
        ofac: extract(ofacResult),
        onu: extract(onuResult),
        providencias: extract(providenciasResult),
        empresasFantasmas: extract(empresasFantasmasResult),
        interpol: extract(interpolResult),
        masBuscados: extract(masBuscadosResult)
    };

    // Count total matches
    const totalCoincidencias = Object.values(resultados).filter(r => r.match).length;

    const elapsedMs = Date.now() - startTime;
    console.log(`[DD-ORCHESTRATOR] Search completed for ${identificacion} in ${elapsedMs}ms — ${totalCoincidencias} coincidencia(s)`);

    return {
        identificacion,
        nombre,
        resultados,
        totalCoincidencias,
        fechaConsulta: new Date().toISOString(),
        tiempoMs: elapsedMs
    };
}

/**
 * Generate a PDF report for a control list search result
 * @param {Object} searchResult - Result from consultarTodasLasListas
 * @returns {Promise<Buffer>} - PDF buffer
 */
export async function generarPDFReporte(searchResult) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // ─── HEADER ─────────────────────────────────
            doc
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('CONSULTA LISTAS DE CONTROL', { align: 'center' });

            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333');
            doc.moveDown(0.5);

            // ─── INFO ───────────────────────────────────
            const fecha = new Date(searchResult.fechaConsulta);
            const fechaStr = fecha.toLocaleDateString('es-EC', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            doc.fontSize(10).font('Helvetica-Bold');
            const infoStartY = doc.y;
            doc.text('Fecha de consulta:', 50, infoStartY);
            doc.font('Helvetica').text(fechaStr, 180, infoStartY);
            doc.font('Helvetica-Bold').text('Cliente:', 50, infoStartY + 16);
            doc.font('Helvetica').text(searchResult.nombre || 'NO DISPONIBLE', 180, infoStartY + 16);
            doc.font('Helvetica-Bold').text('Identificación:', 50, infoStartY + 32);
            doc.font('Helvetica').text(searchResult.identificacion, 180, infoStartY + 32);
            doc.y = infoStartY + 50;

            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333');
            doc.moveDown(0.5);

            // ─── RESULTS TABLE ──────────────────────────
            const listNames = {
                homonimos: 'HOMONIMOS',
                peps: 'PEPS',
                sentenciados: 'SENTENCIADOS',
                observados: 'OBSERVADOS',
                ofac: 'LISTA OFAC',
                onu: 'LISTA ONU',
                providencias: 'PROVIDENCIAS',
                empresasFantasmas: 'EMPRESAS FANTASMAS',
                interpol: 'INTERPOL',
                masBuscados: 'MAS BUSCADOS'
            };

            // Table header
            doc.fontSize(10).font('Helvetica-Bold');
            const tableTop = doc.y;
            doc.text('LISTA', 80, tableTop);
            doc.text('COINCIDENCIAS', 380, tableTop);
            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
            doc.moveDown(0.3);

            // Table rows
            for (const [key, label] of Object.entries(listNames)) {
                const resultado = searchResult.resultados[key];
                const coincide = resultado?.match ? 'SI' : 'NO';
                const rowY = doc.y;

                doc.fontSize(10).font('Helvetica');
                doc.text(label, 80, rowY);

                // Color coding
                if (resultado?.match) {
                    doc.font('Helvetica-Bold').fillColor('#c62828').text(coincide, 430, rowY);
                } else {
                    doc.font('Helvetica').fillColor('#2e7d32').text(coincide, 430, rowY);
                }
                doc.fillColor('#000');

                doc.moveDown(0.5);
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#eee');
                doc.moveDown(0.3);
            }

            // ─── DETAILS SECTION ────────────────────────
            const matchedLists = Object.entries(searchResult.resultados)
                .filter(([, r]) => r.match && r.detalles?.length > 0);

            if (matchedLists.length > 0) {
                doc.moveDown(1);
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333');
                doc.moveDown(0.5);

                for (const [key, resultado] of matchedLists) {
                    const label = listNames[key] || key.toUpperCase();

                    // Check for page break
                    if (doc.y > 700) {
                        doc.addPage();
                    }

                    doc.fontSize(12).font('Helvetica-Bold').text(label, 50);
                    doc.moveDown(0.3);

                    for (const detalle of resultado.detalles) {
                        if (doc.y > 720) {
                            doc.addPage();
                        }

                        doc.fontSize(9).font('Helvetica');
                        const entries = Object.entries(detalle).filter(([k, v]) => v != null && v !== '');
                        for (const [field, value] of entries) {
                            const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
                            doc.font('Helvetica-Bold').text(`${fieldLabel}: `, 70, doc.y, { continued: true });
                            doc.font('Helvetica').text(String(value));
                        }
                        doc.moveDown(0.3);
                    }

                    doc.moveDown(0.5);
                }
            }

            // ─── FOOTER ─────────────────────────────────
            doc.moveDown(1);
            doc.fontSize(8).font('Helvetica')
                .fillColor('#999')
                .text('Documento generado automáticamente por el Sistema de Debida Diligencia — Notaría Segura', {
                    align: 'center'
                });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

export default { consultarTodasLasListas, generarPDFReporte };
