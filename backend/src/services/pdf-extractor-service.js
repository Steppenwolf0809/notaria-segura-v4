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
            .replace(/\r/g, '')
            .replace(/[\t\f]+/g, ' ')
            .replace(/ +/g, ' ')
            .replace(/ *\n */g, '\n')
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
            .replace(/\r/g, '')
            .replace(/[\t\f]+/g, ' ')
            .replace(/ +/g, ' ')
            .replace(/ *\n */g, '\n')
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
      .replace(/\s*:\s*/g, ': ')
      .toUpperCase()

    const getMatch = (regex) => {
      const m = normalized.match(regex)
      return m && m[1] ? m[1].trim() : ''
    }

    // Regex básicos y tolerantes (Sprint 1) respetando saltos de línea
    const tipoActo = getMatch(/ACTO O CONTRATO[:\-]?\s*([\s\S]*?)(?:\n| FECHA| OTORGADO POR| OTORGANTE| OTORGANTES| A FAVOR DE| BENEFICIARIO|$)/)
    const otorgantesRaw = getMatch(/(?:OTORGADO POR|OTORGANTE|OTORGANTES)[:\-]?\s*([\s\S]*?)(?:\n| A FAVOR DE| BENEFICIARIO| NOTARIO| ACTO O CONTRATO|$)/)
    const beneficiariosRaw = getMatch(/(?:A FAVOR DE|BENEFICIARIO(?:S)?)[:\-]?\s*([\s\S]*?)(?:\n| NOTARIO| ACTO O CONTRATO|$)/)
    let notario = getMatch(/NOTARIO[:\-]?\s*([\s\S]*?)(?:\n|$)/)

    const splitPeople = (s) => {
      if (!s) return []
      return s
        .replace(/PERSONANOMBRES?\/RAZ[ÓO]N SOCIAL/gi, '')
        .replace(/TIPO INTERVINIENTE/gi, '')
        .replace(/DOCUMENTO DE IDENTIDAD\s*NO/gi, '')
        .replace(/^S\s+/i, '')
        .split(/\n|,|;| Y | E /)
        .map((x) => x.trim())
        .filter((x) => x && x.length > 1)
    }

    // Limpieza de notario: quitar (A), AB., ABG. iniciales
    if (notario) {
      notario = notario
        .replace(/^\(A\)\s*/i, '')
        .replace(/^ABG?\.?\s*/i, '')
        .trim()
    }

    return {
      tipoActo: tipoActo || '',
      otorgantes: splitPeople(otorgantesRaw),
      beneficiarios: splitPeople(beneficiariosRaw),
      notario: notario || undefined
    }
  },

  /**
   * Parser avanzado: detecta múltiples actos y busca etiquetas comunes
   * - Soporta múltiples ocurrencias de "ACTO O CONTRATO"
   * - Extrae bloques entre "OTORGADO POR"/"OTORGANTES" y "A FAVOR DE"/"BENEFICIARIO(S)"
   * - Considera etiquetas "NOMBRES/RAZÓN SOCIAL" y variaciones
   * @param {string} rawText
   * @returns {{ acts: Array<{ tipoActo: string, otorgantes: string[], beneficiarios: string[], notario?: string }>} }
   */
  parseAdvancedData(rawText) {
    if (!rawText || typeof rawText !== 'string') return { acts: [] }

    const text = rawText.replace(/\s+/g, ' ').trim()
    const upper = text.toUpperCase()

    // Encontrar posiciones de secciones de ACTO O CONTRATO
    const actRegex = /ACTO\s+O\s+CONTRATO\s*[:\-]?\s*(.+?)(?=ACTO\s+O\s+CONTRATO\s*[:\-]?|$)/gis
    const acts = []
    let match
    while ((match = actRegex.exec(upper)) !== null) {
      const fullSection = match[0]
      const tipoActo = (match[1] || '').trim()

      // Dentro de la sección, buscar otorgantes y beneficiarios
      const section = fullSection

      const blockBetween = (startRegex, endRegex) => {
        const s = section.search(startRegex)
        if (s === -1) return ''
        const afterStart = section.slice(s)
        const e = afterStart.search(endRegex)
        return e === -1 ? afterStart.replace(startRegex, '') : afterStart.slice(0, e).replace(startRegex, '')
      }

      // Variantes de etiquetas
      const startOtRegex = /(?:OTORGADO\s+POR|OTORGANTE(?:S)?|NOMBRES\s*\/\s*RAZ[ÓO]N\s+SOCIAL)\s*[:\-]?\s*/i
      const startBenRegex = /(?:A\s+FAVOR\s+DE|BENEFICIARIO(?:S)?)\s*[:\-]?\s*/i
      const notarioRegex = /NOTARIO\s*[:\-]?\s*(.+?)(?:\.|$)/i

      const otorgantesRaw = blockBetween(startOtRegex, startBenRegex)
      const beneficiariosRaw = blockBetween(startBenRegex, /NOTARIO|\.$/i)

      const splitPeople = (s) => {
        if (!s) return []
        return s
          .replace(/\s+/g, ' ')
          .split(/,|;|\s+Y\s+|\s+E\s+/i)
          .map((x) => x.trim())
          .filter((x) => x && x.length > 1)
      }

      let notario
      const notMatch = section.match(notarioRegex)
      if (notMatch && notMatch[1]) notario = notMatch[1].trim()

      acts.push({
        tipoActo: tipoActo || '',
        otorgantes: splitPeople(otorgantesRaw),
        beneficiarios: splitPeople(beneficiariosRaw),
        ...(notario ? { notario } : {})
      })
    }

    // Si no detectó ninguna sección "ACTO O CONTRATO", intentar con parseSimpleData
    if (acts.length === 0) {
      const single = this.parseSimpleData(rawText)
      return { acts: [single] }
    }

    return { acts }
  }
}

export default PdfExtractorService

