/**
 * XML CXC Parser
 * Parser específico para archivos XML de Cartera por Cobrar (CXC) de Koinor
 * 
 * Estructura del XML CXC:
 * - Tag raíz dinámico: cxc_YYYYMMDD (ej: cxc_20260128)
 * - Rows: cxc_YYYYMMDD_row
 * - Groups: cxc_YYYYMMDD_group1
 * 
 * Campos principales:
 * - clientes_codcli: RUC/Cédula del cliente
 * - clientes_nomcli: Nombre del cliente
 * - cxc_numtra: Número de factura
 * - cxc_fecemi: Fecha de emisión
 * - cxc_valcob: Valor de la factura
 * - cxc_saldo: Saldo pendiente
 */

import sax from 'sax';

/**
 * Parsea un archivo XML de CXC de Koinor
 * @param {Buffer} fileBuffer - Buffer del archivo XML
 * @param {string} fileName - Nombre del archivo para logging
 * @returns {Promise<Object>} Resultado del parsing con invoices y summary
 */
export async function parseCxcXML(fileBuffer, fileName) {
    console.log(`[xml-cxc-parser] Starting parse of ${fileName}`);
    
    const startTime = Date.now();
    const invoices = [];
    let totalRows = 0;
    const errors = [];

    try {
        // 1. Detectar encoding - XML Koinor usa UTF-16LE
        let xmlString;
        let detectedEncoding = 'unknown';
        
        try {
            // Intentar decodificar como UTF-16LE (formato típico de Koinor)
            xmlString = fileBuffer.toString('utf16le');
            if (xmlString.includes('<?xml') && xmlString.includes('encoding="UTF-16LE"')) {
                detectedEncoding = 'UTF-16LE';
            } else {
                // Fallback a UTF-8
                xmlString = fileBuffer.toString('utf8');
                detectedEncoding = 'UTF-8';
            }
        } catch (e) {
            xmlString = fileBuffer.toString('utf8');
            detectedEncoding = 'UTF-8 (fallback)';
        }
        
        console.log(`[xml-cxc-parser] Encoding detected: ${detectedEncoding}`);

        // 2. Sanitizar XML (remover BOM y caracteres problemáticos)
        xmlString = sanitizeXML(xmlString);

        // 3. Detectar el patrón de tags dinámicos (cxc_YYYYMMDD)
        const rootTagMatch = xmlString.match(/<(cxc_\d{8})>/);
        if (!rootTagMatch) {
            throw new Error('No se encontró el tag raíz de CXC (formato: cxc_YYYYMMDD)');
        }
        const rootTag = rootTagMatch[1];
        const rowTag = `${rootTag}_row`;
        const groupTag = `${rootTag}_group1`;
        
        console.log(`[xml-cxc-parser] Detected tags: root=${rootTag}, row=${rowTag}, group=${groupTag}`);

        // 4. Parsear con SAX
        return new Promise((resolve, reject) => {
            const parser = sax.parser(true, { trim: true });
            
            let inRow = false;
            let inGroup = false;
            let currentRow = null;
            let currentGroup = null;
            let currentElement = '';
            let textBuffer = '';

            parser.onerror = (err) => {
                console.error(`[xml-cxc-parser] SAX error:`, err);
                errors.push({ type: 'SAX_ERROR', message: err.message });
            };

            parser.onopentag = (node) => {
                const tagName = node.name.toLowerCase();
                
                if (tagName === rowTag.toLowerCase()) {
                    inRow = true;
                    currentRow = {};
                } else if (tagName === groupTag.toLowerCase()) {
                    inGroup = true;
                    currentGroup = {};
                }
                
                currentElement = tagName;
                textBuffer = '';
            };

            parser.ontext = (text) => {
                textBuffer += text;
            };

            parser.onclosetag = (tagName) => {
                tagName = tagName.toLowerCase();
                
                // Guardar valor del elemento actual
                if (currentGroup && inGroup) {
                    // Normalizar nombres de campos (remover prefijos)
                    const fieldName = normalizeFieldName(currentElement);
                    if (fieldName) {
                        currentGroup[fieldName] = textBuffer.trim();
                    }
                } else if (currentRow && inRow) {
                    const fieldName = normalizeFieldName(currentElement);
                    if (fieldName) {
                        currentRow[fieldName] = textBuffer.trim();
                    }
                }

                if (tagName === groupTag.toLowerCase()) {
                    // Procesar el grupo (una factura)
                    inGroup = false;
                    
                    if (currentGroup && currentRow) {
                        // Debug: Log del primer grupo para verificar campos
                        if (invoices.length === 0 && totalRows === 0) {
                            console.log(`[xml-cxc-parser] DEBUG - First group fields:`, Object.keys(currentGroup));
                            console.log(`[xml-cxc-parser] DEBUG - First row fields:`, Object.keys(currentRow));
                            console.log(`[xml-cxc-parser] DEBUG - Group data sample:`, {
                                numtra: currentGroup.numtra,
                                valcob: currentGroup.valcob,
                                nomcli: currentGroup.nomcli,
                                saldo: currentGroup.saldo
                            });
                            console.log(`[xml-cxc-parser] DEBUG - Row data sample:`, {
                                codcli: currentRow.codcli
                            });
                        }
                        
                        try {
                            const invoice = parseInvoiceFromGroup(currentRow, currentGroup);
                            if (invoice) {
                                invoices.push(invoice);
                            }
                        } catch (error) {
                            errors.push({
                                row: totalRows,
                                error: error.message,
                                data: { ...currentGroup }
                            });
                        }
                    }
                    
                    currentGroup = null;
                }

                if (tagName === rowTag.toLowerCase()) {
                    inRow = false;
                    totalRows++;
                    currentRow = null;
                }
                
                currentElement = '';
                textBuffer = '';
            };

            parser.onend = () => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`[xml-cxc-parser] Parsed in ${duration}s: ${invoices.length} invoices from ${totalRows} rows`);

                // Debug: Si hay rows pero no invoices, registrar advertencia
                if (totalRows > 0 && invoices.length === 0) {
                    console.warn(`[xml-cxc-parser] WARNING: Found ${totalRows} rows but 0 invoices!`);
                    console.warn(`[xml-cxc-parser] This may indicate a parsing issue with field names.`);
                    errors.push({
                        type: 'NO_INVOICES_FOUND',
                        message: `Se encontraron ${totalRows} rows pero 0 facturas. Posible problema con los nombres de campos.`,
                        detectedTags: { rowTag, groupTag }
                    });
                }

                resolve({
                    invoices,
                    summary: {
                        totalRows,
                        invoicesFound: invoices.length,
                        errors: errors.length,
                        errorDetails: errors.slice(0, 20),
                        processedAt: new Date(),
                        duration: `${duration}s`
                    }
                });
            };

            // 5. Procesar el XML
            try {
                parser.write(xmlString).close();
            } catch (parseError) {
                console.error(`[xml-cxc-parser] Parse error:`, parseError);
                reject(new Error(`Error parseando XML CXC: ${parseError.message}`));
            }
        });

    } catch (error) {
        console.error(`[xml-cxc-parser] Fatal error:`, error);
        throw new Error(`Error parseando XML CXC: ${error.message}`);
    }
}

