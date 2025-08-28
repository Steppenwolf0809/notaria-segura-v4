import PdfExtractorService from '../services/pdf-extractor-service.js'
import { ExtractoTemplateEngine } from '../services/extractos/index.js'
import { buildActPhrase, normalizeActTypeForDisplay } from '../services/extractos/phrase-builder.js'
import { generateDocxFromText } from '../services/docx-generator.js'

/**
 * Controlador de Generador de Concuerdos (Sprint 1)
 * - Upload de PDF y extracción simple de texto
 * - Parsing básico por regex para un solo acto
 * - Vista previa de texto formateado (opcional)
 */

/**
 * POST /api/concuerdos/upload-pdf
 * Recibe PDF (multipart) y devuelve texto extraído
 */
async function uploadPdf(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Archivo PDF requerido' })
    }

    const { mimetype, buffer, size, originalname } = req.file
    console.log('📄 uploadPdf recibido:', { name: originalname, size, mimetype })
    if (mimetype !== 'application/pdf' && !originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, message: 'Formato inválido. Solo se permiten archivos PDF' })
    }

    // Límite adicional de seguridad (10MB) – multer ya valida pero reforzamos
    const MAX_SIZE = 10 * 1024 * 1024
    if (size > MAX_SIZE) {
      return res.status(400).json({ success: false, message: 'El archivo PDF es demasiado grande (máximo 10MB)' })
    }

    const text = await PdfExtractorService.extractText(buffer)
    if (!text || text.length < 5) {
      return res.status(400).json({ success: false, message: 'No se pudo extraer texto legible del PDF. Verifique que no sea una imagen escaneada.' })
    }

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({
      success: true,
      message: 'Texto extraído correctamente',
      data: { text }
    })
  } catch (error) {
    console.error('Error en uploadPdf:', error?.message || error)
    if (error?.cause) console.error('Causa:', error.cause?.message || error.cause)
    return res.status(500).json({ 
      success: false, 
      message: 'Error procesando PDF',
      details: process.env.NODE_ENV !== 'production' ? (error?.cause?.message || error?.message) : undefined
    })
  }
}

/**
 * POST /api/concuerdos/extract-data
 * Recibe texto y devuelve datos estructurados básicos
 */
async function extractData(req, res) {
  try {
    const { text } = req.body || {}
    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Texto del PDF inválido o vacío' })
    }

    const { acts } = PdfExtractorService.parseAdvancedData(text)
    const parsed = acts[0] || { tipoActo: '', otorgantes: [], beneficiarios: [] }
    const { notarioNombre, notariaNumero, notariaNumeroDigit, notarioSuplente } = PdfExtractorService.extractNotaryInfo(text)

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({
      success: true,
      message: 'Datos extraídos correctamente',
      data: { ...parsed, acts, notario: notarioNombre, notarioSuplente, notariaNumero, notariaNumeroDigit }
    })
  } catch (error) {
    console.error('Error en extractData:', error)
    return res.status(500).json({ success: false, message: 'Error extrayendo datos' })
  }
}

/**
 * POST /api/concuerdos/preview
 * Genera un texto de vista previa del concuerdo
 */
