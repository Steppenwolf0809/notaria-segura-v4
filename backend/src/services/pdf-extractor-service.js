import NotarialTableParser from './notarial-table-parser.js'

/**
 * Servicio de extracción y parsing básico de PDFs de extractos notariales
 * Sprint 1: Casos simples (un solo acto)
 * Incluye parser tabular avanzado como fallback
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
    let notarioSuplente = false

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
      // Caso 1: línea con NOTARIO(A) Nombre Apellidos
      const nLine = line.match(/NOTARIO\s*\(\s*A\s*\)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\.]*)$/i)
      if (nLine) {
        let nombre = nLine[1].toUpperCase().trim()
        // Detectar SUPLENTE
        if (/^SUPLENTE\b/.test(nombre)) {
          notarioSuplente = true
          nombre = nombre.replace(/^SUPLENTE\s+/, '')
        } else if (/\bSUPLENTE\b/.test(nombre)) {
          notarioSuplente = true
          nombre = nombre.replace(/\bSUPLENTE\b\s*/g, ' ').replace(/\s+/g, ' ').trim()
        }
        nombre = nombre.replace(/^ABG\.?\s*/i, '').replace(/^AB\.?\s*/i, '').replace(/^DR\.?\s*/i, '').replace(/^LCDO\.?\s*/i, '')
        notarioNombre = nombre.replace(/\s+/g, ' ').trim()
        // Buscar texto de notaría cercano
        for (let j = idx; j < Math.min(idx + 4, lines.length); j++) {
          const l = lines[j].toUpperCase().trim()
          const mNum = l.match(/NOTAR[ÍI]A\s*(.+)$/i)
          if (mNum && mNum[1]) {
            const raw = mNum[1].replace(/\s+/g, ' ').trim().replace(/[\.;,]+$/,'')
            notariaNumero = raw
            break
          }
        }
        continue
      }
      const m = line.match(/\(\s*A\s*\)\s*([A-ZÁÉÍÓÚÑ\s\.]\S.*)$/i)
      if (m) {
        // Nombre completo después de (A)
        let nombre = m[1].toUpperCase().trim()
        if (/^SUPLENTE\b/.test(nombre)) {
          notarioSuplente = true
          nombre = nombre.replace(/^SUPLENTE\s+/, '')
        } else if (/\bSUPLENTE\b/.test(nombre)) {
          notarioSuplente = true
          nombre = nombre.replace(/\bSUPLENTE\b\s*/g, ' ').replace(/\s+/g, ' ').trim()
        }
        nombre = nombre.replace(/^ABG\.?\s*/i, '').replace(/^AB\.?\s*/i, '').replace(/^DR\.?\s*/i, '').replace(/^LCDO\.?\s*/i, '')
        // Cortar si trae algo como NOTARIA en la misma línea
        const cut = nombre.search(/NOTAR[ÍI]A|Nº|N°|NO\.?/i)
        if (cut !== -1) nombre = nombre.slice(0, cut).trim()
        notarioNombre = nombre

        // Buscar texto de notaría en la misma o siguientes líneas
        for (let j = idx; j < Math.min(idx + 3, lines.length); j++) {
          const l = lines[j].toUpperCase().trim()
          // Capturar todo lo que sigue a "NOTARÍA " hasta fin de línea
          const mNum = l.match(/NOTAR[ÍI]A\s*(.+)$/i)
          if (mNum && mNum[1]) {
            notariaNumero = mNum[1].replace(/\s+/g, ' ').trim().replace(/[\.;,]+$/,'')
            break
          }
        }
        break
      }
    }

    // Fallback: buscar globalmente si no se encontró con (A)
    if (!notarioNombre) {
      // Intentar captura global NOTARIO(A) SUPLENTE
      const sup = text.toUpperCase().match(/NOTARIO\s*\(\s*A\s*\)\s*SUPLENTE\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\.]*)/)
      if (sup && sup[1]) {
        notarioSuplente = true
        notarioNombre = sup[1].replace(/^ABG\.?\s*/i, '').trim()
      }
      if (!notarioNombre) {
        const n3 = text.toUpperCase().match(/NOTARIO\s*\(\s*A\s*\)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\.]*)/)
        if (n3 && n3[1]) notarioNombre = n3[1].replace(/^ABG\.?\s*/i, '').trim()
      }
    }
    if (!notarioNombre) {
      const m2 = text.toUpperCase().match(/\(\s*A\s*\)\s*([A-ZÁÉÍÓÚÑ\s\.]\S.*)/)
      if (m2) notarioNombre = m2[1].replace(/^ABG\.?\s*/i, '').trim()
    }
    if (!notariaNumero) {
      const upper = text.toUpperCase()
      // Capturar texto posterior a NOTARÍA, preferentemente completo
      const mAny = upper.match(/NOTAR[ÍI]A\s+([^\n]+?)(?:\n|$)/)
      if (mAny && mAny[1]) {
        notariaNumero = mAny[1].replace(/\s+/g, ' ').trim().replace(/[\.;,]+$/,'')
      }
    }

    // Derivar número de notaría en dígitos cuando viene en palabras (e.g., DÉCIMA OCTAVA → 18)
    let notariaNumeroDigit
    if (notariaNumero) {
      const parsed = parseOrdinalWords(notariaNumero)
      if (parsed) notariaNumeroDigit = parsed
      // Aceptar formas "N° 18", "NO. 18"
      const numInline = String(notariaNumero)
        .replace(/,/g, ' ')
        .match(/\b(?:N[º°O\.]\s*)?(\d{1,3})\b/)
      if (!notariaNumeroDigit && numInline && numInline[1]) notariaNumeroDigit = numInline[1]
    }

    return { notarioNombre, notariaNumero, notariaNumeroDigit, notarioSuplente }
  },
  /**
   * Inteligente reordenamiento de nombres: detecta si ya están en orden correcto
   * o si necesitan reordenarse de "APELLIDOS NOMBRES" → "NOMBRES APELLIDOS"
   */
  reorderName(nameUpper) {
    if (!nameUpper) return ''
    const tokens = String(nameUpper).trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
    const n = tokens.length
    if (n <= 1) return tokens.join(' ')

    // Detectar empresas - no deben reordenarse
    const companyTokens = new Set(['S.A.', 'LTDA', 'LTDA.', 'CIA', 'CIA.', 'CORP', 'CORP.', 'INC', 'INC.', 'EMPRESA', 'COMPAÑIA', 'COMPANIA', 'CONSTRUCTORA', 'COMERCIAL', 'INDUSTRIAL'])
    if (tokens.some(token => companyTokens.has(token))) {
      return tokens.join(' ')
    }

    const particles = new Set(['DE','DEL','DELA','DELOS','DELAS','LA','LOS','LAS','SAN','SANTA','VON','VAN','DA','DI'])
    const female = new Set(['MARIA','ANA','ROSA','ELENA','FERNANDA','LUISA','VALERIA','CAMILA','GABRIELA','SOFIA','ISABEL','PATRICIA','VERONICA','CARMEN','LUZ'])
    const male = new Set(['JOSE','JUAN','CARLOS','DANIEL','MIGUEL','DIEGO','ANDRES','LUIS','PEDRO','PABLO','FRANCISCO','JAVIER','FERNANDO','ROBERTO','ANTONIO','MANUEL'])
    
    const isParticle = (t) => particles.has(t)
    const isProbableName = (t) => female.has(t) || male.has(t)
    const endsWithVowel = (t) => /[AEIO]$/.test(t)

    // Detectar si ya están en orden correcto (nombres primero)
    const firstToken = tokens[0]
    const lastToken = tokens[n-1]
    
    // Si el primer token es claramente un nombre, probablemente ya está bien ordenado
    if (isProbableName(firstToken)) {
      return tokens.join(' ')
    }

    // Si el último token es claramente un nombre y el primero no, necesita reordenarse
    if (isProbableName(lastToken) && !isProbableName(firstToken)) {
      // Proceder con reordenamiento
    } else if (n >= 3) {
      // Para nombres de 3+ tokens, revisar si los últimos son nombres
      const secondToLast = tokens[n-2]
      if (isProbableName(lastToken) && isProbableName(secondToLast)) {
        // Los últimos dos son nombres, reordenar
      } else if (isProbableName(firstToken) || endsWithVowel(firstToken)) {
        // Ya parece estar bien ordenado
        return tokens.join(' ')
      }
    } else {
      // Para nombres de 2 tokens, si el último termina en vocal y es probable nombre
      if (endsWithVowel(lastToken) && !isProbableName(firstToken)) {
        // Reordenar
      } else {
        return tokens.join(' ')
      }
    }

    // Determinar cuántos tokens son nombres vs apellidos
    let nameCount
    if (n === 2) {
      nameCount = 1
    } else if (n === 3) {
      const last = tokens[n-1], prev = tokens[n-2]
      nameCount = (isProbableName(last) && isProbableName(prev)) ? 2 : 1
    } else if (n === 4) {
      // Para 4 tokens, usualmente 2 nombres + 2 apellidos
      const last = tokens[n-1], prev = tokens[n-2]
      nameCount = (isProbableName(last) && isProbableName(prev)) ? 2 : 1
    } else {
      // Para 5+ tokens, detectar por partículas
      const prev = tokens[n-2]
      nameCount = isParticle(prev) ? 1 : 2
    }
    
    nameCount = Math.max(1, Math.min(2, nameCount))
    
    // Manejar partículas en apellidos compuestos
    let surnameStart = 0
    let surnameEnd = n - nameCount
    
    // Encontrar partículas al inicio que son parte del apellido
    for (let i = 0; i < surnameEnd - 1; i++) {
      if (isParticle(tokens[i]) && !isParticle(tokens[i + 1])) {
        // Mantener la partícula con el apellido
        continue
      }
    }
    
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
    const upperBase = String(raw)
      .replace(/[\t\r\f]+/g, ' ')
      .replace(/ +/g, ' ')
      .toUpperCase()
      .trim()

    // Extraer nombres usando patrón por filas tipo tabla: NATURAL <NOMBRES> POR SUS PROPIOS
    const tableNames = []
    
    // Patrón 1: Personas naturales tradicional
    const natRe = /NATURAL\s+([A-ZÁÉÍÓÚÑ\s]{3,80}?)\s+POR\s+SUS\s+PROPIOS/gi
    let nm
    while ((nm = natRe.exec(upperBase)) !== null) {
      // Limpiar encabezados dentro del bloque capturado y detectar nombre real
      let block = nm[1].replace(/\s+/g, ' ').trim()
      if (!block) continue
      // Remover encabezados conocidos y términos de tabla
      const headerTokens = [
        'PERSONA','NOMBRES','RAZON','RAZÓN','SOCIAL','TIPO','INTERVINIENTE','DOCUMENTO','IDENTIDAD','NACIONALIDAD','CALIDAD','REPRESENTA','REPRESENTE','NO','Nº','N°','NUMERO','NÚMERO','UBICACION','UBICACIÓN','PROVINCIA','CANTON','CANTÓN','PARROQUIA','DESCRIPCION','DESCRIPCIÓN','CUANTIA','CUANTÍA'
      ]
      const headerBlockRe = new RegExp(`\\b(?:${headerTokens.join('|')})\\b`, 'g')
      block = block.replace(headerBlockRe, ' ').replace(/\s+/g, ' ').trim()
      // Buscar primera secuencia de 2 a 5 palabras válidas
      const nameRegexLocal = /([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,4})/
      const mName = block.match(nameRegexLocal)
      if (!mName) continue
      let candidate = (mName[1] || '').replace(/\s+/g, ' ').trim()
      if (!candidate) continue
      // Filtrar tokens basura
      const badTokens = new Set(['POR','SUS','PROPIOS','DERECHOS','PASAPORTE','CEDULA','CÉDULA','MANDANTE','MANDATARIO','PETICIONARIO','ECUATORIA','ECUATORIANA','ECUATORIANO','COLOMBIANA','COLOMBIANO','PERUANA','PERUANO','VENEZOLANA','VENEZOLANO','RAZON','RAZÓN','SOCIAL','SOCIALTIPO','TIPO','INTERVINIENTE','NO','Nº','N°','NUMERO','NÚMERO'])
      const particles = new Set(['DE','DEL','DELA','DELOS','DELAS','LA','LOS','LAS'])
      const toks = candidate.split(' ').filter(Boolean)
      const tokensOk = toks.filter(t => !badTokens.has(t))
      if (tokensOk.length < 2) continue
      // Permitir partículas cortas solo si hay al menos 2 tokens "reales"
      const realTokens = tokensOk.filter(t => t.length > 2 || particles.has(t))
      if (realTokens.length < 2) continue
      const cleaned = realTokens.join(' ')
      const reordered = this.reorderName(cleaned)
      if (reordered && !tableNames.includes(reordered)) tableNames.push(reordered)
    }

    // Patrón 2: Extracción específica de tablas estructuradas (formato moderno)
    // Buscar líneas "Nombres/Razón social: NOMBRE" directamente
    const razSocialRe = /NOMBRES?\s*\/?\s*RAZ[ÓO]N\s+SOCIAL\s*[:\-]\s*([A-ZÁÉÍÓÚÑ\s\.]{3,80}?)(?:\s+TIPO|\s+REPRESENTADO|\s+DOCUMENTO|\s+NACIONALIDAD|\n|$)/gi
    let rs
    while ((rs = razSocialRe.exec(upperBase)) !== null) {
      let name = rs[1].replace(/\s+/g, ' ').trim()
      if (name && name.length > 2) {
        // No aplicar reorderName a empresas que ya están bien ordenadas
        if (/S\.A\.|LTDA|CIA|CORP/i.test(name)) {
          if (!tableNames.includes(name)) tableNames.push(name)
        } else {
          const reordered = this.reorderName(name)
          if (reordered && !tableNames.includes(reordered)) tableNames.push(reordered)
        }
      }
    }

    // Patrón 3: "APELLIDOS Y NOMBRES: ..." (formato persona natural)
    const apellNombresRe = /APELLIDOS?\s*(?:Y|E)\s*NOMBRES?\s*[:\-]\s*([A-ZÁÉÍÓÚÑ\s\.]{3,80}?)(?:\s+DOCUMENTO|\s+NACIONALIDAD|\s+CALIDAD|\n|$)/gi
    let an
    while ((an = apellNombresRe.exec(upperBase)) !== null) {
      let name = an[1].replace(/\s+/g, ' ').trim()
      if (!name) continue
      const reordered = this.reorderName(name)
      if (reordered && !tableNames.includes(reordered)) tableNames.push(reordered)
    }

    // Patrón 4: Jurídica + Nombre en líneas consecutivas (mejorado)
    // Importante: NO cortar por salto de línea porque algunos nombres se parten (ej. QUITEÑA)
    // Solo detenemos cuando aparece una etiqueta fuerte de tabla o campo
    const juridicaRe = /(?:PERSONA\s+)?JUR[IÍ]DICA\s*\n?\s*([A-ZÁÉÍÓÚÑ\s\.\-&]{3,80}?)\s*(?:REPRESENTADO|REPRESENTADA|TIPO|DOCUMENTO|RUC|NOMBRES\s*\/\s*RAZ[ÓO]N|APELLIDOS?|A\s+FAVOR\s+DE|BENEFICIARIO|UBICACI[ÓO]N|$)/gi
    let jr
    while ((jr = juridicaRe.exec(upperBase)) !== null) {
      let name = jr[1].replace(/\s+/g, ' ').trim()
      if (name && name.length > 2 && !tableNames.includes(name)) {
        tableNames.push(name)
      }
    }

    // Patrón 5: Formato tabular específico para nombres como "PAREDES MONTUFAR CAMILO"
    // Buscar secuencias que parezcan apellidos + nombres después de "NATURAL"
    const tabularNamesRe = /NATURAL\s+([A-ZÁÉÍÓÚÑ]+\s+[A-ZÁÉÍÓÚÑ]+\s+[A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+)?)\s+POR\s+SUS\s+PROPIOS/gi
    let tn
    while ((tn = tabularNamesRe.exec(upperBase)) !== null) {
      let name = tn[1].replace(/\s+/g, ' ').trim()
      if (name && name.split(' ').length >= 3) {
        const reordered = this.reorderName(name)
        if (reordered && !tableNames.includes(reordered)) {
          tableNames.push(reordered)
        }
      }
    }


    // Patrón 6: Detectar empresas después de personas que las representan
    // Formato: "PERSONA_NATURAL [datos] EMPRESA S.A."
    const afterPersonRe = /(?:MARIA|JUAN|JOSE|ANA|CARLOS|ELENA|LUIS|PEDRO|JORGE|FERNANDO)\s+[A-ZÁÉÍÓÚÑ\s]+\s+([A-ZÁÉÍÓÚÑ\s\.\-&]+(?:S\.?A\.?|LTDA\.?|CIA\.?|CORP\.?))\s*(?:REPRESENTADO|RUC|MANDANTE|\n|$)/gi
    let ap
    while ((ap = afterPersonRe.exec(upperBase)) !== null) {
      let companyName = ap[1].replace(/\s+/g, ' ').trim()
      if (companyName && companyName.length > 5 && !tableNames.includes(companyName)) {
        tableNames.push(companyName)
      }
    }

    let upper = upperBase

    // Remover frases y términos que no son nombres
    const removePhrases = [
      'POR SUS PROPIOS DERECHOS', 'POR SUS PROPIOS', 'DERECHOS',
      'PASAPORTE', 'CÉDULA', 'CEDULA', 'PPT', 'DOC', 'IDENTIDAD', 'NO IDENTIFICACION', 'N IDENTIFICACION',
      'IDENTIFICACION', 'IDENTIFICACIÓN', 'QUE LE REPRESENTA', 'QUE REPRESENTA', 'LE REPRESENTA', 'LEREPRESENTA', 'QUE SUSCRIBE',
      'NACIONALIDAD', 'ECUATORIANA', 'ECUATORIANO', 'ECUATORIA', 'COLOMBIANA', 'COLOMBIANO', 'COLOMBIAN', 'PERUANA', 'PERUANO', 'VENEZOLANA', 'VENEZOLANO', 'ARGENTINA', 'ARGENTINO', 'CHILENA', 'CHILENO', 'BRASILEÑA', 'BRASILEÑO',
      'MANDANTE', 'MANDATARIO', 'PETICIONARIO', 'REPRESENTA', 'REPRESENTE', 'EN CALIDAD DE',
      'UBICACION', 'UBICACIÓN', 'PROVINCIA', 'CANTON', 'CANTÓN', 'PARROQUIA', 'DESCRIPCION', 'DESCRIPCIÓN', 'CUANTIA', 'CUANTÍA'
    ]
    for (const phrase of removePhrases) {
      const re = new RegExp(`\\b${phrase}\\b`, 'g')
      upper = upper.replace(re, ' ')
    }

    // Eliminar encabezados conocidos
    const headers = [
      'PERSONA', 'NOMBRES', 'RAZON', 'RAZÓN', 'SOCIAL', 'TIPO', 'INTERVINIENTE', 'DOCUMENTO', 'IDENTIDAD', 'NACIONALIDAD',
      'CALIDAD', 'REPRESENTA', 'UBICACION', 'UBICACIÓN', 'PROVINCIA', 'CANTON', 'CANTÓN', 'PARROQUIA', 'DESCRIPCION', 'DESCRIPCIÓN', 'CUANTIA', 'CUANTÍA', 'NATURAL', 'IDENTIFICACION', 'IDENTIFICACIÓN',
      'OBJETO', 'OBSERVACIONES', 'EXTRACTO', 'ESCRITURA', 'NO', 'N°', 'Nº', 'NUMERO', 'NÚMERO', 'PICHINCHA', 'QUITO', 'IÑAQUITO',
      'RUC', 'RAZON SOCIAL', 'RAZÓN SOCIAL'
    ]
    const headerRegex = new RegExp(`\\b(?:${headers.join('|')})\\b`, 'g')
    upper = upper.replace(headerRegex, ' ')

    // Regex: 2 a 5 palabras en mayúsculas con acentos
    // Permitir guiones y puntos intermedios en apellidos compuestos, y eliminar dobles espacios
    // Mejorado para capturar empresas con S.A., LTDA., CIA., etc.
    const nameRegex = /([A-ZÁÉÍÓÚÑ]{2,}(?:[\s\.-]+[A-ZÁÉÍÓÚÑ\.]{1,}){1,6})/g
    const names = []
    let m
    while ((m = nameRegex.exec(upper)) !== null) {
      const candidate = m[1].replace(/\s+/g, ' ').trim()
      if (!candidate) continue
      // Filtrar candidatos que contienen dígitos o palabras no-nombre típicas
      if (/\d/.test(candidate)) continue
      const badTokens = new Set(['POR','SUS','PROPIOS','DERECHOS','PASAPORTE','CEDULA','CÉDULA','MANDANTE','MANDATARIO','PETICIONARIO','ECUATORIA','ECUATORIANA','ECUATORIANO','COLOMBIANA','COLOMBIANO','PERUANA','PERUANO','VENEZOLANA','VENEZOLANO','RAZON','RAZÓN','SOCIAL','SOCIALTIPO','TIPO','INTERVINIENTE','NO','Nº','N°','NUMERO','NÚMERO'])
      const toks = candidate.split(' ')
      if (toks.some(t => badTokens.has(t))) continue
      // Quitar partículas de 1-2 letras no permitidas, pero conservar tokens de empresas
      const particles = new Set(['DE','DEL','DELA','DELOS','DELAS','LA','LOS','LAS'])
      const companyTokens = new Set(['S.A.', 'SA', 'S.A', 'LTDA', 'LTDA.', 'L.T.D.A.', 'CIA', 'CIA.', 'CÍA', 'CÍA.', 'S.A.S', 'SAS', 'CORP', 'CORP.', 'INC', 'INC.'])
      const filtered = toks.filter(t => !badTokens.has(t))
      const cleaned = filtered.filter(t => t.length > 2 || particles.has(t) || companyTokens.has(t)).join(' ')
      // Debe quedar al menos 2 tokens reales, excepto para empresas reconocibles
      const cleanedTokens = cleaned.split(' ').filter(Boolean)
      const hasCompanyToken = cleanedTokens.some(t => companyTokens.has(t))
      if (cleanedTokens.length < 2 && !hasCompanyToken) continue
      // Si tiene token de empresa, permitir aunque sea un solo token válido + empresa
      if (hasCompanyToken && cleanedTokens.length < 1) continue
      // No reordenar empresas que ya están en orden correcto
      const finalName = hasCompanyToken ? cleaned : this.reorderName(cleaned)
      if (!names.includes(finalName)) names.push(finalName)
    }
    // Si se detectaron por patrón de tabla, priorizarlos
    if (tableNames.length > 0) {
      const out = []
      for (const t of tableNames) if (!out.includes(t)) out.push(t)
      return out
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

    // Regex básicos y tolerantes (Sprint 1) preservando bloques multi-línea
    // 1) Título de acto: admitir también "ACTO:" cuando no viene "CONTRATO"
    const tipoActo = this.cleanActType(
      getMatch(/ACTO(?:\s+O\s+CON\s*-?\s*TRATO)?[:\-]?\s*([\s\S]*?)(?:\n| FECHA| OTORGADO\s+POR| OTORGANTE| OTORGANTES| A\s+FAVOR\s+DE| BENEFICIARIO|$)/)
    )
    // 2) Otorgantes: no cortar en salto de línea; parar sólo en siguientes etiquetas conocidas
    const otorgantesRaw = getMatch(
      /(?:OTORGADO\s+POR|OTORGANTE(?:S)?|OTORGANTES|COMPARECIENTE(?:S)?|INTERVINIENTE(?:S)?|NOMBRES\s*\/\s*RAZ[ÓO]N\s+SOCIAL)[:\-]?\s*([\s\S]*?)(?:A\s+FAVOR\s+DE|BENEFICIARIO(?:S)?|NOTARIO|ACTO\s+O\s+CON|ACTO\s*:|EXTRACTO|$)/
    )
    // 3) Beneficiarios: idem, parar en NOTARIO/ACTO/fin
    const beneficiariosRaw = getMatch(
      /(?:A\s+FAVOR\s+DE|BENEFICIARIO(?:S)?)[:\-]?\s*([\s\S]*?)(?:NOTARIO|ACTO\s+O\s+CON|ACTO\s*:|EXTRACTO|$)/
    )
    let notario = getMatch(/NOTARIO[:\-]?\s*([\s\S]*?)(?:\n|$)/)

    // Limpieza de notario: quitar (A), AB., ABG. iniciales
    if (notario) {
      notario = notario
        .replace(/^\(A\)\s*/i, '')
        .replace(/^ABG?\.?\s*/i, '')
        .trim()
    }

    // Fallback: si no se logró capturar otorgantes por etiqueta, tratar de anclar desde "NATURAL"
    let otorgantesList = this.cleanPersonNames(otorgantesRaw)
    if ((!otorgantesList || otorgantesList.length === 0) && /\bNATURAL\b/i.test(normalized)) {
      // Tomar desde el primer NATURAL hasta "A FAVOR"/"BENEFICIARIO"/"NOTARIO"/fin
      const afterNat = normalized.slice(normalized.indexOf('NATURAL') + 'NATURAL'.length)
      const cutIdx = afterNat.search(/A\s+FAVOR\s+DE|BENEFICIARIO|NOTARIO|ACTO\s+O\s+CON|ACTO\s*:|EXTRACTO|$/i)
      const natBlock = cutIdx === -1 ? afterNat : afterNat.slice(0, cutIdx)
      otorgantesList = this.cleanPersonNames(natBlock)
    }

    return {
      tipoActo: tipoActo || '',
      otorgantes: otorgantesList,
      beneficiarios: this.cleanPersonNames(beneficiariosRaw),
      notario: notario || undefined
    }
  },

  /**
   * Parser avanzado con fallback tabular
   * - Intenta extracción por texto plano primero
   * - Si falla, usa parser tabular con coordenadas PDF.js
   * @param {string} rawText
   * @param {Buffer} pdfBuffer - Buffer opcional para fallback tabular
   * @returns {{ acts: Array<{ tipoActo: string, otorgantes: string[], beneficiarios: string[], notario?: string }>} }
   */
  async parseAdvancedData(rawText, pdfBuffer = null) {
    if (!rawText || typeof rawText !== 'string') return { acts: [] }

    // Normalizar preservando saltos de línea
    const text = String(rawText)
      .replace(/\r/g, '')
      .replace(/[\t\f]+/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim()
    const upper = text.toUpperCase()

    // TABLE-FIRST: si detectamos cabeceras de tabla típicas y tenemos buffer del PDF,
    // intentar el parser tabular antes del heurístico.
    if (pdfBuffer && /NOMBRES\s*\/?\s*RAZ[ÓO]N\s+SOCIAL|TIPO\s+INTERVINIENTE|APELLIDOS?\s*(?:Y|E)\s*NOMBRES?/i.test(upper)) {
      try {
        const tableParser = new NotarialTableParser()
        const structuredData = await tableParser.parseStructuredData(pdfBuffer)
        if (structuredData && structuredData.length > 0) {
          const tabularActs = this.convertStructuredDataToActs(structuredData, rawText)
          if (tabularActs.length > 0) {
            return { acts: tabularActs }
          }
        }
      } catch (e) {
        // continuar con heurística si falla
      }
    }

    // 1) Segmentar por “EXTRACTO Escritura N°:” para múltiples actos en un mismo PDF
    const segmentRe = /EXTRACTO\s*ESCRITURA\s*N[°ºO\.]?\s*:\s*/i
    const rawSegments = text.split(segmentRe).map(s => s.trim()).filter(Boolean)
    const segments = rawSegments.length > 0 ? rawSegments : [text]

    const acts = []
    for (const seg of segments) {
      const segUpper = seg.toUpperCase()
      // Encontrar encabezados dentro del segmento
      const headerRe = /ACTO(?:S)?\s+O\s+CON\s*-?\s*TRATO(?:S)?\s*[:\-]?/gi
      const headers = []
      let hm
      while ((hm = headerRe.exec(segUpper)) !== null) {
        const idx = hm.index
        headers.push({ index: idx, length: hm[0].length })
      }
      // Si no hay encabezados, intentar simple dentro del segmento
      if (headers.length === 0) {
        const single = this.parseSimpleData(seg)
        if (single?.tipoActo || (single?.otorgantes?.length || single?.beneficiarios?.length)) acts.push(single)
        continue
      }

      const sliceSection = (startIdx, endIdx) => segUpper.slice(startIdx, endIdx === -1 ? undefined : endIdx)
      for (let i = 0; i < headers.length; i++) {
        const start = headers[i].index
        const end = i + 1 < headers.length ? headers[i + 1].index : -1
        const section = sliceSection(start, end)
        if (!section) continue

      // Título del acto: desde fin del encabezado hasta FECHA/OTORG/FIN DE LÍNEA
      const titleMatch = section.match(/ACTO(?:S)?\s+O\s+CON\s*-?\s*TRATO(?:S)?\s*[:\-]?\s*([\s\S]*?)(?:\n| FECHA| OTORGADO\s+POR| OTORGANTE| OTORGANTES|$)/i)
      const tipoActoRaw = titleMatch && titleMatch[1] ? titleMatch[1].trim() : ''
      const tipoActo = this.cleanActType(tipoActoRaw)

      const blockBetween = (startRegex, endRegex) => {
        const s = section.search(startRegex)
        if (s === -1) return ''
        const afterStart = section.slice(s)
        const e = afterStart.search(endRegex)
        return e === -1 ? afterStart.replace(startRegex, '') : afterStart.slice(0, e).replace(startRegex, '')
      }

      // Variantes de etiquetas (ampliado: COMPARECIENTE/INTERVINIENTE)
      const startOtRegex = /(?:OTORGADO\s+POR|OTORGANTE(?:S)?|OTORGANTES|COMPARECIENTE(?:S)?|INTERVINIENTE(?:S)?|NOMBRES\s*\/\s*RAZ[ÓO]N\s+SOCIAL)\s*[:\-]?\s*/i
      const startBenRegex = /(?:A\s+FAVOR\s+DE|BENEFICIARIO(?:S)?)\s*[:\-]?\s*/i
      const notarioRegex = /NOTARIO\s*\(\s*A\s*\)\s*[:\-]?\s*(.+?)(?:\n|\.|$)/i

      let otorgantesRaw = blockBetween(startOtRegex, startBenRegex)
      let beneficiariosRaw = blockBetween(startBenRegex, /NOTARIO|ACTO\s+O\s+CON|EXTRACTO|\n\s*ESCRITURA|\.$/i)

      // Debug: log secciones para diagnosticar mejor la extracción
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Debug secciones:')
        console.log('  - Otorgantes raw (length):', otorgantesRaw?.length || 0)
        console.log('  - Beneficiarios raw (length):', beneficiariosRaw?.length || 0)
        if (beneficiariosRaw) {
          console.log('  - Beneficiarios preview:', beneficiariosRaw.substring(0, 150))
        }
      }

      // Fallbacks para otorgantes:
      // 1) Variante de etiqueta "OTORGADO POR" que a veces aparece como "OTORGADO  POR" o con salto raro
      if (!otorgantesRaw || otorgantesRaw.trim().length < 3) {
        const altStart = section.search(/OTORGAD[OA]\s+POR\s*[:\-]?/i)
        if (altStart !== -1) {
          const after = section.slice(altStart)
          const e = after.search(/A\s+FAVOR\s+DE|BENEFICIARIO|NOTARIO|ACTO\s+O\s+CON|EXTRACTO|\n\s*ESCRITURA|\.$/i)
          otorgantesRaw = e === -1 ? after.replace(/OTORGAD[OA]\s+POR\s*[:\-]?/i, '') : after.slice(0, e).replace(/OTORGAD[OA]\s+POR\s*[:\-]?/i, '')
        }
      }

      // 2) Afinar con ancla NATURAL dentro de la sección para otorgantes
      const secUpper = section.toUpperCase()
      const idxNat = secUpper.indexOf('NATURAL')
      if ((!otorgantesRaw || otorgantesRaw.trim().length < 3) && idxNat !== -1) {
        let region = secUpper.slice(idxNat + 'NATURAL'.length)
        const stop = region.search(/A\s+FAVOR\s+DE|BENEFICIARIO|NOTARIO|ACTO\s+O\s+CON|\.$/i)
        if (stop !== -1) region = region.slice(0, stop)
        otorgantesRaw = region
      }

      // 3) En algunos PDFs falta la etiqueta y sólo hay tabla; tomar bloque desde "OTORGANTES" hasta siguiente encabezado
      if (!otorgantesRaw || otorgantesRaw.trim().length < 3) {
        const idxHeader = secUpper.search(/\bOTORGANTES?\b/i)
        if (idxHeader !== -1) {
          let region = section.slice(idxHeader)
          const stop = region.search(/A\s+FAVOR\s+DE|BENEFICIARIO|NOTARIO|ACTO\s+O\s+CON|EXTRACTO|\n\s*ESCRITURA|\.$/i)
          region = stop === -1 ? region : region.slice(0, stop)
          // Eliminar la palabra OTORGANTES y dos puntos si existen
          region = region.replace(/OTORGANTES?\s*[:\-]?/i, '')
          otorgantesRaw = region
        }
      }

      // 4) Fallback adicional robusto: si aún no hay otorgantes, usar ventana entre "FECHA DE OTORGAMIENTO" y "A FAVOR DE"
      if (!otorgantesRaw || otorgantesRaw.trim().length < 3) {
        const idxBen = secUpper.search(/A\s+FAVOR\s+DE|BENEFICIARIO(?:S)?/i)
        const idxAfterFecha = (() => {
          const m = secUpper.match(/FECHA\s+DE\s+OTORGAMIENTO[\s:]+/i)
          if (!m) return -1
          return secUpper.indexOf(m[0]) + m[0].length
        })()
        const idxStart = idxAfterFecha !== -1 ? idxAfterFecha : 0
        if (idxBen !== -1) {
          otorgantesRaw = section.slice(idxStart, idxBen)
        } else {
          // Como último recurso, tomar una ventana limitada después de FECHA
          otorgantesRaw = section.slice(idxStart)
        }
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
          .replace(/\s+Y\/?O?\s+/g, '|')
          .replace(/\s+E\s+/g, '|')
          .replace(/\s*[,;/]\s*/g, '|')
        let parts = tmp.split('|').map(p => this.cleanActType(p)).filter(p => p && p.length >= 3)
        // Caso especial: REVOCATORIA embebida sin separadores
        if (parts.length <= 1) {
          const up = base.toUpperCase()
          const idxRev = up.indexOf('REVOCATORIA')
          if (idxRev > 0) {
            const p1 = this.cleanActType(base.slice(0, idxRev))
            const p2 = this.cleanActType(base.slice(idxRev))
            parts = [p1, p2].filter(Boolean)
          }
        }
        // Descartar duplicados triviales
        return Array.from(new Set(parts))
      }

      const multi = splitMultiActs(tipoActoRaw)
      const actsTitles = multi.length > 1 ? multi : [tipoActo]

      const otClean = this.cleanPersonNames(otorgantesRaw)
      // Si seguimos sin detectar, hacer una última búsqueda global de patrones de tabla dentro de la sección
      if ((!otClean || otClean.length === 0) && /NATURAL|RAZ[ÓO]N\s+SOCIAL|APELLIDOS?/i.test(secUpper)) {
        const lastTry = this.cleanPersonNames(section)
        if (lastTry && lastTry.length) {
          otClean.push(...lastTry.filter(n => !otClean.includes(n)))
        }
      }
      let beClean = this.cleanPersonNames(beneficiariosRaw)
      
      // Fallback mejorado para beneficiarios en formato tabular
      if ((!beClean || beClean.length === 0) && /A\s+FAVOR\s+DE/i.test(section)) {
        console.log('🔍 Fallback: Buscando beneficiarios en formato tabular')
        
        // Buscar desde "A FAVOR DE" hasta el final de la sección o siguiente encabezado
        const aFavorIdx = section.search(/A\s+FAVOR\s+DE/i)
        if (aFavorIdx !== -1) {
          const afterAFavor = section.slice(aFavorIdx + 11) // después de "A FAVOR DE"
          const endIdx = afterAFavor.search(/NOTARIO|ACTO\s+O\s+CON|EXTRACTO|\n\s*ESCRITURA|$/)
          const benefRegion = endIdx === -1 ? afterAFavor : afterAFavor.slice(0, endIdx)
          
          console.log('🔍 Región A FAVOR DE encontrada:', benefRegion.substring(0, 200))
          beClean = this.cleanPersonNames(benefRegion)
          console.log('🔍 Beneficiarios extraídos del fallback:', beClean)
        }
      }
      
      // Heurística anti-duplicación: si no existe etiqueta clara de beneficiarios
      // o si la lista coincide con otorgantes, limpiar beneficiarios.
      const hasBenefLabel = /A\s+FAVOR\s+DE|BENEFICIARIO(?:S)?/i.test(section)
      if (!hasBenefLabel) {
        beClean = []
      }
      // Si hay etiqueta pero las listas se solapan, excluir los que ya son otorgantes
      if (hasBenefLabel && beClean.length) {
        const otSet = new Set(otClean)
        const filtered = beClean.filter(n => !otSet.has(n))
        // Si después de filtrar quedan todos vacíos, mantener vacío para evitar espejar otorgantes
        beClean = filtered
      }
      
      // Extraer representantes: soportar tanto encabezado de tabla como "REPRESENTADO POR"
      const representantes = []
      const repWindow = (() => {
        // 1) Si existe columna/encabezado "PERSONA QUE LE REPRESENTA", tomar ventana desde allí hasta el bloque de beneficiarios
        const idxCol = section.search(/PERSONA\s+QUE\s+LE\s+REPRESENTA/i)
        if (idxCol !== -1) {
          const after = section.slice(idxCol)
          const stop = after.search(/A\s+FAVOR\s+DE|BENEFICIARIO|UBICACI[ÓO]N|ACTO\s+O\s+CON|EXTRACTO/i)
          return stop === -1 ? after : after.slice(0, stop)
        }
        // 2) Buscar "REPRESENTADO POR" cerca del bloque de otorgantes
        const idxRep = section.search(/REPRESENTAD[OA]\s+POR/i)
        if (idxRep !== -1) {
          const after = section.slice(idxRep)
          const stop = after.search(/A\s+FAVOR\s+DE|BENEFICIARIO|UBICACI[ÓO]N|ACTO\s+O\s+CON|EXTRACTO/i)
          return stop === -1 ? after : after.slice(0, stop)
        }
        return ''
      })()
      if (repWindow && repWindow.length) {
        // Buscar nombres tipo persona natural dentro de la ventana, evitando tokens de empresa y encabezados
        const candRe = /([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,4})/g
        const bad = new Set(['POR','SUS','PROPIOS','DERECHOS','JURIDICA','JURÍDICA','REPRESENTADO','REPRESENTADA','RUC','CEDULA','CÉDULA','MANDANTE','MANDATARIO','PERSONA','QUE','LE','REPRESENTA'])
        const company = /(FUNDACI[ÓO]N|S\.?A\.?|\bSA\b|LTDA\.?|C[ÍI]A\.?|CORP\.?|CORPORACI[ÓO]N|EMPRESA|ASOCIACI[ÓO]N|COOPERATIVA|UNIVERSIDAD|MUNICIPIO|GAD|\bEP\b)/i
        const repSet = new Set()

        const cleanWindow = repWindow.toUpperCase()
        // 1) Regla: combinar líneas de 2+2 tokens consecutivas ("NOMBRES" + "APELLIDOS")
        const lines = cleanWindow.split(/\n+/).map(s => s.trim()).filter(Boolean)
        const twoWords = (s) => /^([A-ZÁÉÍÓÚÑ]{2,})(\s+)([A-ZÁÉÍÓÚÑ]{2,})$/.test(s) && !company.test(s) && !/REPRESENTAD|RUC|CEDULA|CÉDULA/.test(s)
        for (let i = 0; i < lines.length - 1; i++) {
          if (twoWords(lines[i]) && twoWords(lines[i + 1])) {
            const merged = `${lines[i]} ${lines[i + 1]}`.replace(/\s+/g, ' ').trim()
            repSet.add(merged)
          }
        }
        // 2) Capturar secuencias largas en el bloque ignorando palabras malas
        let m
        while ((m = candRe.exec(cleanWindow)) !== null) {
          const name = m[1].replace(/\s+/g, ' ').trim()
          if (/REPRESENTAD|RUC/.test(name)) continue
          const toks = name.split(' ')
          if (toks.some(t => bad.has(t))) continue
          if (company.test(name)) continue
          repSet.add(name)
        }
        // Deduplicar: eliminar nombres que son subcadenas de uno más largo (p.ej., apellidos solos)
        const repArr = Array.from(repSet)
        for (const r of repArr) {
          if (!r || otClean.includes(r)) continue
          const isSub = repArr.some(other => other !== r && other.includes(r))
          if (!isSub) representantes.push(r)
        }
      }
      
        // Normalización de tipo/persona
        const guessTipo = (name) => /FUNDACI[ÓO]N|S\.?A\.?|\bSA\b|LTDA\.?|C[ÍI]A\.?|CORP\.?|CORPORACI[ÓO]N|EMPRESA|ASOCIACI[ÓO]N|COOPERATIVA|UNIVERSIDAD|MUNICIPIO|GAD|\bEP\b/i.test(name) ? 'Jurídica' : 'Natural'

        for (const title of actsTitles) {
          const actData = {
            tipoActo: title || '',
            otorgantes: otClean.map(n => ({ nombre: n, tipo_persona: guessTipo(n) })),
            beneficiarios: beClean.map(n => ({ nombre: n, tipo_persona: guessTipo(n) })),
            ...(notario ? { notario } : {})
          }
          
          // Log condicional para diagnóstico cuando no se detectan otorgantes
          if (!actData.otorgantes || actData.otorgantes.length === 0) {
            try {
              const preview = (otorgantesRaw || section || '').toString().slice(0, 160).replace(/\s+/g, ' ').trim()
              console.warn('[parseAdvancedData] Otorgantes no detectados. Título:', actData.tipoActo, '| Preview bloque:', preview)
            } catch (_) { /* noop */ }
          }

          // Agregar representantes si hay otorgantes jurídicos
          if (representantes.length > 0 && actData.otorgantes.length > 0) {
            // Buscar el primer otorgante que parezca ser jurídico
            const juridicoIdx = actData.otorgantes.findIndex(ot => /S\.A\.|LTDA|CIA|CORP|FUNDACI[ÓO]N|CORPORACI[ÓO]N/i.test(ot.nombre))
            if (juridicoIdx !== -1) {
              actData.otorgantes = actData.otorgantes.map((o, idx) => (
                idx === juridicoIdx ? { ...o, representantes } : o
              ))
            }
          }
          
          acts.push(actData)
        }
      }
    }

    // Filtrar actos válidos por palabras clave y descartar basura como INDETERMINADA
    const ALLOW = ['PODER', 'REVOCATORIA', 'COMPRAVENTA']
    const filtered = acts.filter((a) => {
      const t = String(a?.tipoActo || '').toUpperCase()
      if (!t || /INDETERMINADA/.test(t)) return false
      return ALLOW.some(k => t.includes(k))
    })

    // Si no detectó ninguna sección válida, intentar con parseSimpleData
    if (filtered.length === 0) {
      const single = this.parseSimpleData(rawText)
      const t = String(single?.tipoActo || '').toUpperCase()
      if (t && !/INDETERMINADA/.test(t) && ALLOW.some(k => t.includes(k))) return { acts: [single] }
      
      // Último recurso: parser tabular si tenemos el buffer
      if (pdfBuffer) {
        console.log('[PdfExtractorService] Fallback: usando parser tabular avanzado')
        try {
          const tableParser = new NotarialTableParser()
          const structuredData = await tableParser.parseStructuredData(pdfBuffer)
          
          if (structuredData.length > 0) {
            const tabularActs = this.convertStructuredDataToActs(structuredData, rawText)
            if (tabularActs.length > 0) {
              console.log(`[PdfExtractorService] Parser tabular extrajo ${tabularActs.length} actos`)
              return { acts: tabularActs }
            }
          }
        } catch (error) {
          console.warn('[PdfExtractorService] Error en parser tabular:', error.message)
        }
      }

      // Fallback final: extracción agresiva por patrones cuando todo falla
      console.log('[PdfExtractorService] Fallback final: extracción agresiva')
      const desperateAct = this.parseDesperatePatterns(rawText)
      if (desperateAct && (desperateAct.otorgantes.length > 0 || desperateAct.beneficiarios.length > 0)) {
        console.log(`[PdfExtractorService] Extracción agresiva encontró ${desperateAct.otorgantes.length} otorgantes, ${desperateAct.beneficiarios.length} beneficiarios`)
        return { acts: [desperateAct] }
      }
      
      return { acts: [] }
    }

    return { acts: filtered }
  },

  /**
   * Convierte datos estructurados del parser tabular a formato de actos
   */
  convertStructuredDataToActs(structuredData, rawText) {
    const acts = []
    
    // Extraer tipo de acto con múltiples estrategias
    const tipoActo = this.extractRealActType(rawText)
    
    let otorgantes = []
    let beneficiarios = []
    
    // Combinar entidades por tipo y filtrar válidas
    for (const section of structuredData) {
      if (section.type === 'otorgantes' && section.entities) {
        otorgantes.push(...section.entities.filter(this.isValidEntityForExtraction))
      } else if (section.type === 'beneficiarios' && section.entities) {
        beneficiarios.push(...section.entities.filter(this.isValidEntityForExtraction))
      }
    }
    
    // Si no encontramos separación clara, usar la primera sección como otorgantes
    if (otorgantes.length === 0 && structuredData.length > 0) {
      const allEntities = structuredData[0].entities?.filter(this.isValidEntityForExtraction) || []
      otorgantes = allEntities
    }
    
    if (otorgantes.length > 0 || beneficiarios.length > 0) {
      acts.push({
        tipoActo,
        otorgantes: otorgantes.map(o => ({
          nombre: o.nombre,
          tipo_persona: o.tipo_persona,
          ...(o.representantes?.length > 0 ? { representantes: o.representantes } : {})
        })),
        beneficiarios: beneficiarios.map(b => ({
          nombre: b.nombre,
          tipo_persona: b.tipo_persona
        }))
      })
    }
    
    return acts
  },

  /**
   * Extrae el tipo de acto real usando múltiples estrategias
   */
  extractRealActType(rawText) {
    const text = rawText.toUpperCase()
    
    // Estrategia 1: Buscar después de "ACTO O CONTRATO:"
    const actMatch = text.match(/ACTO\s+O\s+CONTRATO\s*[:\-]?\s*([^\n]+?)(?:\s+FECHA|\n|$)/i)
    if (actMatch && actMatch[1]) {
      const cleaned = this.cleanActType(actMatch[1])
      if (cleaned && cleaned !== 'ESCRITURA' && !cleaned.includes('ESCRITURA N°')) {
        return cleaned
      }
    }
    
    // Estrategia 2: Buscar patrones específicos de actos
    const actPatterns = [
      /PODER\s+GENERAL(?:\s+PERSONA\s+(?:NATURAL|JUR[IÍ]DICA))?/,
      /PODER\s+ESPECIAL(?:\s+PERSONA\s+(?:NATURAL|JUR[IÍ]DICA))?/,
      /PROCURACI[ÓO]N\s+JUDICIAL/,
      /REVOCATORIA\s+DE\s+PODER/,
      /COMPRAVENTA/,
      /DONACI[ÓO]N/,
      /TESTAMENTO/
    ]
    
    for (const pattern of actPatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[0]
      }
    }
    
    // Estrategia 3: Inferir por contexto
    if (text.includes('PERSONA NATURAL')) {
      if (text.includes('PODER GENERAL')) return 'PODER GENERAL PERSONA NATURAL'
      if (text.includes('PODER ESPECIAL')) return 'PODER ESPECIAL PERSONA NATURAL'
      return 'PODER GENERAL PERSONA NATURAL'
    } else if (text.includes('PERSONA JURÍDICA') || text.includes('PERSONA JURIDICA')) {
      if (text.includes('PODER GENERAL')) return 'PODER GENERAL PERSONA JURÍDICA'
      if (text.includes('PODER ESPECIAL')) return 'PODER ESPECIAL PERSONA JURÍDICA'
      return 'PODER ESPECIAL PERSONA JURÍDICA'
    }
    
    // Fallback final
    return 'PODER ESPECIAL'
  },

  /**
   * Valida si una entidad es válida (no es encabezado o metadata)
   */
  isValidEntityForExtraction(entity) {
    if (!entity || !entity.nombre) return false
    
    const nombre = entity.nombre.trim()
    
    // Filtrar entidades muy cortas
    if (nombre.length < 3) return false
    
    // Filtrar encabezados conocidos
    const badPatterns = [
      /^OTORGANTES?$/i,
      /^BENEFICIARIOS?$/i,
      /^A\s+FAVOR\s+DE$/i,
      /^ESCRITURA\s+N[°º]/i,
      /^FECHA\s+DE/i,
      /^ACTO\s+O\s+CONTRATO/i,
      /^PERSONA$/i,
      /^NATURAL$/i,
      /^JUR[IÍ]DICA$/i,
      /^NOMBRES?\s*\/?\s*RAZ[ÓO]N/i,
      /^TIPO\s+INTERVINIENTE/i,
      /^DOCUMENTO/i,
      /^NACIONALIDAD$/i,
      /^CALIDAD$/i,
      /^UBICACI[ÓO]N$/i,
      /^PROVINCIA$/i,
      /^CANT[ÓO]N$/i,
      /^\d{1,2}\s+DE\s+\w+\s+DEL\s+\d{4}/i, // Fechas
      /^\d{15,}[A-Z]\d+$/i // Números de escritura
    ]
    
    if (badPatterns.some(pattern => pattern.test(nombre))) {
      return false
    }
    
    // Debe tener al menos 2 palabras o ser una empresa reconocible
    const words = nombre.split(/\s+/).filter(Boolean)
    if (words.length < 2) {
      // Permitir si es empresa con tokens conocidos
      const companyTokens = /(?:S\.A\.|LTDA|CIA|CORP|FUNDACI[ÓO]N|EMPRESA)/i
      return companyTokens.test(nombre)
    }
    
    return true
  },

  /**
   * Parser desesperado: extrae nombres usando patrones muy amplios
   * Solo se usa cuando todos los otros métodos fallan
   */
  parseDesperatePatterns(rawText) {
    if (!rawText) return null

    console.log('[parseDesperatePatterns] Iniciando extracción agresiva')
    
    const text = String(rawText).toUpperCase()
    const allNames = []
    
    // Patrón 1: Buscar cualquier secuencia de nombres que parezca persona
    const namePatterns = [
      // Nombres completos típicos (2-4 palabras)
      /([A-ZÁÉÍÓÚÑ]{3,}(?:\s+[A-ZÁÉÍÓÚÑ]{3,}){1,3})(?=\s+(?:POR\s+SUS|CEDULA|ECUATORIAN|REPRESENTADO|RUC|\d{10,13}))/g,
      // Empresas con palabras clave
      /([A-ZÁÉÍÓÚÑ\s\.&-]+(?:FUNDACI[ÓO]N|EMPRESA|CORPORACI[ÓO]N|ASOCIACI[ÓO]N|S\.A\.|LTDA|CIA)[A-ZÁÉÍÓÚÑ\s\.&-]*)/g,
      // Nombres después de NATURAL
      /NATURAL\s+([A-ZÁÉÍÓÚÑ\s]{6,50}?)(?=\s+(?:POR\s+SUS|CEDULA|ECUATORIAN|REPRESENTADO|$))/g,
      // Nombres en contexto de tabla (más flexible)
      /(?:^|\n)\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\.&-]{8,60}?)(?=\s+(?:ECUATORIAN|MANDATARIO|CEDULA|RUC|\d{10,13}|$))/gm
    ]
    
    for (const pattern of namePatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const candidate = match[1].trim()
        if (candidate && this.isValidNameCandidate(candidate)) {
          allNames.push(candidate)
        }
      }
    }
    
    // Limpiar y deduplicar nombres
    const cleanedNames = [...new Set(allNames)]
      .map(name => this.cleanDesperateName(name))
      .filter(name => name && name.length >= 3)
      .slice(0, 10) // Limitar a 10 para evitar spam
    
    console.log(`[parseDesperatePatterns] Encontrados ${cleanedNames.length} nombres candidatos:`, cleanedNames)
    
    if (cleanedNames.length === 0) return null
    
    // Intentar separar otorgantes vs beneficiarios por contexto
    const otorgantes = []
    const beneficiarios = []
    
    for (const name of cleanedNames) {
      // Buscar contexto del nombre en el texto original
      const nameRegex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const match = text.match(nameRegex)
      
      if (match) {
        const index = text.indexOf(match[0].toUpperCase())
        const before = text.slice(Math.max(0, index - 100), index)
        const after = text.slice(index, Math.min(text.length, index + 200))
        
        // Heurística: si aparece antes "A FAVOR" o después de "OTORGADO POR", es beneficiario
        if (/A\s+FAVOR|BENEFICIARIO/i.test(before) || /FAVOR.*DE/i.test(before)) {
          beneficiarios.push({
            nombre: name,
            tipo_persona: this.guessTipoPersona(name)
          })
        } else {
          otorgantes.push({
            nombre: name,
            tipo_persona: this.guessTipoPersona(name)
          })
        }
      } else {
        // Si no hay contexto claro, asumir otorgante
        otorgantes.push({
          nombre: name,
          tipo_persona: this.guessTipoPersona(name)
        })
      }
    }
    
    // Si todos fueron a una categoría, redistribuir
    if (otorgantes.length === 0 && beneficiarios.length > 0) {
      otorgantes.push(beneficiarios.shift())
    }
    
    const tipoActo = this.extractDesperateActType(text) || 'PODER ESPECIAL'
    
    return {
      tipoActo,
      otorgantes,
      beneficiarios
    }
  },

  /**
   * Valida si un candidato a nombre es válido
   */
  isValidNameCandidate(name) {
    const trimmed = name.trim()
    
    // Debe tener al menos 6 caracteres
    if (trimmed.length < 6) return false
    
    // No debe ser solo números
    if (/^\d+$/.test(trimmed)) return false
    
    // No debe contener demasiados espacios consecutivos
    if (/\s{3,}/.test(trimmed)) return false
    
    // Debe tener al menos 2 palabras o ser una empresa conocida
    const words = trimmed.split(/\s+/).filter(Boolean)
    if (words.length < 2 && !/FUNDACI[ÓO]N|EMPRESA|S\.A\.|LTDA|CIA/i.test(trimmed)) {
      return false
    }
    
    // No debe contener palabras comunes de encabezados
    const badWords = ['PERSONA', 'NATURAL', 'JURIDICA', 'JURÍDICA', 'TIPO', 'INTERVINIENTE', 'DOCUMENTO', 'NACIONALIDAD', 'CALIDAD', 'REPRESENTA', 'UBICACION', 'PROVINCIA', 'CANTON', 'PARROQUIA']
    if (badWords.some(bad => trimmed.includes(bad))) return false
    
    return true
  },

  /**
   * Limpia un nombre extraído desesperadamente
   */
  cleanDesperateName(name) {
    return name
      .replace(/\s+/g, ' ')
      .replace(/^(PERSONA\s+)?(NATURAL|JUR[IÍ]DICA)\s+/i, '')
      .replace(/\s+(POR\s+SUS\s+PROPIOS|REPRESENTADO|RUC|CEDULA).*$/i, '')
      .replace(/\s+(ECUATORIAN|MANDATARIO).*$/i, '')
      .trim()
  },

  /**
   * Extrae tipo de acto desesperadamente
   */
  extractDesperateActType(text) {
    // Buscar patrones comunes de actos
    const patterns = [
      /PODER\s+(?:GENERAL|ESPECIAL|UNIVERSAL)/i,
      /REVOCATORIA\s+DE\s+PODER/i,
      /COMPRAVENTA/i,
      /TESTAMENTO/i,
      /DONACI[ÓO]N/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return match[0].toUpperCase()
      }
    }
    
    return null
  },

  /**
   * Determina tipo de persona (reutilizado desde concuerdo-controller pero más simple)
   */
  guessTipoPersona(name) {
    const s = String(name || '').toUpperCase()
    const entityTokens = [
      'FUNDACION', 'FUNDACIÓN', 'S.A.', 'SA', 'LTDA', 'CIA', 'CÍA',
      'CORPORACION', 'CORPORACIÓN', 'EMPRESA', 'ASOCIACION', 'ASOCIACIÓN',
      'COOPERATIVA', 'UNIVERSIDAD', 'MUNICIPIO', 'GAD', 'EP'
    ]
    
    const pattern = new RegExp(`\\b(${entityTokens.join('|').replace(/\./g, '\\.')})\\b`)
    return pattern.test(s) ? 'Jurídica' : 'Natural'
  }
}

export default PdfExtractorService
