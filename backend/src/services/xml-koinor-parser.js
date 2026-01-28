/**
 * XML Koinor Parser
 * Parser por streaming para archivos XML de pagos Koinor
 * 
 * Dependencias: sax (Pure JavaScript - no requiere compilación nativa)
 * 
 * IMPORTANTE: Mantiene formato RAW del XML sin normalizar
 * - numtra se extrae tal cual: "001002-00123341" (formato RAW)
 * - NO se aplica normalizeInvoiceNumber aquí
 * - La búsqueda en BD usa invoiceNumberRaw directamente
 */

import sax from 'sax';
import iconv from 'iconv-lite';

/**
 * Parsea archivo XML de Koinor por streaming usando SAX
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
            
            // Limpiar BOM si existe
            xmlString = xmlString.replace(/^\uFEFF/, '');
        } catch (error) {
            console.error('[xml-koinor-parser] Encoding detection error:', error);
            // Fallback a UTF-8
            xmlString = fileBuffer.toString('utf8');
        }

        // 2. Crear parser SAX en modo strict
        const parser = sax.parser(true, { 
            trim: true,
            normalize: true,
            lowercase: false,
            xmlns: false,
            position: true
        });

        // Variables de estado para el parser SAX
        let currentElement = '';
        let currentGroup = null;
        let textBuffer = '';
        let inGroup1 = false;

        // 3. Configurar eventos del parser SAX
        return new Promise((resolve, reject) => {
            parser.onerror = (err) => {
                console.error('[xml-koinor-parser] SAX parser error:', err);
                // Intentar continuar en lugar de rechazar inmediatamente
                parser.resume();
            };

            parser.onopentag = (node) => {
                currentElement = node.name;
                textBuffer = '';
                
                if (node.name === 'd_vc_i_estado_cuenta_group1') {
                    inGroup1 = true;
                    currentGroup = {};
                }
            };

            parser.ontext = (text) => {
                if (inGroup1 && currentElement) {
                    textBuffer += text;
                }
            };

            parser.onclosetag = (tagName) => {
                if (inGroup1 && currentGroup && currentElement) {
                    // Guardar el valor del elemento actual en el grupo
                    currentGroup[currentElement] = textBuffer.trim();
                }

                if (tagName === 'd_vc_i_estado_cuenta_group1') {
                    // Procesar el grupo completo
                    inGroup1 = false;
                    totalTransactions++;
                    
                    try {
                        const tipdoc = String(currentGroup.tipdoc || '').trim().toUpperCase();
                        
                        // Filtrar solo AB (pagos) y NC (notas de crédito)
                        if (tipdoc === 'AB') {
                            const payment = parsePaymentTransaction(currentGroup);
                            if (payment) {
                                payments.push(payment);
                            }
                        } else if (tipdoc === 'NC') {
                            const nc = parseNotaCreditoTransaction(currentGroup);
                            if (nc) {
                                notasCredito.push(nc);
                            }
                        }
                        // FC (facturas) se ignoran - ya las tenemos en el sistema
                    } catch (error) {
                        errors.push({
                            transaction: totalTransactions,
                            error: error.message,
                            data: { ...currentGroup }
                        });
                        console.error(`[xml-koinor-parser] Error parsing transaction ${totalTransactions}:`, error);
                    }
                    
                    currentGroup = null;
                }
                
                currentElement = '';
                textBuffer = '';
            };

            parser.onend = () => {
                // Agrupar pagos multi-factura
                const groupedPayments = groupMultiInvoicePayments(payments);

                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`[xml-koinor-parser] Parsed in ${duration}s: ${groupedPayments.length} payments, ${notasCredito.length} NC`);

                resolve({
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
                });
            };

            // 4. Procesar el XML
            try {
                parser.write(xmlString).close();
            } catch (parseError) {
                console.error('[xml-koinor-parser] Error writing to parser:', parseError);
                reject(new Error(`Error parseando XML: ${parseError.message}`));
            }
        });

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
    // Verificar que no está vacío
    if (!xmlString || xmlString.length < 100) {
        return {
            valid: false,
            error: 'El archivo XML está vacío o es demasiado corto'
        };
    }

    // Detectar el tag raíz del XML
    const hasXMLDeclaration = xmlString.includes('<?xml');
    const hasRowTag = xmlString.includes('d_vc_i_estado_cuenta_row');
    const hasGroup1Tag = xmlString.includes('d_vc_i_estado_cuenta_group1');
    const hasGroup1CloseTag = xmlString.includes('</d_vc_i_estado_cuenta_group1>');
    
    // Logging para diagnóstico
    console.log('[xml-koinor-parser] Validation check:', {
        hasXMLDeclaration,
        hasRowTag,
        hasGroup1Tag,
        hasGroup1CloseTag,
        length: xmlString.length,
        firstChars: xmlString.substring(0, 200)
    });

    // Verificar que tiene al menos uno de los tags esperados
    if (!hasRowTag && !hasGroup1Tag) {
        return {
            valid: false,
            error: `El archivo no tiene la estructura XML de Koinor esperada. ` +
                   `Primeros 200 caracteres: ${xmlString.substring(0, 200)}...`
        };
    }

    // Verificar que tiene tags de cierre si tiene tags de apertura
    if (hasGroup1Tag && !hasGroup1CloseTag) {
        return {
            valid: false,
            error: 'El XML parece incompleto (falta tag de cierre d_vc_i_estado_cuenta_group1)'
        };
    }

    return { valid: true };
}

export default {
    parseKoinorXML,
    validateKoinorXMLStructure
};