async function previewConcuerdo(req, res) {
  try {
    console.log('[concuerdos] POST /preview body:', {
      keys: Object.keys(req.body || {}),
      numeroCopias: req.body?.numeroCopias,
      actsLen: Array.isArray(req.body?.acts) ? req.body.acts.length : 0
    })
    const { tipoActo, otorgantes, beneficiarios, acts, notario, notariaNumero, notarioSuplente, numeroCopias = 2 } = req.body || {}

    const safeArray = (v) => Array.isArray(v)
      ? v.map((x) => String(x || '').trim()).filter(Boolean)
      : String(v || '').split(/\n|,|;/).map((x) => x.trim()).filter(Boolean)

    // Normaliza posibles bloques sucios (con encabezados de tabla) → lista de nombres
    const extractFromBlock = (block) => {
      const s = String(block || '')
      const m1 = s.match(/NOMBRES\s*\/\s*RAZ[ÓO]N\s+SOCIAL\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ0-9\s\.,\-\&]+?)(?=\s+(?:TIPO\s+INTERVINIENTE|DOCUMENTO|NACIONALIDAD|CALIDAD|REPRESENTAD[OA]\s+POR|RUC)|$)/i)
      if (m1 && m1[1]) return [m1[1].replace(/\s+/g, ' ').trim()]
      const m2 = s.match(/NOMBRES\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+(?:TIPO\s+INTERVINIENTE|DOCUMENTO|NACIONALIDAD|CALIDAD|REPRESENTAD[OA]\s+POR|RUC)|$)/i)
      if (m2 && m2[1]) return [m2[1].replace(/\s+/g, ' ').trim()]
      return null
    }
    const expandComparecientes = (raw) => {
      const arr = safeArray(raw)
      if (arr.length === 0) return []
      // Si llega un único bloque largo con encabezados conocidos, limpiarlo
      const joined = arr.join(' ')
      const hasHeaders = /RAZ[ÓO]N\s+SOCIAL|NOMBRES\s*\/|TIPO\s+INTERVINIENTE|NACIONALIDAD|CALIDAD/i.test(joined)
      if (arr.length === 1 && (arr[0].length > 40 || hasHeaders)) {
        const s = arr[0]
        const direct = extractFromBlock(s)
        if (direct && direct.length) return direct.map(n => ({ nombre: n }))
        // Extraer RAZÓN SOCIAL antes de "REPRESENTADO POR" si existe
        const mJ = s.match(/RAZ[ÓO]N\s+SOCIAL\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ0-9\s\.,\-\&]+?)\s+(?:REPRESENTAD[OA]\s+POR|RUC)/i)
        if (mJ && mJ[1]) return [{ nombre: mJ[1].replace(/\s+/g, ' ').trim(), tipo_persona: 'Jurídica' }]
        const names = PdfExtractorService.cleanPersonNames(s)
        return names.map(n => ({ nombre: n }))
      }
      return arr.map(n => ({ nombre: n }))
    }

    const guessTipoPersona = (name) => {
      const s = String(name || '').toUpperCase()
      // Detectar tokens típicos de entidades usando límites de palabra
      const entityTokens = [
        'CIA', 'CÍA', 'LTDA', 'L.T.D.A', 'S.A', 'S.A.S', 'S.A.C', 'SAS', 'SA',
        'BANCO', 'FIDEICOMISO', 'CONSTRUCTORA', 'CORPORACION', 'CORPORACIÓN',
        'COMPAÑIA', 'COMPAÑÍA', 'EMPRESA PÚBLICA', 'EMPRESA PUBLICA', 'EP',
        'MUNICIPIO', 'GAD', 'GOBIERNO AUTONOMO DESCENTRALIZADO', 'GOBIERNO AUTÓNOMO DESCENTRALIZADO',
        'UNIVERSIDAD', 'FUNDACION', 'FUNDACIÓN', 'ASOCIACION', 'ASOCIACIÓN',
        'COOPERATIVA', 'COOP', 'CONSORCIO', 'CLUB'
      ]
      const pattern = new RegExp(`\\b(${entityTokens.join('|').replace(/\./g, '\\.')})\\b`)
      if (pattern.test(s)) return 'Jurídica'
      if (/\bRUC\b/.test(s)) return 'Jurídica'
      if (/\b\d{13}\b/.test(s)) return 'Jurídica'
      return 'Natural'
    }
    const normalizeCompareciente = (c) => {
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        const nombre = String(c.nombre || c.fullname || c.text || '').trim()
        const tipo_persona = c.tipo_persona || c.tipoPersona || c.tipo || guessTipoPersona(nombre)
        const representante = c.representante || c.apoderado || undefined
        return { ...c, nombre, tipo_persona, representante }
      }
      const nombre = String(c || '').trim()
      return { nombre, tipo_persona: guessTipoPersona(nombre) }
    }

    // Si en los otorgantes hay una entidad y naturales, mover los naturales a representantes de la entidad
    const attachRepresentantesIfJuridica = (comparecientes, repsFromBody) => {
      const arr = Array.isArray(comparecientes) ? comparecientes.map(normalizeCompareciente) : []
      if (arr.length === 0) return arr
      const juridicasIdx = []
      const naturalesIdx = []
      arr.forEach((p, i) => (/JUR[IÍ]DICA/i.test(p?.tipo_persona || '') ? juridicasIdx : naturalesIdx).push(i))
      if (juridicasIdx.length === 0 || naturalesIdx.length === 0) return arr
      // Tomar la primera jurídica como principal otorgante
      const j = arr[juridicasIdx[0]]
      const naturalesNombres = naturalesIdx.map(i => arr[i]?.nombre).filter(Boolean)
      const reps = (Array.isArray(repsFromBody) && repsFromBody.length > 0)
        ? repsFromBody
        : naturalesNombres
      if (reps.length > 0) {
        const unique = [...new Set([...(Array.isArray(j.representantes) ? j.representantes : []), ...reps])]
        j.representantes = unique
      }
      // Conservar sólo jurídicas como otorgantes
      const onlyJuridicas = juridicasIdx.map(i => arr[i])
      return onlyJuridicas
    }

    const actsData = Array.isArray(acts) && acts.length > 0
      ? acts
      : [{ tipoActo: tipoActo, otorgantes, beneficiarios }]

    const hasValidAct = actsData.some(a => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo)
      const ots = safeArray(a?.otorgantes)
      return tipo && ots.length > 0
    })
    if (!hasValidAct) {
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios' })
    }

    const engineActs = actsData.map((a) => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo)
      const otsBase = expandComparecientes(a?.otorgantes)
      const besBase = expandComparecientes(a?.beneficiarios)
      // Adjuntar representantes si corresponde (persona jurídica detectada)
      const repsRaw = req.body?.representantes || req.body?.representantesOtorgantes
      const ots = attachRepresentantesIfJuridica(otsBase, Array.isArray(repsRaw) ? repsRaw : String(repsRaw || '').split(/\n|,|;/).map(s => s.trim()).filter(Boolean))
      const bes = besBase.map(normalizeCompareciente)
      return { tipo, otorgantes: ots, beneficiarios: bes }
    })

    const engineDataBase = {
      notario,
      notarioNombre: notario,
      notarioSuplente: Boolean(notarioSuplente),
      notaria: notariaNumero || req.body?.notaria,
      notariaNumero: notariaNumero || req.body?.notaria,
      actos: []
    }

    // Si el frontend proporciona representantes (string o array), asociar al primer otorgante jurídico
    const repsRaw = req.body?.representantes || req.body?.representantesOtorgantes
    const actsPrepared = engineActs.map((act) => {
      const copy = JSON.parse(JSON.stringify(act))
      if (repsRaw) {
        const reps = Array.isArray(repsRaw) ? repsRaw : String(repsRaw).split(/\n|,|;/).map(s => s.trim()).filter(Boolean)
        const ots = copy.otorgantes
        const findJuridicaIdx = ots.findIndex(o => /JUR[IÍ]DICA/i.test(o?.tipo_persona || ''))
        const idx = findJuridicaIdx !== -1 ? findJuridicaIdx : 0
        if (ots[idx]) ots[idx].representantes = reps
      }
      return copy
    })

    // Preparar vista previa combinando todos los actos en cada copia
    const firstAct = actsPrepared[0]
    const engineInfo = { template: 'poder-universal', acto: firstAct?.tipo, actosCount: actsPrepared.length }

    const copies = Math.max(1, Math.min(10, parseInt(numeroCopias || 2)))
    const ordinalWord = (n) => {
      const map = {
        1: 'PRIMERA', 2: 'SEGUNDA', 3: 'TERCERA', 4: 'CUARTA', 5: 'QUINTA',
        6: 'SEXTA', 7: 'SÉPTIMA', 8: 'OCTAVA', 9: 'NOVENA', 10: 'DÉCIMA',
        11: 'UNDÉCIMA', 12: 'DUODÉCIMA',
        13: 'DÉCIMA TERCERA', 14: 'DÉCIMA CUARTA', 15: 'DÉCIMA QUINTA', 16: 'DÉCIMA SEXTA',
        17: 'DÉCIMA SÉPTIMA', 18: 'DÉCIMA OCTAVA', 19: 'DÉCIMA NOVENA',
        20: 'VIGÉSIMA',
        21: 'VIGÉSIMA PRIMERA', 22: 'VIGÉSIMA SEGUNDA', 23: 'VIGÉSIMA TERCERA', 24: 'VIGÉSIMA CUARTA', 25: 'VIGÉSIMA QUINTA',
        26: 'VIGÉSIMA SEXTA', 27: 'VIGÉSIMA SÉPTIMA', 28: 'VIGÉSIMA OCTAVA', 29: 'VIGÉSIMA NOVENA',
        30: 'TRIGÉSIMA'
      }
      return map[n] || String(n)
    }
    const rotulo = (n) => `${ordinalWord(n)} COPIA`
    const previews = []
    const shouldCombine = Array.isArray(actsPrepared) && actsPrepared.length > 1 && req.body?.combine !== false
    for (let i = 0; i < copies; i++) {
      const n = i + 1
      const rot = rotulo(n)
      const override = { NUMERO_COPIA: ordinalWord(n) }
      // Si hay múltiples actos y no se desactiva, construir un solo párrafo con un encabezado
      if (shouldCombine) {
        const phrases = []
        let footerNotario = ''
        let footerNotaria = ''
        for (const act of actsPrepared) {
          const engineData = { ...engineDataBase, actos: [act] }
          const { variables } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, override)
          const v = variables || {}
          footerNotario = v.NOMBRE_NOTARIO || footerNotario
          footerNotaria = v.NOTARIA || footerNotaria
          phrases.push(buildActPhrase(v))
        }
        const connector = phrases.slice(1).map(p => `y de ${p}`).join('; ')
        const body = phrases.length > 1 ? `${phrases[0]}; ${connector}` : phrases[0]
        const combined = `Se otorgó ante mí, en fe de ello confiero esta **${ordinalWord(n)} COPIA CERTIFICADA** de la escritura pública de ${body}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.\n\n${footerNotario}\n${footerNotaria}\n`
        previews.push({ index: n, title: rot, text: `${rot}:\n\n${combined}` })
      } else {
        // Modo clásico: render individual por acto y concatenado con separador
        const rendered = []
        for (const act of actsPrepared) {
          const engineData = { ...engineDataBase, actos: [act] }
          const { text: t } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, override)
          rendered.push(t)
        }
        const combined = rendered.join('\n\n—\n\n')
        previews.push({ index: n, title: rot, text: `${rot}:\n\n${combined}` })
      }
    }

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({ success: true, data: { previews, engine: engineInfo } })
  } catch (error) {
    console.error('Error en previewConcuerdo:', error?.stack || error)
    return res.status(500).json({ success: false, message: 'Error generando vista previa', details: process.env.NODE_ENV !== 'production' ? (error?.stack || error?.message) : undefined })
  }
}

