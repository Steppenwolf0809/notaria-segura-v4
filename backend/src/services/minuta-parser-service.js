import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Regex Patterns ───────────────────────────────────────────────

// Cédula: 10 dígitos (con o sin guión antes del verificador)
const CEDULA_RE = /\b(\d{9,10}[-]?\d?)\b/g;
// Cédula escrita en letras dentro de paréntesis: (0500729983)
const CEDULA_PAREN_RE = /\((\d{10})\)/g;

// RUC: 13 dígitos
const RUC_RE = /\b(\d{13})\b/g;

// Montos USD: $145.000,00 o USD 145.000,00 o $56,500.00
// Captura formatos latam (punto=miles, coma=decimal) y US (coma=miles, punto=decimal)
const MONTO_RE = /(?:USD?\s*\$?\s*|US\s*\$\s*|\$\s*)([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/gi;
const MONTO_ESCRITO_RE = /(\w[\w\s]+)\s+D[OÓ]LARES\s+DE\s+LOS\s+ESTADOS\s+UNIDOS\s+DE\s+AM[EÉ]RICA/gi;

// Correo electrónico
const EMAIL_RE = /[\w.-]+@[\w.-]+\.\w{2,}/gi;

// Teléfono: 09XXXXXXXX o +593XXXXXXXXX
const TELEFONO_RE = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?\d{6,8}/g;
const TELEFONO_PAREN_RE = /\((\d{10})\)/g;

/**
 * Parsea un string de monto detectando formato latam (56.500,00) vs US (56,500.00).
 * Regla: si el ultimo separador es coma → formato latam (coma=decimal, punto=miles).
 *        si el ultimo separador es punto → formato US (punto=decimal, coma=miles).
 *        si no hay separadores → entero.
 */
function parseMontoStr(str) {
  if (!str) return NaN;
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Latam: 56.500,00 → quitar puntos, coma→punto
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  } else if (lastDot > lastComma) {
    // US: 56,500.00 → quitar comas
    return parseFloat(str.replace(/,/g, ''));
  }
  // Sin separadores o solo uno tipo
  return parseFloat(str.replace(/,/g, ''));
}

// ── Section Extraction ───────────────────────────────────────────

/**
 * Extrae secciones clave de la minuta por cláusulas.
 */
function extractSections(text) {
  const sections = {};
  const normalized = text.replace(/\r\n/g, '\n');

  // Patrones de cláusulas (PRIMERA, SEGUNDA, etc. o Primera, Segunda)
  const clauseNames = [
    'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA',
    'SEXTA', 'S[EÉ]PTIMA', 'OCTAVA', 'NOVENA', 'D[EÉ]CIMA',
    'D[EÉ]CIMA\\s*PRIMERA', 'D[EÉ]CIMA\\s*SEGUNDA', 'D[EÉ]CIMA\\s*TERCERA',
    'D[EÉ]CIMA\\s*CUARTA',
  ];

  const clausePattern = new RegExp(
    `(${clauseNames.join('|')})\\s*[.:\\-–—]+\\s*`,
    'gi'
  );

  const matches = [...normalized.matchAll(clausePattern)];

  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1].toUpperCase().replace(/\s+/g, '_');
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    sections[name] = normalized.substring(start, end).trim();
  }

  return sections;
}

/**
 * Identifica la sección de comparecientes.
 * Generalmente está en PRIMERA con subtítulo COMPARECIENTES.
 */
function getComparecientesText(sections, fullText) {
  // Buscar en PRIMERA
  if (sections.PRIMERA) {
    const compIdx = sections.PRIMERA.toUpperCase().indexOf('COMPARECIENTES');
    if (compIdx >= 0) return sections.PRIMERA;
  }

  // Fallback: buscar directamente en el texto completo
  const compStart = fullText.toUpperCase().indexOf('COMPARECIENTES');
  if (compStart >= 0) {
    const secondaIdx = fullText.toUpperCase().indexOf('SEGUNDA', compStart);
    return fullText.substring(compStart, secondaIdx > 0 ? secondaIdx : compStart + 5000);
  }

  return '';
}

/**
 * Identifica la sección de precio/cuantía.
 */
function getPrecioText(sections, fullText) {
  // Buscar cláusula que contenga "PRECIO"
  for (const [key, value] of Object.entries(sections)) {
    if (value.toUpperCase().includes('PRECIO') || value.toUpperCase().includes('CUANT')) {
      return value;
    }
  }

  // Fallback
  const precioIdx = fullText.toUpperCase().indexOf('PRECIO');
  if (precioIdx >= 0) {
    return fullText.substring(Math.max(0, precioIdx - 200), precioIdx + 2000);
  }

  return '';
}

// ── Regex Extraction (Phase 1) ───────────────────────────────────

/**
 * Extrae datos mecánicos con regex.
 * No intenta interpretar semántica (quién es comprador/vendedor).
 */
