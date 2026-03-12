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

// Prefijo de teléfono móvil Ecuador (09XX) — seguro que NO es cédula
const TELEFONO_MOVIL_RE = /^09\d{8}$/;

// Tipo de bien — detectar por palabras clave en antecedentes/objeto
const TIPO_BIEN_PATTERNS = [
  { re: /\bDEPARTAMENTO\b/i, codigo: 'DEP', descripcion: 'Departamento' },
  { re: /\bCASA\b/i, codigo: 'CAS', descripcion: 'Casa' },
  { re: /\bLOTE\s+(?:DE\s+)?TERRENO\b/i, codigo: 'TER', descripcion: 'Terreno' },
  { re: /\bTERRENO\b/i, codigo: 'TER', descripcion: 'Terreno' },
  { re: /\bEDIFICIO\b/i, codigo: 'EDI', descripcion: 'Edificio' },
  { re: /\bOFICINA\b/i, codigo: 'OFI', descripcion: 'Oficina' },
  { re: /\bVEH[IÍ]CULO\b/i, codigo: 'VEH', descripcion: 'Vehiculo' },
  { re: /\bEMBARCACI[OÓ]N\b/i, codigo: 'EMB', descripcion: 'Embarcacion' },
];

// Forma de pago — detectar tipo por palabras clave (orden: más específico primero)
const FORMA_PAGO_PATTERNS = [
  { re: /\btransferencia\s+bancaria\b/i, tipo: 'TRANSFERENCIA' },
  { re: /\btransferencia\b/i, tipo: 'TRANSFERENCIA' },
  { re: /\bcheque\s+certificado\b/i, tipo: 'CHEQUE' },
  { re: /\bcheque\b/i, tipo: 'CHEQUE' },
  { re: /\bdep[oó]sito\b/i, tipo: 'DEPOSITO' },
  { re: /\bcr[eé]dito\s+hipotecario\b/i, tipo: 'CREDITO_HIPOTECARIO' },
  { re: /\bhipoteca(?:rio)?\b/i, tipo: 'CREDITO_HIPOTECARIO' },
  { re: /\bfinanciamiento\b/i, tipo: 'CREDITO_HIPOTECARIO' },
  { re: /\bpr[eé]stamo\b/i, tipo: 'CREDITO_HIPOTECARIO' },
  { re: /\ba\s+cr[eé]dito\b/i, tipo: 'CREDITO_HIPOTECARIO' },
  { re: /\bdinero\s+en\s+efectivo\b/i, tipo: 'EFECTIVO' },
  { re: /\ben\s+(?:dinero\s+)?efectivo\b/i, tipo: 'EFECTIVO' },
  { re: /\bespecie\s+monetaria\b/i, tipo: 'EFECTIVO' },
  { re: /\banticipo\b/i, tipo: 'EFECTIVO' },
  { re: /\befectivo\b/i, tipo: 'EFECTIVO' },
  { re: /\bal?\s+contado\b/i, tipo: 'EFECTIVO' },
  { re: /\bletra\s+de\s+cambio\b/i, tipo: 'OTRO' },
  { re: /\bpagar[eé]\b/i, tipo: 'OTRO' },
  { re: /\bcompensaci[oó]n\b/i, tipo: 'OTRO' },
];

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

  // Ordinales compuestos primero (más específicos), luego simples
  const clauseNames = [
    'D[EÉ]CIMA\\s*SEXTA', 'D[EÉ]CIMA\\s*QUINTA', 'D[EÉ]CIMA\\s*CUARTA',
    'D[EÉ]CIMA\\s*TERCERA', 'D[EÉ]CIMA\\s*SEGUNDA', 'D[EÉ]CIMA\\s*PRIMERA',
    'D[EÉ]CIMA', 'NOVENA', 'OCTAVA', 'S[EÉ]PTIMA', 'SEXTA',
    'QUINTA', 'CUARTA', 'TERCERA', 'SEGUNDA', 'PRIMERA',
  ];

  // Soporta prefijo opcional "CLÁUSULA" / "CLAUSULA"
  const clausePattern = new RegExp(
    `(?:CL[AÁ]USULA\\s+)?(${clauseNames.join('|')})\\s*[.:\\-–—]+\\s*`,
    'gi'
  );

  const matches = [...normalized.matchAll(clausePattern)];

  // Ordenar por posición en el texto (matchAll ya lo hace, pero por seguridad)
  matches.sort((a, b) => a.index - b.index);

  for (let i = 0; i < matches.length; i++) {
    const rawName = matches[i][1].toUpperCase()
      .replace(/É/g, 'E')
      .replace(/\s+/g, '_');
    // Evitar duplicados: si ya existe la sección, usar la primera ocurrencia
    if (sections[rawName]) continue;
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    sections[rawName] = normalized.substring(start, end).trim();
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
 * Identifica las secciones de antecedentes y objeto (SEGUNDA + TERCERA).
 * Aquí se describe el bien inmueble: tipo, ubicación, linderos, superficie.
 */
function getAntecedentesObjetoText(sections, fullText) {
  const parts = [];

  if (sections.SEGUNDA) {
    parts.push(sections.SEGUNDA);
  }
  if (sections.TERCERA) {
    parts.push(sections.TERCERA);
  }

  if (parts.length > 0) return parts.join('\n');

  // Fallback: buscar "ANTECEDENTES" en texto completo
  const antIdx = fullText.toUpperCase().indexOf('ANTECEDENTES');
  if (antIdx >= 0) {
    return fullText.substring(antIdx, antIdx + 5000);
  }

  return '';
}

/**
 * Extrae tipo de bien por regex desde texto de antecedentes/objeto.
 */
function detectTipoBien(antecedentesText) {
  if (!antecedentesText) return null;
  const upper = antecedentesText.toUpperCase();
  for (const pat of TIPO_BIEN_PATTERNS) {
    if (pat.re.test(upper)) {
      return { codigo: pat.codigo, descripcion: pat.descripcion };
    }
  }
  return null;
}

/**
 * Extrae descripción del bien desde antecedentes/objeto.
 * Busca el fragmento que describe el inmueble concreto.
 */
function detectDescripcionBien(antecedentesText) {
  if (!antecedentesText) return null;

  // Patrón: capturar desde tipo de bien concreto hasta próximo punto final o cláusula
  const patterns = [
    // "un LOTE de terreno signado con el número 5, que forma parte de..."
    /(?:un\s+)?LOTE\s+(?:DE\s+)?TERRENO[^.]*?(?:Parroquia|Cant[oó]n|Provincia|ubicad)[^.]{0,200}/i,
    // "DEPARTAMENTO 5F, NIVEL 14.41... QUE FORMA PARTE DEL EDIFICIO..."
    /DEPARTAMENTO\s+\w+[^.]*?(?:EDIFICIO|CONJUNTO|PARROQUIA|QUE\s+FORMA\s+PARTE)[^.]{0,200}/i,
    // "inmueble consistente en DEPARTAMENTO 5F..."
    /inmueble\s+consistente\s+en\s+[^.]{10,300}/i,
    // Fallback simple: tipo de bien + hasta 200 chars
    /(?:un\s+)?(?:LOTE\s+(?:DE\s+)?TERRENO|DEPARTAMENTO|CASA|OFICINA)\s+[^.]{10,200}/i,
  ];

  for (const re of patterns) {
    const match = antecedentesText.match(re);
    if (match) {
      return match[0].trim().substring(0, 300);
    }
  }

  return null;
}

/**
 * Extrae forma de pago por regex desde texto de precio.
 * Busca bloques con monto USD y tipo de pago en contexto cercano.
 * Fallback: si no encuentra montos con tipo, busca tipos de pago sin monto.
 */
function detectFormaPago(precioText) {
  if (!precioText) return [];
  const pagos = [];

  // Buscar cada monto USD con su contexto (300 chars alrededor)
  const montoMatches = [...precioText.matchAll(MONTO_RE)];

  for (const mm of montoMatches) {
    const monto = parseMontoStr(mm[1]);
    if (isNaN(monto) || monto <= 0) continue;

    // Contexto: 300 chars antes y después del monto
    const start = Math.max(0, mm.index - 300);
    const end = Math.min(precioText.length, mm.index + mm[0].length + 300);
    const contexto = precioText.substring(start, end);

    // Detectar tipo de pago en el contexto cercano
    let tipo = null;
    for (const pat of FORMA_PAGO_PATTERNS) {
      if (pat.re.test(contexto)) {
        tipo = pat.tipo;
        break;
      }
    }

    // Solo registrar si encontramos un tipo de pago explícito
    if (tipo) {
      const bancoMatch = contexto.match(/(?:Banco|BANCO)\s+[\w]+(?:\s+(?:de[l]?\s+)?[\w]+)*/i);
      pagos.push({
        tipo,
        monto,
        detalle: bancoMatch ? bancoMatch[0].trim() : null,
      });
    }
  }

  // Fallback: si no se encontraron pagos con monto, buscar tipos de pago mencionados en el texto
  if (pagos.length === 0) {
    for (const pat of FORMA_PAGO_PATTERNS) {
      if (pat.re.test(precioText)) {
        const bancoMatch = precioText.match(/(?:Banco|BANCO)\s+[\w]+(?:\s+(?:de[l]?\s+)?[\w]+)*/i);
        pagos.push({
          tipo: pat.tipo,
          monto: null,
          detalle: bancoMatch ? bancoMatch[0].trim() : null,
        });
        break; // Solo el tipo de pago más relevante (primero en la lista de prioridad)
      }
    }
  }

  // Deduplicar: mismo tipo + mismo monto = mismo pago mencionado varias veces
  const seen = new Set();
  return pagos.filter(p => {
    const key = `${p.tipo}-${p.monto}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Identifica la sección de precio/cuantía/forma de pago.
 * Combina todas las secciones relevantes para no perder datos.
 */
function getPrecioText(sections, fullText) {
  const keywords = ['PRECIO', 'CUANT', 'FORMA DE PAGO', 'FORMA_DE_PAGO'];
  const parts = [];

  // Buscar en claves y valores de secciones
  for (const [key, value] of Object.entries(sections)) {
    const upper = (key + ' ' + value).toUpperCase();
    if (keywords.some(kw => upper.includes(kw))) {
      parts.push(value);
    }
  }

  if (parts.length > 0) return parts.join('\n\n');

  // Fallback: buscar directamente en texto completo
  const upperFull = fullText.toUpperCase();
  for (const kw of ['PRECIO', 'FORMA DE PAGO', 'CUANTIA', 'CUANTÍA']) {
    const idx = upperFull.indexOf(kw);
    if (idx >= 0) {
      return fullText.substring(Math.max(0, idx - 200), idx + 3000);
    }
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
  const antecedentesObjetoText = getAntecedentesObjetoText(sections, text);

  // Cédulas (filtrar teléfonos móviles y números no válidos)
  const cedulas = new Set();
  const allCedulaMatches = [
    ...text.matchAll(CEDULA_PAREN_RE),
    ...text.matchAll(CEDULA_RE),
  ];
  for (const m of allCedulaMatches) {
    const clean = m[1].replace(/-/g, '');
    if (clean.length !== 10 || !/^\d+$/.test(clean)) continue;
    // Filtrar teléfonos móviles (09XX — estos NUNCA son cédulas)
    if (TELEFONO_MOVIL_RE.test(clean)) continue;
    // Cédula ecuatoriana: primeros 2 dígitos = provincia (01-24) o 30 (extranjeros)
    const prov = parseInt(clean.substring(0, 2), 10);
    if (prov < 1 || (prov > 24 && prov !== 30)) continue;
    // Filtrar por contexto: cuentas bancarias, repertorios, teléfonos
    const idx = text.indexOf(m[0]);
    if (idx >= 0) {
      const before = text.substring(Math.max(0, idx - 80), idx).toLowerCase();
      if (/(?:cuenta|repertorio|inscri(?:ta|to)|nro\.|número de cuenta)/i.test(before)) continue;
      if (/(?:tel[eé]fono|celular|tel\.)\s*$/i.test(before.trim())) continue;
    }
    cedulas.add(clean);
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

  // Advertencias de parseo (feedback para el matrizador)
  const advertencias = [];

  // Detectar posibles cédulas malformadas:
  // 1. Con guión y total != 10 dígitos (ej: "17192122-9" = 9 dígitos)
  const cedulasConGuion = [...text.matchAll(/c[eé]dula[^.]{0,40}?(\d{7,9}[-]\d{1,2})/gi)];
  for (const m of cedulasConGuion) {
    const raw = m[1];
    const clean = raw.replace(/-/g, '');
    if (clean.length !== 10) {
      advertencias.push({
        campo: 'cedula',
        mensaje: `Posible cedula malformada: "${raw}" (${clean.length} digitos, se esperan 10). Verifique el documento original.`,
        valor: raw,
      });
    }
  }

  // 2. Sin guión: números de 9 u 11 dígitos cerca de "cédula" (posible error de digitación)
  // Excluir los que son seguidos de guión+dígito (ya capturados en paso 1)
  const cedulasCercanas = [...text.matchAll(/c[eé]dula[^.]{0,40}?(\d{9}|\d{11})(?![\d-])/gi)];
  for (const m of cedulasCercanas) {
    const raw = m[1];
    // Evitar falsos positivos: no advertir si es substring de una cédula válida
    const esSubstring = [...cedulas].some(c => c.includes(raw) || raw.includes(c));
    if (!esSubstring) {
      advertencias.push({
        campo: 'cedula',
        mensaje: `Posible cedula malformada: "${raw}" (${raw.length} digitos, se esperan 10). Verifique el documento original.`,
        valor: raw,
      });
    }
  }

  // 3. Números de 9 u 11 dígitos cerca de "identificación" o "identidad"
  const idCercanas = [...text.matchAll(/identifica(?:ci[oó]n|d)[^.]{0,40}?(\d{9}|\d{11})(?![\d-])/gi)];
  for (const m of idCercanas) {
    const raw = m[1];
    const esSubstring = [...cedulas].some(c => c.includes(raw) || raw.includes(c));
    if (!esSubstring) {
      const yaAdvertido = advertencias.some(a => a.valor === raw);
      if (!yaAdvertido) {
        advertencias.push({
          campo: 'cedula',
          mensaje: `Posible cedula malformada: "${raw}" (${raw.length} digitos, se esperan 10). Verifique el documento original.`,
          valor: raw,
        });
      }
    }
  }

  // Advertir si se detectaron muy pocas cédulas vs comparecientes esperados
  if (cedulas.size === 0 && comparecientesText.length > 100) {
    advertencias.push({
      campo: 'cedula',
      mensaje: 'No se detectaron cedulas en el documento. Verifique que la minuta contenga numeros de cedula.',
      valor: null,
    });
  }

  // Cuantía principal (monto más grande generalmente es el precio)
  const cuantia = montos.length > 0 ? Math.max(...montos) : null;

  // Avalúo municipal
  let avaluo = null;
  const avaluoMatch = precioText.match(/aval[uú]o[^$\d]*(?:USD?\s*\$?\s*|US\s*\$\s*|\$\s*)([\d.,]+)/i);
  if (avaluoMatch) {
    avaluo = parseMontoStr(avaluoMatch[1]);
  }

  // Tipo de bien (regex desde antecedentes/objeto)
  const tipoBienDetectado = detectTipoBien(antecedentesObjetoText);

  // Descripción del bien (regex desde antecedentes/objeto)
  const descripcionBienDetectada = detectDescripcionBien(antecedentesObjetoText);

  // Forma de pago (regex desde sección precio)
  const formaPagoDetectada = detectFormaPago(precioText);

  return {
    cedulas: [...cedulas],
    rucs: [...rucs],
    montos,
    cuantia,
    avaluo,
    emails,
    telefonos: [...telefonos],
    tipoActoDetectado,
    tipoBienDetectado,
    descripcionBienDetectada,
    formaPagoDetectada,
    advertencias,
    sections,
    comparecientesText,
    precioText,
    antecedentesObjetoText,
  };
}

// ── Gemini Extraction (Phase 2) ──────────────────────────────────

const MINUTA_PROMPT = `Eres un experto en documentos notariales ecuatorianos. Analiza el siguiente fragmento de una minuta notarial y extrae los datos en formato JSON.

INSTRUCCIONES:
- Extrae TODOS los comparecientes con sus datos
- Identifica claramente quién es vendedor/comprador (o prominente vendedor/comprador en promesas)
- Las cédulas pueden aparecer como números o escritas en letras
- Los montos pueden estar en letras o números
- tipoBien y descripcionBien se encuentran en la SECCION ANTECEDENTES Y OBJETO, NO en comparecientes
- formaPago: identifica CADA pago individual (anticipo, cheque, transferencia, crédito, saldo, etc.) con su monto y tipo
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
 * Envía comparecientes + antecedentes/objeto + precio.
 */
async function extractWithGemini(comparecientesText, precioText, antecedentesObjetoText) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('⚠️  GOOGLE_API_KEY no configurada, omitiendo extracción Gemini');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const inputText = [
      'SECCION COMPARECIENTES:',
      comparecientesText.substring(0, 4000),
      '',
      'SECCION ANTECEDENTES Y OBJETO (aquí se describe el bien inmueble):',
      (antecedentesObjetoText || '').substring(0, 4000),
      '',
      'SECCION PRECIO Y FORMA DE PAGO:',
      precioText.substring(0, 4000),
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
      regexData.precioText,
      regexData.antecedentesObjetoText
    );
  }

  // 4. Combinar resultados (Gemini prevalece sobre regex para datos semánticos)
  const combined = mergeResults(regexData, geminiData);

  return {
    ...combined,
    advertencias: regexData.advertencias || [],
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
      tipoBien: regexData.tipoBienDetectado?.codigo || null,
      descripcionBien: regexData.descripcionBienDetectada || null,
      formaPago: regexData.formaPagoDetectada || [],
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
    tipoBien: geminiData.tipoBien || regexData.tipoBienDetectado?.codigo || null,
    descripcionBien: geminiData.descripcionBien || regexData.descripcionBienDetectada || null,
    formaPago: (geminiData.formaPago && geminiData.formaPago.length > 0)
      ? geminiData.formaPago
      : (regexData.formaPagoDetectada || []),
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