export { uploadPdf, extractData, previewConcuerdo }
/**
 * Generar múltiples documentos (copias) numerados
 * POST /api/concuerdos/generate-documents
 * body: { tipoActo, otorgantes, beneficiarios, numCopias, notario?, format? }
 */
async function generateDocuments(req, res) {
  try {
    console.log('🔍 [concuerdos] POST /generate-documents - INICIO')
    console.log('📋 [concuerdos] req.body completo:', JSON.stringify(req.body, null, 2))
    console.log('[concuerdos] POST /generate-documents body keys:', {
      keys: Object.keys(req.body || {}),
      numCopias: req.body?.numCopias,
      combine: req.body?.combine,
      actsLen: Array.isArray(req.body?.acts) ? req.body.acts.length : 0
    })
    const { tipoActo, otorgantes, beneficiarios, acts, notario, notariaNumero, notarioSuplente, numCopias = 2 } = req.body || {}
    console.log('🎯 [concuerdos] Variables extraídas del body:', {
      tipoActo,
      otorgantes: Array.isArray(otorgantes) ? `Array[${otorgantes.length}]` : typeof otorgantes,
      beneficiarios: Array.isArray(beneficiarios) ? `Array[${beneficiarios.length}]` : typeof beneficiarios,
      acts: Array.isArray(acts) ? `Array[${acts.length}]` : typeof acts,
      notario,
      notariaNumero,
      notarioSuplente,
      numCopias
    })

    const safeArray = (v) => Array.isArray(v)
      ? v.map((x) => String(x || '').trim()).filter(Boolean)
      : String(v || '').split(/\n|,|;/).map((x) => x.trim()).filter(Boolean)

    const extractFromBlock = (block) => {
      const s = String(block || '')
      const m1 = s.match(/NOMBRES\s*\/\s*RAZ[ÓO]N\s+SOCIAL\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ0-9\s\.,\-\&]+?)(?=\s+(?:TIPO\s+INTERVINIENTE|DOCUMENTO|NACIONALIDAD|CALIDAD)|$)/i)
      if (m1 && m1[1]) return [m1[1].replace(/\s+/g, ' ').trim()]
      const m2 = s.match(/NOMBRES\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=\s+(?:TIPO\s+INTERVINIENTE|DOCUMENTO|NACIONALIDAD|CALIDAD)|$)/i)
      if (m2 && m2[1]) return [m2[1].replace(/\s+/g, ' ').trim()]
      return null
    }
    const expandComparecientes = (raw) => {
      const arr = safeArray(raw)
      if (arr.length === 0) return []
      const joined = arr.join(' ')
      const hasHeaders = /RAZ[ÓO]N\s+SOCIAL|NOMBRES\s*\/|TIPO\s+INTERVINIENTE|NACIONALIDAD|CALIDAD/i.test(joined)
      if (arr.length === 1 && (arr[0].length > 40 || hasHeaders)) {
        const direct = extractFromBlock(arr[0])
        if (direct && direct.length) return direct.map(n => ({ nombre: n }))
        const names = PdfExtractorService.cleanPersonNames(arr[0])
        return names.map(n => ({ nombre: n }))
      }
      return arr.map(n => ({ nombre: n }))
    }

    const guessTipoPersona = (name) => {
      const s = String(name || '').toUpperCase()
      const entityTokens = [
        'CIA', 'CÍA', 'LTDA', 'L.T.D.A', 'S.A', 'S.A.S', 'S.A.C', 'SAS', 'SA',
        'BANCO', 'FIDEICOMISO', 'CONSTRUCTORA', 'CORPORACION', 'CORPORACIÓN',
        'COMPAÑIA', 'COMPAÑÍA', 'EMPRESA PÚBLICA', 'EMPRESA PUBLICA', 'EP',
        'MUNICIPIO', 'GAD', 'GOBIERNO AUTONOMO DESCENTRALIZADO', 'GOBIERNO AUTÓNOMO DESCENTRALIZADO',
        'UNIVERSIDAD', 'FUNDACION', 'FUNDACIÓN', 'ASOCIACION', 'ASOCIACIÓN',
        'COOPERATIVA', 'COOP', 'CONSORCIO', 'CLUB'
      ]
      const pattern = new RegExp(`\\b(${entityTokens.join('|').replace(/\./g, '\\.')})\\b`)
      if (pattern.test(s)) return 'Jurídica'
      if (/\bRUC\b/.test(s)) return 'Jurídica'
      if (/\b\d{13}\b/.test(s)) return 'Jurídica'
      return 'Natural'
    }
    const normalizeCompareciente = (c) => {
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        const nombre = String(c.nombre || c.fullname || c.text || '').trim()
        const tipo_persona = c.tipo_persona || c.tipoPersona || c.tipo || guessTipoPersona(nombre)
        const representante = c.representante || c.apoderado || undefined
        return { ...c, nombre, tipo_persona, representante }
      }
      const nombre = String(c || '').trim()
      return { nombre, tipo_persona: guessTipoPersona(nombre) }
    }

    const actsData = Array.isArray(acts) && acts.length > 0
      ? acts
      : [{ tipoActo: tipoActo, otorgantes, beneficiarios }]

    console.log('📊 [concuerdos] Procesando actos:', actsData.length)
    actsData.forEach((act, index) => {
      console.log(`🎭 [concuerdos] Acto ${index + 1}:`, {
        tipoActo: act?.tipoActo || act?.tipo,
        otorgantes: Array.isArray(act?.otorgantes) ? `Array[${act.otorgantes.length}]` : typeof act?.otorgantes,
        beneficiarios: Array.isArray(act?.beneficiarios) ? `Array[${act.beneficiarios.length}]` : typeof act?.beneficiarios
      })
    })

    const hasValidAct = actsData.some(a => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo)
      const ots = safeArray(a?.otorgantes)
      console.log(`✅ [concuerdos] Validando acto: tipo="${tipo}", otorgantes=${ots.length}`)
      return tipo && ots.length > 0
    })
    if (!hasValidAct) {
      console.error('❌ [concuerdos] generate-documents: validación fallida', { actsData })
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios', details: { actsData } })
    }
    console.log('✅ [concuerdos] Validación de actos exitosa')

    const engineActs = actsData.map((a) => ({
      tipo: PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo),
      otorgantes: expandComparecientes(a?.otorgantes).map(normalizeCompareciente),
      beneficiarios: expandComparecientes(a?.beneficiarios).map(normalizeCompareciente)
    }))
    console.log('🔧 [concuerdos] engineActs procesados:', JSON.stringify(engineActs, null, 2))

    const engineDataBase = {
      notario,
      notarioNombre: notario,
      notarioSuplente: Boolean(notarioSuplente),
      notaria: notariaNumero || req.body?.notaria,
      notariaNumero: notariaNumero || req.body?.notaria,
      actos: []
    }
    console.log('🏗️ [concuerdos] engineDataBase calculado:', JSON.stringify(engineDataBase, null, 2))

    // Asociar representantes si vienen del frontend
    const repsRaw = req.body?.representantes || req.body?.representantesOtorgantes
    const actsPrepared = engineActs.map((act) => {
      const copy = JSON.parse(JSON.stringify(act))
      if (repsRaw) {
        const reps = Array.isArray(repsRaw) ? repsRaw : String(repsRaw).split(/\n|,|;/).map(s => s.trim()).filter(Boolean)
        const ots = copy.otorgantes
        const findJuridicaIdx = ots.findIndex(o => /JUR[IÍ]DICA/i.test(o?.tipo_persona || ''))
        const idx = findJuridicaIdx !== -1 ? findJuridicaIdx : 0
        if (ots[idx]) ots[idx].representantes = reps
      }
      return copy
    })

    const copies = Math.max(1, Math.min(10, parseInt(numCopias || 2)))
    const documents = []
    const bundle = Boolean(req.body?.bundle || req.body?.singleFile)
    const bundleEntries = []
    const engineInfo = { template: 'poder-universal', acto: actsPrepared?.[0]?.tipo, actosCount: actsPrepared.length }
    const ordinalWord = (n) => {
      const map = {
        1: 'PRIMERA', 2: 'SEGUNDA', 3: 'TERCERA', 4: 'CUARTA', 5: 'QUINTA',
        6: 'SEXTA', 7: 'SÉPTIMA', 8: 'OCTAVA', 9: 'NOVENA', 10: 'DÉCIMA',
        11: 'UNDÉCIMA', 12: 'DUODÉCIMA',
        13: 'DÉCIMA TERCERA', 14: 'DÉCIMA CUARTA', 15: 'DÉCIMA QUINTA', 16: 'DÉCIMA SEXTA',
        17: 'DÉCIMA SÉPTIMA', 18: 'DÉCIMA OCTAVA', 19: 'DÉCIMA NOVENA',
        20: 'VIGÉSIMA',
        21: 'VIGÉSIMA PRIMERA', 22: 'VIGÉSIMA SEGUNDA', 23: 'VIGÉSIMA TERCERA', 24: 'VIGÉSIMA CUARTA', 25: 'VIGÉSIMA QUINTA',
        26: 'VIGÉSIMA SEXTA', 27: 'VIGÉSIMA SÉPTIMA', 28: 'VIGÉSIMA OCTAVA', 29: 'VIGÉSIMA NOVENA',
        30: 'TRIGÉSIMA'
      }
      return map[n] || String(n)
    }
    console.log(`📄 [concuerdos] Generando ${copies} copias de documentos`)
    for (let i = 0; i < copies; i++) {
      const n = i + 1
      const rotuloPalabra = ordinalWord(n)
      console.log(`📝 [concuerdos] Procesando copia ${n}/${copies}: ${rotuloPalabra}`)
      let combined
      try {
        const shouldCombine = Array.isArray(actsPrepared) && actsPrepared.length > 1 && req.body?.combine !== false
        if (shouldCombine) {
          console.log('🔀 [concuerdos] Modo combinado activado para múltiples actos')
          // Construir frases por acto sin encabezado repetido usando variables del engine
          const phrases = []
          let footerNotario = ''
          let footerNotaria = ''
          for (const act of actsPrepared) {
            const engineData = { ...engineDataBase, actos: [act] }
            console.log(`🎯 [concuerdos] Renderizando acto con ExtractoTemplateEngine:`, JSON.stringify(engineData, null, 2))
            const { variables } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, { NUMERO_COPIA: rotuloPalabra })
            console.log(`✅ [concuerdos] Variables generadas por engine:`, JSON.stringify(variables, null, 2))
            const v = variables || {}
            footerNotario = v.NOMBRE_NOTARIO || footerNotario
            footerNotaria = v.NOTARIA || footerNotaria
            const phrase = buildActPhrase(v)
            phrases.push(phrase)
          }
          const connector = phrases.slice(1).map(p => `y de ${p}`).join('; ')
          const body = phrases.length > 1 ? `${phrases[0]}; ${connector}` : phrases[0]
          combined = `Se otorgó ante mí, en fe de ello confiero esta **${rotuloPalabra} COPIA CERTIFICADA** de la escritura pública de ${body}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.\n\n${footerNotario}\n${footerNotaria}\n`
        } else {
          console.log('📋 [concuerdos] Modo clásico: render individual por acto')
          // Render clásico por acto y concatenado con separador
          const rendered = []
          for (const act of actsPrepared) {
            const engineData = { ...engineDataBase, actos: [act] }
            console.log(`🎯 [concuerdos] Renderizando acto individual:`, JSON.stringify(engineData, null, 2))
            const { text } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, { NUMERO_COPIA: rotuloPalabra })
            console.log(`✅ [concuerdos] Texto generado (primeros 200 chars):`, text?.substring(0, 200) + '...')
            rendered.push(text)
          }
          combined = rendered.join('\n\n—\n\n')
        }
        console.log(`✅ [concuerdos] Documento ${n} generado exitosamente (${combined?.length || 0} caracteres)`)
      } catch (templateError) {
        console.error(`❌ [concuerdos] Error al generar documento ${n}:`, templateError?.stack || templateError)
        throw templateError
      }
      // Registrar para bundling y, si bundle=true, saltar creación individual
      bundleEntries.push({ title: `${rotuloPalabra} COPIA`, text: combined })
      if (bundle) continue
      // Formateo de salida: txt (por defecto), html o rtf
      const requestedFormat = String(req.body?.format || '').toLowerCase()
      const fmt = ['html', 'rtf', 'txt', 'docx'].includes(requestedFormat) ? requestedFormat : 'txt'

      const toHtml = (text) => {
        // Convertir **negritas** a <strong>
        const esc = (s) => String(s || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        const bolded = esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${rotuloPalabra} COPIA</title>
<style>
  @media print { body { margin: 2cm; } }
  body { font-family: 'Times New Roman', serif; line-height: 1.4; }
  .doc { white-space: pre-wrap; font-size: 12pt; }
  h1 { font-size: 14pt; margin: 0 0 12px 0; }
</style></head><body>
<h1>${rotuloPalabra} COPIA</h1>
<div class="doc">${bolded}</div>
</body></html>`
      }

      const toRtf = (text) => {
        // Convertir **negritas** y saltos de línea a RTF básico con codificación ANSI
        const escapeRtf = (s) => String(s || '')
          .replace(/\\/g, '\\\\')
          .replace(/[{}]/g, (m) => '\\' + m)
        // Reemplazo de **texto** por {\b texto}
        const withBold = text.replace(/\*\*(.+?)\*\*/g, (m, p1) => `{\\b ${p1}}`)
        const withParas = withBold.replace(/\r?\n/g, '\\par\n')
        const payload = escapeRtf(withParas)
        return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\fs24 ${payload}}`
      }

      let filename, mimeType, payload
      if (fmt === 'html') {
        filename = `CONCUERDO_${rotuloPalabra}_COPIA.html`
        mimeType = 'text/html; charset=utf-8'
        payload = toHtml(combined)
      } else if (fmt === 'docx') {
        try {
          const buf = await generateDocxFromText({ title: `${rotuloPalabra} COPIA`, bodyText: combined })
          filename = `CONCUERDO_${rotuloPalabra}_COPIA.docx`
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          // Notar: Buffer ya es binario; convertimos a base64 desde el buffer directamente
          const contentBase64 = Buffer.from(buf).toString('base64')
          documents.push({ index: n, title: `${rotuloPalabra} COPIA`, filename, mimeType, contentBase64 })
          continue
        } catch (e) {
          // Si no está instalada la librería docx, caemos a RTF sin romper el flujo
          console.warn('[concuerdos] DOCX no disponible, haciendo fallback a RTF:', e?.code || e?.message)
          filename = `CONCUERDO_${rotuloPalabra}_COPIA.rtf`
          mimeType = 'application/rtf'
          payload = toRtf(combined)
        }
      } else if (fmt === 'rtf') {
        filename = `CONCUERDO_${rotuloPalabra}_COPIA.rtf`
        mimeType = 'application/rtf'
        payload = toRtf(combined)
      } else {
        filename = `CONCUERDO_${rotuloPalabra}_COPIA.txt`
        mimeType = 'text/plain; charset=utf-8'
        payload = combined
      }
      const contentBase64 = Buffer.from(payload, 'utf8').toString('base64')
      documents.push({ index: n, title: `${rotuloPalabra} COPIA`, filename, mimeType, contentBase64 })
    }

    // Si bundle=true, construir un único archivo con todas las copias
    if (bundle && bundleEntries.length) {
      const requestedFormat = String(req.body?.format || '').toLowerCase()
      const fmt = ['html', 'rtf', 'txt', 'docx'].includes(requestedFormat) ? requestedFormat : 'txt'

      const toHtmlBundle = (entries) => {
        const headerTitle = [
          (notariaNumero ? `Notaría: ${notariaNumero}` : ''),
          (notario ? `Notario(a): ${notario}` : '')
        ].filter(Boolean).join(' · ')
        const footerText = `Fecha de impresión: ${new Date().toLocaleDateString('es-EC')}`
        const esc = (s) => String(s || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        const section = (title, text, first) => {
          const bolded = esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          const pb = first ? '' : 'page-break-before: always;'
          return `<section style=\"${pb}\">
  <div class=\"hdr\">${esc(headerTitle)}</div>
  <h1>${esc(title)}</h1>
  <div class=\"doc\">${bolded}</div>
  <div class=\"ftr\">${esc(footerText)}</div>
</section>`
        }
        const body = entries.map((e, idx) => section(e.title, e.text, idx === 0)).join('\n')
        return `<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\"/><title>Concuerdo</title>
<style>
  @media print { body { margin: 2cm; } section{ page-break-inside: avoid; } }
  body { font-family: Arial, sans-serif; line-height: 1.5; }
  .doc { white-space: pre-wrap; font-size: 14pt; text-align: justify; }
  h1 { font-size: 16pt; margin: 0 0 12px 0; font-family: Arial, sans-serif; }
  .hdr { font-size: 10pt; color: #444; margin-bottom: 6px; }
  .ftr { font-size: 10pt; color: #666; margin-top: 10px; }
</style></head><body>
${body}
</body></html>`
      }

      const toRtfBundle = (entries) => {
        const escapeRtf = (s) => String(s || '')
          .replace(/\\/g, '\\\\')
          .replace(/[{}]/g, (m) => '\\' + m)
        const toUnicode = (s) => s.replace(/[\u0080-\uFFFF]/g, (ch) => `\\u${ch.charCodeAt(0)}?`)
        const sections = entries.map((e, idx) => {
          const title = toUnicode(escapeRtf(e.title))
          const bodyBold = e.text.replace(/\*\*(.+?)\*\*/g, (m, p1) => `{\\b ${p1}}`)
          const body = toUnicode(escapeRtf(bodyBold))
          const paras = body.split(/\r?\n/).map(line => `\\qj\\sl420\\slmult1 ${line}`).join('\\par\n')
          const page = idx === 0 ? '' : '\\page\n'
          const hdr = toUnicode(escapeRtf([notariaNumero ? `Notaría: ${notariaNumero}` : '', notario ? `Notario(a): ${notario}` : ''].filter(Boolean).join(' · ')))
          const ftr = toUnicode(escapeRtf(`Fecha de impresión: ${new Date().toLocaleDateString('es-EC')}`))
          return `${page}${hdr}\\par\n{\\b ${title}}\\par\n${paras}\\par\n${ftr}`
        }).join('\\par\n')
        return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs28\n${sections}\n}`
      }

      let filename, mimeType, contentBase64
      if (fmt === 'html') {
        filename = 'CONCUERDO_COPIAS_UNIDAS.html'
        mimeType = 'text/html; charset=utf-8'
        const payload = toHtmlBundle(bundleEntries)
        contentBase64 = Buffer.from(payload, 'utf8').toString('base64')
      } else if (fmt === 'rtf') {
        filename = 'CONCUERDO_COPIAS_UNIDAS.rtf'
        mimeType = 'application/rtf'
        const payload = toRtfBundle(bundleEntries)
        contentBase64 = Buffer.from(payload, 'utf8').toString('base64')
      } else if (fmt === 'docx') {
        try {
          const { generateDocxFromCopies } = await import('../services/docx-generator.js')
          const headerTitle = [
            (notariaNumero ? `Notaría: ${notariaNumero}` : ''),
            (notario ? `Notario(a): ${notario}` : ''),
          ].filter(Boolean).join(' · ')
          const footerText = `Fecha de impresión: ${new Date().toLocaleDateString('es-EC')}`
          const buf = await generateDocxFromCopies({ copies: bundleEntries, headerTitle, footerText })
          filename = 'CONCUERDO_COPIAS_UNIDAS.docx'
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          contentBase64 = Buffer.from(buf).toString('base64')
        } catch (e) {
          // Fallback a RTF si no está docx
          filename = 'CONCUERDO_COPIAS_UNIDAS.rtf'
          mimeType = 'application/rtf'
          const payload = toRtfBundle(bundleEntries)
          contentBase64 = Buffer.from(payload, 'utf8').toString('base64')
        }
      } else { // txt
        filename = 'CONCUERDO_COPIAS_UNIDAS.txt'
        mimeType = 'text/plain; charset=utf-8'
        const payload = bundleEntries.map((e, idx) => (idx ? '\f\n' : '') + e.title + '\n\n' + e.text).join('\n\n')
        contentBase64 = Buffer.from(payload, 'utf8').toString('base64')
      }
      documents.length = 0
      documents.push({ index: 1, title: 'COPIAS UNIDAS', filename, mimeType, contentBase64 })
    }

    console.log(`🎉 [concuerdos] ¡Generación completada exitosamente! ${documents.length} documentos creados`)
    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({ success: true, data: { documents, engine: engineInfo } })
  } catch (error) {
    console.error('💥 [concuerdos] Error generando documentos de concuerdo:', error?.stack || error)
    console.error('💥 [concuerdos] Error name:', error?.name)
    console.error('💥 [concuerdos] Error message:', error?.message)
    if (error?.cause) {
      console.error('💥 [concuerdos] Error cause:', error.cause)
    }
    return res.status(500).json({
      success: false,
      message: 'Error generando documentos',
      errorType: error?.name || 'Unknown',
      details: process.env.NODE_ENV !== 'production' ? (error?.stack || error?.message || String(error)) : undefined
    })
  }
}

export { generateDocuments }