/**
 * Sanitiza el XML removiendo caracteres problemáticos y escapando entities
 */
function sanitizeXML(xmlString) {
    // Remover BOM
    xmlString = xmlString.replace(/^\uFEFF/, '');
    xmlString = xmlString.replace(/^\uFFFE/, '');
    
    // Remover caracteres de control excepto tab, newline, carriage return
    xmlString = xmlString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    // Escapar ampersands que no son parte de entities válidas
    // Esto maneja casos como "PEREZ & ASOCIADOS" -> "PEREZ &amp; ASOCIADOS"
    // Pero preserva entities válidas como &amp; &lt; &gt; &quot; &apos;
    xmlString = xmlString.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
    
    return xmlString;
}

/**
 * Normaliza nombres de campos removiendo prefijos de Koinor
 * Mapea los campos del XML CXC a nombres estándar
 */
function normalizeFieldName(elementName) {
    if (!elementName) return null;
    
    const fieldName = elementName.toLowerCase();
    
    // Mapeo directo de campos del XML CXC a nombres estándar
    const fieldMapping = {
        // Campos de cliente
        'clientes_codcli': 'codcli',      // RUC/Cédula
        'clientes_nomcli': 'nomcli',      // Nombre cliente
        'clientes_dircli': 'dircli',      // Dirección
        'clientes_telcli': 'telcli',      // Teléfono
        'clientes_codcta': 'codcta',      // Código cuenta
        'clientes_faxcli': 'faxcli',      // Fax
        
        // Campos de factura (tmpfacturas_)
        'tmpfacturas_numtra': 'numtra',   // Número de factura
        'tmpfacturas_valcob': 'valcob',   // Valor total
        'tmpfacturas_fecemi': 'fecemi',   // Fecha emisión
        'tmpfacturas_fecven': 'fecven',   // Fecha vencimiento
        'tmpfacturas_tipdoc': 'tipdoc',   // Tipo documento (FC)
        'tmpfacturas_abomes': 'abomes',   // Abono del mes
        'tmpfacturas_codven': 'codven',   // Código vendedor
        
        // Campos de saldo
        'csaldo': 'saldo',                // Saldo pendiente
        
        // Campos de encabezado
        'encabezadofacturas_codsol': 'codsol',
        'encabezadofacturas_nomsol': 'nomsol',
        'encabezadofacturas_codgru': 'codgru',
        'encabezadofacturas_nomgru': 'nomgru'
    };
    
    // Buscar en el mapeo
    if (fieldMapping[fieldName]) {
        return fieldMapping[fieldName];
    }
    
    // Si no está en el mapeo, intentar remover prefijos dinámicos (cxc_YYYYMMDD_)
    const dynamicPrefixMatch = fieldName.match(/^cxc_\d{8}_(.+)$/);
    if (dynamicPrefixMatch) {
        return dynamicPrefixMatch[1];
    }
    
    return fieldName;
}

