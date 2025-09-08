import PythonPdfClient from './python-pdf-client.js'
import UniversalPdfParser from './universal-pdf-parser.js'
import PdfExtractorService from './pdf-extractor-service.js'

function normalizeName(name) {
  return String(name || '')
    .replace(/[\t\r\f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim()
}

// Tokens de ruido comunes en extractos (alineados con Python/Node)
const STOP_TOKENS = new Set([
  'PERSONA','PERSONAS','NATURAL','JURIDICA','JURÍDICA','DOCUMENTO','IDENTIDAD','NACIONALIDAD','CALIDAD','RUC','CÉDULA','CEDULA','NUMERO','NÚMERO',
  'NOMBRES','RAZON','RAZÓN','SOCIAL','TIPO','INTERVINIENTE','BENEFICIARIO','BENEFICIARIOS','OTORGANTE','OTORGANTES','OTORGADO','BENEFICIARIOS',
  'OBJETO','OBSERVACIONES','DESCRIPCIÓN','DESCRIPCION','CUANTÍA','CUANTIA','ACTO','CONTRATO','INDETERMINADA','UBICACION','UBICACIÓN','PROVINCIA','CANTON','CANTÓN','PARROQUIA',
  'QUITO','PICHINCHA','IÑAQUITO','NA','A','FAVOR','DE','POR','SUS','PROPIOS','DERECHOS'
])

function isValidPersonName(name) {
  const n = normalizeName(name)
  if (!n || n.length < 4) return false
  const tokens = n.split(' ').filter(Boolean)
  // Al menos 2 tokens no-ruido
  const clean = tokens.filter(t => !STOP_TOKENS.has(t))
  if (clean.length < 2) return false
  // Evitar nombres que están compuestos mayoritariamente de tokens de parada
  const noiseRatio = 1 - (clean.length / tokens.length)
  if (noiseRatio > 0.4) return false
  return true
}

function jaccardSimilarity(a, b) {
  const as = new Set(normalizeName(a).split(' ').filter(Boolean))
  const bs = new Set(normalizeName(b).split(' ').filter(Boolean))
  if (as.size === 0 && bs.size === 0) return 1
  const inter = new Set([...as].filter(x => bs.has(x)))
  const union = new Set([...as, ...bs])
  return inter.size / Math.max(1, union.size)
}

function mapTipoPersona(anyTipo) {
  const up = String(anyTipo || '').toUpperCase()
  if (/JURIDICA|JURÍDICA/.test(up)) return 'Jurídica'
  return 'Natural'
}

function ensureNamesFirst(name) {
  const upper = normalizeName(name)
  if (!upper) return ''
  try {
    return PdfExtractorService.reorderName(upper)
  } catch {
    return upper
  }
}

function bestPythonName(o) {
  if (!o) return ''
  const fromFields = o?.nombre_normalizado || (o?.nombres && o?.apellidos ? `${o.nombres} ${o.apellidos}` : null) || o?.nombre
  return ensureNamesFirst(fromFields)
}

function dedupeEntities(entities, threshold = 0.6) {
  const out = []
  for (const e of entities || []) {
    const n = normalizeName(ensureNamesFirst(e?.nombre))
    if (!isValidPersonName(n)) continue
    if (!n || n.length < 3) continue
    const found = out.find(o => jaccardSimilarity(o.nombre, n) >= threshold)
    if (!found) {
      out.push({ nombre: n, tipo_persona: mapTipoPersona(e?.tipo_persona || e?.tipo), sources: new Set([e?.source || 'unknown']) })
    } else {
      if (e?.tipo_persona || e?.tipo) {
        // Si cualquiera indica Jurídica, conservar Jurídica
        const tipo = mapTipoPersona(e?.tipo_persona || e?.tipo)
        if (tipo === 'Jurídica') found.tipo_persona = 'Jurídica'
      }
      found.sources.add(e?.source || 'unknown')
    }
  }
  // Normalizar sources a array
  return out.map(x => ({ nombre: x.nombre, tipo_persona: x.tipo_persona, sources: [...x.sources] }))
}

function toAsciiUpper(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

function buildSectionBlocks(rawText) {
  const text = toAsciiUpper(rawText)
  const startOt = /(OTORGAD[OA]\s+POR|OTORGANTES?|COMPARECIENTE[S]?|NOMBRES\s*\/??\s*RAZON\s+SOCIAL)/i
  const startBe = /(A\s+FAVOR\s+DE|BENEFICIARIOS?)/i
  const endCommon = /(A\s+FAVOR\s+DE|BENEFICIARIOS?|NOTARIO|ACTO\s+O\s+CON|EXTRACTO|ESCRITURA)\b/i
  const findBetween = (reStart, reEnd) => {
    const m = text.match(reStart)
    if (!m) return ''
    const from = m.index + m[0].length
    const rest = text.slice(from)
    const e = rest.match(reEnd)
    return e ? rest.slice(0, e.index) : rest
  }
  const ot = findBetween(startOt, endCommon)
  const be = findBetween(startBe, /(NOTARIO|ACTO\s+O\s+CON|EXTRACTO|ESCRITURA)\b/i)
  return { otBlock: ot || '', beBlock: be || '' }
}

const CONNECTORS = new Set(['DE','DEL','DELA','DELOS','DELAS','LA','LOS','LAS','Y'])

function coverageInBlock(name, block) {
  if (!name || !block) return 0
  const tokens = normalizeName(name).split(' ').filter(t => t && !CONNECTORS.has(t) && !STOP_TOKENS.has(t))
  if (tokens.length === 0) return 0
  const b = toAsciiUpper(block)
  const present = tokens.filter(t => b.includes(toAsciiUpper(t))).length
  return present / tokens.length
}

function disambiguateSections(rawText, otorgantes, beneficiarios) {
  const { otBlock, beBlock } = buildSectionBlocks(rawText || '')
  const mapName = new Map()
  for (const o of otorgantes || []) mapName.set(o.nombre, { where: new Set(['o']), item: o })
  for (const b of beneficiarios || []) {
    const key = b.nombre
    if (!mapName.has(key)) mapName.set(key, { where: new Set(['b']), item: b })
    else mapName.get(key).where.add('b')
  }

  const outO = []
  const outB = []
  for (const [name, meta] of mapName.entries()) {
    const cO = coverageInBlock(name, otBlock)
    const cB = coverageInBlock(name, beBlock)
    if (cO === 0 && cB === 0) {
      // Mantener donde ya estaba, pero si estaba en ambos, preferir otorgantes
      if (meta.where.has('o')) outO.push(meta.item)
      else outB.push(meta.item)
      continue
    }
    if (cO >= cB + 0.2) { outO.push(meta.item); continue }
    if (cB >= cO + 0.2) { outB.push(meta.item); continue }
    // Empate: si aparece en ambos, mantén la primera ocurrencia (otorgantes)
    if (meta.where.has('o') && !meta.where.has('b')) outO.push(meta.item)
    else if (meta.where.has('b') && !meta.where.has('o')) outB.push(meta.item)
    else outO.push(meta.item)
  }
  return { otorgantes: outO, beneficiarios: outB }
}

function mergeActs(nodeActs = [], pythonActs = []) {
  // Por ahora considerar un solo acto predominante; elegir el más confiable
  const nodeAct = Array.isArray(nodeActs) && nodeActs.length > 0 ? nodeActs[0] : null
  const pyAct = Array.isArray(pythonActs) && pythonActs.length > 0 ? pythonActs[0] : null

  if (!nodeAct && !pyAct) return []

  const tipo = PdfExtractorService.cleanActType(pyAct?.tipo_acto || pyAct?.tipo || nodeAct?.tipoActo || nodeAct?.tipo)

  const mark = (list, src) => (list || []).map(x => ({ ...x, source: src }))
  const nodeO = mark((nodeAct?.otorgantes || []).map(o => ({ ...o, nombre: ensureNamesFirst(o?.nombre) })), 'node')
  const nodeB = mark((nodeAct?.beneficiarios || []).map(b => ({ ...b, nombre: ensureNamesFirst(b?.nombre) })), 'node')

  const pyO = mark((pyAct?.otorgantes || []).map(o => ({ nombre: bestPythonName(o), tipo_persona: mapTipoPersona(o?.tipo) })), 'python')
  const pyB = mark((pyAct?.beneficiarios || []).map(b => ({ nombre: bestPythonName(b), tipo_persona: mapTipoPersona(b?.tipo) })), 'python')

  let otorgantes = dedupeEntities([...nodeO, ...pyO])
  let beneficiarios = dedupeEntities([...nodeB, ...pyB])

  // Resolver duplicados cruzados usando el texto original (si está disponible luego en la llamada de alto nivel)
  // Esta función será aplicada en hybridExtract donde sí tenemos rawText

  // Heurística simple de confianza
  const overlapO = otorgantes.filter(o => (nodeO.some(n => jaccardSimilarity(n.nombre, o.nombre) >= 0.7) && pyO.some(p => jaccardSimilarity(p.nombre, o.nombre) >= 0.7))).length
  const overlapB = beneficiarios.filter(b => (nodeB.some(n => jaccardSimilarity(n.nombre, b.nombre) >= 0.7) && pyB.some(p => jaccardSimilarity(p.nombre, b.nombre) >= 0.7))).length
  const conf = Math.min(0.95, 0.5 + 0.2 * overlapO + 0.15 * overlapB)

  return [{
    tipoActo: tipo || 'ACTO_GENERICO',
    otorgantes,
    beneficiarios,
    source: 'hybrid',
    confidence: conf
  }]
}

const ExtractionAggregator = {
  /**
   * Ejecuta extracción en paralelo (Node + Python) y fusiona resultados.
   */
  async hybridExtract({ pdfBuffer, rawText, filename = 'document.pdf', pythonOptions = {}, pythonClient } = {}) {
    const tasks = []
    const debug = { startedAt: Date.now() }

    // Node (Universal Parser)
    const uni = new UniversalPdfParser()
    const nodePromise = uni.parseDocument(pdfBuffer, rawText)
      .then(r => ({ ok: true, data: r, source: 'node' }))
      .catch(e => ({ ok: false, error: e?.message || String(e), source: 'node' }))
    tasks.push(nodePromise)

    // Python (si hay buffer)
    let pythonPromise = Promise.resolve({ ok: false, data: null, source: 'python' })
    if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
      const py = pythonClient || new PythonPdfClient()
      pythonPromise = py.extractFromPdf(pdfBuffer, filename, { debug: 0, ...(pythonOptions || {}) })
        .then(r => ({ ok: true, data: r, source: 'python' }))
        .catch(e => ({ ok: false, error: e?.message || String(e), source: 'python' }))
    }
    tasks.push(pythonPromise)

    const [nodeRes, pythonRes] = await Promise.all(tasks)
    debug.node = nodeRes
    debug.python = pythonRes

    const nodeActs = nodeRes?.ok ? (nodeRes.data?.acts || []) : []
    const pythonActs = pythonRes?.ok ? (Array.isArray(pythonRes.data?.actos) ? pythonRes.data.actos : []) : []

    let merged = mergeActs(nodeActs, pythonActs)
    // Reasignación cruzada usando ventanas del texto
    if (merged?.[0] && rawText) {
      const fix = disambiguateSections(rawText, merged[0].otorgantes, merged[0].beneficiarios)
      merged[0].otorgantes = fix.otorgantes
      merged[0].beneficiarios = fix.beneficiarios
    }
    debug.merged = merged
    debug.durationMs = Date.now() - debug.startedAt

    return {
      acts: merged,
      source: 'hybrid',
      confidence: merged[0]?.confidence || 0,
      debug
    }
  }
}

export default ExtractionAggregator


