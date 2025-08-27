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

    res.set('Content-Type', 'application/json; charset=utf-8')
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
    const { tipoActo, otorgantes, beneficiarios, numCopias = 2 } = req.body || {}

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

    const isFemaleName = (full) => {
      if (!full) return false
      const tokens = String(full).trim().toUpperCase().split(/\s+/)
      const firstName = tokens[tokens.length - 1] || ''
      const femaleList = ['MARIA','ANA','ROSA','ELENA','FERNANDA','LUISA','VALERIA','CAMILA','GABRIELA','SOFIA','ISABEL','PATRICIA']
      if (femaleList.includes(firstName)) return true
      return firstName.endsWith('A')
    }

    const otRaw = (Array.isArray(otorgs) && otorgs.length) ? otorgs[0] : ''
    const beRaw = (Array.isArray(benefs) && benefs.length) ? benefs[0] : ''
    const otGenero = isFemaleName(otRaw) ? 'la señora' : 'el señor'
    const beGenero = isFemaleName(beRaw) ? 'la señora' : 'el señor'

    const buildTexto = (rotuloPalabra) => `Se otorgó ante mí, en fe de ello confiero esta ${rotuloPalabra} COPIA CERTIFICADA de la escritura pública de ${tipo} que otorga ${otGenero} ${otRaw} a favor de ${beGenero} ${beRaw}, la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.`

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


