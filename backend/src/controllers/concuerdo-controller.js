import PdfExtractorService from '../services/pdf-extractor-service.js'
import { ExtractoTemplateEngine } from '../services/extractos/index.js'

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
    const { notarioNombre, notariaNumero } = PdfExtractorService.extractNotaryInfo(text)

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({
      success: true,
      message: 'Datos extraídos correctamente',
      data: { ...parsed, acts, notario: notarioNombre, notariaNumero }
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
    const { tipoActo, otorgantes, beneficiarios, acts, notario, notariaNumero, numeroCopias = 2 } = req.body || {}

    const safeArray = (v) => Array.isArray(v)
      ? v.map((x) => String(x || '').trim()).filter(Boolean)
      : String(v || '').split(/\n|,|;/).map((x) => x.trim()).filter(Boolean)

    // Normaliza posibles bloques sucios (con encabezados de tabla) → lista de nombres
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
      // Si llega un único bloque largo con encabezados conocidos, limpiarlo
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
      const keys = [' CIA', 'CIA.', ' LTDA', ' S.A', ' S.A.', ' BANCO', ' FIDEICOMISO', ' CONSTRUCTORA', ' CORPORACION', ' COMPAÑIA', ' COMPAÑÍA', ' GRUPO']
      return keys.some(k => s.includes(k)) ? 'Jurídica' : 'Natural'
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

    const hasValidAct = actsData.some(a => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo)
      const ots = safeArray(a?.otorgantes)
      return tipo && ots.length > 0
    })
    if (!hasValidAct) {
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios' })
    }

    const firstAct = actsData[0]
    const engineData = {
      notario,
      notarioNombre: notario,
      notaria: notariaNumero || req.body?.notaria,
      notariaNumero: notariaNumero || req.body?.notaria,
      actos: [{
        tipo: PdfExtractorService.cleanActType(firstAct?.tipoActo || firstAct?.tipo),
        otorgantes: expandComparecientes(firstAct?.otorgantes).map(normalizeCompareciente),
        beneficiarios: expandComparecientes(firstAct?.beneficiarios).map(normalizeCompareciente)
      }]
    }

    // Si el frontend proporciona representantes (string o array), asociar al primer otorgante jurídico
    const repsRaw = req.body?.representantes || req.body?.representantesOtorgantes
    if (repsRaw) {
      const reps = Array.isArray(repsRaw) ? repsRaw : String(repsRaw).split(/\n|,|;/).map(s => s.trim()).filter(Boolean)
      const ots = engineData.actos[0].otorgantes
      const findJuridicaIdx = ots.findIndex(o => /JUR[IÍ]DICA/i.test(o?.tipo_persona || ''))
      const idx = findJuridicaIdx !== -1 ? findJuridicaIdx : 0
      if (ots[idx]) ots[idx].representantes = reps
    }

    const { text } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, { NUMERO_COPIA: 'PRIMERA' })
    const engineInfo = { template: 'poder-universal', acto: engineData.actos[0].tipo }

    const copies = Math.max(1, Math.min(10, parseInt(numeroCopias || 2)))
    const rotulo = (n) => (n === 1 ? 'PRIMERA COPIA' : n === 2 ? 'SEGUNDA COPIA' : `${n}ª COPIA`)
    const previews = []
    for (let i = 0; i < copies; i++) {
      const n = i + 1
      const rot = rotulo(n)
      const override = { NUMERO_COPIA: rot.split(' ')[0] }
      const { text: t } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, override)
      previews.push({ index: n, title: rot, text: `${rot}:\n\n${t}` })
    }

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({ success: true, data: { previewText: text, previews, engine: engineInfo } })
  } catch (error) {
    console.error('Error en previewConcuerdo:', error)
    return res.status(500).json({ success: false, message: 'Error generando vista previa' })
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
    const { tipoActo, otorgantes, beneficiarios, acts, notario, notariaNumero, numCopias = 2 } = req.body || {}

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
      const keys = [' CIA', 'CIA.', ' LTDA', ' S.A', ' S.A.', ' BANCO', ' FIDEICOMISO', ' CONSTRUCTORA', ' CORPORACION', ' COMPAÑIA', ' COMPAÑÍA', ' GRUPO']
      return keys.some(k => s.includes(k)) ? 'Jurídica' : 'Natural'
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

    const hasValidAct = actsData.some(a => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo || a?.tipo)
      const ots = safeArray(a?.otorgantes)
      return tipo && ots.length > 0
    })
    if (!hasValidAct) {
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios' })
    }

    const firstAct = actsData[0]
    const engineData = {
      notario,
      notarioNombre: notario,
      notaria: notariaNumero || req.body?.notaria,
      notariaNumero: notariaNumero || req.body?.notaria,
      actos: [{
        tipo: PdfExtractorService.cleanActType(firstAct?.tipoActo || firstAct?.tipo),
        otorgantes: expandComparecientes(firstAct?.otorgantes).map(normalizeCompareciente),
        beneficiarios: expandComparecientes(firstAct?.beneficiarios).map(normalizeCompareciente)
      }]
    }

    // Asociar representantes si vienen del frontend
    const repsRaw = req.body?.representantes || req.body?.representantesOtorgantes
    if (repsRaw) {
      const reps = Array.isArray(repsRaw) ? repsRaw : String(repsRaw).split(/\n|,|;/).map(s => s.trim()).filter(Boolean)
      const ots = engineData.actos[0].otorgantes
      const findJuridicaIdx = ots.findIndex(o => /JUR[IÍ]DICA/i.test(o?.tipo_persona || ''))
      const idx = findJuridicaIdx !== -1 ? findJuridicaIdx : 0
      if (ots[idx]) ots[idx].representantes = reps
    }

    const copies = Math.max(1, Math.min(10, parseInt(numCopias || 2)))
    const documents = []
    const engineInfo = { template: 'poder-universal', acto: engineData.actos[0].tipo }
    for (let i = 0; i < copies; i++) {
      const n = i + 1
      const rotuloPalabra = n === 1 ? 'PRIMERA' : n === 2 ? 'SEGUNDA' : `${n}ª`
      const { text } = await ExtractoTemplateEngine.render('poder-universal.txt', engineData, { NUMERO_COPIA: rotuloPalabra })
      const filename = `CONCUERDO_${rotuloPalabra}_COPIA.txt`
      const mimeType = 'text/plain; charset=utf-8'
      const contentBase64 = Buffer.from(text, 'utf8').toString('base64')
      documents.push({ index: n, title: `${rotuloPalabra} COPIA`, filename, mimeType, contentBase64 })
    }

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({ success: true, data: { documents, engine: engineInfo } })
  } catch (error) {
    console.error('Error generando documentos de concuerdo:', error)
    return res.status(500).json({ success: false, message: 'Error generando documentos' })
  }
}

export { generateDocuments }


