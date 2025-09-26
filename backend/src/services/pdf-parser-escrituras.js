/**
 * Servicio de parsing de PDF para extractos de escrituras notariales
 * Extrae datos específicos de documentos de la Notaría 18
 */

import pdfParse from 'pdf-parse';

// Debug flag (enable with PDF_PARSER_DEBUG=true)
const DEBUG = process.env.PDF_PARSER_DEBUG === 'true';

/**
 * Patrones regex para extraer datos de escrituras notariales
 * Diseñados para ser flexibles con variaciones de etiquetas (p. ej. "ACTO O CONTRATO:",
 * "ACTO/CONTRATO:", mayúsculas/minúsculas, acentos, espacios y separadores).
 */
const PATTERNS = {
  // Número de escritura (ej: "20251701018P02183")
  numeroEscritura: [
    /ESCRITURA\s+N[°º]?\s*:?\s*([A-Z0-9]{10,20})/i,
    /N[°º]?\s*DE\s+ESCRITURA\s*:?\s*([A-Z0-9]{10,20})/i,
    /MATRIZ\s+N[°º]?\s*:?\s*([A-Z0-9]{10,20})/i,
    // Secuencia típica: AAAA + 7 dígitos + letra + 5 dígitos (permitiendo espacios/separadores)
    /([0-9]{4}\s*[0-9]{7}\s*[A-Z]\s*[0-9]{5})/i,
    // Variante con separadores no alfanuméricos entre grupos
    /([0-9]{4}[^A-Za-z0-9]?[0-9]{7}[^A-Za-z0-9]?[A-Z][^A-Za-z0-9]?[0-9]{5})/i
  ],
  
  // Acto/contrato
  acto: [
    // "ACTO O CONTRATO:" | "ACTO/CONTRATO:" | "ACTO – CONTRATO:" etc.
    /ACTO\s*(?:\/|\s*[OY]\s+|\s*[–-]\s*)\s*CONTRATO\s*:?\s*([A-ZÁÉÍÓÚÑÜ0-9\s,.;:-]+?)(?=\n{1,}|\n[A-ZÁÉÍÓÚÑÜ/ \t]{3,}:|OTORGADO|FECHA|$)/i,
    /ACTO\s*:?\s*([A-ZÁÉÍÓÚÑÜ0-9\s,.;:-]+?)(?=\n{1,}|\n[A-ZÁÉÍÓÚÑÜ/ \t]{3,}:|OTORGADO|FECHA|$)/i,
    /CONTRATO\s*:?\s*([A-ZÁÉÍÓÚÑÜ0-9\s,.;:-]+?)(?=\n{1,}|\n[A-ZÁÉÍÓÚÑÜ/ \t]{3,}:|OTORGADO|FECHA|$)/i,
    /AUTORIZACI[ÓO]N\s+DE\s+([A-ZÁÉÍÓÚÑÜ0-9\s,.;:-]+?)(?=\n{1,}|\n[A-ZÁÉÍÓÚÑÜ/ \t]{3,}:|OTORGADO|FECHA|$)/i
  ],
  
  // Fecha de otorgamiento
  fecha: [
    /FECHA\s+DE\s+OTORGAMIENTO\s*:?\s*([0-9]{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑÜ]+\s+DEL?\s+[0-9]{4}[^0-9]*(?:\([0-9]{1,2}:[0-9]{2}\))?)/i,
    /OTORGADO\s+EL\s*:?\s*([0-9]{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑÜ]+\s+DEL?\s+[0-9]{4}[^0-9]*(?:\([0-9]{1,2}:[0-9]{2}\))?)/i
  ],
  
  // Notario
  notario: [
    /NOTARIO\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s,.-]+?)(?:\n|NOTARÍA|$)/i,
    /ANTE\s+MÍ\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s,.-]+?)(?:\n|NOTARIO|$)/i
  ],
  
  // Notaría
  notaria: [
    /NOTARÍA\s*:?\s*([A-ZÁÉÍÓÚÑÜ0-9\s,.-]+?)(?:\n|OTORGADO|$)/i,
    /(DÉCIMA\s+OCTAVA\s+DEL\s+CANTÓN\s+QUITO)/i
  ],
  
  // Otorgantes - OTORGADO POR
  otorgadoPor: [
    /OTORGADO\s+POR\s*:?\s*((?:[A-ZÁÉÍÓÚÑÜ\s,.-]+(?:\n|$))+?)(?=OTORGADO\s+A\s+FAVOR|A\s+FAVOR\s+DE|BENEFICIARIO|UBICACIÓN|CUANTÍA|$)/i,
    /COMPARECIENTE\s*:?\s*((?:[A-ZÁÉÍÓÚÑÜ\s,.-]+(?:\n|$))+?)(?=A\s+FAVOR\s+DE|BENEFICIARIO|UBICACIÓN|CUANTÍA|$)/i
  ],
  
  // Beneficiarios - A FAVOR DE
  aFavorDe: [
    /A\s+FAVOR\s+DE\s*:?\s*((?:[A-ZÁÉÍÓÚÑÜ\s,.-]+(?:\n|$))+?)(?=UBICACIÓN|CUANTÍA|OBSERVACIONES|$)/i,
    /BENEFICIARIO\(?A?\)?\s*:?\s*((?:[A-ZÁÉÍÓÚÑÜ\s,.-]+(?:\n|$))+?)(?=UBICACIÓN|CUANTÍA|OBSERVACIONES|$)/i
  ],
  
  // Ubicación
  ubicacion: [
    /UBICACIÓN\s*:?\s*PROVINCIA\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s]+)\s*CANTÓN\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s]+)\s*PARROQUIA\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s]+)/i,
    /PROVINCIA\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s]+).*?CANTÓN\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s]+).*?PARROQUIA\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s]+)/i
  ],
  
  // Cuantía
  cuantia: [
    /CUANTÍA\s*:?\s*([A-ZÁÉÍÓÚÑÜ0-9\s,.$-]+?)(?:\n|OBSERVACIONES|$)/i,
    /VALOR\s*:?\s*([A-ZÁÉÍÓÚÑÜ0-9\s,.$-]+?)(?:\n|OBSERVACIONES|$)/i
  ],

  // Objeto / Observaciones: bloque de texto que puede abarcar varias líneas hasta el próximo header/etiqueta
  objetoObservaciones: [
    /OBJETO\s*(?:\/|\s*[OY]\s+|\s*[–-]\s*)\s*OBSERVACIONES\s*:?\s*([\s\S]+?)(?=\n{2,}|\n[A-ZÁÉÍÓÚÑÜ/() \t]{3,}:|$)/i,
    /OBSERVACIONES\s*:?\s*([\s\S]+?)(?=\n{2,}|\n[A-ZÁÉÍÓÚÑÜ/() \t]{3,}:|$)/i,
    /OBJETO\s*:?\s*([\s\S]+?)(?=\n{2,}|\n[A-ZÁÉÍÓÚÑÜ/() \t]{3,}:|$)/i
  ],
  
  // Datos de personas (cédula, nacionalidad)
  cedula: /CÉDULA\s*:?\s*([0-9-]+)/gi,
  nacionalidad: /NACIONALIDAD\s*:?\s*([A-ZÁÉÍÓÚÑÜ]+)/gi
};

