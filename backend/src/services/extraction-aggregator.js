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

  const otorgantes = dedupeEntities([...nodeO, ...pyO])
  const beneficiarios = dedupeEntities([...nodeB, ...pyB])

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

    const merged = mergeActs(nodeActs, pythonActs)
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


