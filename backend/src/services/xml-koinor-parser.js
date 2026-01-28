/**
 * XML Koinor Parser
 * Parser por streaming para archivos XML de pagos Koinor
 * 
 * Dependencias: xml-stream, iconv-lite
 * 
 * IMPORTANTE: Mantiene formato RAW del XML sin normalizar
 * - numtra se extrae tal cual: "001002-00123341" (formato RAW)
 * - NO se aplica normalizeInvoiceNumber aquí
 * - La búsqueda en BD usa invoiceNumberRaw directamente
 */

import XmlStream from 'xml-stream';
import iconv from 'iconv-lite';
import { Readable } from 'stream';

/**
 * Parsea archivo XML de Koinor por streaming
 * @param {Buffer} fileBuffer - Buffer del archivo XML
 * @param {string} fileName - Nombre del archivo para logging
 * @returns {Promise<Object>} Resultado del parsing con payments y summary
 */
export async function parseKoinorXML(fileBuffer, fileName) {
    console.log(`[xml-koinor-parser] Starting parse of ${fileName}`);
    
    const startTime = Date.now();
    const payments = [];
    const notasCredito = [];
    let totalTransactions = 0;
    const errors = [];

    try {
        // 1. Detectar encoding - XML Koinor usa UTF-16LE
        let xmlString;
        try {
            // Intentar decodificar como UTF-16LE (formato típico de Koinor)
            xmlString = iconv.decode(fileBuffer, 'utf-16le');
            
            // Si no tiene declaración XML válida, intentar UTF-8
            if (!xmlString.includes('<?xml') && !xmlString.includes('<d_vc_i_estado_cuenta')) {
                xmlString = fileBuffer.toString('utf8');
            }
        } catch (error) {
            console.error('[xml-koinor-parser] Encoding detection error:', error);
            // Fallback a UTF-8
            xmlString = fileBuffer.toString('utf8');
        }

        // 2. Crear stream readable
        const stream = Readable.from([xmlString]);
        const xml = new XmlStream(stream);

        // 3. Configurar parser
        xml.preserve('d_vc_i_estado_cuenta_group1');
        xml.collect('d_vc_i_estado_cuenta_group1');

        // 4. Promesa para manejo de eventos async
        await new Promise((resolve, reject) => {
            // Procesar cada grupo (transacción)
            xml.on('endElement: d_vc_i_estado_cuenta_group1', (group) => {
                totalTransactions++;
                
                try {
                    const tipdoc = String(group.tipdoc || '').trim().toUpperCase();
                    
                    // Filtrar solo AB (pagos) y NC (notas de crédito)
                    if (tipdoc === 'AB') {
                        const payment = parsePaymentTransaction(group);
                        if (payment) {
                            payments.push(payment);
                        }
                    } else if (tipdoc === 'NC') {
                        const nc = parseNotaCreditoTransaction(group);
                        if (nc) {
                            notasCredito.push(nc);
                        }
                    }
                    // FC (facturas) se ignoran - ya las tenemos en el sistema
                } catch (error) {
                    errors.push({
                        transaction: totalTransactions,
                        error: error.message,
                        data: group
                    });
                    console.error(`[xml-koinor-parser] Error parsing transaction ${totalTransactions}:`, error);
                }
            });

            xml.on('end', () => {
                console.log(`[xml-koinor-parser] Parse completed - ${totalTransactions} transactions processed`);
                resolve();
            });

            xml.on('error', (error) => {
                console.error('[xml-koinor-parser] XML parsing error:', error);
                reject(error);
            });
        });

        // 5. Agrupar pagos multi-factura
        const groupedPayments = groupMultiInvoicePayments(payments);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[xml-koinor-parser] Parsed in ${duration}s: ${groupedPayments.length} payments, ${notasCredito.length} NC`);

        return {
            payments: groupedPayments,
            notasCredito,
            summary: {
                totalTransactions,
                paymentsFound: groupedPayments.length,
                notasCreditoFound: notasCredito.length,
                errors: errors.length,
                errorDetails: errors.slice(0, 10), // Solo primeros 10 errores
                processedAt: new Date(),
                duration: `${duration}s`
            }
        };

    } catch (error) {
        console.error('[xml-koinor-parser] Fatal error:', error);
        throw new Error(`Error parseando XML: ${error.message}`);
    }
}

/**
 * Parsea una transacción de tipo AB (pago)
 * @param {Object} group - Nodo d_vc_i_estado_cuenta_group1
 * @returns {Object|null} - Objeto de pago o null si es inválido
 */
function parsePaymentTransaction(group) {
    // Validar campos obligatorios
    const receiptNumber = String(group.numdoc || '').trim();
    const numtra = String(group.numtra || '').trim();
    const valcob = parseFloat(group.valcob || 0);

    if (!receiptNumber) {
        console.warn('[xml-koinor-parser] Skipping AB: missing numdoc');
        return null;
    }

    if (!numtra) {
        console.warn('[xml-koinor-parser] Skipping AB: missing numtra');
        return null;
    }

    if (valcob <= 0) {
        console.warn('[xml-koinor-parser] Skipping AB: invalid valcob');
        return null;
    }

    // Parsear fecha - fecemi es la fecha real del pago
    const paymentDate = parseKoinorDate(group.fecemi);
    if (!paymentDate) {
        console.warn('[xml-koinor-parser] Skipping AB: invalid fecemi');
        return null;
    }

    return {
        receiptNumber,              // "001-2601000305"
        clientTaxId: String(group.codcli || '').trim(),
        clientName: String(group.nomcli || '').trim(),
        paymentDate,
        type: 'AB',
        invoiceNumberRaw: numtra,   // ⚠️ FORMATO RAW: "001002-00123341"
        amount: valcob,
        sigdoc: String(group.sigdoc || '').trim(), // Debería ser "-" para pagos
        concept: String(group.concep || '').trim()
    };
}

/**
 * Parsea una transacción de tipo NC (nota de crédito)
 * @param {Object} group - Nodo d_vc_i_estado_cuenta_group1
 * @returns {Object|null} - Objeto de nota de crédito o null si es inválido
 */
function parseNotaCreditoTransaction(group) {
    const receiptNumber = String(group.numdoc || '').trim();
    const numtra = String(group.numtra || '').trim();
    const valcob = Math.abs(parseFloat(group.valcob || 0));

    if (!receiptNumber || !numtra || valcob <= 0) {
        return null;
    }

    const fecha = parseKoinorDate(group.fecemi);
    if (!fecha) {
        return null;
    }

    return {
        receiptNumber,
        invoiceNumberRaw: numtra,   // Factura afectada (formato RAW)
        amount: valcob,
        fecha,
        clientTaxId: String(group.codcli || '').trim(),
        clientName: String(group.nomcli || '').trim(),
        motivo: String(group.concep || '').trim()
    };
}

/**
 * Agrupa pagos que tienen el mismo receiptNumber pero pagan múltiples facturas
 * En el XML, cada factura pagada aparece como un group1 separado con el mismo numdoc
 * 
 * Ejemplo:
 * - group1: numdoc="001-2601000305", numtra="001002-00124369", valcob=2.36
 * - group1: numdoc="001-2601000305", numtra="001002-00124370", valcob=23.63
 * 
 * Resultado: 1 payment con 2 details
 */
function groupMultiInvoicePayments(payments) {
    const grouped = new Map();

    for (const payment of payments) {
        const key = payment.receiptNumber;

        if (!grouped.has(key)) {
            // Primer pago con este receiptNumber
            grouped.set(key, {
                receiptNumber: payment.receiptNumber,
                clientTaxId: payment.clientTaxId,
                clientName: payment.clientName,
                paymentDate: payment.paymentDate,
                type: payment.type,
                concept: payment.concept,
                details: [
                    {
                        invoiceNumberRaw: payment.invoiceNumberRaw,
                        amount: payment.amount
                    }
                ]
            });
        } else {
            // Pago adicional con el mismo receiptNumber (multi-factura)
            const existing = grouped.get(key);
            existing.details.push({
                invoiceNumberRaw: payment.invoiceNumberRaw,
                amount: payment.amount
            });
        }
    }

    return Array.from(grouped.values());
}

/**
 * Parsea fecha del formato Koinor: "2026-01-19 00:00:00"
 * @param {string} dateString - Fecha en formato Koinor
 * @returns {Date|null} - Fecha parseada o null si es inválida
 */
function parseKoinorDate(dateString) {
    if (!dateString) return null;

    try {
        // Formato: "YYYY-MM-DD HH:MM:SS"
        const parsed = new Date(dateString);
        
        if (isNaN(parsed.getTime())) {
            return null;
        }

        return parsed;
    } catch (error) {
        console.warn('[xml-koinor-parser] Invalid date:', dateString);
        return null;
    }
}

/**
 * Valida estructura básica del XML de Koinor
 * @param {string} xmlString - Contenido del XML
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateKoinorXMLStructure(xmlString) {
    // Verificar que tiene estructura esperada
    if (!xmlString.includes('d_vc_i_estado_cuenta_row') && 
        !xmlString.includes('d_vc_i_estado_cuenta_group1')) {
        return {
            valid: false,
            error: 'El archivo no tiene la estructura XML de Koinor esperada'
        };
    }

    // Verificar que no está vacío
    if (xmlString.length < 100) {
        return {
            valid: false,
            error: 'El archivo XML está vacío o es demasiado corto'
        };
    }

    return { valid: true };
}

export default {
    parseKoinorXML,
    validateKoinorXMLStructure
};