/**
 * Extrae el número de escritura del texto
 * @param {string} text - Texto del PDF
 * @returns {string|null} Número de escritura encontrado
 */
function extractNumeroEscritura(text) {
  if (!text) return null;
  for (const pattern of PATTERNS.numeroEscritura) {
    try {
      const match = text.match(pattern);
      if (DEBUG) {
        console.info('[PDF-PARSER] numeroEscritura pattern', String(pattern), 'matched:', !!match);
      }
      if (match) {
        // Tomar el primer grupo disponible
        const raw = match[1] || match[0] || '';
        // Normalizar removiendo espacios/separadores
        const cleaned = String(raw).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        return cleaned || raw;
      }
    } catch (e) {
      if (DEBUG) console.warn('[PDF-PARSER] Error matching numeroEscritura with', String(pattern), e.message);
    }
  }
  return null;
}

/**
 * Extrae información de personas (otorgantes/beneficiarios)
 * @param {string} text - Texto que contiene información de personas
 * @returns {Array} Array de objetos con información de personas
 */
function extractPersonas(text) {
  if (!text) return [];
  
  const personas = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length < 3) continue;
    
    const persona = {
      nombre: trimmedLine,
      documento: 'CÉDULA',
      numero: null,
      nacionalidad: 'ECUATORIANA',
      calidad: 'COMPARECIENTE'
    };
    
    // Buscar cédula en la línea
    const cedulaMatch = trimmedLine.match(/([0-9]{10})/);
    if (cedulaMatch) {
      persona.numero = cedulaMatch[1];
      // Limpiar el nombre removiendo la cédula
      persona.nombre = trimmedLine.replace(/[0-9]{10}/, '').trim();
    }
    
    // Buscar nacionalidad
    const nacionalidadMatch = trimmedLine.match(/NACIONALIDAD\s*:?\s*([A-ZÁÉÍÓÚÑÜ]+)/i);
    if (nacionalidadMatch) {
      persona.nacionalidad = nacionalidadMatch[1].toUpperCase();
    }
    
    personas.push(persona);
  }
  
  return personas;
}

