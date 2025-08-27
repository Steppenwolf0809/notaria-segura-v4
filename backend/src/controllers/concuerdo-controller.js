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
    if (mimetype !== 'application/pdf' && !originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, message: 'Formato inválido. Solo se permiten archivos PDF' })
    }

    // Límite adicional de seguridad (10MB) – multer ya valida pero reforzamos
    const MAX_SIZE = 10 * 1024 * 1024
    if (size > MAX_SIZE) {
      return res.status(400).json({ success: false, message: 'El archivo PDF es demasiado grande (máximo 10MB)' })
    }

    const text = await PdfExtractorService.extractText(buffer)

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

    const parsed = PdfExtractorService.parseSimpleData(text)

    return res.json({
      success: true,
      message: 'Datos extraídos correctamente',
      data: parsed
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
    const { tipoActo, otorgantes, beneficiarios, notario } = req.body || {}

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

    let preview = `Se otorgó ante mí, en fe de ello confiero esta COPIA CERTIFICADA de la escritura pública de ${tipo} que ${verboOtorgar} ${otorgantesTexto}`
    if (beneficiariosTexto) preview += `, a favor de ${beneficiariosTexto}`
    preview += ', la misma que se encuentra debidamente firmada y sellada en el mismo lugar y fecha de su celebración.'
    if (notarioStr) preview += ` (Notario: ${notarioStr}).`

    return res.json({ success: true, data: { previewText: preview } })
  } catch (error) {
    console.error('Error en previewConcuerdo:', error)
    return res.status(500).json({ success: false, message: 'Error generando vista previa' })
  }
}

export { uploadPdf, extractData, previewConcuerdo }


