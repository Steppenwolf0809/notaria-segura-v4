/**
 * Parser Universal para PDFs Notariales
 * Sistema robusto que detecta automáticamente el tipo de PDF y aplica la estrategia óptima
 */

import PdfExtractorService from './pdf-extractor-service.js'
import NotarialTableParser from './notarial-table-parser.js'
import createDebug from 'debug'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PATTERNS_DIR = path.join(__dirname, '..', 'data', 'extractos-referencia', 'inputs')

class UniversalPdfParser {
  constructor() {
    this.debug = process.env.NODE_ENV !== 'production'
    this.dlog = createDebug('concuerdos:universal')
    this.patterns = new Map()
    this.confidence = {
      HIGH: 0.8,
      MEDIUM: 0.6,
      LOW: 0.3
    }
    
    // Cargar patrones conocidos al inicializar
    this.loadKnownPatterns()
  }

  async loadKnownPatterns() {
    try {
      const files = await fs.readdir(PATTERNS_DIR)
      for (const file of files.filter(f => f.endsWith('.json'))) {
        const pattern = JSON.parse(await fs.readFile(path.join(PATTERNS_DIR, file), 'utf8'))
        this.patterns.set(pattern.patron || file.replace('.json', ''), pattern)
      }
      this.log(`Cargados ${this.patterns.size} patrones conocidos`)
    } catch (error) {
      this.log('Error cargando patrones:', error.message)
    }
  }

  log(message, ...args) {
    if (this.debug) {
      this.dlog(message, ...args)
    }
  }

  /**
   * Análisis principal - detecta automáticamente el mejor parser
   */
  async parseDocument(pdfBuffer, rawText) {
    try {
      this.log('🚀 Iniciando análisis universal del PDF')
      
      // 1. Analizar estructura del documento
      const structure = await this.analyzeDocumentStructure(pdfBuffer, rawText)
      this.log('📊 Estructura detectada:', structure)
      
      // 2. Clasificar tipo de documento
      const classification = this.classifyDocument(rawText, structure)
      this.log('🏷️ Clasificación:', classification)
      
      // 3. Seleccionar estrategia de parsing
      const strategy = this.selectParsingStrategy(structure, classification)
      this.log('🎯 Estrategia seleccionada:', strategy.name)
      
      // 4. Ejecutar parsing con múltiples métodos
      const results = await this.executeMultiParser(pdfBuffer, rawText, strategy)
      
      // 5. Validar y fusionar resultados
      const validated = this.validateAndMerge(results, classification)
      
      this.log('✅ Parsing completado con confianza:', validated.confidence)
      return validated
      
    } catch (error) {
      this.log('❌ Error en parsing universal:', error.message)
      throw error
    }
  }

  /**
   * Analiza la estructura espacial y textual del documento
   */
  async analyzeDocumentStructure(pdfBuffer, rawText) {
    const structure = {
      layout: 'unknown',
      hasTable: false,
      sections: [],
      notaryInfo: null,
      coordinates: null
    }

    try {
      // Análisis textual
      const textAnalysis = this.analyzeTextStructure(rawText)
      structure.sections = textAnalysis.sections
      structure.notaryInfo = textAnalysis.notaryInfo
      
      // Análisis espacial con PDF.js
      if (pdfBuffer) {
        const spatialAnalysis = await this.analyzeSpatialStructure(pdfBuffer)
        structure.layout = spatialAnalysis.layout
        structure.hasTable = spatialAnalysis.hasTable
        structure.coordinates = spatialAnalysis.coordinates
      }
      
      return structure
    } catch (error) {
      this.log('Advertencia en análisis estructural:', error.message)
      return structure
    }
  }