function extractWithRegex(text) {
  const sections = extractSections(text);
  const comparecientesText = getComparecientesText(sections, text);
  const precioText = getPrecioText(sections, text);

  // Cédulas
  const cedulas = new Set();
  const allCedulaMatches = [
    ...text.matchAll(CEDULA_PAREN_RE),
    ...text.matchAll(CEDULA_RE),
  ];
  for (const m of allCedulaMatches) {
    const clean = m[1].replace(/-/g, '');
    if (clean.length === 10 && /^\d+$/.test(clean)) {
      cedulas.add(clean);
    }
  }

  // RUCs
  const rucs = new Set();
  for (const m of text.matchAll(RUC_RE)) {
    rucs.add(m[1]);
  }

  // Montos
  const montos = [];
  for (const m of text.matchAll(MONTO_RE)) {
    const value = parseMontoStr(m[1]);
    if (!isNaN(value) && value > 0) {
      montos.push(value);
    }
  }

  // Emails
  const emails = [...new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase()))];

  // Teléfonos - buscar formatos comunes ecuatorianos
  const telefonos = new Set();
  // Dentro de paréntesis (formato minuta: (0998220990))
  for (const m of comparecientesText.matchAll(TELEFONO_PAREN_RE)) {
    if (m[1].startsWith('0') && m[1].length === 10) {
      telefonos.add(m[1]);
    }
  }
  // Formato directo
  const telMatches = comparecientesText.match(/0\d{9}/g) || [];
  telMatches.forEach(t => telefonos.add(t));
  // Formato internacional
  const intlMatches = comparecientesText.match(/\+\d[\d()\s.-]{8,}/g) || [];
  intlMatches.forEach(t => telefonos.add(t.replace(/[\s.-]/g, '')));

  // Tipo de acto - detectar del encabezado
  let tipoActoDetectado = null;
  const upperText = text.toUpperCase();
  if (upperText.includes('PROMESA DE COMPRAVENTA') || upperText.includes('PROMESA DE COMPRA VENTA')) {
    tipoActoDetectado = { codigo: '85', descripcion: 'PROMESA DE COMPRAVENTA DE INMUEBLES' };
  } else if (upperText.includes('COMPRAVENTA') && !upperText.includes('PROMESA')) {
    tipoActoDetectado = { codigo: '73', descripcion: 'COMPRAVENTA DE INMUEBLES' };
  } else if (upperText.includes('DONACI')) {
    if (upperText.includes('VEHICULO') || upperText.includes('VEHÍCULO')) {
      tipoActoDetectado = { codigo: '76', descripcion: 'DONACION DE VEHICULOS' };
    } else {
      tipoActoDetectado = { codigo: '75', descripcion: 'DONACION DE INMUEBLES' };
    }
  } else if (upperText.includes('PERMUTA')) {
    tipoActoDetectado = { codigo: '77', descripcion: 'PERMUTA DE INMUEBLES' };
  } else if (upperText.includes('DACI[OÓ]N EN PAGO')) {
    tipoActoDetectado = { codigo: '79', descripcion: 'DACION EN PAGO DE INMUEBLES' };
  } else if (upperText.includes('APORTE') && upperText.includes('SOCIEDAD')) {
    tipoActoDetectado = { codigo: '81', descripcion: 'APORTE A SOCIEDAD DE INMUEBLES' };
  } else if (upperText.includes('FIDEICOMISO')) {
    tipoActoDetectado = { codigo: '83', descripcion: 'FIDEICOMISO DE INMUEBLES' };
  } else if (upperText.includes('CAPITULACIONES MATRIMONIALES')) {
    tipoActoDetectado = { codigo: '86', descripcion: 'CAPITULACIONES MATRIMONIALES' };
  } else if (upperText.includes('LIQUIDACI') && upperText.includes('CONYUGAL')) {
    tipoActoDetectado = { codigo: '87', descripcion: 'LIQUIDACION DE SOCIEDAD CONYUGAL' };
  } else if (upperText.includes('PARTICI') && upperText.includes('BIENES')) {
    tipoActoDetectado = { codigo: '88', descripcion: 'PARTICION DE BIENES' };
  } else if (upperText.includes('ADJUDICACI')) {
    tipoActoDetectado = { codigo: '89', descripcion: 'ADJUDICACION DE INMUEBLES' };
  } else if (upperText.includes('CESI[OÓ]N') && upperText.includes('HERENCIALES')) {
    tipoActoDetectado = { codigo: '90', descripcion: 'CESION DE DERECHOS HERENCIALES' };
  } else if (upperText.includes('PATRIMONIO FAMILIAR')) {
    tipoActoDetectado = { codigo: '91', descripcion: 'CONSTITUCION DE PATRIMONIO FAMILIAR' };
  } else if (upperText.includes('HIPOTECA')) {
    tipoActoDetectado = { codigo: '92', descripcion: 'HIPOTECA ABIERTA' };
  }

  // Cuantía principal (monto más grande generalmente es el precio)
  const cuantia = montos.length > 0 ? Math.max(...montos) : null;

  // Avalúo municipal
  let avaluo = null;
  const avaluoMatch = precioText.match(/aval[uú]o[^$\d]*(?:USD?\s*\$?\s*|US\s*\$\s*|\$\s*)([\d.,]+)/i);
  if (avaluoMatch) {
    avaluo = parseMontoStr(avaluoMatch[1]);
  }

  return {
    cedulas: [...cedulas],
    rucs: [...rucs],
    montos,
    cuantia,
    avaluo,
    emails,
    telefonos: [...telefonos],
    tipoActoDetectado,
    sections,
    comparecientesText,
    precioText,
  };
}

