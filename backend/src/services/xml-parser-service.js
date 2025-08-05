import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

/**
 * Servicio para procesar XMLs de facturas notariales
 * Implementa detección híbrida: código + contenido
 */

// 1. DETECCIÓN POR CÓDIGO (Prioritaria)
const TIPOS_POR_CODIGO = {
  'P': 'PROTOCOLO',      // 20251701018P01741
  'D': 'DILIGENCIA',     // 20251701018D00741  
  'A': 'ARRENDAMIENTO',  // 20251701018A00041
  'C': 'CERTIFICACION',  // 20251701018C01637
  'O': 'OTROS'           // 20251701018O01741 (copias archivo, razones marginales)
};

// 3. LISTA DE EXCLUSIÓN (Solo para P, D, A, O)
const ITEMS_A_IGNORAR = [
  'CONSULTA DATOS BIOMETRICOS',
  'SISTEMA NACIONAL DE IDENTIFICACIÓN', 
  'REGISTRO CIVIL',
  'CERTIFICACIÓN DE DOCUMENTOS',
  'MATERIALIZADOS',
  'PÁGINA WEB',
  'SOPORTE ELECTRÓNICO',
  'PRESTACION DE SERVICIO FUERA DE DESPACHO',
  'FUERA DE DESPACHO',
  'MATERIALIZACIÓN',
  'APOSTILLA'
];

/**
 * Procesa un XML completo y retorna objeto estructurado para crear Document
 * @param {string} xmlContent - Contenido XML como string
 * @returns {Promise<Object>} Objeto con datos estructurados del documento
 */
async function parseXmlDocument(xmlContent) {
  try {
    // Parse del XML
    const result = await parseXML(xmlContent);
    const factura = result.factura;
    
    if (!factura) {
      throw new Error('XML no válido: falta elemento factura');
    }

    // 1. Extraer código del documento del XML (campo NÚMERO DE LIBRO)
    const protocolNumber = extractProtocolNumber(factura);
    if (!protocolNumber) {
      throw new Error('No se pudo extraer el número de protocolo del XML');
    }

    // 2. Identificar tipo por letra del código
    const documentType = classifyDocumentByCode(protocolNumber);
    
    // 3. Extraer información del cliente y matrizador
    const clientData = extractClientDataFromXml(factura);
    
    // 4. Extraer información de la factura
    const totalFactura = parseFloat(factura.infoFactura[0].importeTotal[0]) || 0;
    
    // 5. Procesar detalles según tipo de documento
    const detalles = factura.detalles?.[0]?.detalle || [];
    const processedDetails = processDocumentByType(documentType, detalles);
    
    // 6. Extraer nombre del matrizador
    const matrizadorName = extractMatrizadorName(factura);
    
    return {
      protocolNumber,
      clientName: clientData.clientName,
      clientPhone: clientData.clientPhone,
      clientEmail: clientData.clientEmail,
      documentType,
      actoPrincipalDescripcion: processedDetails.actoPrincipalDescripcion,
      actoPrincipalValor: processedDetails.actoPrincipalValor,
      totalFactura,
      matrizadorName,
      itemsSecundarios: processedDetails.itemsSecundarios,
      xmlOriginal: xmlContent // Guardar XML completo
    };
    
  } catch (error) {
    console.error('Error procesando XML:', error);
    throw new Error(`Error al procesar XML: ${error.message}`);
  }
}

/**
 * Extrae información del cliente del XML
 * @param {Object} factura - Objeto factura del XML parseado
 * @returns {Object} Datos del cliente
 */
function extractClientDataFromXml(factura) {
  const infoFactura = factura.infoFactura?.[0] || {};
  const infoAdicional = factura.infoAdicional?.[0]?.campoAdicional || [];
  
  // Extraer nombre del cliente (razonSocialComprador)
  const clientName = infoFactura.razonSocialComprador?.[0] || 'Sin nombre';
  
  // Buscar email en infoAdicional
  let clientEmail = null;
  const emailField = infoAdicional.find(campo => 
    campo.$.nombre === 'Email Cliente'
  );
  if (emailField && emailField._) {
    clientEmail = emailField._;
  }
  
  // Buscar CELULAR (NO teléfono) en infoAdicional para WhatsApp
  let clientPhone = null;
  const celularField = infoAdicional.find(campo => 
    campo.$.nombre === 'CELULAR'
  );
  if (celularField && celularField._) {
    clientPhone = celularField._;
  }
  
  return {
    clientName,
    clientEmail,
    clientPhone
  };
}

/**
 * Extrae el código del documento del XML
 * @param {Object} factura - Objeto factura del XML parseado
 * @returns {string|null} Número de protocolo
 */
