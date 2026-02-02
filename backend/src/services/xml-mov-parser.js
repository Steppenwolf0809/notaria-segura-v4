/**
 * XML MOV Parser (Movimientos de Caja)
 * Parser por streaming para archivos XML de movimientos diarios de caja Koinor
 * 
 * Estructura del XML:
 * - d_vc_i_diario_caja_detallado_group1: Facturas con info de pago
 *   - encabezadofacturas_codapu: Código de factura (FC001002-00124216)
 *   - encabezadofacturas_conpag: E=Efectivo, C=Crédito
 *   - encabezadopuntosventa_valefe: Monto pagado en efectivo
 *   - encabezadopuntosventa_totfac: Total de la factura
 * 
 * Dependencias: sax (Pure JavaScript - no requiere compilación nativa)
 */

import sax from 'sax';
import iconv from 'iconv-lite';

/**
 * Sanitiza un string XML reemplazando caracteres & por &amp;
 * Solo reemplaza & que NO sean parte de entidades válidas
 */
function sanitizeXMLString(xmlString) {
    return xmlString.replace(/&(?!(amp;|lt;|gt;|quot;|apos;|#\d+;))/g, '&amp;');
}

/**
 * Parsea archivo XML de Movimientos de Caja por streaming usando SAX
 * @param {Buffer} fileBuffer - Buffer del archivo XML
 * @param {string} fileName - Nombre del archivo para logging
 * @returns {Promise<Object>} Resultado del parsing con invoices y summary
 */
export async function parseMovXML(fileBuffer, fileName) {
    console.log(`[xml-mov-parser] Starting parse of ${fileName}`);
    
    const startTime = Date.now();
    const invoices = [];
    let totalTransactions = 0;
    const errors = [];

    try {
        // 1. Detectar encoding - XML Koinor usa UTF-16LE
        let xmlString;
        let detectedEncoding = 'unknown';
        
        try {
            // Intentar decodificar como UTF-16LE (formato típico de Koinor)
            xmlString = iconv.decode(fileBuffer, 'utf-16le');
            xmlString = xmlString.replace(/^\uFEFF/, ''); // Limpiar BOM
            
            if (xmlString.includes('<?xml') || xmlString.includes('<d_vc_i_diario_caja')) {
                detectedEncoding = 'UTF-16LE';
                console.log('[xml-mov-parser] Encoding detected: UTF-16LE');
            } else {
                // Intentar UTF-8
                xmlString = fileBuffer.toString('utf8');
                xmlString = xmlString.replace(/^\uFEFF/, '');
                
                if (xmlString.includes('<?xml') || xmlString.includes('<d_vc_i_diario_caja')) {
                    detectedEncoding = 'UTF-8';
                    console.log('[xml-mov-parser] Encoding detected: UTF-8');
                } else {
                    throw new Error('No se pudo detectar el encoding del archivo XML');
                }
            }
        } catch (error) {
            console.error('[xml-mov-parser] Encoding detection error:', error);
            throw new Error(`Error detectando encoding del archivo: ${error.message}`);
        }

        // 2. Sanitizar XML
        console.log('[xml-mov-parser] Sanitizing XML for special characters...');
        xmlString = sanitizeXMLString(xmlString);

        // 3. Validar estructura
        const validation = validateMovXMLStructure(xmlString);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // 4. Crear parser SAX
        const parser = sax.parser(true, {
            trim: true,
            normalize: true,
            lowercase: false,
            xmlns: false,
            position: true
        });

        // Variables de estado
        let currentElement = '';
        let currentGroup = null;
        let textBuffer = '';
        let inGroup1 = false;

        // 5. Configurar eventos del parser SAX
        return new Promise((resolve, reject) => {
            parser.onerror = (err) => {
                console.error('[xml-mov-parser] SAX parser error:', err);
                parser.resume();
            };

            parser.onopentag = (node) => {
                currentElement = node.name;
                textBuffer = '';
                
                if (node.name === 'd_vc_i_diario_caja_detallado_group1') {
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
                    currentGroup[currentElement] = textBuffer.trim();
                }

                if (tagName === 'd_vc_i_diario_caja_detallado_group1') {
                    inGroup1 = false;
                    totalTransactions++;
                    
                    try {
                        // Procesar cada registro como factura
                        const invoice = parseInvoiceFromMov(currentGroup);
                        if (invoice) {
                            invoices.push(invoice);
                        }
                    } catch (error) {
                        errors.push({
                            transaction: totalTransactions,
                            error: error.message,
                            data: { ...currentGroup }
                        });
                        console.error(`[xml-mov-parser] Error parsing transaction ${totalTransactions}:`, error);
                    }
                    
                    currentGroup = null;
                }
                
                currentElement = '';
                textBuffer = '';
            };

            parser.onend = () => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                
                // Estadísticas
                const paidCash = invoices.filter(i => i.paymentMethod === 'CASH' && i.isPaid).length;
                const credit = invoices.filter(i => i.paymentMethod === 'CREDIT').length;
                
                console.log(`[xml-mov-parser] Parsed in ${duration}s: ${invoices.length} invoices (${paidCash} cash, ${credit} credit)`);

                resolve({
                    invoices,
                    summary: {
                        totalTransactions,
                        invoicesFound: invoices.length,
                        paidCash,
                        credit,
                        errors: errors.length,
                        errorDetails: errors.slice(0, 20),
                        processedAt: new Date(),
                        duration: `${duration}s`
                    }
                });
            };

            // 6. Procesar el XML
            try {
                parser.write(xmlString).close();
            } catch (parseError) {
                console.error('[xml-mov-parser] Error writing to parser:', parseError);
                reject(new Error(`Error parseando XML: ${parseError.message}`));
            }
        });

    } catch (error) {
        console.error('[xml-mov-parser] Fatal error:', error);
        throw new Error(`Error parseando XML MOV: ${error.message}`);
    }
}

/**
 * Parsea una factura desde el grupo de movimientos
 * @param {Object} group - Nodo d_vc_i_diario_caja_detallado_group1
 * @returns {Object|null} - Objeto de factura o null si es inválido
 */
function parseInvoiceFromMov(group) {
    // Extraer código de factura (FC001002-00124216)
    const codapu = String(group.encabezadofacturas_codapu || '').trim();
    
    if (!codapu || !codapu.startsWith('FC')) {
        return null; // Skip silently - not a valid invoice
    }
    
    // FILTRO: Solo procesar facturas con pago en efectivo (valefe > 0)
    const valefe = parseFloat(group.encabezadopuntosventa_valefe || 0);
    if (valefe <= 0) {
        return null; // Skip - no cash payment, will be handled by Estado de Cuenta
    }

    // Extraer número de factura del codapu (quitar prefijo FC)
    const invoiceNumberRaw = codapu.substring(2); // "001002-00124216"
    
    // Datos de la factura
    const totalAmount = parseFloat(group.encabezadopuntosventa_totfac || 0);
    const cashAmount = valefe;
    const checkAmount = parseFloat(group.encabezadopuntosventa_valche || 0);
    const cardAmount = parseFloat(group.encabezadopuntosventa_valtar || 0);
    const depositAmount = parseFloat(group.encabezadofacturas_valdep || 0);
    
    // Condición de pago: E=Efectivo, C=Crédito
    const conpag = String(group.encabezadofacturas_conpag || '').trim().toUpperCase();
    
    // Fecha de factura
    const issueDate = parseMovDate(group.encabezadopuntosventa_fecfac);
    
    // Datos del cliente
    const clientName = String(group.encabezadofacturas_nomcxc || '').trim();
    
    // Determinar si está pagada y método de pago
    let isPaid = false;
    let paymentMethod = 'CREDIT';
    let paidAmount = 0;
    
    if (conpag === 'E') {
        // Pagado en efectivo al momento
        isPaid = true;
        paymentMethod = 'CASH';
        paidAmount = cashAmount > 0 ? cashAmount : totalAmount;
    } else if (cashAmount > 0 || checkAmount > 0 || cardAmount > 0 || depositAmount > 0) {
        // Pago parcial o mixto
        paidAmount = cashAmount + checkAmount + cardAmount + depositAmount;
        isPaid = paidAmount >= totalAmount;
        
        if (cashAmount > 0) paymentMethod = 'CASH';
        else if (checkAmount > 0) paymentMethod = 'CHECK';
        else if (cardAmount > 0) paymentMethod = 'CARD';
        else if (depositAmount > 0) paymentMethod = 'TRANSFER';
    }

    return {
        invoiceNumberRaw,           // "001002-00124216"
        codapu,                     // "FC001002-00124216"
        clientName,
        totalAmount,
        paidAmount,
        isPaid,
        paymentMethod,              // CASH, CHECK, CARD, TRANSFER, CREDIT
        conpag,                     // E o C
        issueDate,
        // Desglose de pagos
        cashAmount,
        checkAmount,
        cardAmount,
        depositAmount,
        // Metadata adicional
        vendedor: String(group.vendedorescob_nomven || '').trim(),
        tiporg: String(group.tiporg || '').trim()
    };
}

/**
 * Parsea fecha del formato Koinor: "2026-01-19 00:00:00"
 */
function parseMovDate(dateString) {
    if (!dateString) return null;

    try {
        const parsed = new Date(dateString);
        if (isNaN(parsed.getTime())) {
            return null;
        }
        return parsed;
    } catch (error) {
        console.warn('[xml-mov-parser] Invalid date:', dateString);
        return null;
    }
}

/**
 * Valida estructura básica del XML de Movimientos
 */
export function validateMovXMLStructure(xmlString) {
    if (!xmlString || xmlString.length < 100) {
        return {
            valid: false,
            error: 'El archivo XML está vacío o es demasiado corto'
        };
    }

    const hasXMLDeclaration = xmlString.includes('<?xml');
    const hasDiarioCaja = xmlString.includes('d_vc_i_diario_caja_detallado');
    const hasGroup1Tag = xmlString.includes('d_vc_i_diario_caja_detallado_group1');
    const hasGroup1CloseTag = xmlString.includes('</d_vc_i_diario_caja_detallado_group1>');
    
    console.log('[xml-mov-parser] Validation check:', {
        hasXMLDeclaration,
        hasDiarioCaja,
        hasGroup1Tag,
        hasGroup1CloseTag,
        length: xmlString.length
    });

    if (!hasDiarioCaja && !hasGroup1Tag) {
        return {
            valid: false,
            error: `El archivo no tiene la estructura XML de Movimientos de Caja esperada. ` +
                   `Debe contener tags d_vc_i_diario_caja_detallado.`
        };
    }

    if (hasGroup1Tag && !hasGroup1CloseTag) {
        return {
            valid: false,
            error: 'El XML parece incompleto (falta tag de cierre)'
        };
    }

    return { valid: true };
}

export default {
    parseMovXML,
    validateMovXMLStructure
};