// ── Gemini Extraction (Phase 2) ──────────────────────────────────

const MINUTA_PROMPT = `Eres un experto en documentos notariales ecuatorianos. Analiza el siguiente fragmento de una minuta notarial y extrae los datos en formato JSON.

INSTRUCCIONES:
- Extrae TODOS los comparecientes con sus datos
- Identifica claramente quién es vendedor/comprador (o prominente vendedor/comprador en promesas)
- Las cédulas pueden aparecer como números o escritas en letras
- Los montos pueden estar en letras o números
- Si un dato no aparece, usa null
- Responde SOLO con JSON válido, sin texto adicional

FORMATO JSON REQUERIDO:
{
  "tipoActo": "COMPRAVENTA DE INMUEBLES",
  "codigoActo": "73",
  "comparecientes": [
    {
      "nombres": "NOMBRE1 NOMBRE2",
      "apellidos": "APELLIDO1 APELLIDO2",
      "cedula": "1234567890",
      "estadoCivil": "CASADO",
      "nacionalidad": "ECUATORIANA",
      "profesion": "ABOGADO",
      "domicilio": "Quito, calle tal...",
      "telefono": "0991234567",
      "correo": "email@ejemplo.com",
      "calidad": "VENDEDOR",
      "actuaPor": "PROPIOS_DERECHOS",
      "representadoDe": null
    }
  ],
  "cuantia": 145000.00,
  "avaluoMunicipal": 77456.60,
  "tipoBien": "TER",
  "descripcionBien": "Departamento Duplex 506 del Edificio Vitoria...",
  "formaPago": [
    { "tipo": "TRANSFERENCIA", "monto": 1500.00, "detalle": "Banco Pichincha" },
    { "tipo": "CHEQUE", "monto": 143500.00, "detalle": "Cheque 3740 Banco Pichincha" }
  ]
}

CODIGOS DE TIPO ACTO:
73=COMPRAVENTA INMUEBLES, 74=COMPRAVENTA VEHICULOS, 75=DONACION INMUEBLES,
76=DONACION VEHICULOS, 77=PERMUTA INMUEBLES, 78=PERMUTA VEHICULOS,
79=DACION EN PAGO INMUEBLES, 80=DACION EN PAGO VEHICULOS,
81=APORTE SOCIEDAD INMUEBLES, 82=APORTE SOCIEDAD VEHICULOS,
83=FIDEICOMISO INMUEBLES, 84=FIDEICOMISO VEHICULOS,
85=PROMESA COMPRAVENTA INMUEBLES, 86=CAPITULACIONES MATRIMONIALES,
87=LIQUIDACION SOCIEDAD CONYUGAL, 88=PARTICION DE BIENES,
89=ADJUDICACION INMUEBLES, 90=CESION DERECHOS HERENCIALES,
91=PATRIMONIO FAMILIAR, 92=HIPOTECA ABIERTA, 93=OTROS

CODIGOS TIPO BIEN: CAS=Casa, DEP=Departamento, TER=Terreno, EDI=Edificio, OFI=Oficina, VEH=Vehiculo, EMB=Embarcacion, OTR=Otro

CALIDADES: VENDEDOR, COMPRADOR, DONANTE, DONATARIO, PERMUTANTE, PROMITENTE_VENDEDOR, PROMITENTE_COMPRADOR, CEDENTE, CESIONARIO, ADJUDICATARIO, OTRO

ACTUA POR: PROPIOS_DERECHOS, APODERADO_GENERAL, APODERADO_ESPECIAL, REPRESENTANTE_LEGAL, REPRESENTANTE_MENOR

FRAGMENTO DE MINUTA:
`;

/**
 * Extrae datos semánticos con Gemini.
 * Solo envía las secciones relevantes (comparecientes + precio).
 */
