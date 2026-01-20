/**
 * Servicio de parsing de PDF para extractos de escrituras notariales
 * Extrae datos específicos de documentos de la Notaría 18
 */

// Carga de pdf-parse solo bajo demanda (evita costos en arranque)
async function getPdfParse() {
  // Evitar cargar en producción sin necesidad; se invoca solo con Buffer real
  try {
    const modDirect = await import('pdf-parse/lib/pdf-parse.js')
    return modDirect?.default || modDirect
  } catch (_) {
    const mod = await import('pdf-parse')
    return mod?.default || mod
  }
}

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

  // Fecha de otorgamiento (con hora opcional entre paréntesis)
  fecha: [
    /FECHA\s+DE\s+OTORGAMIENTO\s*:?\s*([0-9]{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑÜ]+\s+DEL?\s+[0-9]{4}(?:\s*,\s*\([0-9]{1,2}:[0-9]{2}\))?)/i,
    /OTORGADO\s+EL\s*:?\s*([0-9]{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑÜ]+\s+DEL?\s+[0-9]{4}(?:\s*,\s*\([0-9]{1,2}:[0-9]{2}\))?)/i
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
 * Limpia y valida el valor extraído de cuantía
 * @param {string|null} cuantiaRaw - Valor crudo de cuantía
 * @returns {string|null} Cuantía limpia o null si no es válida
 */
function cleanCuantia(cuantiaRaw) {
  if (!cuantiaRaw) return null;

  const cuantiaStr = String(cuantiaRaw).trim().toUpperCase();

  // Si solo contiene palabras clave sin valor numérico, retornar null
  const palabrasClave = ['CUANTIA', 'CUANTÍA', 'DEL ACTO', 'VALOR', 'O.', 'O', 'CONTRATO'];
  const soloClaves = palabrasClave.some(palabra => cuantiaStr.includes(palabra))
    && !/\d/.test(cuantiaStr); // No contiene dígitos

  if (soloClaves) {
    return null;
  }

  // Si es muy corto (menos de 2 caracteres) o solo tiene letras sin sentido
  if (cuantiaStr.length < 2) {
    return null;
  }

  // Si ya dice "INDETERMINADA" o variantes, retornar null para usar el default
  if (cuantiaStr.includes('INDETERMINAD') || cuantiaStr === 'N/A' || cuantiaStr === 'S/N') {
    return null;
  }

  return cuantiaStr;
}

/**
 * Limpia el texto de observaciones removiendo encabezados no deseados
 * @param {string|null} obsRaw - Texto crudo de observaciones
 * @returns {string|null} Observaciones limpias o null
 */
function cleanObservaciones(obsRaw) {
  if (!obsRaw) return null;

  let texto = String(obsRaw).trim();

  // Remover encabezados de otras secciones que pueden haberse colado (al inicio y al final)
  const encabezadosBasura = [
    // Al inicio del texto
    /^CUANTÍA\s*(?:DEL\s*)?(?:ACTO\s*)?(?:O\s*)?(?:CONTRATO\s*)?:?\s*/gi,
    /^CUANTIA\s*(?:DEL\s*)?(?:ACTO\s*)?(?:O\s*)?(?:CONTRATO\s*)?:?\s*/gi,
    /^VALOR\s*:?\s*/gi,
    /^UBICACIÓN\s*:?\s*/gi,
    /^UBICACION\s*:?\s*/gi,
    // Al final del texto (más común)
    /\s*CUANTÍA\s*(?:DEL\s*)?(?:ACTO\s*)?(?:O\s*)?(?:CONTRATO\s*)?:?\s*$/gi,
    /\s*CUANTIA\s*(?:DEL\s*)?(?:ACTO\s*)?(?:O\s*)?(?:CONTRATO\s*)?:?\s*$/gi,
    /\s*VALOR\s*:?\s*$/gi,
    /\s*UBICACIÓN\s*:?\s*$/gi,
    /\s*UBICACION\s*:?\s*$/gi
  ];

  // Aplicar todos los patrones
  for (const patron of encabezadosBasura) {
    texto = texto.replace(patron, '');
  }

  // Limpiar líneas que solo contienen estos encabezados
  texto = texto
    .split('\n')
    .filter(linea => {
      const lineaLimpia = linea.trim().toUpperCase();
      // Filtrar líneas que solo son encabezados basura
      if (!lineaLimpia) return false;
      if (lineaLimpia === 'CUANTÍA DEL ACTO O' ||
        lineaLimpia === 'CUANTIA DEL ACTO O' ||
        lineaLimpia === 'CUANTÍA DEL ACTO' ||
        lineaLimpia === 'CUANTIA DEL ACTO' ||
        lineaLimpia === 'CUANTÍA' ||
        lineaLimpia === 'CUANTIA' ||
        lineaLimpia === 'VALOR' ||
        lineaLimpia === 'UBICACIÓN' ||
        lineaLimpia === 'UBICACION') {
        return false;
      }
      return true;
    })
    .join('\n');

  texto = texto.trim();

  // Si después de limpiar queda muy poco texto o vacío, retornar null
  if (texto.length < 5) {
    return null;
  }

  return texto;
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
  const match = text.match(labelRegex);
  if (!match) return null;

  // Start AFTER the full match of the label
  const startIdx = match.index + match[0].length;

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

  // Función mejorada para separar columnas:
  // Si detectamos el header específico "Persona | Nombres/Razón social", somos más permisivos con los espacios
  const splitRow = (line, isHeaderSearch = false) => {
    // Si contiene pipes, usar pipes
    if (line.includes('|')) {
      return line.split('|').map(c => c.trim()).filter(Boolean);
    }

    // Si estamos buscando headers y parece ser la tabla específica de Notaría 18
    if (isHeaderSearch && /Persona.*Nombres.*Razón/i.test(line)) {
      // Separar por 2+ espacios O por cambios bruscos de capitalización/categoría conocidos
      return line.split(/\s{2,}|\t+/).map(c => c.trim()).filter(Boolean);
    }

    // Default: 2 o más espacios o tabs
    return line.split(/\s{2,}|\t+/).map(c => c.trim()).filter(Boolean);
  };

  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const cells = splitRow(lines[i], true);
    if (cells.length >= 2) {
      const normCells = cells.map(normalizeLabel);
      // Check específico para "Persona" como primer columna común en N18
      const hasPersonaCol = normCells.some(c => c === 'PERSONA');
      const hasNameCol = normCells.some(c => c.includes('NOMBRES') || c.includes('RAZON SOCIAL'));
      const hasIdCol = normCells.some(c => c.includes('CEDULA') || c.includes('RUC') || c.includes('PASAPORTE') || c.includes('NUMERO') || c.includes('IDENTIFICACION'));

      if ((hasNameCol && hasIdCol) || (hasPersonaCol && hasNameCol)) {
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
    else if (n.includes('CEDULA') || n.includes('RUC') || n.includes('PASAPORTE') || n.includes('IDENTIFICACION') || (n.includes('NO') && n.includes('NUMERO'))) headerMap[idx] = 'numero';
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
    const person = { nombre: '', documento: '', numero: '', nacionalidad: '', calidad: 'COMPARECIENTE', representadoPor: null };
    cells.forEach((val, cidx) => {
      const key = headerMap[cidx];
      if (!key) return;
      if (key === 'nombre') {
        // Verificar si el nombre contiene "representado por"
        const representadoMatch = val.match(/^(.+?)\s+representad[oa]\s+por[:\s]+(.+?)$/i);
        if (representadoMatch) {
          person.nombre = representadoMatch[1].trim();
          person.representadoPor = representadoMatch[2].trim();
        } else {
          person.nombre = val;
        }
      }
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
 * Limpia personas extraídas: remover entradas sin nombre válido o con datos basura
 */
function cleanPersonsList(persons) {
  if (!Array.isArray(persons)) return [];

  // Tokens y patrones que NO son nombres de personas
  const invalidExact = new Set([
    'PERSONA', 'NATURAL', 'JURIDICA', 'DOCUMENTO', 'TIPO', 'INTERVINIENTE',
    'OTORGADO POR', 'A FAVOR DE', 'BENEFICIARIO', 'COMPARECIENTE',
    'POR SUS PROPIOS', 'POR SUS PROPIOS DERECHOS', 'DERECHOS',
    'DOCUMENTO DE', 'PERSONA QUE LE', 'PERSONA QUE', 'QUE REPRESENTA',
    'NACIONALIDAD', 'CALIDAD', 'ECUATORIANA', 'COLOMBIANA',
    'CÉDULA', 'CEDULA', 'RUC', 'PASAPORTE', 'IDENTIFICACIÓN', 'IDENTIFICACION',
    'NO IDENTIFICACIÓN', 'NO IDENTIFICACION', 'CUANTÍA DEL ACTO',
    'CUANTÍA DEL ACTO O', 'ACTO O CONTRATO', 'OBJETO', 'OBSERVACIONES',
    'UBICACIÓN', 'PROVINCIA', 'CANTÓN', 'PARROQUIA',
    'REPRESENTADO POR', 'REPRESENTADO PORRUC', 'REPRESENTANTE LEGAL',
    'NA', 'TE', 'DE A FAVOR', 'PROPIOS POR SUS', 'DE A'
  ]);

  // Patrones regex que indican basura
  const garbagePatterns = [
    /^Documento/i, /^Persona/i, /^Tipo/i, /^No\s+/i, /^Nombres/i,
    /^Razón/i, /^Social/i, /^Interviniente/i, /^Nacionalidad/i,
    /^Calidad/i, /^Representa/i, /^Cuantía/i, /^Ubicación/i,
    /CalidadPersona/i, /NacionalidadCalidad/i, /socialTipo/i,
    /^Natural/i, /^Jur[ií]dica/i // Start of line garbage
  ];

  return persons.filter(p => {
    if (!p || !p.nombre) return false;
    const name = String(p.nombre).trim().toUpperCase();

    // Filtrar nombres muy cortos
    if (name.length < 3) return false;

    // Filtrar coincidencias exactas con tokens inválidos
    if (invalidExact.has(name)) return false;

    // Filtrar si comienza con patrón basura
    if (garbagePatterns.some(pat => pat.test(name))) return false;

    // Limpiar basura concatenada al final (ej. "NaturalLIU" -> "LIU")
    // Esto pasa cuando la columna "Tipo" se pega al nombre
    let cleanName = name.replace(/Natural[A-Z]*$/i, '')
      .replace(/Jur[ií]dica[A-Z]*$/i, '')
      .trim();

    // Si quedó vacío o muy corto tras limpiar
    if (cleanName.length < 3) return false;

    return true;
  }).map(p => {
    let cleanName = String(p.nombre).trim();
    // Re-aplicar limpieza de sufijos basura para el valor final
    cleanName = cleanName.replace(/Natural[A-Z]*$/i, '')
      .replace(/Jur[ií]dica[A-Z]*$/i, '')
      .trim();

    return {
      nombre: cleanName,
      documento: p.documento || 'CÉDULA',
      numero: p.numero ? String(p.numero).replace(/[^0-9A-Z]/g, '') : null,
      nacionalidad: p.nacionalidad || 'ECUATORIANA',
      calidad: p.calidad || 'COMPARECIENTE',
      representadoPor: p.representadoPor || null
    };
  });
}

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
 * Ahora detecta y extrae información de representantes legales
 * @param {string} text - Texto que contiene información de personas
 * @returns {Array} Array de objetos con información de personas
 */
/**
 * Reordena nombres de formato "APELLIDOS NOMBRES" a "NOMBRES APELLIDOS"
 * Asume convención hispana estándar (2 apellidos + nombres)
 * @param {string} fullName 
 */
function reorderName(fullName) {
  if (!fullName) return '';
  const tokens = fullName.trim().split(/\s+/).filter(t => t.length > 0);

  // Si son pocos tokens, devolver tal cual o intentar heurística simple
  if (tokens.length < 3) return fullName;

  // Detectar empresas (si contiene S.A., CIA, LTDA, etc. no tocar)
  const isCompany = tokens.some(t => /^(S\.A\.|CIA\.?|LTDA\.?|CORP\.?|INC\.?|S\.A\.S\.?)$/i.test(t));
  if (isCompany) return fullName;

  // Heurística básica: Asumir los 2 primeros tokens son apellidos si no hay partículas
  // Excepción: Partículas "DE", "DEL", "DE LA"
  const particles = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA']);

  let surnameTokens = [];
  let nameTokens = [];

  // Intentar detectar corte de apellidos
  // Estrategia: "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2..."

  let i = 0;
  // Primer apellido
  surnameTokens.push(tokens[i++]);
  if (i < tokens.length && particles.has(tokens[i].toUpperCase())) {
    surnameTokens.push(tokens[i++]); // DE
    if (i < tokens.length) surnameTokens.push(tokens[i++]); // LEON
  }

  // Segundo apellido (si existe)
  if (i < tokens.length) {
    // Chequeo simple: si es partícula, se une
    if (particles.has(tokens[i].toUpperCase())) {
      surnameTokens.push(tokens[i++]);
      if (i < tokens.length) surnameTokens.push(tokens[i++]);
    } else {
      // Asumimos que el segundo token es el segundo apellido
      surnameTokens.push(tokens[i++]);
    }
  }

  // El resto son nombres
  while (i < tokens.length) {
    nameTokens.push(tokens[i++]);
  }

  // Si no hay nombres, algo salió mal (ej. nombre de empresa largo o solo un nombre), devolver original
  if (nameTokens.length === 0) return fullName;

  return [...nameTokens, ...surnameTokens].join(' ');
}

/**
 * Parsea personas basándose en bloques verticales (común en notaría 18)
 * Estructura típica:
 * Natural
 * APELLIDO APELLIDO NOMBRE
 * NOMBRE
 * POR SUS PROPIOS...
 * CÉDULA0123...
 * @param {string} text Texto de la sección
 */
function parseBlockStructuredPersons(text) {
  const persons = [];
  if (!text) return persons;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let bufferName = [];
  let currentPerson = null; // { nombre: '', documento: '', numero: '', ... }

  const flushPerson = () => {
    if (currentPerson) {
      // Finalizar captura de nombre
      if (bufferName.length > 0) {
        // Evitar basura acumulada
        const rawName = bufferName.join(' ').replace(/\s+/g, ' ');
        // Filtrar si es "Persona" o headers
        if (!/^(Persona|Nombres|Raz|Social)/i.test(rawName)) {
          currentPerson.nombre = reorderName(rawName);
        }
      }

      if (currentPerson.nombre && currentPerson.nombre.length > 3) {
        persons.push(currentPerson);
      }
    }
    currentPerson = null;
    bufferName = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase().trim();

    // 1. Detectar inicio de bloque (Tipo de persona)
    if (/^(NATURAL|JUR[IÍ]DICA)$/i.test(upperLine)) {
      flushPerson();
      currentPerson = {
        nombre: '',
        documento: 'CÉDULA', // Default
        numero: null,
        nacionalidad: 'ECUATORIANA',
        calidad: 'COMPARECIENTE'
      };
      // Si es jurídica, cambiar default
      if (/JUR[IÍ]DICA/i.test(upperLine)) {
        currentPerson.documento = 'RUC';
      }
      continue;
    }

    if (!currentPerson) continue;

    // 2. Detectar Documento e ID
    const idMatch = line.match(/(C[ée]dula|RUC|Pasaporte)\s*:?\s*([0-9A-Z]+)/i);
    if (idMatch) {
      currentPerson.documento = idMatch[1].toUpperCase().replace('CEDULA', 'CÉDULA');
      currentPerson.numero = idMatch[2];
      continue;
    }

    // 3. Detectar y saltar líneas de Calidad/Rol/Basura común de intervinientes
    // Se usa regex más permisivo para capturar "ECUATORIA", "COMPARECIEN", etc.
    if (/PROPIOS|DERECHOS|POR\s+SUS|COMPARECIEN|BENEFICIARI|REPRESENTA|INTERVINIENTE|OTORGA|ESTADO\s+CIVIL|PROFESI[ÓO]N|DOMICILIADO/i.test(line)) {
      continue;
    }

    // 4. Detectar Nacionalidad
    if (/^(ECUATORIA|EXTRANJERA|COLOMBIANA|PERUANA|VENEZOLANA)/i.test(line)) {
      if (/ECUATORIA/i.test(line)) currentPerson.nacionalidad = 'ECUATORIANA';
      else currentPerson.nacionalidad = line.toUpperCase();
      continue;
    }

    // 5. Acumular Nombre
    // Ignorar líneas muy cortas o que parezcan basura ("NA", "TE", "NO")
    if (line.length < 3 && !/^[A-Z]\.?$/.test(line)) continue;

    // Ignorar headers de tabla
    if (/^(Persona|Nombres|Raz|Social|Tipo|Interviniente|Documento|Identidad|No\.|Nacionalidad|Calidad|Repres)/i.test(line)) continue;

    // Validación extra: no agregar si parece una fecha o un email
    if (/[0-9]{2,}/.test(line) && !/S\.?A/.test(upperLine)) continue; // Números (excepto S.A.)
    if (/@/.test(line)) continue;

    // Limpiar tokens basura dentro de la línea (ej. "DAVID ECUATORIA")
    const cleanLine = line.replace(/(ECUATORIA[NA]?|COMPARECIEN[TE]?|PROPIOS DERECHOS)/gi, '').trim();

    if (cleanLine.length > 1) {
      bufferName.push(cleanLine);
    }
  }

  flushPerson(); // El último
  return persons;
}

/**
 * Extrae información de personas (otorgantes/beneficiarios)
 * Usa lógica de bloques prioritaria, fallback a detección por línea
 */
function extractPersonas(text) {
  // 1. Intentar parsing por bloques (más preciso para este PDF)
  const blockPersons = parseBlockStructuredPersons(text);
  if (blockPersons.length > 0) return blockPersons;

  // 2. Fallback: Lógica línea a línea (legacy)
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
      calidad: 'COMPARECIENTE',
      representadoPor: null
    };

    // Buscar patrón de representación: "NOMBRE representado/a por REPRESENTANTE"
    const representadoMatch = trimmedLine.match(
      /^(.+?)\s+representad[oa]\s+por[:\s]+(.+?)(?:\s*[,.]|$)/i
    );

    if (representadoMatch) {
      // Hay un representante
      const nombrePrincipal = representadoMatch[1].trim();
      const nombreRepresentante = representadoMatch[2].trim();

      // Buscar cédula en el nombre principal
      const cedulaPrincipalMatch = nombrePrincipal.match(/([0-9]{10})/);
      if (cedulaPrincipalMatch) {
        persona.numero = cedulaPrincipalMatch[1];
        persona.nombre = nombrePrincipal.replace(/[0-9]{10}/, '').trim();
      } else {
        persona.nombre = nombrePrincipal;
      }
      // Reordenar nombre persona natural
      persona.nombre = reorderName(persona.nombre);

      // Buscar cédula en el nombre del representante
      const cedulaRepresentanteMatch = nombreRepresentante.match(/([0-9]{10})/);
      if (cedulaRepresentanteMatch) {
        persona.representadoPor = nombreRepresentante; // Se guarda completo por ahora
      } else {
        persona.representadoPor = nombreRepresentante;
      }
    } else {
      // No hay representante, extracción normal
      // Buscar cédula en la línea
      const cedulaMatch = trimmedLine.match(/([0-9]{10})/);
      if (cedulaMatch) {
        persona.numero = cedulaMatch[1];
        // Limpiar el nombre removiendo la cédula
        persona.nombre = trimmedLine.replace(/[0-9]{10}/, '').trim();
      }
      persona.nombre = reorderName(persona.nombre);
    }

    // Buscar nacionalidad
    const nacionalidadMatch = trimmedLine.match(/NACIONALIDAD\s*:?\s*([A-ZÁÉÍÓÚÑÜ]+)/i);
    if (nacionalidadMatch) {
      persona.nacionalidad = nacionalidadMatch[1].toUpperCase();
    }

    // Solo agregar si hay información útil del nombre
    if (persona.nombre && persona.nombre.length > 2) {
      personas.push(persona);
    }
  }

  return personas;
}

// ... (helpers intermedios omitidos si no cambian) ...

// ... (helpers intermedios omitidos si no cambian) ...

/**
 * Parsea un buffer de PDF y extrae datos de escritura notarial
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @param {string} filename - Nombre del archivo original
 * @returns {Promise<Object>} Objeto con datos extraídos y estado
 */
export async function parseEscrituraPDF(pdfBuffer, filename) {
  try {
    if (!pdfBuffer || !(pdfBuffer instanceof Buffer) || pdfBuffer.length === 0) {
      throw new Error('Buffer de PDF inválido o vacío')
    }
    const pdfParse = await getPdfParse()
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

    // placeholder
    function check() { }
    const numeroEscritura = extractNumeroEscritura(text);
    const acto = extractWithPatterns(text, PATTERNS.acto);
    const fecha = extractWithPatterns(text, PATTERNS.fecha);
    const notario = extractWithPatterns(text, PATTERNS.notario);
    const notaria = extractWithPatterns(text, PATTERNS.notaria);

    // Extraer y limpiar cuantía
    const cuantiaRaw = extractWithPatterns(text, PATTERNS.cuantia);
    const cuantia = cleanCuantia(cuantiaRaw);

    // Extraer bloque de OBJETO/OBSERVACIONES
    const objetoObsRaw = extractWithPatterns(text, PATTERNS.objetoObservaciones)
      || (extractSectionText(text, /(OBJETO\s*(?:\/|\s*[OY]\s+|\s*[–-]\s*)\s*OBSERVACIONES|OBSERVACIONES|OBJETO)\s*:?/i) || '')
        .replace(/^.*?\b(OBJETO|OBSERVACIONES)\b\s*:?[ \t]*/i, '')
        .trim() || null;

    // Limpiar observaciones
    const objetoObs = cleanObservaciones(objetoObsRaw);
    const ubicacion = extractUbicacion(text);

    // OTORGANTES: Extracción deshabilitada a petición del usuario (20-01-2026)
    // Se usará ingreso manual o importación de texto.
    const otorgantes = {
      otorgado_por: [],
      a_favor_de: []
    };

    // Extraer pares etiqueta:valor genéricos
    const extraCampos = extractGenericLabelValues(text);

    // Construir objeto de datos completos
    const datosCompletos = {
      escritura: numeroEscritura,
      acto: acto,
      fecha_otorgamiento: fecha,
      notario: notario || 'GLENDA ELIZABETH ZAPATA SILVA',
      notaria: notaria || 'DÉCIMA OCTAVA DEL CANTÓN QUITO',
      otorgantes: otorgantes,
      ubicacion: ubicacion || {
        provincia: 'PICHINCHA',
        canton: 'QUITO',
        parroquia: 'IÑAQUITO'
      },
      cuantia: cuantia || 'INDETERMINADA',
      objeto_observaciones: objetoObs || null,
    };

    // Extraer pares etiqueta:valor genéricos
    // const extraCampos = extractGenericLabelValues(text); // This line was already there, but the instruction re-added it. Keeping the original.
    datosCompletos.extra_campos = extraCampos;
    datosCompletos.archivo_original = filename;
    datosCompletos.fecha_procesamiento = new Date().toISOString();

    // Determinar estado basado en campos críticos
    // const camposCriticos = [numeroEscritura, acto, fecha];
    // const camposCompletos = camposCriticos.filter(campo => campo && campo.trim().length > 0);
    const estado = 'activo'; // Simplificado por ahora o usar lógica anterior

    if (DEBUG) console.info('[PDF-PARSER] estado=', estado);

    return {
      success: true,
      estado: estado,
      numeroEscritura: numeroEscritura,
      datosCompletos: JSON.stringify(datosCompletos, null, 2),
      archivoOriginal: filename,
      warnings: []
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
