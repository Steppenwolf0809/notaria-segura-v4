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
      // Validación simple de cabecera PDF
      if (!pdfBuffer || pdfBuffer.length < 5) {
        throw new Error('Archivo vacío o corrupto')
      }
      const header = pdfBuffer.toString('ascii', 0, 4)
      if (header !== '%PDF') {
        throw new Error('El archivo no parece ser un PDF válido')
      }

      // Estrategia 1: pdf-parse
      const text1 = await (async () => {
        try {
          // Importación dinámica para evitar side-effects al arrancar
          let pdfParse
          try {
            const modDirect = await import('pdf-parse/lib/pdf-parse.js')
            pdfParse = modDirect?.default || modDirect
          } catch (_) {
            const mod = await import('pdf-parse')
            pdfParse = mod?.default || mod
          }
          const data = await pdfParse(pdfBuffer)
          const text = (data.text || '')
            .replace(/\u0000/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          return text
        } catch (e) {
          return ''
        }
      })()

      // Si es suficientemente bueno, devolver
      if (text1 && text1.length >= 20) return text1

      // Estrategia 2: pdfjs-dist (fallback)
      const text2 = await (async () => {
        try {
          const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
          const pdfjsLib = pdfjs?.default || pdfjs
          // Desactivar worker en Node
          if (pdfjsLib?.GlobalWorkerOptions) {
            try { pdfjsLib.GlobalWorkerOptions.workerSrc = '' } catch {}
          }
          const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer })
          const doc = await loadingTask.promise
          const maxPages = Math.min(doc.numPages || 1, 50)
          let out = ''
          for (let i = 1; i <= maxPages; i++) {
            const page = await doc.getPage(i)
            const content = await page.getTextContent()
            const strings = content.items?.map(item => item.str).filter(Boolean) || []
            out += strings.join(' ') + '\n'
          }
          return out
            .replace(/\u0000/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        } catch (e) {
          return ''
        }
      })()

      if (text2 && text2.length >= 20) return text2

      // Estrategia 3 (opcional futura): pdftotext del sistema si está habilitado
      if (process.env.PDF_USE_PDFTOTEXT === 'true') {
        try {
          const { spawn } = await import('node:child_process')
          const child = spawn('pdftotext', ['-', '-'], { stdio: ['pipe', 'pipe', 'pipe'] })
          let stdout = ''
          let stderr = ''
          child.stdout.on('data', (d) => { stdout += d.toString('utf8') })
          child.stderr.on('data', (d) => { stderr += d.toString('utf8') })
          const res = await new Promise((resolve, reject) => {
            child.on('error', reject)
            child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || `pdftotext exited ${code}`)))
          })
          if (res && res.trim().length >= 20) return res.trim()
        } catch (_) { /* ignore */ }
      }

      // Si ninguno funcionó, lanzar error controlado
      const err = new Error('No se pudo extraer texto del PDF con los métodos disponibles')
      throw err
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