  analyzeTextStructure(rawText) {
    const text = rawText.toUpperCase()
    const sections = []
    
    // Detectar secciones principales
    const sectionMarkers = [
      { name: 'HEADER', regex: /NOTARIO\s*\(\s*A\s*\)/ },
      { name: 'TITLE', regex: /ACTO\s+O\s+CONTRATO/ },
      { name: 'OTORGANTES', regex: /OTORGAD[OA]\s+POR|OTORGANTES/ },
      { name: 'BENEFICIARIOS', regex: /A\s+FAVOR\s+DE|BENEFICIARIOS?/ },
      { name: 'FOOTER', regex: /PROVINCIA|UBICACI[ÓO]N/ }
    ]
    
    for (const marker of sectionMarkers) {
      const match = text.search(marker.regex)
      if (match !== -1) {
        sections.push({ type: marker.name, position: match })
      }
    }
    
    // Extraer información del notario
    const notaryInfo = PdfExtractorService.extractNotaryInfo(rawText)
    
    return { sections, notaryInfo }
  }

  async analyzeSpatialStructure(pdfBuffer) {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
      const pdfjsLib = pdfjs?.default || pdfjs
      
      if (pdfjsLib?.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      }

      const data = new Uint8Array(pdfBuffer)
      const loadingTask = pdfjsLib.getDocument({ data })
      const doc = await loadingTask.promise
      
      const page = await doc.getPage(1)
      const textContent = await page.getTextContent()
      
      // Analizar distribución espacial
      const items = textContent.items.map(item => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height
      }))
      
      // Detectar si hay estructura tabular
      const hasTable = this.detectTableStructure(items)
      const layout = hasTable ? 'tabular' : 'linear'
      
      return { layout, hasTable, coordinates: items }
    } catch (error) {
      this.log('Error en análisis espacial:', error.message)
      return { layout: 'linear', hasTable: false, coordinates: null }
    }
  }

  detectTableStructure(items) {
    // Buscar patrones de alineación que indiquen tabla
    const xPositions = items.map(item => Math.round(item.x))
    const uniqueX = [...new Set(xPositions)]
    
    // Si hay más de 3 columnas alineadas, probablemente es una tabla
    const columnCount = uniqueX.filter(x => 
      xPositions.filter(pos => Math.abs(pos - x) < 5).length > 3
    ).length
    
    return columnCount >= 3
  }

  /**
   * Clasifica el tipo de documento basado en contenido
   */
  classifyDocument(rawText, structure) {
    const text = rawText.toUpperCase()
    const classification = {
      docType: 'unknown',
      actType: 'unknown',
      notaryType: 'generic',
      confidence: 0
    }
    
    // Detectar tipo de acto
    if (text.includes('PODER GENERAL')) {
      classification.actType = 'PODER_GENERAL'
      classification.confidence += 0.3
    } else if (text.includes('PODER ESPECIAL')) {
      classification.actType = 'PODER_ESPECIAL'
      classification.confidence += 0.3
    } else if (text.includes('REVOCATORIA')) {
      classification.actType = 'REVOCATORIA'
      classification.confidence += 0.3
    }
    
    // Detectar si es persona natural o jurídica
    if (text.includes('PERSONA NATURAL')) {
      classification.docType = 'NATURAL'
      classification.confidence += 0.2
    } else if (text.includes('PERSONA JURÍDICA') || text.includes('JURIDICA')) {
      classification.docType = 'JURIDICA'
      classification.confidence += 0.2
    }
    
    // Detectar tipo de notaría por patrón
    if (structure.notaryInfo?.notariaNumero?.includes('DÉCIMA OCTAVA')) {
      classification.notaryType = 'DECIMA_OCTAVA_QUITO'
      classification.confidence += 0.2
    }
    
    // Buscar en patrones conocidos
    for (const [key, pattern] of this.patterns) {
      if (pattern.tipos_aplicables?.some(tipo => text.includes(tipo))) {
        classification.pattern = key
        classification.confidence += 0.3
        break
      }
    }
    
    return classification
  }

  /**
   * Selecciona la mejor estrategia de parsing
   */
  selectParsingStrategy(structure, classification) {
    const strategies = []
    
    // Estrategia 1: Parser tabular (si hay tabla)
    if (structure.hasTable) {
      strategies.push({
        name: 'tabular',
        priority: 0.8,
        parser: 'NotarialTableParser'
      })
    }
    
    // Estrategia 2: Parser de texto avanzado
    strategies.push({
      name: 'advanced_text',
      priority: 0.6,
      parser: 'PdfExtractorService.parseAdvancedData'
    })
    
    // Estrategia 3: Parser simple (fallback)
    strategies.push({
      name: 'simple_text',
      priority: 0.4,
      parser: 'PdfExtractorService.parseSimpleData'
    })
    
    // Ordenar por prioridad y confianza de clasificación
    return strategies
      .map(s => ({ ...s, score: s.priority * classification.confidence }))
      .sort((a, b) => b.score - a.score)[0]
  }

  /**
   * Ejecuta múltiples parsers y combina resultados
   */
  async executeMultiParser(pdfBuffer, rawText, strategy) {
    const results = []
    
    try {
      // Parser principal
      if (strategy.parser === 'NotarialTableParser') {
        const tableParser = new NotarialTableParser()
        const tableResult = await tableParser.parseStructuredData(pdfBuffer)
        if (tableResult.length > 0) {
          results.push({
            source: 'table',
            confidence: 0.8,
            data: PdfExtractorService.convertStructuredDataToActs(tableResult, rawText)
          })
        }
      }
      
      // Parser de texto avanzado (siempre como respaldo)
      const advancedResult = await PdfExtractorService.parseAdvancedData(rawText, pdfBuffer)
      if (advancedResult.acts.length > 0) {
        results.push({
          source: 'advanced_text',
          confidence: 0.6,
          data: advancedResult.acts
        })
      }
      
      // Parser simple (fallback final)
      const simpleResult = PdfExtractorService.parseSimpleData(rawText)
      if (simpleResult.tipoActo || simpleResult.otorgantes.length > 0) {
        results.push({
          source: 'simple_text',
          confidence: 0.4,
          data: [simpleResult]
        })
      }
      
    } catch (error) {
      this.log('Error en multi-parser:', error.message)
    }
    
    return results
  }

  /**
   * Valida y fusiona resultados de múltiples parsers
   */
  validateAndMerge(results, classification) {
    if (results.length === 0) {
      return {
        acts: [],
        confidence: 0,
        source: 'none',
        validation: { issues: ['No se pudo extraer información del PDF'] }
      }
    }
    
    // Tomar el resultado con mayor confianza
    const bestResult = results.sort((a, b) => b.confidence - a.confidence)[0]
    
    // Validar calidad de los datos
    const validation = this.validateExtractedData(bestResult.data)
    
    // Fusionar con información complementaria de otros parsers
    const mergedData = this.mergeComplementaryData(bestResult, results)
    
    return {
      acts: mergedData,
      confidence: Math.min(bestResult.confidence + validation.score, 1.0),
      source: bestResult.source,
      validation: validation,
      classification: classification
    }
  }

  validateExtractedData(acts) {
    const validation = {
      score: 0,
      issues: [],
      warnings: []
    }
    
    for (const act of acts) {
      // Validar tipo de acto
      if (!act.tipoActo || act.tipoActo.length < 3) {
        validation.issues.push('Tipo de acto no detectado o muy corto')
      } else {
        validation.score += 0.2
      }
      
      // Validar otorgantes
      if (!act.otorgantes || act.otorgantes.length === 0) {
        validation.issues.push('No se detectaron otorgantes')
      } else {
        validation.score += 0.4
        
        // Validar nombres de otorgantes
        const invalidNames = act.otorgantes.filter(o => 
          !o.nombre || o.nombre.length < 3 || o.nombre === '[object Object]'
        )
        if (invalidNames.length > 0) {
          validation.issues.push(`${invalidNames.length} otorgantes con nombres inválidos`)
        }
      }
      
      // Validar beneficiarios (opcional)
      if (act.beneficiarios && act.beneficiarios.length > 0) {
        validation.score += 0.2
        
        const invalidBenef = act.beneficiarios.filter(b => 
          !b.nombre || b.nombre.length < 3 || b.nombre === '[object Object]'
        )
        if (invalidBenef.length > 0) {
          validation.warnings.push(`${invalidBenef.length} beneficiarios con nombres inválidos`)
        }
      }
    }
    
    return validation
  }

  mergeComplementaryData(bestResult, allResults) {
    // Por ahora retornar el mejor resultado
    // En el futuro se puede implementar fusión inteligente
    return bestResult.data
  }
}

export default UniversalPdfParser
