// Motor de templates inteligentes para extractos de referencia
// - Carga template base desde data/templates
// - Resuelve variables dinámicas con lógica gramatical (8 pasos)
// - Soporta módulos por tipo de trámite (p.ej., poder)

import fs from 'fs/promises'
import path from 'path'
import PdfExtractorService from '../pdf-extractor-service.js'

const ROOT_DIR = path.resolve(process.cwd(), 'backend', 'src', 'data', 'extractos-referencia')
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates')
const CONFIG_DIR = path.join(ROOT_DIR, 'config')

async function loadJsonConfig(file) {
  const p = path.join(CONFIG_DIR, file)
  const raw = await fs.readFile(p, 'utf8')
  return JSON.parse(raw)
}

// Utilidades comunes
const humanJoin = (arr) => {
  const list = (arr || []).filter(Boolean)
  if (list.length <= 1) return list[0] || ''
  if (list.length === 2) return `${list[0]} y ${list[1]}`
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`
}

const toUpper = (s) => String(s || '').toUpperCase()

// Heurística de género para personas naturales (nombres comunes en Ecuador)
const isFemaleName = (full) => {
  const first = String(full || '').trim().toUpperCase().split(/\s+/)[0] || ''
  const tokens = String(full || '').trim().toUpperCase().split(/\s+/)
  const femaleList = new Set([
    'MARIA','ANA','ROSA','ELENA','FERNANDA','LUISA','VALERIA','CAMILA','GABRIELA','SOFIA','ISABEL','PATRICIA','VERONICA','SUSAN','MAGDALENA','CARMEN','TERESA','BEATRIZ','ELIZABETH','ELIZABET','NOELIA','PAULA','PAOLA','MERCEDES','PILAR','GUADALUPE'
  ])
  if (femaleList.has(first)) return true
  if (tokens.some(t => femaleList.has(t))) return true
  return /A$/.test(first)
}

function detectNaturalGender(name) {
  const up = String(name || '').toUpperCase()
  // Intentar reordenar para tener primero el nombre de pila
  const reordered = PdfExtractorService.reorderName(up)
  const first = String(reordered || '').trim().split(/\s+/)[0] || ''
  const maleList = new Set([
    'JOSE','JUAN','CARLOS','DANIEL','MIGUEL','DIEGO','ANDRES','LUIS','PEDRO','PABLO','FRANCISCO','JAVIER','FERNANDO','ROBERTO','WILLIAM','STALIN','IGNACIO','ENRIQUE','EDUARDO','ANTONIO','RAFAEL','RICARDO','ALFREDO','MARCO','OSCAR','GUSTAVO'
  ])
  if (maleList.has(first)) return 'M'
  return isFemaleName(reordered) ? 'F' : 'M'
}

// Heurística para empresas (fem/masc) según palabras clave
function companyGender(nameUpper, empresasCfg) {
  const txt = String(nameUpper || '').toUpperCase()
  const femKeys = (empresasCfg?.femeninas || []).map(toUpper)
  const mascKeys = (empresasCfg?.masculinos || []).map(toUpper)
  const hasAny = (keys) => keys.some(k => txt.includes(k))
  if (hasAny(femKeys)) return 'F'
  if (hasAny(mascKeys)) return 'M'
  // Por defecto la mayoría de sociedades se tratan en femenino (la compañía)
  return 'F'
}

// Reordenar apellidos/nombres cuando vienen como "APELLIDOS NOMBRES"
function normalizeName(name) {
  const up = String(name || '').replace(/\s+/g, ' ').trim().toUpperCase()
  const tokens = up.split(' ').filter(Boolean)
  if (tokens.length === 0) return ''
  const given = new Set([
    'MARIA','ANA','ROSA','ELENA','FERNANDA','LUISA','VALERIA','CAMILA','GABRIELA','SOFIA','ISABEL','PATRICIA','VERONICA','SUSAN','MAGDALENA','CARMEN','TERESA','BEATRIZ','ELIZABETH','ELIZABET','NOELIA','PAULA','PAOLA','MERCEDES','PILAR','GUADALUPE',
    'JOSE','JUAN','CARLOS','DANIEL','MIGUEL','DIEGO','ANDRES','LUIS','PEDRO','PABLO','FRANCISCO','JAVIER','FERNANDO','ROBERTO','WILLIAM','STALIN','IGNACIO','MARCO','ENRIQUE','EDUARDO','ANTONIO','RAFAEL','RICARDO','ALFREDO'
  ])
  // Si el primer token luce como nombre de pila conocido → no reordenar
  if (given.has(tokens[0])) return up
  // Si los dos primeros tokens lucen ambos como nombres → no reordenar
  if (tokens.length > 1 && given.has(tokens[0]) && given.has(tokens[1])) return up
  // Si el último token es nombre conocido → probablemente está "APELLIDOS NOMBRES" → reordenar
  return PdfExtractorService.reorderName(up)
}

// 1) Extraer datos (acto, otorgantes, beneficiarios)
function extractCoreAct(data) {
  const act = Array.isArray(data?.actos) && data.actos.length ? data.actos[0] : null
  const tipoActo = PdfExtractorService.cleanActType(act?.tipo || data?.tipoActo || '')
  const otorgantes = (act?.otorgantes || []).map(o => ({ ...o }))
  const beneficiarios = (act?.beneficiarios || []).map(b => ({ ...b }))
  return { tipoActo, otorgantes, beneficiarios }
}

// 2) Determinar tipos y género
function enrichRoles(otorgantes, beneficiarios, reglasGenero) {
  const empresasCfg = reglasGenero?.empresas || {}
  const enrichOne = (p) => {
    const tipo = (p?.tipo_persona || p?.tipoPersona || '').toUpperCase()
    const isJuridica = /JUR[IÍ]DICA/.test(tipo)
    const isNatural = /NATURAL/.test(tipo) || !isJuridica
    let genero
    if (isJuridica) {
      genero = companyGender(p?.nombre, empresasCfg) // 'F' | 'M'
    } else {
      genero = detectNaturalGender(p?.nombre)
    }
    return { ...p, _tipo: isJuridica ? 'JURIDICA' : 'NATURAL', _genero: genero }
  }
  return {
    otorgantes: (otorgantes || []).map(enrichOne),
    beneficiarios: (beneficiarios || []).map(enrichOne)
  }
}

// 3) Conjugar verbos (otorga/otorgan)
function verboOtorgar(otorgantes) {
  const n = (otorgantes || []).length
  return n === 1 ? 'otorga' : 'otorgan'
}

// 4) Tratamientos según grupo
function tratamientoGrupo(personas, rol, reglasGenero) {
  const n = (personas || []).length
  if (n === 0) return ''
  const allJ = personas.every(p => p._tipo === 'JURIDICA')
  const allN = personas.every(p => p._tipo === 'NATURAL')
  if (n === 1) {
    const p = personas[0]
    if (p._tipo === 'NATURAL') return p._genero === 'F' ? 'la señora' : 'el señor'
    // Jurídica
    return p._genero === 'F' ? 'la compañía' : 'el'
  }
  // Plural
  if (allJ) {
    // Si todas son empresas, usar "las compañías" (común) o "los" para masculinas
    // Usar femenino como default para grupos de empresas
    const anyMasc = personas.some(p => p._genero === 'M')
    return anyMasc ? 'las compañías' : 'las compañías'
  }
  // Para humanos
  const femCount = personas.filter(p => p._genero === 'F' && p._tipo === 'NATURAL').length
  const mascCount = personas.filter(p => p._genero === 'M' && p._tipo === 'NATURAL').length
  if (allN) {
    if (mascCount > 0 && femCount > 0) return 'los señores'
    if (mascCount > 0) return 'los señores'
    return 'las señoras'
  }
  // Mixto empresa + naturales → optar por plurales masculinos neutros en humano
  return 'los señores'
}

// Variante sin artículo para usar después de "a / a favor de"
function sustantivoGrupo(personas) {
  const n = (personas || []).length
  if (n === 0) return ''
  const allJ = personas.every(p => p._tipo === 'JURIDICA')
  const allN = personas.every(p => p._tipo === 'NATURAL')
  if (n === 1) {
    const p = personas[0]
    if (p._tipo === 'NATURAL') return p._genero === 'F' ? 'señora' : 'señor'
    return p._genero === 'F' ? 'compañía' : 'ente'
  }
  if (allJ) return 'compañías'
  if (allN) {
    const femCount = personas.filter(p => p._genero === 'F').length
    const mascCount = personas.filter(p => p._genero === 'M').length
    if (mascCount > 0 && femCount > 0) return 'señores'
    if (mascCount > 0) return 'señores'
    return 'señoras'
  }
  return 'señores'
}

// 5) Conjunción de nombres
function nombresConjuncion(personas, opts = {}) {
  const names = (personas || []).map(p => p._tipo === 'JURIDICA' ? String(p?.nombre || '').toUpperCase().replace(/\s+/g, ' ').trim() : normalizeName(p?.nombre))
  return humanJoin(names)
}

// 6) Frase de representación condicional
function fraseRepresentacion(otorgantes, reglasGenero) {
  // Solo aplica cuando hay jurídicos con representante(s)
  const juridicos = (otorgantes || []).filter(o => o._tipo === 'JURIDICA')
  if (juridicos.length === 0) return ''

  // Recolectar representantes desde otorgantes: admitir uno o array
  const reps = []
  for (const o of juridicos) {
    const r = o?.representante || o?.representantes || null
    if (!r) continue
    if (Array.isArray(r)) reps.push(...r)
    else reps.push(r)
  }
  if (reps.length === 0) return ''

  // En plural/singular según cantidad de JURÍDICAS
  const femJuris = juridicos.some(j => j._genero === 'F')
  const mascJuris = juridicos.some(j => j._genero === 'M')
  const manyJuris = juridicos.length > 1
  let verbo = 'representada'
  if (manyJuris) verbo = (mascJuris && femJuris) ? 'representados' : (femJuris ? 'representadas' : 'representados')

  // Construir tratamientos para representantes
  const repObjs = reps.map((nombre) => {
    const f = isFemaleName(nombre)
    return { nombre: normalizeName(nombre), genero: f ? 'F' : 'M' }
  })
  const tratSing = (g) => g === 'F' ? 'la señora' : 'el señor'
  let texto
  if (repObjs.length === 1) {
    const r = repObjs[0]
    texto = ` ${verbo} por ${tratSing(r.genero)} **${r.nombre}**`
  } else {
    // Varios representantes → unir con conjunción
    const tratados = repObjs.map(r => `${tratSing(r.genero)} **${r.nombre}**`)
    texto = ` ${verbo} por ${humanJoin(tratados)}`
    // Si número de reps == número de jurídicas y > 1, agregar 'respectivamente'
    if (repObjs.length === juridicos.length) texto += ' respectivamente'
  }
  return texto ? (texto + ',') : ''
}

// 7) Contracción de artículos en tramo "a (favor de) ..."
// - Si hay representación → usar "a la/al/a los/a las"
// - Si NO hay representación → usar "a favor de la/del/de los/de las"
function contraccionAFavor(beneficiarios, tieneRepresentacion) {
  const n = (beneficiarios || []).length
  if (n === 0) return ''
  const allNat = beneficiarios.every(b => b._tipo === 'NATURAL')
  const femCount = beneficiarios.filter(b => b._genero === 'F').length
  const mascCount = beneficiarios.filter(b => b._genero === 'M').length

  if (tieneRepresentacion) {
    if (n === 1) {
      const b = beneficiarios[0]
      if (b._tipo === 'NATURAL') return b._genero === 'F' ? 'a la' : 'al'
      // Jurídica
      return b._genero === 'F' ? 'a la' : 'al'
    }
    // plural
    if (mascCount > 0 && femCount > 0) return 'a los'
    if (mascCount > 0) return 'a los'
    return 'a las'
  }
  // Sin representación → usar 'a favor de' + contracción de/de la/del/de los/de las
  if (n === 1) {
    const b = beneficiarios[0]
    if (b._tipo === 'NATURAL') return b._genero === 'F' ? 'a favor de la' : 'a favor del'
    return b._genero === 'F' ? 'a favor de la' : 'a favor del'
  }
  if (mascCount > 0 && femCount > 0) return 'a favor de los'
  if (mascCount > 0) return 'a favor de los'
  return 'a favor de las'
}

// 8) Construcción final de variables para el template
function buildVariables({ data, reglasGenero }) {
  const { tipoActo, otorgantes, beneficiarios } = extractCoreAct(data)
  const { otorgantes: ots, beneficiarios: bes } = enrichRoles(otorgantes, beneficiarios, reglasGenero)

  const VERBO_OTORGAR = verboOtorgar(ots)
  const TRATAMIENTO_OTORGANTES = tratamientoGrupo(ots, 'OTORGANTES', reglasGenero)
  const NOMBRES_OTORGANTES = nombresConjuncion(ots)
  const FRASE_REPRESENTACION = fraseRepresentacion(ots, reglasGenero)
  const tieneRep = FRASE_REPRESENTACION.trim().length > 0
  const CONTRACCION_A_FAVOR = contraccionAFavor(bes, tieneRep)
  // Para beneficiarios usamos el sustantivo sin artículo, pues la contracción lo aporta
  const TRATAMIENTO_BENEFICIARIOS = sustantivoGrupo(bes)
  const NOMBRES_BENEFICIARIOS = nombresConjuncion(bes)

  const NOMBRE_NOTARIO = (() => {
    const base = String(data?.notario || data?.notarioNombre || '').trim()
    const isSuplente = Boolean(data?.notarioSuplente)
    const full = isSuplente ? `NOTARIO(A) SUPLENTE ${base}` : base
    return String(full || '').toUpperCase()
  })()
  const NOTARIA = (() => {
    const raw = String(data?.notaria || data?.notariaNumero || '').trim()
    if (!raw) return ''
    // Sin acentos por preferencia del cliente y sin prefijos automáticos
    const upNoAccents = raw
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toUpperCase()
    return upNoAccents
  })()

  const NUMERO_COPIA = 'PRIMERA'
  const TIPO_ACTO = tipoActo

  return {
    NUMERO_COPIA,
    TIPO_ACTO,
    VERBO_OTORGAR,
    TRATAMIENTO_OTORGANTES,
    NOMBRES_OTORGANTES,
    FRASE_REPRESENTACION,
    CONTRACCION_A_FAVOR,
    TRATAMIENTO_BENEFICIARIOS,
    NOMBRES_BENEFICIARIOS,
    NOMBRE_NOTARIO,
    NOTARIA
  }
}

function renderWithVariables(tpl, vars) {
  let out = String(tpl)
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`\\{\\{${k}\\}\\}`, 'g')
    out = out.replace(re, String(v ?? ''))
  }
  return out
}

async function loadTemplateContent(templateFilename) {
  const p = path.join(TEMPLATES_DIR, templateFilename)
  return fs.readFile(p, 'utf8')
}

// API pública
const ExtractoTemplateEngine = {
  // Render genérico desde un template y datos de input (estructura de inputs/*.json)
  async render(templateFile, data, overrides = {}) {
    const reglasGenero = await loadJsonConfig('reglas-genero.json')
    const tpl = await loadTemplateContent(templateFile)
    const base = buildVariables({ data, reglasGenero })
    const vars = { ...base, ...overrides }
    return { text: renderWithVariables(tpl, vars), variables: vars }
  },
  // Render "poder universal" (alias)
  async renderPoderUniversal(data, overrides = {}) {
    return this.render('poder-universal.txt', data, overrides)
  }
}

export default ExtractoTemplateEngine