/**
 * Extrae datos usando un patrón específico
 * @param {string} text - Texto del PDF
 * @param {Array} patterns - Array de patrones regex
 * @returns {string|null} Primer match encontrado
 */
function extractWithPatterns(text, patterns) {
  for (const pattern of patterns) {
    try {
      const match = text.match(pattern);
      if (DEBUG) {
        console.info('[PDF-PARSER] extractWithPatterns pattern', String(pattern), 'matched:', !!match);
      }
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch (e) {
      if (DEBUG) console.warn('[PDF-PARSER] Error matching pattern', String(pattern), e.message);
    }
  }
  return null;
}

/**
 * Extrae la sección de texto que inicia con un encabezado dado hasta el próximo encabezado relevante.
 */
function extractSectionText(text, labelRegex) {
  if (!text) return null;
  const startIdx = text.search(labelRegex);
  if (startIdx === -1) return null;
  const after = text.slice(startIdx);
  // Próximo encabezado común (inicio de línea + etiqueta en mayúscula con dos puntos opcionales)
  const nextHeader = after.search(/^[ \t]*?(OTORGADO\s+POR|OTORGADO\s+A\s+FAVOR|A\s+FAVOR\s+DE|BENEFICIARIO|UBICACI[ÓO]N|CUANT[IÍ]A|OBJETO|OBSERVACIONES|ACTO|CONTRATO|FECHA|NOTAR[IÍ]A|NOTARIO)\s*:?.*$/im);
  const section = nextHeader > 0 ? after.slice(0, nextHeader) : after;
  return section;
}

/**
 * Extrae nombres de una sección etiquetada (p. ej. OTORGADO POR / A FAVOR DE) buscando tablas y líneas.
 */
function extractNamesForLabeledSection(text, labelRegex) {
  const section = extractSectionText(text, labelRegex) || '';
  // 1) Intentar parseo tipo tabla con cabeceras detectadas
  const tablePersonsStructured = parsePersonsTableFromSection(section);
  if (tablePersonsStructured.length > 0) {
    return tablePersonsStructured;
  }
  // Buscar en tablas de texto y html-like dentro de la sección
  const namesFromTables = [
    ...extractNamesFromTextTables(section),
    ...extractNamesFromHtmlLikeTables(section)
  ];
  const personsFromTables = namesFromTables.map(n => ({
    nombre: n,
    documento: 'DESCONOCIDO',
    numero: null,
    nacionalidad: '',
    calidad: 'COMPARECIENTE'
  }));
  // Fallback: parseo línea a línea de la sección
  const personsFromLines = extractPersonas(section);
  return mergePersonsUnique(personsFromTables, personsFromLines);
}

/**
 * Intenta parsear una tabla de personas en texto plano dentro de una sección.
 * Detecta cabeceras como "Nombres/Razón social", "Documento", "Cédula", "Nacionalidad", "Calidad".
 */
function parsePersonsTableFromSection(sectionText) {
  const persons = [];
  if (!sectionText) return persons;

  const lines = sectionText.split(/\r?\n/).map(l => l.trimEnd());
  if (lines.length === 0) return persons;

  // Encontrar línea de cabecera (contenga varias columnas relevantes)
  let headerIndex = -1;
  let headerCells = [];
  const splitRow = (line) => line.split(/\s{2,}|\t+|\|/).map(c => c.trim()).filter(Boolean);

  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const cells = splitRow(lines[i]);
    if (cells.length >= 2) {
      const normCells = cells.map(normalizeLabel);
      const hasNameCol = normCells.some(c => c.includes('NOMBRES') || c.includes('RAZON SOCIAL'));
      const hasIdCol = normCells.some(c => c.includes('CEDULA') || c.includes('RUC') || c.includes('PASAPORTE') || c.includes('NUMERO'));
      if (hasNameCol && hasIdCol) {
        headerIndex = i;
        headerCells = cells;
        break;
      }
    }
  }

  if (headerIndex === -1) return persons;

  // Mapear columnas a claves conocidas
  const headerMap = {};
  headerCells.forEach((h, idx) => {
    const n = normalizeLabel(h);
    if (n.includes('NOMBRES') || n.includes('RAZON SOCIAL')) headerMap[idx] = 'nombre';
    else if (n.includes('DOCUMENTO') || n.includes('TIPO')) headerMap[idx] = 'documento';
    else if (n.includes('CEDULA') || n.includes('RUC') || n.includes('PASAPORTE') || n.includes('NUMERO')) headerMap[idx] = 'numero';
    else if (n.includes('NACIONALIDAD')) headerMap[idx] = 'nacionalidad';
    else if (n.includes('CALIDAD') || n.includes('INTERVINIENTE') || n.includes('INTERV')) headerMap[idx] = 'calidad';
  });

  // Leer filas de datos hasta un corte (línea vacía o nueva cabecera)
  for (let r = headerIndex + 1; r < lines.length; r++) {
    const line = lines[r];
    if (!line.trim()) break; // corte natural
    // Si parece cabecera nueva, cortamos
    if (/^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ/() \t]{2,}$/.test(normalizeLabel(line))) break;

    const cells = splitRow(line);
    if (cells.length === 0) continue;
    const person = { nombre: '', documento: '', numero: '', nacionalidad: '', calidad: 'COMPARECIENTE' };
    cells.forEach((val, cidx) => {
      const key = headerMap[cidx];
      if (!key) return;
      if (key === 'nombre') person.nombre = val;
      else if (key === 'numero') person.numero = val.replace(/[^0-9A-Za-z]/g, '');
      else person[key] = val;
    });
    if (person.nombre && /[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}/.test(person.nombre)) {
      persons.push(person);
    }
  }

  return persons;
}

