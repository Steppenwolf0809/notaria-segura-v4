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

    return res.json({
      success: true,
      message: 'Datos extraídos correctamente',
      data: { ...parsed, acts }
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
    const { tipoActo, otorgantes, beneficiarios, notario, numeroCopias = 2 } = req.body || {}

    const safeArray = (v) => Array.isArray(v)
      ? v.map((x) => String(x || '').trim()).filter(Boolean)
      : String(v || '').split(/\n|,|;/).map((x) => x.trim()).filter(Boolean)

    const tipo = String(tipoActo || '').trim()
    const otorgs = safeArray(otorgantes)
    const benefs = safeArray(beneficiarios)
    const notarioStr = String(notario || '').trim()

    if (!tipo || otorgs.length === 0) {
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios' })
    }

    const verboOtorgar = otorgs.length > 1 ? 'otorgan' : 'otorga'

    const humanJoin = (arr) => {
      if (arr.length === 1) return arr[0]
      if (arr.length === 2) return `${arr[0]} y ${arr[1]}`
      return `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`
    }

    const otorgantesTexto = humanJoin(otorgs)
    const beneficiariosTexto = benefs.length ? humanJoin(benefs) : ''

    // Construcción de texto (sin fecha, numeración de copias)
    let preview = `Se otorgó ante mí, en fe de ello confiero esta ${numeroCopias === 1 ? 'COPIA CERTIFICADA' : `${numeroCopias} COPIAS CERTIFICADAS`} de la escritura pública de ${tipo} que ${verboOtorgar} ${otorgantesTexto}`
    if (beneficiariosTexto) preview += `, a favor de ${beneficiariosTexto}`
    preview += ', la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.'
    if (notarioStr) preview += ` (Notario: ${notarioStr}).`

    // Generar múltiples vistas previas individuales
    const copies = Math.max(1, Math.min(10, parseInt(numeroCopias || 2)))
    const previews = Array.from({ length: copies }, (_, idx) => {
      const n = idx + 1
      const rotulo = n === 1 ? 'PRIMERA COPIA' : n === 2 ? 'SEGUNDA COPIA' : `${n}ª COPIA`
      const content = `${rotulo}:\n\n${preview}`
      return { index: n, title: rotulo, text: content }
    })

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
    const { tipoActo, otorgantes, beneficiarios, numCopias = 2, notario, format = 'html' } = req.body || {}

    const safeArray = (v) => Array.isArray(v)
      ? v.map((x) => String(x || '').trim()).filter(Boolean)
      : String(v || '').split(/\n|,|;/).map((x) => x.trim()).filter(Boolean)

    const tipo = String(tipoActo || '').trim()
    const otorgs = safeArray(otorgantes)
    const benefs = safeArray(beneficiarios)

    if (!tipo || otorgs.length === 0) {
      return res.status(400).json({ success: false, message: 'Tipo de acto y al menos un otorgante son obligatorios' })
    }

    const copies = Math.max(1, Math.min(10, parseInt(numCopias || 2)))

    const buildHtml = (title, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family: Arial, sans-serif; line-height:1.5; padding:24px} h1{font-size:18px} .meta{color:#666;font-size:12px}</style></head>
      <body><h1>${title}</h1><div>${body}</div><div class=\"meta\">Generado por Notaría Segura</div></body></html>`

    const verboOtorgar = otorgs.length > 1 ? 'otorgan' : 'otorga'
    const humanJoin = (arr) => {
      if (arr.length === 1) return arr[0]
      if (arr.length === 2) return `${arr[0]} y ${arr[1]}`
      return `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`
    }
    const otorgantesTexto = humanJoin(otorgs)
    const beneficiariosTexto = benefs.length ? `, a favor de ${humanJoin(benefs)}` : ''
    const notarioStr = notario ? ` (Notario: ${String(notario).trim()})` : ''

    const baseParagraph = `Se otorgó ante mí, en fe de ello confiero esta COPIA CERTIFICADA de la escritura pública de ${tipo} que ${verboOtorgar} ${otorgantesTexto}${beneficiariosTexto}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.${notarioStr}.`

    const documents = []
    for (let i = 0; i < copies; i++) {
      const n = i + 1
      const rotulo = n === 1 ? 'PRIMERA_COPIA' : n === 2 ? 'SEGUNDA_COPIA' : `${n}_COPIA`
      const title = `${rotulo.replace('_', ' ')} - ${tipo}`
      let mimeType = 'text/html'
      let filename = `CONCUERDO_${rotulo}.html`
      let contentString = buildHtml(title, `<p>${baseParagraph}</p>`)

      if (format === 'txt') {
        mimeType = 'text/plain'
        filename = `CONCUERDO_${rotulo}.txt`
        contentString = `${title}\n\n${baseParagraph}`
      }

      const contentBase64 = Buffer.from(contentString, 'utf8').toString('base64')
      documents.push({ index: n, title, filename, mimeType, contentBase64, simulated: format !== 'pdf' })
    }

    return res.json({ success: true, data: { documents } })
  } catch (error) {
    console.error('Error generando documentos de concuerdo:', error)
    return res.status(500).json({ success: false, message: 'Error generando documentos' })
  }
}

export { generateDocuments }


