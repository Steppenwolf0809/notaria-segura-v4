/**
 * Script de prueba para el Parser Universal
 * Analiza todos los PDFs de muestra y genera reporte de efectividad
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import UniversalPdfParser from './src/services/universal-pdf-parser.js'
import PdfExtractorService from './src/services/pdf-extractor-service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PDF_DIR = path.join(__dirname, 'src/data/extractos-referencia/pdf')

async function testUniversalParser() {
  console.log('🚀 Iniciando pruebas del Parser Universal')
  console.log('='.repeat(60))
  
  // Debug: verificar que podemos leer el directorio
  console.log('📁 Directorio PDF:', PDF_DIR)
  
  const parser = new UniversalPdfParser()
  const results = []
  
  try {
    const files = await fs.readdir(PDF_DIR)
    const pdfFiles = files.filter(f => f.endsWith('.pdf'))
    
    console.log(`📁 Encontrados ${pdfFiles.length} PDFs para analizar`)
    console.log('')
    
    for (const filename of pdfFiles) {
      console.log(`📄 Analizando: ${filename}`)
      console.log('-'.repeat(40))
      
      try {
        // Leer PDF
        const pdfPath = path.join(PDF_DIR, filename)
        const pdfBuffer = await fs.readFile(pdfPath)
        
        // Extraer texto
        const rawText = await PdfExtractorService.extractText(pdfBuffer)
        
        // Análisis con parser universal
        const startTime = Date.now()
        const universalResult = await parser.parseDocument(pdfBuffer, rawText)
        const parseTime = Date.now() - startTime
        
        // Análisis con parser original (comparación)
        const originalResult = await PdfExtractorService.parseAdvancedData(rawText, pdfBuffer)
        
        // Evaluación
        const evaluation = evaluateResult(universalResult, originalResult)
        
        const result = {
          filename,
          parseTime,
          universal: universalResult,
          original: originalResult,
          evaluation
        }
        
        results.push(result)
        
        // Mostrar resultado
        console.log(`✅ Resultado Universal:`)
        console.log(`   Confianza: ${Math.round(universalResult.confidence * 100)}%`)
        console.log(`   Fuente: ${universalResult.source}`)
        console.log(`   Actos detectados: ${universalResult.acts.length}`)
        
        if (universalResult.acts.length > 0) {
          const act = universalResult.acts[0]
          console.log(`   Tipo: ${act.tipoActo}`)
          console.log(`   Otorgantes: ${act.otorgantes?.length || 0}`)
          console.log(`   Beneficiarios: ${act.beneficiarios?.length || 0}`)
          
          if (act.otorgantes?.length > 0) {
            console.log(`   Primer otorgante: ${act.otorgantes[0].nombre}`)
          }
          if (act.beneficiarios?.length > 0) {
            console.log(`   Primer beneficiario: ${act.beneficiarios[0].nombre}`)
          }
        }
        
        if (universalResult.validation?.issues?.length > 0) {
          console.log(`⚠️  Issues:`, universalResult.validation.issues)
        }
        
        console.log(`⏱️  Tiempo: ${parseTime}ms`)
        console.log('')
        
      } catch (error) {
        console.error(`❌ Error procesando ${filename}:`, error.message)
        results.push({
          filename,
          error: error.message,
          parseTime: 0
        })
        console.log('')
      }
    }
    
    // Generar reporte final
    generateReport(results)
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message)
  }
}

function evaluateResult(universalResult, originalResult) {
  const evaluation = {
    score: 0,
    improvements: [],
    regressions: []
  }
  
  // Comparar número de actos detectados
  const universalActs = universalResult.acts?.length || 0
  const originalActs = originalResult.acts?.length || 0
  
  if (universalActs > originalActs) {
    evaluation.improvements.push(`Detectó más actos (${universalActs} vs ${originalActs})`)
    evaluation.score += 0.2
  } else if (universalActs < originalActs) {
    evaluation.regressions.push(`Detectó menos actos (${universalActs} vs ${originalActs})`)
    evaluation.score -= 0.2
  } else {
    evaluation.score += 0.1
  }
  
  // Comparar calidad de extracción del primer acto
  if (universalActs > 0 && originalActs > 0) {
    const uAct = universalResult.acts[0]
    const oAct = originalResult.acts[0]
    
    // Otorgantes
    const uOtorgantes = uAct.otorgantes?.length || 0
    const oOtorgantes = oAct.otorgantes?.length || 0
    
    if (uOtorgantes > oOtorgantes) {
      evaluation.improvements.push(`Más otorgantes detectados (${uOtorgantes} vs ${oOtorgantes})`)
      evaluation.score += 0.3
    } else if (uOtorgantes < oOtorgantes) {
      evaluation.regressions.push(`Menos otorgantes detectados (${uOtorgantes} vs ${oOtorgantes})`)
      evaluation.score -= 0.3
    } else {
      evaluation.score += 0.2
    }
    
    // Beneficiarios
    const uBeneficiarios = uAct.beneficiarios?.length || 0
    const oBeneficiarios = oAct.beneficiarios?.length || 0
    
    if (uBeneficiarios > oBeneficiarios) {
      evaluation.improvements.push(`Más beneficiarios detectados (${uBeneficiarios} vs ${oBeneficiarios})`)
      evaluation.score += 0.3
    } else if (uBeneficiarios < oBeneficiarios) {
      evaluation.regressions.push(`Menos beneficiarios detectados (${uBeneficiarios} vs ${oBeneficiarios})`)
      evaluation.score -= 0.3
    } else {
      evaluation.score += 0.2
    }
  }
  
  // Bonificación por confianza alta
  if (universalResult.confidence > 0.8) {
    evaluation.score += 0.2
  }
  
  return evaluation
}

function generateReport(results) {
  console.log('📊 REPORTE FINAL')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => !r.error)
  const failed = results.filter(r => r.error)
  
  console.log(`📈 Estadísticas Generales:`)
  console.log(`   Total PDFs analizados: ${results.length}`)
  console.log(`   Exitosos: ${successful.length}`)
  console.log(`   Fallidos: ${failed.length}`)
  console.log(`   Tasa de éxito: ${Math.round(successful.length / results.length * 100)}%`)
  console.log('')
  
  if (successful.length > 0) {
    const avgConfidence = successful.reduce((sum, r) => sum + (r.universal?.confidence || 0), 0) / successful.length
    const avgParseTime = successful.reduce((sum, r) => sum + r.parseTime, 0) / successful.length
    const avgScore = successful.reduce((sum, r) => sum + (r.evaluation?.score || 0), 0) / successful.length
    
    console.log(`📊 Métricas de Calidad:`)
    console.log(`   Confianza promedio: ${Math.round(avgConfidence * 100)}%`)
    console.log(`   Tiempo promedio: ${Math.round(avgParseTime)}ms`)
    console.log(`   Score de mejora: ${avgScore.toFixed(2)}`)
    console.log('')
    
    // Top mejoras
    const allImprovements = successful.flatMap(r => r.evaluation?.improvements || [])
    const improvementCounts = {}
    allImprovements.forEach(imp => improvementCounts[imp] = (improvementCounts[imp] || 0) + 1)
    
    if (Object.keys(improvementCounts).length > 0) {
      console.log(`🎯 Mejoras más frecuentes:`)
      Object.entries(improvementCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .forEach(([improvement, count]) => {
          console.log(`   • ${improvement} (${count} casos)`)
        })
      console.log('')
    }
  }
  
  if (failed.length > 0) {
    console.log(`❌ Archivos fallidos:`)
    failed.forEach(r => {
      console.log(`   • ${r.filename}: ${r.error}`)
    })
    console.log('')
  }
  
  console.log('✅ Análisis completado')
}

// Ejecutar pruebas
testUniversalParser().catch(console.error)

export default testUniversalParser