/**
 * Extrae pares etiqueta: valor genéricos (p. ej. "CAMPO: valor").
 * Retorna un diccionario { etiqueta_normalizada: valor } para referencia adicional.
 */
function extractGenericLabelValues(text) {
  const map = {};
  if (!text) return map;

  const lines = String(text).split(/\r?\n/);
  const labelLine = /^\s*([A-ZÁÉÍÓÚÑÜ0-9][A-ZÁÉÍÓÚÑÜ0-9/() .,-]{2,}?)\s*:\s*(.+)\s*$/i;
  for (const line of lines) {
    const m = line.match(labelLine);
    if (m) {
      const rawLabel = m[1].trim();
      const value = m[2].trim();
      const key = normalizeLabel(rawLabel);
      if (value) {
        map[key] = value;
      }
    }
  }
  return map;
}

/**
 * Normaliza etiquetas para comparaciones: mayúsculas, sin acentos ni espacios repetidos.
 */
function normalizeLabel(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intenta extraer nombres desde una tabla en texto plano posterior a headers como
 * "Nombres/Razón social". Toma las líneas siguientes hasta encontrar un posible
 * corte (doble salto o nuevo header) y devuelve una lista de nombres en la primera
 * columna.
 */
function extractNamesFromTextTables(text) {
  const names = [];
  if (!text) return names;

  const lines = text.split(/\r?\n/);
  const headerRegex = /NOMBRES\s*(?:\/|\s*[–-]\s*|\s*\/\s*)?\s*RAZ[ÓO]N\s+SOCIAL/i;
  const nextHeaderRegex = /^\s*[A-ZÁÉÍÓÚÑÜ/() \t]{3,}:\s*$/;

  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inTable && headerRegex.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable) {
      if (!line.trim()) {
        // línea vacía = posible fin de tabla
        break;
      }
      if (nextHeaderRegex.test(line.trim())) {
        break;
      }
      // Particionar por separadores frecuentes en tablas de texto: tuberías, tabs, o 2+ espacios
      const cells = line.split(/\s{2,}|\t+|\|/).map(c => c.trim()).filter(Boolean);
      if (cells.length > 0) {
        const first = cells[0];
        // Evitar líneas residuales tipo numeración o encabezados repetidos
        if (first && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(first)) {
          names.push(first);
        }
      }
    }
  }
  return names;
}

