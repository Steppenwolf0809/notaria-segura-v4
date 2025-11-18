// Construcción genérica de frases para actos en concuerdos combinados
// - Evita hardcodear un solo caso (p.ej., poder + revocatoria)
// - Aplica reglas gramaticales mínimas por tipo

// Normaliza el tipo de acto para visualización
// - Asegura "REVOCATORIA DE ..." cuando venga como "REVOCATORIA ..."
export function normalizeActTypeForDisplay(t) {
  const raw = String(t || '').trim()
  const m = raw.match(/^REVOCATORIA(?:\s+DE)?\s+(.+)$/i)
  if (m && m[1]) return `REVOCATORIA DE ${m[1]}`.toUpperCase()
  return raw.toUpperCase()
}

function cleanTextSpaces(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ', ')
    .replace(/\s+;/g, ';')
    .trim()
}

// Valida si un nombre es válido (no es dato de ubicación, asteriscos, etc.)
function isValidPersonName(name) {
  const nameStr = String(name || '').trim()
  if (!nameStr || nameStr.length < 3) return false

  // Detectar patrones inválidos
  const invalidPatterns = [
    /^\*+$/, // Solo asteriscos
    /PROVINCIA|CANT[OÓ]N|PARROQUIA/i, // Datos de ubicación
    /QUITO.*QUITO|PICHINCHA.*PICHINCHA/i, // Ubicaciones duplicadas
    /^\d+$/, // Solo números
    /GERENTE|PRESIDENTE|REPRESENTANTE\s+LEGAL/i, // Cargos
  ]

  return !invalidPatterns.some(pattern => pattern.test(nameStr))
}

// Crea la frase de un acto a partir de las variables del engine
// v: variables devueltas por ExtractoTemplateEngine.render(...).variables
export function buildActPhrase(v) {
  const vars = v || {}
  const tipoDisplay = normalizeActTypeForDisplay(vars.TIPO_ACTO || '')
  const isRevocatoria = /REVOCATORIA/i.test(vars.TIPO_ACTO || '')

  // Partes comunes
  const tratOtorgantes = String(vars.TRATAMIENTO_OTORGANTES || '')
  const nombresOtorgantes = String(vars.NOMBRES_OTORGANTES || '')
  const fraseRepresentacion = String(vars.FRASE_REPRESENTACION || '') // incluye coma si aplica
  const contraccionAFavor = String(vars.CONTRACCION_A_FAVOR || '')
  const tratBenef = String(vars.TRATAMIENTO_BENEFICIARIOS || '')
  const nombresBenef = String(vars.NOMBRES_BENEFICIARIOS || '')

  // Validar que los nombres de beneficiarios sean válidos
  const benefNamesValid = isValidPersonName(nombresBenef)

  // Advertir si se detectan beneficiarios inválidos
  if (!benefNamesValid && nombresBenef.trim().length > 0) {
    console.warn(`⚠️ [phrase-builder] Beneficiario inválido detectado y filtrado: "${nombresBenef}"`)
  }

  const haveBenef = benefNamesValid && cleanTextSpaces(`${contraccionAFavor} ${tratBenef} ${nombresBenef}`) !== ''

  let phrase
  if (isRevocatoria) {
    // REVOCATORIA: "otorgado por ... , a favor de ..."
    const addComma = fraseRepresentacion.trim().length > 0 ? '' : ','
    const benePart = haveBenef ? ` ${contraccionAFavor} ${tratBenef} **${nombresBenef}**` : ''
    phrase = `**${tipoDisplay}** otorgado por ${tratOtorgantes} **${nombresOtorgantes}**${fraseRepresentacion}${addComma}${benePart}`
  } else {
    // Genérico por defecto: "que otorga(n) ... a favor de ..."
    const benePart = haveBenef ? ` ${contraccionAFavor} ${tratBenef} **${nombresBenef}**` : ''
    phrase = `**${tipoDisplay}** que ${vars.VERBO_OTORGAR || ''} ${tratOtorgantes} **${nombresOtorgantes}**${fraseRepresentacion}${benePart}`
  }

  return cleanTextSpaces(phrase)
}