async function extractWithGemini(comparecientesText, precioText) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('⚠️  GOOGLE_API_KEY no configurada, omitiendo extracción Gemini');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Limitar texto para mantener tokens bajos
    const inputText = [
      'SECCION COMPARECIENTES:',
      comparecientesText.substring(0, 4000),
      '',
      'SECCION PRECIO Y FORMA DE PAGO:',
      precioText.substring(0, 2000),
    ].join('\n');

    const prompt = MINUTA_PROMPT + inputText;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 30000)
      ),
    ]);

    const response = await result.response;
    const text = response.text();

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Gemini no retornó JSON válido');
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error en extracción Gemini:', error?.message || error);
    return null;
  }
}

// ── Main Parser ──────────────────────────────────────────────────

/**
 * Extrae texto de un archivo .docx
 * @param {Buffer} buffer - Contenido del archivo .docx
 * @returns {Promise<string>} Texto extraído
 */
export async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Parsea una minuta completa: regex + Gemini.
 * @param {Buffer} docxBuffer - Archivo .docx como Buffer
 * @param {Object} options
 * @param {boolean} [options.useGemini=true] - Si se debe usar Gemini
 * @returns {Promise<Object>} Datos extraídos
 */
export async function parseMinuta(docxBuffer, { useGemini = true } = {}) {
  // 1. Extraer texto del .docx
  const fullText = await extractTextFromDocx(docxBuffer);

  if (!fullText || fullText.trim().length < 100) {
    throw new Error('No se pudo extraer texto del documento. Verifique que sea un archivo .docx válido.');
  }

  // 2. Fase 1: Regex
  const regexData = extractWithRegex(fullText);

  // 3. Fase 2: Gemini (si está habilitado y configurado)
  let geminiData = null;
  if (useGemini && process.env.GOOGLE_API_KEY) {
    geminiData = await extractWithGemini(
      regexData.comparecientesText,
      regexData.precioText
    );
  }

  // 4. Combinar resultados (Gemini prevalece sobre regex para datos semánticos)
  const combined = mergeResults(regexData, geminiData);

  return {
    ...combined,
    textoCompleto: fullText,
    regexRaw: regexData,
    geminiRaw: geminiData,
    fuente: geminiData ? 'regex+gemini' : 'regex',
  };
}

/**
 * Combina resultados de regex y Gemini.
 * Gemini aporta la semántica (quién es quién), regex aporta datos mecánicos.
 */
function mergeResults(regexData, geminiData) {
  if (!geminiData) {
    // Solo regex: retornar lo que se pudo extraer
    return {
      tipoActo: regexData.tipoActoDetectado?.descripcion || null,
      codigoActo: regexData.tipoActoDetectado?.codigo || null,
      comparecientes: regexData.cedulas.map(cedula => ({
        cedula,
        nombres: null,
        apellidos: null,
        estadoCivil: null,
        nacionalidad: null,
        profesion: null,
        domicilio: null,
        telefono: null,
        correo: null,
        calidad: null,
        actuaPor: null,
        representadoDe: null,
      })),
      cuantia: regexData.cuantia,
      avaluoMunicipal: regexData.avaluo,
      tipoBien: null,
      descripcionBien: null,
      formaPago: [],
      emails: regexData.emails,
      telefonos: regexData.telefonos,
    };
  }

  // Gemini disponible: usar sus datos, enriquecer con regex si falta algo
  const result = {
    tipoActo: geminiData.tipoActo || regexData.tipoActoDetectado?.descripcion || null,
    codigoActo: geminiData.codigoActo || regexData.tipoActoDetectado?.codigo || null,
    comparecientes: geminiData.comparecientes || [],
    cuantia: geminiData.cuantia || regexData.cuantia,
    avaluoMunicipal: geminiData.avaluoMunicipal || regexData.avaluo,
    tipoBien: geminiData.tipoBien || null,
    descripcionBien: geminiData.descripcionBien || null,
    formaPago: geminiData.formaPago || [],
    emails: regexData.emails,
    telefonos: regexData.telefonos,
  };

  // Enriquecer comparecientes de Gemini con datos de regex (emails, teléfonos)
  // si Gemini no los capturó
  for (const comp of result.comparecientes) {
    if (!comp.correo && regexData.emails.length > 0) {
      // Intentar asociar por posición (heurística simple)
      const idx = result.comparecientes.indexOf(comp);
      if (idx < regexData.emails.length) {
        comp.correo = regexData.emails[idx];
      }
    }
    if (!comp.telefono && regexData.telefonos.length > 0) {
      const idx = result.comparecientes.indexOf(comp);
      if (idx < regexData.telefonos.length) {
        comp.telefono = regexData.telefonos[idx];
      }
    }
    // Limpiar cédula (remover guiones)
    if (comp.cedula) {
      comp.cedula = comp.cedula.replace(/-/g, '');
    }
  }

  return result;
}

export default {
  parseMinuta,
  extractTextFromDocx,
  extractWithRegex,
};