/**
 * Parsea tablas con marcado tipo HTML si existiesen (<table><tr><td>) en el texto.
 * Extrae valores de la columna cuyo header contenga "Nombres" o "Razón social".
 */
function extractNamesFromHtmlLikeTables(text) {
  const names = [];
  if (!text || text.indexOf('<table') === -1) return names;

  try {
    const tables = text.match(/<table[\s\S]*?<\/table>/gi) || [];
    for (const tbl of tables) {
      const rows = tbl.match(/<tr[\s\S]*?<\/tr>/gi) || [];
      if (rows.length === 0) continue;
      // Headers
      const headers = (rows[0].match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [])
        .map(cell => String(cell).replace(/<[^>]+>/g, '').trim());
      const idx = headers.findIndex(h => {
        const norm = normalizeLabel(h);
        return norm.includes('NOMBRES') || norm.includes('RAZON SOCIAL');
      });
      if (idx === -1) continue;
      // Filas de datos
      for (let r = 1; r < rows.length; r++) {
        const cells = (rows[r].match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi) || [])
          .map(cell => String(cell).replace(/<[^>]+>/g, '').trim());
        const val = cells[idx];
        if (val && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(val)) {
          names.push(val);
        }
      }
    }
  } catch {
    // Si falla el parsing toleramos y retornamos lo obtenido
  }
  return names;
}

/**
 * Extrae información de ubicación
 * @param {string} text - Texto del PDF
 * @returns {Object|null} Objeto con provincia, cantón y parroquia
 */
function extractUbicacion(text) {
  for (const pattern of PATTERNS.ubicacion) {
    const match = text.match(pattern);
    if (match && match.length >= 4) {
      return {
        provincia: match[1].trim().toUpperCase(),
        canton: match[2].trim().toUpperCase(),
        parroquia: match[3].trim().toUpperCase()
      };
    }
  }
  return null;
}

/**
 * Fusiona arrays de personas evitando duplicados por nombre normalizado
 */
function mergePersonsUnique(a = [], b = []) {
  const norm = (s) => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
  const map = new Map();
  for (const p of [...a, ...b]) {
    const key = norm(p?.nombre);
    if (!key) continue;
    if (!map.has(key)) map.set(key, p);
  }
  return Array.from(map.values());
}

/**
 * Parsea un buffer de PDF y extrae datos de escritura notarial
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @param {string} filename - Nombre del archivo original
 * @returns {Promise<Object>} Objeto con datos extraídos y estado
 */
