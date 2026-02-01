/**
 * Import MOV Service
 * Servicio de importación de Movimientos de Caja desde XML Koinor
 * 
 * Funcionalidad:
 * - Importa facturas desde el reporte de movimientos diarios
 * - Marca como PAGADAS las facturas con conpag='E' (efectivo)
 * - Las facturas con conpag='C' quedan PENDIENTES para pago posterior
 * 
 * Flujo:
 * 1. XML MOV → Facturas + pagos efectivo (este servicio)
 * 2. XML Estado Cuenta → Pagos posteriores (import-koinor-xml-service.js)
 */

import { db as prisma } from '../db.js';
import { parseMovXML } from './xml-mov-parser.js';
import { normalizeInvoiceNumber } from '../utils/billing-utils.js';

/**
 * Extrae el secuencial de un número de factura (los últimos dígitos después del último guión o los últimos 6-9 dígitos)
 * Ejemplos:
 * - "001-002-000124216" → "124216"
 * - "001002-00124216" → "124216"
 * - "001002-000124216" → "124216"
 * @param {string} invoiceNumber - Número de factura en cualquier formato
 * @returns {string} Secuencial normalizado (sin ceros a la izquierda)
 */
function extractSecuencial(invoiceNumber) {
    if (!invoiceNumber) return '';
    
    const str = String(invoiceNumber);
    
    // Buscar el último segmento después del guión
    const parts = str.split('-');
    const lastPart = parts[parts.length - 1];
    
    // Remover ceros a la izquierda del secuencial
    return lastPart.replace(/^0+/, '') || '0';
}

/**
 * Extrae el número de factura del xmlOriginal de un documento
 * @param {string} xmlOriginal - XML completo del documento
 * @returns {string|null} Número de factura en formato del documento
 */
function extractNumeroFacturaFromXml(xmlOriginal) {
    if (!xmlOriginal) return null;
    
    try {
        // Buscar estab, ptoEmi y secuencial en el XML
        const estabMatch = xmlOriginal.match(/<estab>(\d+)<\/estab>/);
        const ptoEmiMatch = xmlOriginal.match(/<ptoEmi>(\d+)<\/ptoEmi>/);
        const secuencialMatch = xmlOriginal.match(/<secuencial>(\d+)<\/secuencial>/);
        
        if (estabMatch && ptoEmiMatch && secuencialMatch) {
            const estab = estabMatch[1];
            const ptoEmi = ptoEmiMatch[1];
            const secuencial = secuencialMatch[1];
            
            // Formato estándar: 001-002-000124216 (con guiones)
            return `${estab}-${ptoEmi}-${secuencial}`;
        }
        
        return null;
    } catch (error) {
        console.error('[import-mov] Error extracting numeroFactura from XML:', error);
        return null;
    }
}

/**
 * Compara dos números de factura por su secuencial
 * @param {string} num1 - Primer número de factura
 * @param {string} num2 - Segundo número de factura
 * @returns {boolean} true si son equivalentes
 */
function invoiceNumbersMatch(num1, num2) {
    if (!num1 || !num2) return false;
    
    const seq1 = extractSecuencial(num1);
    const seq2 = extractSecuencial(num2);
    
    // Comparar secuenciales
    return seq1 === seq2 && seq1.length >= 5; // Al menos 5 dígitos para ser válido
}

/**
 * Importa archivo XML de Movimientos de Caja
 * @param {Buffer} fileBuffer - Buffer del archivo XML
 * @param {string} fileName - Nombre del archivo
 * @param {number} userId - ID del usuario ejecutando la importación
 * @returns {Promise<Object>} - Resultado de la importación
 */
