/**
 * Servicio de extracción y parsing básico de PDFs de extractos notariales
 * Sprint 1: Casos simples (un solo acto)
 */
const PdfExtractorService = {
  /**
   * Extrae texto plano desde un Buffer de PDF
   * @param {Buffer} pdfBuffer
   * @returns {Promise<string>} texto extraído
   */
  async extractText(pdfBuffer) {
    try {
      const mod = await import('pdf-parse')
      const pdf = mod?.default || mod
      const data = await pdf(pdfBuffer)
      // Limpiar y normalizar espacios
      const text = (data.text || '')
        .replace(/\u0000/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return text
    } catch (error) {
      const err = new Error('No se pudo extraer texto del PDF')
      err.cause = error
      throw err
    }
  },

  /**
   * Parser simple por regex para un solo acto
   * Busca secciones clave: ACTO O CONTRATO, OTORGADO POR, A FAVOR DE
   * @param {string} text
   * @returns {{ tipoActo: string, otorgantes: string[], beneficiarios: string[], notario?: string }}
   */
  parseSimpleData(text) {
    if (!text || typeof text !== 'string') {
      return { tipoActo: '', otorgantes: [], beneficiarios: [] }
    }

    const normalized = text
      .replace(/\s+/g, ' ')
      .replace(/\s*:\s*/g, ': ')
      .toUpperCase()

    const getMatch = (regex) => {
      const m = normalized.match(regex)
      return m && m[1] ? m[1].trim() : ''
    }

    // Regex básicos y tolerantes (Sprint 1):
    const tipoActo = getMatch(/ACTO O CONTRATO[:\-]?\s*(.+?)(?: OTORGADO POR| OTORGANTE| OTORGANTES| A FAVOR DE| BENEFICIARIO|$)/)
    const otorgantesRaw = getMatch(/(?:OTORGADO POR|OTORGANTE|OTORGANTES)[:\-]?\s*(.+?)(?: A FAVOR DE| BENEFICIARIO| NOTARIO|\.)/)
    const beneficiariosRaw = getMatch(/(?:A FAVOR DE|BENEFICIARIO(?:S)?)[:\-]?\s*(.+?)(?: NOTARIO|\.)/)
    const notario = getMatch(/NOTARIO[:\-]?\s*(.+?)(?:\.|$)/)

    const splitPeople = (s) => {
      if (!s) return []
      return s
        .split(/,|;| Y | E /)
        .map((x) => x.trim())
        .filter((x) => x && x.length > 1)
    }

    return {
      tipoActo: tipoActo || '',
      otorgantes: splitPeople(otorgantesRaw),
      beneficiarios: splitPeople(beneficiariosRaw),
      notario: notario || undefined
    }
  }
}

export default PdfExtractorService