export async function parseEscrituraPDF(pdfBuffer, filename) {
  try {
    // Extraer texto del PDF
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;
    if (DEBUG) {
      const preview = String(text || '').slice(0, 1200).replace(/\s+/g, ' ').trim();
      console.info('[PDF-PARSER] textLength=', text?.length || 0, 'preview=', preview);
    }
    
    if (!text || text.trim().length < 100) {
      return {
        success: false,
        estado: 'revision_requerida',
        error: 'El PDF no contiene texto suficiente para procesar',
        datosCompletos: null
      };
    }
    
    // Extraer datos usando patrones
    const numeroEscritura = extractNumeroEscritura(text);
    if (DEBUG) console.info('[PDF-PARSER] numeroEscritura:', numeroEscritura || '(no-match)');
    const acto = extractWithPatterns(text, PATTERNS.acto);
    const fecha = extractWithPatterns(text, PATTERNS.fecha);
    const notario = extractWithPatterns(text, PATTERNS.notario);
    const notaria = extractWithPatterns(text, PATTERNS.notaria);
    const cuantia = extractWithPatterns(text, PATTERNS.cuantia);
    if (DEBUG) {
      console.info('[PDF-PARSER] acto:', !!acto, 'fecha:', !!fecha, 'notario:', !!notario, 'notaria:', !!notaria, 'cuantia:', !!cuantia);
    }
    // Extraer bloque de OBJETO/OBSERVACIONES (preferir sección explícita si existe)
    const objetoObs = extractWithPatterns(text, PATTERNS.objetoObservaciones)
      || (extractSectionText(text, /(OBJETO\s*(?:\/|\s*[OY]\s+|\s*[–-]\s*)\s*OBSERVACIONES|OBSERVACIONES|OBJETO)\s*:?/i) || '')
          .replace(/^.*?\b(OBJETO|OBSERVACIONES)\b\s*:?[ \t]*/i, '')
          .trim() || null;
    const ubicacion = extractUbicacion(text);

    // Extraer otorgantes y beneficiarios (separando secciones)
    const otorgadoPorPersons = extractNamesForLabeledSection(text, /OTORGADO\s+POR/i);
    const aFavorDePersons = extractNamesForLabeledSection(text, /(OTORGADO\s+A\s+FAVOR|A\s+FAVOR\s+DE|BENEFICIARIO)/i);
    if (DEBUG) {
      console.info('[PDF-PARSER] otorgadoPorPersons:', otorgadoPorPersons.length, 'aFavorDePersons:', aFavorDePersons.length);
    }

    const otorgantes = {
      otorgado_por: otorgadoPorPersons,
      a_favor_de: aFavorDePersons
    };

    // Extraer pares etiqueta:valor genéricos
    const extraCampos = extractGenericLabelValues(text);
    
    // Construir objeto de datos completos
    const datosCompletos = {
      escritura: numeroEscritura,
      acto: acto,
      fecha_otorgamiento: fecha,
      notario: notario,
      notaria: notaria || 'DÉCIMA OCTAVA DEL CANTÓN QUITO',
      otorgantes: otorgantes,
      ubicacion: ubicacion || {
        provincia: 'PICHINCHA',
        canton: 'QUITO',
        parroquia: 'IÑAQUITO'
      },
      cuantia: cuantia || 'INDETERMINADA',
      objeto_observaciones: objetoObs || null,
      extra_campos: extraCampos,
      archivo_original: filename,
      fecha_procesamiento: new Date().toISOString()
    };
    
    // Determinar estado basado en campos críticos
    const camposCriticos = [numeroEscritura, acto, fecha];
    const camposCompletos = camposCriticos.filter(campo => campo && campo.trim().length > 0);
    
    const estado = camposCompletos.length >= 2 ? 'activo' : 'revision_requerida';
    if (DEBUG) console.info('[PDF-PARSER] camposCriticos=', camposCriticos.map(c=>!!c), 'estado=', estado);
    
    return {
      success: true,
      estado: estado,
      numeroEscritura: numeroEscritura,
      datosCompletos: JSON.stringify(datosCompletos, null, 2),
      archivoOriginal: filename,
      warnings: camposCompletos.length < 3 ? ['Algunos campos críticos no pudieron ser extraídos'] : []
    };
    
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return {
      success: false,
      estado: 'revision_requerida',
      error: `Error procesando PDF: ${error.message}`,
      datosCompletos: null
    };
  }
}

/**
 * Valida que un archivo sea un PDF válido
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} mimetype - Tipo MIME del archivo
 * @returns {boolean} True si es un PDF válido
 */
export function validatePDFFile(buffer, mimetype) {
  // Verificar tipo MIME
  const validMimeTypes = ['application/pdf'];
  if (!validMimeTypes.includes(mimetype)) {
    return false;
  }
  
  // Verificar magic bytes del PDF
  const pdfHeader = buffer.slice(0, 4).toString();
  return pdfHeader === '%PDF';
}

/**
 * Sanitiza el nombre de archivo
 * @param {string} filename - Nombre original del archivo
 * @returns {string} Nombre sanitizado
 */
export function sanitizeFilename(filename) {
  if (!filename) return 'documento.pdf';
  
  // Remover caracteres peligrosos y mantener solo alfanuméricos, guiones y puntos
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200); // Limitar longitud
}