function extractProtocolNumber(factura) {
  const infoAdicional = factura.infoAdicional?.[0]?.campoAdicional || [];
  
  const protocolField = infoAdicional.find(campo => 
    campo.$.nombre === 'NÚMERO DE LIBRO'
  );
  
  return protocolField && protocolField._ ? protocolField._ : null;
}

/**
 * Extrae el nombre del matrizador del XML
 * @param {Object} factura - Objeto factura del XML parseado
 * @returns {string} Nombre del matrizador
 */
function extractMatrizadorName(factura) {
  const infoAdicional = factura.infoAdicional?.[0]?.campoAdicional || [];
  
  const matrizadorField = infoAdicional.find(campo => 
    campo.$.nombre === 'Matrizador'
  );
  
  return matrizadorField && matrizadorField._ ? matrizadorField._ : 'Sin asignar';
}

/**
 * Clasifica el documento por letra del código
 * @param {string} codigo - Código del documento
 * @returns {string} Tipo de documento
 */
function classifyDocumentByCode(codigo) {
  // Buscar la letra en el código (ej: 20251701018P01738 -> P)
  const match = codigo.match(/[A-Z]/);
  if (!match) {
    return 'OTROS'; // Default si no se encuentra letra
  }
  
  const letra = match[0];
  return TIPOS_POR_CODIGO[letra] || 'OTROS';
}

/**
 * Procesa los detalles del documento según su tipo
 * @param {string} tipo - Tipo de documento
 * @param {Array} detalles - Array de detalles del XML
 * @returns {Object} Información procesada del documento
 */
function processDocumentByType(tipo, detalles) {
  if (tipo === 'CERTIFICACION') {
    // 2. LÓGICA ESPECIAL PARA CERTIFICACIONES
    // Si código indica C → Agrupar TODOS los items como "CERTIFICACIONES"
    // No aplicar filtros, no buscar acto principal
    
    const totalValor = detalles.reduce((sum, detalle) => {
      const valor = parseFloat(detalle.precioTotalSinImpuesto?.[0]) || 0;
      return sum + valor;
    }, 0);
    
    return {
      actoPrincipalDescripcion: 'CERTIFICACIONES',
      actoPrincipalValor: totalValor,
      itemsSecundarios: detalles.map(detalle => ({
        descripcion: detalle.descripcion?.[0] || 'Sin descripción',
        valor: parseFloat(detalle.precioTotalSinImpuesto?.[0]) || 0
      }))
    };
  } else {
    // Para otros tipos (P, D, A, O): aplicar lógica de filtrado normal
    return processNormalDocument(detalles);
  }
}

/**
 * Procesa documentos normales (no certificaciones)
 * Filtra items secundarios y busca acto principal
 * @param {Array} detalles - Array de detalles del XML
 * @returns {Object} Información procesada del documento
 */
function processNormalDocument(detalles) {
  const itemsSecundarios = [];
  const itemsPrincipales = [];
  
  // Clasificar items
  detalles.forEach(detalle => {
    const descripcion = detalle.descripcion?.[0] || '';
    const valor = parseFloat(detalle.precioTotalSinImpuesto?.[0]) || 0;
    
    const item = {
      descripcion,
      valor
    };
    
    // Verificar si es item a ignorar
    const esSecundario = ITEMS_A_IGNORAR.some(itemIgnorar => 
      descripcion.toUpperCase().includes(itemIgnorar.toUpperCase())
    );
    
    if (esSecundario) {
      itemsSecundarios.push(item);
    } else {
      itemsPrincipales.push(item);
    }
  });
  
  // Encontrar acto principal (item con mayor valor entre los principales)
  let actoPrincipal = itemsPrincipales.reduce((max, item) => {
    return item.valor > max.valor ? item : max;
  }, { descripcion: 'Sin acto principal', valor: 0 });
  
  // Si no hay items principales, tomar el primero de todos
  if (itemsPrincipales.length === 0 && detalles.length > 0) {
    const primerItem = detalles[0];
    actoPrincipal = {
      descripcion: primerItem.descripcion?.[0] || 'Sin descripción',
      valor: parseFloat(primerItem.precioTotalSinImpuesto?.[0]) || 0
    };
  }
  
  return {
    actoPrincipalDescripcion: actoPrincipal.descripcion,
    actoPrincipalValor: actoPrincipal.valor,
    itemsSecundarios
  };
}

/**
 * Genera código de verificación de 4 dígitos
 * @returns {string} Código de 4 dígitos
 */
function generateVerificationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export {
  parseXmlDocument,
  extractClientDataFromXml,
  classifyDocumentByCode,
  processDocumentByType,
  generateVerificationCode
}; 