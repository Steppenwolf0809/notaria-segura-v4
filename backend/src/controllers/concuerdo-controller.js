import PdfExtractorService from '../services/pdf-extractor-service.js'

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

    // Preparar fuente de actos (usar acts si viene; si no, construir con el acto único)
    let actsData = Array.isArray(acts) && acts.length > 0
      ? acts
      : [{ tipoActo: tipoActo, otorgantes, beneficiarios }]

    // Validar que haya al menos un acto con tipo y con otorgante(s)
    const hasValidAct = actsData.some(a => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo)
      const ots = safeArray(a?.otorgantes)
      return tipo && ots.length > 0
    })
    if (!hasValidAct) {
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios' })
    }

    const firstToken = (full) => String(full || '').trim().split(/\s+/)[0]?.toUpperCase() || ''
    const isFemale = (n) => {
      const token = firstToken(n)
      const femaleList = new Set(['MARIA','ANA','ROSA','ELENA','FERNANDA','LUISA','VALERIA','CAMILA','GABRIELA','SOFIA','ISABEL','PATRICIA','VERONICA'])
      return femaleList.has(token) || token.endsWith('A')
    }
    // Construir texto por actos con conectores "y de"
    const humanJoin = (arr) => {
      const list = arr.filter(Boolean)
      if (list.length <= 1) return list[0] || ''
      if (list.length === 2) return `${list[0]} y ${list[1]}`
      return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`
    }

    // Generar segmentos por acto
    const segments = actsData.map((a) => {
      const tipo = PdfExtractorService.cleanActType(a.tipoActo)
      const otList = safeArray(a.otorgantes)
      const beList = safeArray(a.beneficiarios)
      const otRaw = otList[0] || ''
      const beRaw = beList[0] || ''
      const otTrat = isFemale(otRaw) ? 'la señora' : 'el señor'
      const beTrat = isFemale(beRaw) ? 'la señora' : 'el señor'
      const otTexto = humanJoin(otList)
      const beTexto = humanJoin(beList)
      const base = `de la escritura pública de ${tipo} que otorga ${otTrat} ${otTexto}`
      return beTexto ? `${base} a favor de ${beTrat} ${beTexto}` : base
    })

    const actsText = segments.length > 0
      ? segments[0] + segments.slice(1).map(s => ` y ${s.replace(/^de la escritura pública de /i, 'de ')}`).join('')
      : ''

    const suffixNotaria = (() => {
      const parts = []
      if (notario && String(notario).trim()) parts.push(`Notario: ${String(notario).trim()}`)
      if (notariaNumero && String(notariaNumero).trim()) parts.push(`Notaría N° ${String(notariaNumero).trim()}`)
      return parts.length ? ' ' + parts.join('. ') + '.' : ''
    })()

    const preview = `Se otorgó ante mí, en fe de ello confiero esta PRIMERA COPIA CERTIFICADA ${actsText}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.${suffixNotaria}`

    // Generar múltiples vistas previas individuales
    const copies = Math.max(1, Math.min(10, parseInt(numeroCopias || 2)))
    const previews = Array.from({ length: copies }, (_, idx) => {
      const n = idx + 1
      const rotulo = n === 1 ? 'PRIMERA COPIA' : n === 2 ? 'SEGUNDA COPIA' : `${n}ª COPIA`
      const content = `${rotulo}:\n\n${preview}`
      return { index: n, title: rotulo, text: content }
    })

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({ success: true, data: { previewText: preview, previews } })
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

    // Preparar fuente de actos
    let actsData = Array.isArray(acts) && acts.length > 0
      ? acts
      : [{ tipoActo: tipoActo, otorgantes, beneficiarios }]

    // Validación mínima
    const hasValidAct = actsData.some(a => {
      const tipo = PdfExtractorService.cleanActType(a?.tipoActo)
      const ots = safeArray(a?.otorgantes)
      return tipo && ots.length > 0
    })
    if (!hasValidAct) {
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios' })
    }

    const copies = Math.max(1, Math.min(10, parseInt(numCopias || 2)))

    const firstToken2 = (full) => String(full || '').trim().split(/\s+/)[0]?.toUpperCase() || ''
    const isFemaleName = (full) => {
      const first = firstToken2(full)
      const femaleList = new Set(['MARIA','ANA','ROSA','ELENA','FERNANDA','LUISA','VALERIA','CAMILA','GABRIELA','SOFIA','ISABEL','PATRICIA','VERONICA'])
      return femaleList.has(first) || first.endsWith('A')
    }

    const humanJoin = (arr) => {
      const list = (arr || []).filter(Boolean)
      if (list.length <= 1) return list[0] || ''
      if (list.length === 2) return `${list[0]} y ${list[1]}`
      return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`
    }

    const buildActsText = () => {
      const segs = actsData.map((a) => {
        const tipo = PdfExtractorService.cleanActType(a.tipoActo)
        const ots = safeArray(a.otorgantes)
        const bes = safeArray(a.beneficiarios)
        const otRaw = ots[0] || ''
        const beRaw = bes[0] || ''
        const otGenero = isFemaleName(otRaw) ? 'la señora' : 'el señor'
        const beGenero = isFemaleName(beRaw) ? 'la señora' : 'el señor'
        const otTexto = humanJoin(ots)
        const beTexto = humanJoin(bes)
        const base = `de la escritura pública de ${tipo} que otorga ${otGenero} ${otTexto}`
        return beTexto ? `${base} a favor de ${beGenero} ${beTexto}` : base
      })
      if (segs.length === 0) return ''
      return segs[0] + segs.slice(1).map(s => ` y ${s.replace(/^de la escritura pública de /i, 'de ')}`).join('')
    }

    const suffixNotaria = (() => {
      const parts = []
      if (notario && String(notario).trim()) parts.push(`Notario: ${String(notario).trim()}`)
      if (notariaNumero && String(notariaNumero).trim()) parts.push(`Notaría N° ${String(notariaNumero).trim()}`)
      return parts.length ? ' ' + parts.join('. ') + '.' : ''
    })()

    const buildTexto = (rotuloPalabra) => `Se otorgó ante mí, en fe de ello confiero esta ${rotuloPalabra} COPIA CERTIFICADA ${buildActsText()}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.${suffixNotaria}`

    const documents = []
    for (let i = 0; i < copies; i++) {
      const n = i + 1
      const rotuloPalabra = n === 1 ? 'PRIMERA' : n === 2 ? 'SEGUNDA' : `${n}ª`
      const texto = buildTexto(rotuloPalabra)
      const filename = `CONCUERDO_${rotuloPalabra}_COPIA.txt`
      const mimeType = 'text/plain; charset=utf-8'
      const contentBase64 = Buffer.from(texto, 'utf8').toString('base64')
      documents.push({ index: n, title: `${rotuloPalabra} COPIA`, filename, mimeType, contentBase64 })
    }

    res.set('Content-Type', 'application/json; charset=utf-8')
    return res.json({ success: true, data: { documents } })
  } catch (error) {
    console.error('Error generando documentos de concuerdo:', error)
    return res.status(500).json({ success: false, message: 'Error generando documentos' })
  }
}

export { generateDocuments }