/**
 * Parsea una factura desde los datos del row y group
 * 
 * Estructura del XML CXC:
 * - row contiene: codcli (RUC del cliente)
 * - group contiene: nomcli, numtra, valcob, fecemi, saldo, tipdoc, etc.
 */
function parseInvoiceFromGroup(row, group) {
    // Obtener número de factura (campo tmpfacturas_numtra -> numtra)
    const invoiceNumber = (group.numtra || '').trim();
    if (!invoiceNumber) {
        return null; // Sin número de factura, no es válido
    }

    // Obtener datos del cliente
    // codcli viene del row (clientes_codcli)
    // nomcli viene del group (clientes_nomcli dentro del group)
    const clientTaxId = (row.codcli || group.codcli || '').trim();
    const clientName = (group.nomcli || row.nomcli || '').trim();

    // Obtener montos (tmpfacturas_valcob -> valcob, csaldo -> saldo)
    const totalAmount = parseFloat(group.valcob || 0);
    const balance = parseFloat(group.saldo || group.valcob || 0);

    // Parsear fecha (tmpfacturas_fecemi -> fecemi)
    // Formato: "2025-12-01 00:00:00"
    const issueDate = parseKoinorDate(group.fecemi);
    const dueDate = parseKoinorDate(group.fecven);

    // Tipo de documento (tmpfacturas_tipdoc -> tipdoc)
    const docType = (group.tipdoc || 'FC').trim();

    return {
        invoiceNumber,
        invoiceNumberRaw: invoiceNumber,
        clientTaxId,
        clientName,
        totalAmount: Math.abs(totalAmount),
        balance: Math.abs(balance),
        issueDate,
        dueDate,
        type: docType,
        concept: `Factura ${invoiceNumber}`
    };
}

/**
 * Parsea fecha en formato Koinor
 * Formatos soportados:
 * - "2025-12-01 00:00:00" (YYYY-MM-DD HH:mm:ss)
 * - "2025-12-01" (YYYY-MM-DD)
 * - "01/12/2025" (DD/MM/YYYY)
 */
function parseKoinorDate(dateStr) {
    if (!dateStr) return null;
    
    dateStr = dateStr.trim();
    
    // Formato YYYY-MM-DD HH:mm:ss o YYYY-MM-DD
    if (dateStr.includes('-')) {
        // Extraer solo la parte de fecha si tiene hora
        const datePart = dateStr.split(' ')[0];
        const date = new Date(datePart);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    
    // Formato DD/MM/YYYY
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        if (day && month && year) {
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
    }
    
    return null;
}

/**
 * Detecta si un archivo XML es de tipo CXC basado en su contenido
 */
export function isCxcXML(xmlContent) {
    // Buscar patrón de tag raíz CXC: <cxc_YYYYMMDD>
    return /<cxc_\d{8}>/.test(xmlContent);
}

export default {
    parseCxcXML,
    isCxcXML
};
