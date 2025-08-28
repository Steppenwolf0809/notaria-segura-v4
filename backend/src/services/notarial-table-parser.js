/**
 * Parser especializado para extractos notariales con estructura tabular
 * Usa coordenadas PDF.js para reconstruir la estructura de tabla
 */

class NotarialTableParser {
  constructor() {
    this.debug = process.env.NODE_ENV !== 'production'
  }

  /**
   * Extrae datos estructurados de un PDF usando coordenadas
   * @param {Buffer} pdfBuffer 
   * @returns {Promise<Array>} Array de actos con otorgantes/beneficiarios estructurados
   */
  async parseStructuredData(pdfBuffer) {
    try {
      // Usar pdfjs-dist para obtener coordenadas y texto posicionado
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
      const pdfjsLib = pdfjs?.default || pdfjs
      
      if (pdfjsLib?.GlobalWorkerOptions) {
        try { pdfjsLib.GlobalWorkerOptions.workerSrc = '' } catch {}
      }

      const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer })
      const doc = await loadingTask.promise
      
      const allStructuredData = []
      
      for (let pageNum = 1; pageNum <= Math.min(doc.numPages, 10); pageNum++) {
        const page = await doc.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Extraer elementos con coordenadas
        const items = textContent.items.map(item => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height
        })).filter(item => item.text.trim())

        // Buscar secciones de tabla
        const tableSections = this.identifyTableSections(items)
        
        for (const section of tableSections) {
          const parsedData = this.parseTableSection(section)
          if (parsedData) {
            allStructuredData.push(parsedData)
          }
        }
      }

      return allStructuredData
    } catch (error) {
      this.log('Error en parseStructuredData:', error.message)
      return []
    }
  }

  /**
   * Identifica secciones que contienen tablas de otorgantes/beneficiarios
   */
  identifyTableSections(items) {
    const sections = []
    
    // Buscar marcadores de inicio de tabla
    const tableMarkers = [
      'OTORGANTES', 'OTORGADO POR', 'A FAVOR DE', 'BENEFICIARIO',
      'PERSONA', 'NOMBRES/RAZÓN SOCIAL', 'NOMBRES / RAZÓN SOCIAL'
    ]
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const upperText = item.text.toUpperCase()
      
      if (tableMarkers.some(marker => upperText.includes(marker))) {
        // Encontramos un marcador de tabla, extraer la sección completa
        const sectionItems = this.extractTableSection(items, i)
        if (sectionItems.length > 0) {
          sections.push({
            type: this.identifySectionType(upperText),
            items: sectionItems,
            startIndex: i
          })
        }
      }
    }
    
    return sections
  }

  /**
   * Extrae una sección completa de tabla basada en coordenadas Y
   */
  extractTableSection(items, startIndex) {
    const startY = items[startIndex].y
    const sectionItems = []
    
    // Tomar elementos en un rango Y similar (±50 puntos hacia abajo)
    const minY = startY - 200 // Hacia arriba
    const maxY = startY + 50  // Hacia abajo
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.y >= minY && item.y <= maxY) {
        sectionItems.push({
          ...item,
          index: i
        })
      }
    }
    
    // Ordenar por Y descendente, luego por X ascendente (lectura natural)
    return sectionItems.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 10) { // Misma fila
        return a.x - b.x
      }
      return b.y - a.y // Y descendente
    })
  }

  /**
   * Determina el tipo de sección (otorgantes o beneficiarios)
   */
  identifySectionType(upperText) {
    if (upperText.includes('OTORG') || upperText.includes('POR')) {
      return 'otorgantes'
    }
    if (upperText.includes('FAVOR') || upperText.includes('BENEFICIARIO')) {
      return 'beneficiarios'
    }
    return 'unknown'
  }

  /**
   * Parsea una sección de tabla y extrae los datos estructurados
   */
  parseTableSection(section) {
    try {
      const { type, items } = section
      const rows = this.groupItemsIntoRows(items)
      const columns = this.identifyColumns(items)
      
      this.log(`Parseando sección ${type}: ${rows.length} filas, ${columns.length} columnas`)
      
      const entities = []
      
      for (const row of rows) {
        const entity = this.parseRowAsEntity(row, columns)
        if (entity && entity.nombre) {
          entities.push(entity)
        }
      }
      
      return {
        type,
        entities,
        raw: { rows: rows.length, columns: columns.length }
      }
    } catch (error) {
      this.log('Error parseando sección:', error.message)
      return null
    }
  }

  /**
   * Agrupa elementos en filas basado en coordenadas Y
   */
  groupItemsIntoRows(items) {
    const rows = []
    const tolerance = 8 // Tolerancia para considerar elementos en la misma fila
    
    for (const item of items) {
      let foundRow = false
      
      for (const row of rows) {
        const rowY = row[0].y
        if (Math.abs(item.y - rowY) <= tolerance) {
          row.push(item)
          foundRow = true
          break
        }
      }
      
      if (!foundRow) {
        rows.push([item])
      }
    }
    
    // Ordenar elementos dentro de cada fila por X
    rows.forEach(row => {
      row.sort((a, b) => a.x - b.x)
    })
    
    // Ordenar filas por Y descendente
    rows.sort((a, b) => b[0].y - a[0].y)
    
    return rows
  }

  /**
   * Identifica columnas basado en posiciones X comunes
   */
  identifyColumns(items) {
    const xPositions = [...new Set(items.map(item => Math.round(item.x / 10) * 10))]
    xPositions.sort((a, b) => a - b)
    
    const columns = []
    const tolerance = 30
    
    for (const x of xPositions) {
      let merged = false
      for (const col of columns) {
        if (Math.abs(col.x - x) <= tolerance) {
          merged = true
          break
        }
      }
      if (!merged) {
        columns.push({ x, items: [] })
      }
    }
    
    // Asignar items a columnas
    for (const item of items) {
      const nearestCol = columns.reduce((prev, curr) => 
        Math.abs(curr.x - item.x) < Math.abs(prev.x - item.x) ? curr : prev
      )
      nearestCol.items.push(item)
    }
    
    return columns
  }

  /**
   * Convierte una fila en una entidad estructurada
   */
  parseRowAsEntity(row, columns) {
    if (row.length === 0) return null
    
    // Concatenar todo el texto de la fila
    const fullText = row.map(item => item.text).join(' ').trim()
    
    // Filtrar filas de encabezado
    if (this.isHeaderRow(fullText)) {
      return null
    }
    
    const entity = {
      nombre: '',
      tipo_persona: 'Natural',
      documento: '',
      nacionalidad: '',
      representantes: []
    }
    
    // Estrategia de extracción por patrones
    const patterns = {
      // Patrón: Jurídica + Nombre + Representado
      juridica: /JUR[IÍ]DICA\s+(.+?)(?:\s+REPRESENTADO|\s+RUC|\s+\d{13}|$)/i,
      // Patrón: Natural + Nombre + Por sus propios
      natural: /NATURAL\s+(.+?)(?:\s+POR\s+SUS|\s+CEDULA|\s+\d{10}|$)/i,
      // Patrón: Nombres/Razón Social
      razonSocial: /(.+?)(?:\s+REPRESENTADO|\s+POR\s+SUS|\s+CEDULA|\s+RUC|\s+\d{10,13}|$)/i
    }
    
    // Detectar tipo y extraer nombre
    if (patterns.juridica.test(fullText)) {
      const match = fullText.match(patterns.juridica)
      entity.nombre = this.cleanEntityName(match[1])
      entity.tipo_persona = 'Jurídica'
    } else if (patterns.natural.test(fullText)) {
      const match = fullText.match(patterns.natural)
      entity.nombre = this.cleanEntityName(match[1])
      entity.tipo_persona = 'Natural'
    } else {
      // Fallback: usar el primer texto sustancial
      const substantialTexts = row.filter(item => 
        item.text.length > 2 && 
        !/^\d+$/.test(item.text) && 
        !this.isCommonTableWord(item.text)
      )
      
      if (substantialTexts.length > 0) {
        entity.nombre = substantialTexts.map(item => item.text).join(' ').trim()
        entity.tipo_persona = this.guessTipoPersona(entity.nombre)
      }
    }
    
    // Extraer información adicional
    entity.documento = this.extractDocumento(fullText)
    entity.nacionalidad = this.extractNacionalidad(fullText)
    
    return entity.nombre ? entity : null
  }

  /**
   * Determina si una fila es un encabezado
   */
  isHeaderRow(text) {
    const headers = [
      'PERSONA', 'NOMBRES', 'RAZÓN SOCIAL', 'TIPO', 'INTERVINIENTE',
      'DOCUMENTO', 'IDENTIDAD', 'NACIONALIDAD', 'CALIDAD', 'REPRESENTA',
      'OTORGADO POR', 'A FAVOR DE'
    ]
    
    const upperText = text.toUpperCase()
    return headers.some(header => upperText.includes(header))
  }

  /**
   * Limpia el nombre de una entidad
   */
  cleanEntityName(name) {
    if (!name) return ''
    
    return name
      .replace(/\s+/g, ' ')
      .replace(/^(PERSONA\s+)?(NATURAL|JUR[IÍ]DICA)\s+/i, '')
      .replace(/\s+(POR\s+SUS\s+PROPIOS|REPRESENTADO|RUC|CEDULA).*$/i, '')
      .trim()
  }

  /**
   * Determina el tipo de persona basado en el nombre
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

  /**
   * Extrae número de documento
   */
  extractDocumento(text) {
    const cedulaMatch = text.match(/\b(\d{10})\b/)
    const rucMatch = text.match(/\b(\d{13})\b/)
    return rucMatch ? rucMatch[1] : (cedulaMatch ? cedulaMatch[1] : '')
  }

  /**
   * Extrae nacionalidad
   */
  extractNacionalidad(text) {
    const nacionalidades = ['ECUATORIANA', 'ECUATORIANO', 'COLOMBIANA', 'COLOMBIANO', 'PERUANA', 'PERUANO']
    const upperText = text.toUpperCase()
    
    for (const nac of nacionalidades) {
      if (upperText.includes(nac)) {
        return nac
      }
    }
    return ''
  }

  /**
   * Determina si una palabra es común en tablas (no es nombre)
   */
  isCommonTableWord(text) {
    const commonWords = [
      'POR', 'SUS', 'PROPIOS', 'DERECHOS', 'REPRESENTADO', 'CEDULA', 'RUC',
      'ECUATORIANA', 'ECUATORIANO', 'MANDANTE', 'MANDATARIO'
    ]
    return commonWords.includes(text.toUpperCase())
  }

  /**
   * Log condicional para debugging
   */
  log(...args) {
    if (this.debug) {
      console.log('[NotarialTableParser]', ...args)
    }
  }
}

export default NotarialTableParser
