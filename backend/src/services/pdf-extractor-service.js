/**
 * Servicio de extracción y parsing básico de PDFs de extractos notariales
 * Sprint 1: Casos simples (un solo acto)
 */
const PdfExtractorService = {
  /**
   * Limpia el tipo de acto para eliminar metadata (PERSONA NATURAL, FECHA, etc.)
   */
  cleanActType(s) {
    const txt = String(s || '').toUpperCase().replace(/\s+/g, ' ').trim()
    const cutKeys = [' FECHA', ' OTORGANTE', ' OTORGADO', ' A FAVOR', ' PERSONA ', ' UBICACI', ' PROVINCIA', ' CANTON', ' PARROQUIA', ' DESCRIP', ' CUANT', ' DOCUMENTO']
    let base = txt
    for (const k of cutKeys) {
      const i = base.indexOf(k)
      if (i !== -1) base = base.slice(0, i)
    }
    base = base.replace(/\bPERSONA\s+NATURAL\b/g, '').replace(/\bPERSONA\s+JUR[IÍ]DICA\b/g, '')
    base = base.replace(/\s+/g, ' ').trim()
    return base
  },

  /**
   * Extrae nombre de notario (después de (A)) y número de notaría (línea siguiente o inmediata)
   */
  extractNotaryInfo(rawText) {
    if (!rawText) return { notarioNombre: undefined, notariaNumero: undefined }
    // Trabajar con saltos de línea para mayor precisión
    const text = String(rawText).replace(/\r/g, '').replace(/[\t\f]+/g, ' ')
    const lines = text.split(/\n+/)
    let notarioNombre
    let notariaNumero

    // Utilidad: normaliza texto (sin acentos) y mapea ordinales en español → número
    const toAsciiUpper = (s) => String(s || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toUpperCase()
      .trim()

    const unitOrdinals = new Map([
      ['PRIMER', 1], ['PRIMERA', 1], ['PRIMERO', 1], ['UNO', 1], ['UNA', 1],
      ['SEGUNDA', 2], ['SEGUNDO', 2], ['DOS', 2],
      ['TERCERA', 3], ['TERCERO', 3], ['TRES', 3],
      ['CUARTA', 4], ['CUARTO', 4], ['CUATRO', 4],
      ['QUINTA', 5], ['QUINTO', 5], ['CINCO', 5],
      ['SEXTA', 6], ['SEXTO', 6], ['SEIS', 6],
      ['SEPTIMA', 7], ['SEPTIMO', 7], ['SIETE', 7],
      ['OCTAVA', 8], ['OCTAVO', 8], ['OCHO', 8],
      ['NOVENA', 9], ['NOVENO', 9], ['NUEVE', 9]
    ])
    const tensOrdinals = new Map([
      ['DECIMA', 10], ['DECIMO', 10],
      ['VIGESIMA', 20], ['VIGESIMO', 20],
      ['TRIGESIMA', 30], ['TRIGESIMO', 30],
      ['CUADRAGESIMA', 40], ['CUADRAGESIMO', 40],
      ['QUINCUAGESIMA', 50], ['QUINCUAGESIMO', 50]
    ])
    const teenOrdinals = new Map([
      ['UNDECIMA', 11], ['UNDECIMO', 11], ['UNDECIMAPRIMERA', 11], ['UNDECIMOPRIMERA', 11],
      ['DUODECIMA', 12], ['DUODECIMO', 12],
      ['DECIMOTERCERA', 13], ['DECIMOTERCERO', 13], ['DECIMO TERCERA', 13],
      ['DECIMOCUARTA', 14], ['DECIMOCUARTO', 14], ['DECIMO CUARTA', 14],
      ['DECIMOQUINTA', 15], ['DECIMOQUINTO', 15], ['DECIMO QUINTA', 15],
      ['DECIMOSEXTA', 16], ['DECIMOSEXTO', 16], ['DECIMO SEXTA', 16],
      ['DECIMOSEPTIMA', 17], ['DECIMOSEPTIMO', 17], ['DECIMO SEPTIMA', 17],
      ['DECIMOOCTAVA', 18], ['DECIMOOCTAVO', 18], ['DECIMO OCTAVA', 18], ['DECIMO OCTAVO', 18],
      ['DECIMONOVENA', 19], ['DECIMONOVENO', 19], ['DECIMO NOVENA', 19]
    ])
    const parseOrdinalWords = (s) => {
      const base = toAsciiUpper(s).replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim()
      if (!base) return undefined
      // Casos combinados pegados: DECIMOQUINTA, VIGESIMOPRIMERA, etc.
      const glued = base.replace(/\s+/g, '')
      if (teenOrdinals.has(glued)) return String(teenOrdinals.get(glued))
      // Tens + unit: e.g., DECIMA OCTAVA → 10 + 8; VIGESIMA SEGUNDA → 20 + 2
      const tokens = base.split(' ')
      let total = 0
      for (const t of tokens) {
        if (teenOrdinals.has(t)) { total = teenOrdinals.get(t); continue }
        if (tensOrdinals.has(t)) { total += tensOrdinals.get(t); continue }
        if (unitOrdinals.has(t)) { total += unitOrdinals.get(t); continue }
        // Combinados pegados dentro de un token
        const tt = t
        for (const [k, v] of tensOrdinals.entries()) {
          if (tt.startsWith(k)) {
            total += v
            const rest = tt.slice(k.length)
            if (unitOrdinals.has(rest)) total += unitOrdinals.get(rest)
          }
        }
      }
      return total > 0 ? String(total) : undefined
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx]
      const m = line.match(/\(\s*A\s*\)\s*([A-ZÁÉÍÓÚÑ\s\.]\S.*)$/i)
      if (m) {
        // Nombre completo después de (A)
        let nombre = m[1].toUpperCase().trim()
        nombre = nombre.replace(/^ABG\.?\s*/i, '').replace(/^AB\.?\s*/i, '').replace(/^DR\.?\s*/i, '').replace(/^LCDO\.?\s*/i, '')
        // Cortar si trae algo como NOTARIA en la misma línea
        const cut = nombre.search(/NOTAR[ÍI]A|Nº|N°|NO\.?/i)
        if (cut !== -1) nombre = nombre.slice(0, cut).trim()
        notarioNombre = nombre

        // Buscar número de notaría en la misma o siguiente línea(s)
        for (let j = idx; j < Math.min(idx + 3, lines.length); j++) {
          const l = lines[j].toUpperCase()
          const n = l.match(/NOTAR[ÍI]A\s*(?:N°|Nº|NO\.?|NUMERO)?\s*(\d{1,3})/i)
          if (n) { notariaNumero = n[1]; break }
        }
        break
      }
    }

    // Fallback: buscar globalmente si no se encontró con (A)
    if (!notarioNombre) {
      const m2 = text.toUpperCase().match(/\(\s*A\s*\)\s*([A-ZÁÉÍÓÚÑ\s\.]\S.*)/)
      if (m2) notarioNombre = m2[1].replace(/^ABG\.?\s*/i, '').trim()
    }
    if (!notariaNumero) {
      const upper = text.toUpperCase()
      // Caso 1: formato numérico
      const n2 = upper.match(/NOTAR[ÍI]A\s*(?:N°|Nº|NO\.?|NUMERO)?\s*(\d{1,3})/)
      if (n2) {
        notariaNumero = n2[1]
      } else {
        // Caso 2: ordinal en palabras, ej. "NOTARÍA DÉCIMA OCTAVA DEL CANTON QUITO"
        const mOrdinal = upper.match(/NOTAR[ÍI]A\s+([A-ZÁÉÍÓÚÑ\s]{3,40}?)\s+DEL\s+CANT[ÓO]N/)
        if (mOrdinal && mOrdinal[1]) {
          const numFromWords = parseOrdinalWords(mOrdinal[1])
          if (numFromWords) notariaNumero = numFromWords
        }
      }
    }

    return { notarioNombre, notariaNumero }
  },
  /**
   * Reordena "APELLIDOS NOMBRES" → "NOMBRES APELLIDOS" (heurística)
   */
  reorderName(nameUpper) {
    if (!nameUpper) return ''
    const tokens = String(nameUpper).trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
    const n = tokens.length
    if (n <= 1) return tokens.join(' ')
    const particles = new Set(['DE','DEL','DELA','DELOS','DELAS','LA','LOS','LAS','SAN','SANTA'])
    const female = new Set(['MARIA','ANA','ROSA','ELENA','FERNANDA','LUISA','VALERIA','CAMILA','GABRIELA','SOFIA','ISABEL','PATRICIA','VERONICA'])
    const male   = new Set(['JOSE','JUAN','CARLOS','DANIEL','MIGUEL','DIEGO','ANDRES','LUIS','PEDRO','PABLO','FRANCISCO','JAVIER','FERNANDO','ROBERTO'])
    const isParticle = (t) => particles.has(t)
    const isProbableName = (t) => female.has(t) || male.has(t) || /[AEIO]$/.test(t)

    let nameCount
    if (n === 2) {
      nameCount = 1
    } else if (n === 3) {
      const last = tokens[n-1], prev = tokens[n-2]
      nameCount = (isProbableName(last) && isProbableName(prev)) ? 2 : 1
    } else { // 4 o 5
      const prev = tokens[n-2]
      nameCount = isParticle(prev) ? 1 : 2
    }
    nameCount = Math.max(1, Math.min(2, nameCount))
    const names = tokens.slice(-nameCount)
    const surnames = tokens.slice(0, n - nameCount)
    return (names.join(' ') + ' ' + surnames.join(' ')).replace(/\s+/g, ' ').trim()
  },
  /**
   * Extrae nombres de personas en mayúsculas, eliminando metadatos y encabezados.
   */
  cleanPersonNames(raw) {
    if (!raw) return []
    // Normalizar
    let upper = String(raw)
      .replace(/[\t\r\f]+/g, ' ')
      .replace(/ +/g, ' ')
      .toUpperCase()
      .trim()

    // Eliminar encabezados conocidos
    const headers = [
      'PERSONA', 'NOMBRES', 'TIPO', 'INTERVINIENTE', 'DOCUMENTO', 'IDENTIDAD', 'NACIONALIDAD',
      'CALIDAD', 'REPRESENTA', 'UBICACION', 'PROVINCIA', 'CANTON', 'DESCRIPCION', 'CUANTIA'
    ]
    const headerRegex = new RegExp(`\\b(?:${headers.join('|')})\\b`, 'g')
    upper = upper.replace(headerRegex, ' ')

    // Si existe NATURAL, recortar después de NATURAL y antes de POR SUS PROPIOS
    const natIdx = upper.indexOf('NATURAL')
    if (natIdx !== -1) {
      let region = upper.slice(natIdx + 'NATURAL'.length)
      const stop = region.indexOf('POR SUS PROPIOS')
      if (stop !== -1) region = region.slice(0, stop)
      upper = region.trim()
    }

    // Regex: 2 a 5 palabras en mayúsculas con acentos
    const nameRegex = /([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,4})/g
    const names = []
    let m
    while ((m = nameRegex.exec(upper)) !== null) {
      const candidate = m[1].replace(/\s+/g, ' ').trim()
      if (!candidate) continue
      const reordered = this.reorderName(candidate)
      if (!names.includes(reordered)) names.push(reordered)
    }
    return names
  },
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
    const tipoActo = this.cleanActType(getMatch(/ACTO O CONTRATO[:\-]?\s*([\s\S]*?)(?:\n| FECHA| OTORGADO POR| OTORGANTE| OTORGANTES| A FAVOR DE| BENEFICIARIO|$)/))
    const otorgantesRaw = getMatch(/(?:OTORGADO POR|OTORGANTE|OTORGANTES)[:\-]?\s*([\s\S]*?)(?:\n| A FAVOR DE| BENEFICIARIO| NOTARIO| ACTO O CONTRATO|$)/)
    const beneficiariosRaw = getMatch(/(?:A FAVOR DE|BENEFICIARIO(?:S)?)[:\-]?\s*([\s\S]*?)(?:\n| NOTARIO| ACTO O CONTRATO|$)/)
    let notario = getMatch(/NOTARIO[:\-]?\s*([\s\S]*?)(?:\n|$)/)

    // Limpieza de notario: quitar (A), AB., ABG. iniciales
    if (notario) {
      notario = notario
        .replace(/^\(A\)\s*/i, '')
        .replace(/^ABG?\.?\s*/i, '')
        .trim()
    }

    return {
      tipoActo: tipoActo || '',
      otorgantes: this.cleanPersonNames(otorgantesRaw),
      beneficiarios: this.cleanPersonNames(beneficiariosRaw),
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
      const tipoActoRaw = (match[1] || '').trim()
      const tipoActo = this.cleanActType(tipoActoRaw)

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

      let otorgantesRaw = blockBetween(startOtRegex, startBenRegex)
      let beneficiariosRaw = blockBetween(startBenRegex, /NOTARIO|\.$/i)

      // Afinar con ancla NATURAL dentro de la sección para otorgantes
      const secUpper = section.toUpperCase()
      const idxNat = secUpper.indexOf('NATURAL')
      if (idxNat !== -1) {
        let region = secUpper.slice(idxNat + 'NATURAL'.length)
        const stop = region.search(/A\s+FAVOR\s+DE|BENEFICIARIO|NOTARIO|\.$/i)
        if (stop !== -1) region = region.slice(0, stop)
        otorgantesRaw = region
      }

      let notario
      const notMatch = section.match(notarioRegex)
      if (notMatch && notMatch[1]) notario = notMatch[1].trim()

      // Intentar dividir múltiples actos dentro de una sola sección "ACTO O CONTRATO"
      const splitMultiActs = (s) => {
        const base = String(s || '').replace(/\s+/g, ' ').trim()
        if (!base) return []
        // Separadores comunes y listas numeradas
        let tmp = base
          .replace(/\b\d+\s*[\).:-]\s*/g, '|') // 1), 2., 3:
          .replace(/\s+[-–—]\s+/g, '|')
          .replace(/\s+Y\s+/g, '|')
          .replace(/\s+E\s+/g, '|')
          .replace(/\s*[,;/]\s*/g, '|')
        const parts = tmp.split('|').map(p => this.cleanActType(p)).filter(p => p && p.length >= 3)
        // Descartar duplicados triviales
        return Array.from(new Set(parts))
      }

      const multi = splitMultiActs(tipoActoRaw)
      const actsTitles = multi.length > 1 ? multi : [tipoActo]

      const otClean = this.cleanPersonNames(otorgantesRaw)
      const beClean = this.cleanPersonNames(beneficiariosRaw)
      for (const title of actsTitles) {
        acts.push({
          tipoActo: title || '',
          otorgantes: otClean,
          beneficiarios: beClean,
          ...(notario ? { notario } : {})
        })
      }
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