export async function importMovFile(fileBuffer, fileName, userId) {
    const startTime = Date.now();
    console.log(`[import-mov] Starting MOV import of ${fileName} by user ${userId}`);

    // Crear log de importación
    const importLog = await prisma.importLog.create({
        data: {
            fileName,
            fileType: 'XML_MOV',
            totalRows: 0,
            status: 'PROCESSING',
            executedBy: userId
        }
    });

    const stats = {
        totalFacturas: 0,
        facturasNuevas: 0,
        facturasActualizadas: 0,
        pagosEfectivoAplicados: 0,
        facturasVinculadas: 0,        // NUEVO: facturas vinculadas a documentos
        facturasSinVincular: 0,       // NUEVO: facturas sin documento asociado
        facturasCredito: 0,
        errors: 0,
        errorDetails: [],
        detalleVinculaciones: []      // NUEVO: log de vinculaciones exitosas
    };

    try {
        // 1. Parsear XML MOV
        console.log('[import-mov] Parsing MOV XML...');
        const parsed = await parseMovXML(fileBuffer, fileName);

        const invoices = parsed.invoices || [];
        stats.totalFacturas = invoices.length;
        console.log(`[import-mov] Found ${invoices.length} invoices to process`);

        // 2. Procesar cada factura
        for (const invoiceData of invoices) {
            try {
                const result = await processMovInvoice(invoiceData, fileName);
                
                if (result.created) stats.facturasNuevas++;
                if (result.updated) stats.facturasActualizadas++;
                if (result.cashPaymentApplied) stats.pagosEfectivoAplicados++;
                if (result.isCredit) stats.facturasCredito++;
                
                // NUEVO: Tracking de vinculaciones
                if (result.linkedToDocument) {
                    stats.facturasVinculadas++;
                    stats.detalleVinculaciones.push({
                        invoiceNumber: invoiceData.invoiceNumberRaw,
                        documentProtocol: result.documentProtocol,
                        clientName: invoiceData.clientName
                    });
                } else if (result.cashPaymentApplied) {
                    stats.facturasSinVincular++;
                }
                
            } catch (error) {
                stats.errors++;
                stats.errorDetails.push({
                    type: 'INVOICE',
                    invoiceNumber: invoiceData.invoiceNumberRaw,
                    error: error.message
                });
                console.error(`[import-mov] Error processing invoice ${invoiceData.invoiceNumberRaw}:`, error);
            }
        }

        // 3. Actualizar log con éxito
        await prisma.importLog.update({
            where: { id: importLog.id },
            data: {
                totalRows: stats.totalFacturas,
                invoicesCreated: stats.facturasNuevas,
                invoicesUpdated: stats.facturasActualizadas,
                paymentsCreated: stats.pagosEfectivoAplicados,
                errors: stats.errors,
                status: stats.errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
                errorDetails: stats.errorDetails.length > 0 ? stats.errorDetails : null,
                completedAt: new Date()
            }
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // Log detallado de resultados
        console.log(`[import-mov] ========== RESUMEN IMPORTACIÓN MOV ==========`);
        console.log(`[import-mov] Archivo: ${fileName}`);
        console.log(`[import-mov] Duración: ${duration}s`);
        console.log(`[import-mov] Total facturas procesadas: ${stats.totalFacturas}`);
        console.log(`[import-mov] Facturas nuevas creadas: ${stats.facturasNuevas}`);
        console.log(`[import-mov] Facturas actualizadas: ${stats.facturasActualizadas}`);
        console.log(`[import-mov] Pagos efectivo aplicados: ${stats.pagosEfectivoAplicados}`);
        console.log(`[import-mov] ✅ Facturas VINCULADAS a documentos: ${stats.facturasVinculadas}`);
        console.log(`[import-mov] ⚠️ Facturas SIN VINCULAR (sin documento): ${stats.facturasSinVincular}`);
        console.log(`[import-mov] Facturas a crédito: ${stats.facturasCredito}`);
        console.log(`[import-mov] Errores: ${stats.errors}`);
        
        if (stats.detalleVinculaciones.length > 0) {
            console.log(`[import-mov] --- Detalle de vinculaciones exitosas (primeras 20): ---`);
            stats.detalleVinculaciones.slice(0, 20).forEach((v, i) => {
                console.log(`[import-mov]   ${i+1}. Factura ${v.invoiceNumber} → Documento ${v.documentProtocol} (${v.clientName})`);
            });
        }
        console.log(`[import-mov] ===============================================`);

        return {
            success: true,
            importLogId: importLog.id,
            stats: {
                totalProcesados: stats.totalFacturas,
                facturasNuevas: stats.facturasNuevas,
                facturasActualizadas: stats.facturasActualizadas,
                pagosEfectivoAplicados: stats.pagosEfectivoAplicados,
                facturasVinculadas: stats.facturasVinculadas,
                facturasSinVincular: stats.facturasSinVincular,
                facturasCredito: stats.facturasCredito,
                errores: stats.errorDetails,
                detalleVinculaciones: stats.detalleVinculaciones.slice(0, 50) // Limitar a 50 para respuesta
            },
            duration: `${duration}s`,
            summary: parsed.summary
        };

    } catch (error) {
        console.error('[import-mov] Import failed:', error);

        await prisma.importLog.update({
            where: { id: importLog.id },
            data: {
                status: 'FAILED',
                errorDetails: { 
                    message: error.message, 
                    stack: error.stack 
                },
                completedAt: new Date()
            }
        });

        throw error;
    }
}

/**
 * Procesa una factura del XML MOV
 * @param {Object} invoiceData - Datos de la factura del parser
 * @param {string} sourceFile - Nombre del archivo origen
 * @returns {Promise<Object>} - {created, updated, cashPaymentApplied, isCredit}
 */
async function processMovInvoice(invoiceData, sourceFile) {
    const result = {
        created: false,
        updated: false,
        cashPaymentApplied: false,
        isCredit: false,
        linkedToDocument: false,      // NUEVO: indica si se vinculó a documento
        documentProtocol: null        // NUEVO: protocolo del documento vinculado
    };

    const invoiceNumberRaw = invoiceData.invoiceNumberRaw;
    const invoiceNumber = normalizeInvoiceNumber(invoiceNumberRaw);
    
    if (!invoiceNumber) {
        throw new Error('Factura sin número válido');
    }

    // Buscar factura existente
    let invoice = await prisma.invoice.findFirst({
        where: {
            OR: [
                { invoiceNumber },
                { invoiceNumberRaw }
            ]
        },
        include: {
            payments: true,
            document: true
        }
    });

    // Buscar documento para vinculación
    let documentId = invoice?.documentId || null;
    
    if (!documentId) {
        // Extraer secuencial para búsqueda flexible
        const secuencial = extractSecuencial(invoiceNumber);
        
        // Primero intentar por numeroFactura directo o por secuencial
        let document = await prisma.document.findFirst({
            where: {
                OR: [
                    { numeroFactura: invoiceNumber },
                    // Buscar por secuencial: el numeroFactura termina con el mismo secuencial
                    { numeroFactura: { endsWith: secuencial } }
                ],
                invoices: { none: {} } // Solo documentos sin factura vinculada
            },
            select: {
                id: true,
                protocolNumber: true,
                numeroFactura: true
            }
        });
        
        // Validar que el secuencial coincida exactamente (evitar falsos positivos)
        if (document && document.numeroFactura) {
            const docSecuencial = extractSecuencial(document.numeroFactura);
            if (docSecuencial !== secuencial) {
                console.log(`[import-mov] Secuencial mismatch: doc=${docSecuencial}, invoice=${secuencial}`);
                document = null;
            }
        }
        
        // Si no encuentra, buscar documentos sin numeroFactura pero con xmlOriginal que contenga el número
        if (!document) {
            // Buscar documentos que coincidan por clientName + totalFactura y extraer numeroFactura del XML
            const clientNameSearch = invoiceData.clientName ? invoiceData.clientName.trim().substring(0, 20) : '';
            console.log(`[import-mov] Searching document for invoice ${invoiceNumber}: clientName="${clientNameSearch}", totalAmount=${invoiceData.totalAmount}`);
            
            const candidatos = await prisma.document.findMany({
                where: {
                    clientName: {
                        contains: clientNameSearch,
                        mode: 'insensitive'
                    },
                    invoices: {
                        none: {}
                    }
                },
                select: {
                    id: true,
                    protocolNumber: true,
                    numeroFactura: true,
                    xmlOriginal: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 10
            });
            
            console.log(`[import-mov] Found ${candidatos.length} candidate documents for invoice ${invoiceNumber}`);
            
            // Buscar el documento cuyo xmlOriginal contenga el número de factura
            for (const candidato of candidatos) {
                // Extraer numeroFactura del xmlOriginal si no existe
                const docNumeroFactura = candidato.numeroFactura || extractNumeroFacturaFromXml(candidato.xmlOriginal);
                console.log(`[import-mov] Checking candidate ${candidato.protocolNumber}: docNumeroFactura=${docNumeroFactura}, invoiceNumber=${invoiceNumber}`);
                
                // Si el documento ya tiene numeroFactura, comparar con normalización
                if (candidato.numeroFactura && invoiceNumbersMatch(candidato.numeroFactura, invoiceNumber)) {
                    document = candidato;
                    console.log(`[import-mov] Found document ${candidato.protocolNumber} by numeroFactura match (${candidato.numeroFactura} ≈ ${invoiceNumber})`);
                    break;
                }
                
                // Si no tiene numeroFactura, extraerlo del xmlOriginal
                if (!candidato.numeroFactura && candidato.xmlOriginal) {
                    const extractedNumero = extractNumeroFacturaFromXml(candidato.xmlOriginal);
                    if (extractedNumero && invoiceNumbersMatch(extractedNumero, invoiceNumber)) {
                        document = candidato;
                        console.log(`[import-mov] Found document ${candidato.protocolNumber} by xmlOriginal extraction (${extractedNumero} ≈ ${invoiceNumber})`);
                        
                        // Actualizar el documento con el numeroFactura extraído
                        await prisma.document.update({
                            where: { id: candidato.id },
                            data: { numeroFactura: extractedNumero }
                        });
                        console.log(`[import-mov] Updated document ${candidato.protocolNumber} with numeroFactura: ${extractedNumero}`);
                        break;
                    }
                }
            }
        }
        
        if (document) {
            documentId = document.id;
            result.linkedToDocument = true;
            result.documentProtocol = document.protocolNumber;
            console.log(`[import-mov] ✅ Linking invoice ${invoiceNumber} to document ${document.protocolNumber}`);
        } else {
            console.log(`[import-mov] ⚠️ No document found for invoice ${invoiceNumber} (client: ${invoiceData.clientName})`);
        }
    }

    // Determinar estado inicial
    let status = 'PENDING';
    let paidAmount = 0;

    if (invoiceData.isPaid && invoiceData.paymentMethod === 'CASH') {
        status = 'PAID';
        paidAmount = invoiceData.totalAmount;
        result.cashPaymentApplied = true;
    } else if (invoiceData.paidAmount > 0) {
        paidAmount = invoiceData.paidAmount;
        status = paidAmount >= invoiceData.totalAmount ? 'PAID' : 'PARTIAL';
    }

    if (invoiceData.conpag === 'C') {
        result.isCredit = true;
    }

    if (invoice) {
        // Factura existe - actualizar solo si hay nueva información
        const existingPaid = invoice.payments.reduce(
            (sum, p) => sum + Number(p.amount), 0
        );
        
        // SIEMPRE intentar vincular documento si la factura no tiene uno
        if (documentId && !invoice.documentId) {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { documentId }
            });
            result.linkedToDocument = true;
            result.documentProtocol = result.documentProtocol; // Ya fue asignado arriba
            console.log(`[import-mov] ✅ Linked existing invoice ${invoiceNumber} to document (documentId: ${documentId})`);
            result.updated = true;
        }
        
        // Solo crear pago si el pago en efectivo es nuevo
        if (invoiceData.isPaid && invoiceData.paymentMethod === 'CASH' && existingPaid === 0) {
            // Crear pago en efectivo
            await prisma.payment.create({
                data: {
                    invoiceId: invoice.id,
                    receiptNumber: `MOV-${invoiceNumberRaw}`,
                    amount: invoiceData.totalAmount,
                    paymentDate: invoiceData.issueDate || new Date(),
                    paymentType: 'CASH',
                    concept: 'Pago en efectivo al momento de facturación',
                    sourceFile
                }
            });

            // Actualizar estado de factura
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'PAID',
                    paidAmount: invoiceData.totalAmount,
                    sourceFile
                }
            });

            result.updated = true;
            console.log(`[import-mov] Cash payment applied to existing invoice: ${invoiceNumber}`);
        } else if (!result.updated) {
            console.log(`[import-mov] Invoice already exists, no changes needed: ${invoiceNumber}`);
        }
        
    } else {
        // Crear nueva factura
        const invoiceCreateData = {
            invoiceNumber,
            invoiceNumberRaw,
            clientTaxId: '', // No disponible en XML MOV
            clientName: invoiceData.clientName || 'Sin nombre',
            totalAmount: invoiceData.totalAmount,
            paidAmount: paidAmount,
            issueDate: invoiceData.issueDate || new Date(),
            status,
            isLegacy: false,
            sourceFile,
            concept: `Importado de MOV - ${invoiceData.paymentMethod}`
        };
        
        // Vincular con documento si se encontró
        if (documentId) {
            invoiceCreateData.documentId = documentId;
        }
        
        const newInvoice = await prisma.invoice.create({
            data: invoiceCreateData
        });

        result.created = true;
        console.log(`[import-mov] Invoice created: ${invoiceNumber} (status: ${status})`);

        // Si fue pagada en efectivo, crear el registro de pago
        if (invoiceData.isPaid && invoiceData.paymentMethod === 'CASH') {
            await prisma.payment.create({
                data: {
                    invoiceId: newInvoice.id,
                    receiptNumber: `MOV-${invoiceNumberRaw}`,
                    amount: invoiceData.totalAmount,
                    paymentDate: invoiceData.issueDate || new Date(),
                    paymentType: 'CASH',
                    concept: 'Pago en efectivo al momento de facturación',
                    sourceFile
                }
            });
            console.log(`[import-mov] Cash payment created for: ${invoiceNumber}`);
        }
    }

    return result;
}

export default {
    importMovFile
};
