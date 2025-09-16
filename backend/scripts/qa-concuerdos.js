#!/usr/bin/env node

// Script de QA para sistema de concuerdos
// --------------------------------------
// Ejecuta pruebas automatizadas contra dataset piloto
// Genera reportes de calidad y métricas

import { generarConcuerdos } from '../src/services/concuerdo-service.js';
import { detectStructure } from '../src/services/structure-router.js';
import fs from 'fs';
import path from 'path';

// Dataset de prueba (3-5 casos por estructura A/B/C)
const testCases = [
  {
    id: 'test_A_001',
    name: 'Poder General con Beneficiario',
    data: {
      actos: [{ tipo: 'PODER GENERAL' }],
      notario: 'MARIA ELENA RODRIGUEZ',
      notaria: 'QUINTA DEL CANTON QUITO',
      otorgantes: [{ nombre: 'JUAN CARLOS PEREZ LOPEZ', tipo_persona: 'Natural' }],
      beneficiarios: [{ nombre: 'ANA MARIA GONZALEZ', tipo_persona: 'Natural' }],
      source: 'Poder otorgado a favor de Ana Maria'
    },
    expectedStructure: 'A'
  },
  {
    id: 'test_B_001',
    name: 'Poder Solo Otorgante',
    data: {
      actos: [{ tipo: 'PODER ESPECIAL' }],
      notario: 'CARLOS ALBERTO VERA',
      notaria: 'DECIMA OCTAVA DEL CANTON QUITO',
      otorgantes: [{ nombre: 'MARIA FERNANDA TORRES', tipo_persona: 'Natural' }],
      beneficiarios: [],
      source: 'Poder especial sin beneficiarios específicos'
    },
    expectedStructure: 'B'
  },
  {
    id: 'test_C_001',
    name: 'Autorización de Salida',
    data: {
      actos: [{ tipo: 'AUTORIZACIÓN DE SALIDA' }],
      notario: 'GLENDA ZAPATA',
      notaria: 'DECIMA OCTAVA DEL CANTON QUITO',
      otorgantes: [{ nombre: 'PATRICIA LOPEZ', tipo_persona: 'Natural' }],
      beneficiarios: [{ nombre: 'CARLOS LOPEZ', tipo_persona: 'Natural' }],
      source: 'Autorización de salida del menor'
    },
    expectedStructure: 'C'
  },
  {
    id: 'test_A_002',
    name: 'Compra Venta con Beneficiarios',
    data: {
      actos: [{ tipo: 'COMPRAVENTA' }],
      notario: 'FERNANDO GARCIA',
      notaria: 'QUINTA DEL CANTON QUITO',
      otorgantes: [{ nombre: 'COMPAÑIA CONSTRUCTORA S.A.', tipo_persona: 'Jurídica' }],
      beneficiarios: [{ nombre: 'BANCO NACIONAL', tipo_persona: 'Jurídica' }],
      source: 'Compraventa a favor del banco'
    },
    expectedStructure: 'A'
  },
  {
    id: 'test_B_002',
    name: 'Reconocimiento Simple',
    data: {
      actos: [{ tipo: 'RECONOCIMIENTO' }],
      notario: 'LUISA MARTINEZ',
      notaria: 'DECIMA OCTAVA DEL CANTON QUITO',
      otorgantes: [{ nombre: 'PEDRO SANCHEZ', tipo_persona: 'Natural' }],
      beneficiarios: [],
      source: 'Reconocimiento de firma'
    },
    expectedStructure: 'B'
  }
];

// Configuraciones de prueba
const testConfigs = [
  { TEMPLATE_MODE: 'structural', PROMPT_FORCE_TEMPLATE: 'auto' },
  { TEMPLATE_MODE: 'family', PROMPT_FORCE_TEMPLATE: 'auto' },
  { TEMPLATE_MODE: 'structural', PROMPT_FORCE_TEMPLATE: 'A' }
];

// Resultados de QA
const qaResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  structureDistribution: { A: 0, B: 0, C: 0 },
  concordanciaIssues: 0,
  templateIssues: 0,
  testDetails: []
};

/**
 * Valida concordancias gramaticales
 */
function validateConcordancias(text, otorgantesCount) {
  const textLower = text.toLowerCase();
  const hasQueOtorga = textLower.includes('que otorga');
  const hasQueOtorgan = textLower.includes('que otorgan');

  if (otorgantesCount === 1) {
    return hasQueOtorga && !hasQueOtorgan;
  } else {
    return hasQueOtorgan && !hasQueOtorga;
  }
}

/**
 * Valida estructura básica del template
 */
function validateTemplateStructure(text) {
  const hasPrimera = text.includes('PRIMERA') || text.includes('SEGUNDA');
  const hasNotario = text.includes('NOTARIO') || text.includes('NOTARÍA');
  const hasStructure = text.length > 100; // Longitud mínima razonable

  return { hasPrimera, hasNotario, hasStructure };
}

/**
 * Ejecuta una prueba individual
 */
async function runTest(testCase, config) {
  try {
    console.log(`🧪 Ejecutando ${testCase.id}: ${testCase.name}`);

    // Detectar estructura esperada
    const detectedStructure = detectStructure(testCase.data);
    const structureCorrect = detectedStructure === testCase.expectedStructure;

    // Generar concuerdos
    const result = generarConcuerdos({
      data: testCase.data,
      settings: config
    });

    // Validaciones
    const primera = result.primera || '';
    const segunda = result.segunda || '';

    const concordanciaPrimera = validateConcordancias(primera, testCase.data.otorgantes.length);
    const concordanciaSegunda = validateConcordancias(segunda, testCase.data.otorgantes.length);

    const templatePrimera = validateTemplateStructure(primera);
    const templateSegunda = validateTemplateStructure(segunda);

    // Calcular calidad (PU-0: sin ediciones, PU-1: ≤1 edición)
    const pu0 = structureCorrect && concordanciaPrimera && concordanciaSegunda &&
                templatePrimera.hasPrimera && templatePrimera.hasNotario &&
                templateSegunda.hasPrimera && templateSegunda.hasNotario;

    const pu1 = !pu0 && (
      structureCorrect ||
      (concordanciaPrimera || concordanciaSegunda) ||
      (templatePrimera.hasPrimera || templateSegunda.hasPrimera)
    );

    // Actualizar contadores
    qaResults.totalTests++;
    if (pu0) qaResults.passedTests++;
    else qaResults.failedTests++;

    qaResults.structureDistribution[detectedStructure] =
      (qaResults.structureDistribution[detectedStructure] || 0) + 1;

    if (!concordanciaPrimera || !concordanciaSegunda) qaResults.concordanciaIssues++;
    if (!templatePrimera.hasStructure || !templateSegunda.hasStructure) qaResults.templateIssues++;

    // Detalles de la prueba
    const testDetail = {
      id: testCase.id,
      name: testCase.name,
      config: config,
      structure: {
        expected: testCase.expectedStructure,
        detected: detectedStructure,
        correct: structureCorrect
      },
      concordancias: {
        primera: concordanciaPrimera,
        segunda: concordanciaSegunda
      },
      templates: {
        primera: templatePrimera,
        segunda: templateSegunda
      },
      quality: {
        pu0: pu0,
        pu1: pu1,
        needsEditing: !pu0 && !pu1
      },
      lengths: {
        primera: primera.length,
        segunda: segunda.length
      }
    };

    qaResults.testDetails.push(testDetail);

    console.log(`  ✅ Estructura: ${detectedStructure} (${structureCorrect ? 'OK' : 'FAIL'})`);
    console.log(`  ✅ Concordancias: ${concordanciaPrimera && concordanciaSegunda ? 'OK' : 'ISSUES'}`);
    console.log(`  ✅ Templates: ${templatePrimera.hasStructure && templateSegunda.hasStructure ? 'OK' : 'ISSUES'}`);
    console.log(`  📊 Calidad: ${pu0 ? 'PU-0' : pu1 ? 'PU-1' : 'REQUIERE EDICIÓN'}`);

    return testDetail;

  } catch (error) {
    console.error(`❌ Error en test ${testCase.id}:`, error.message);
    qaResults.failedTests++;
    qaResults.totalTests++;

    return {
      id: testCase.id,
      error: error.message,
      quality: { pu0: false, pu1: false, needsEditing: true }
    };
  }
}

/**
 * Genera reporte de QA
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: qaResults.totalTests,
      passedTests: qaResults.passedTests,
      failedTests: qaResults.failedTests,
      passRate: qaResults.totalTests > 0 ? (qaResults.passedTests / qaResults.totalTests * 100).toFixed(1) + '%' : '0%'
    },
    issues: {
      concordanciaIssues: qaResults.concordanciaIssues,
      templateIssues: qaResults.templateIssues
    },
    structureDistribution: qaResults.structureDistribution,
    qualityBreakdown: {
      pu0: qaResults.testDetails.filter(t => t.quality?.pu0).length,
      pu1: qaResults.testDetails.filter(t => t.quality?.pu1).length,
      needsEditing: qaResults.testDetails.filter(t => t.quality?.needsEditing).length
    },
    testDetails: qaResults.testDetails
  };

  return report;
}

/**
 * Guarda artefactos de QA
 */
function saveArtifacts(report) {
  const qaDir = path.join(process.cwd(), 'qa');
  const outputsDir = path.join(qaDir, 'outputs');

  // Crear directorios si no existen
  if (!fs.existsSync(qaDir)) fs.mkdirSync(qaDir);
  if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir);

  // Guardar reporte JSON
  const reportPath = path.join(outputsDir, `qa-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Guardar ejemplos de concuerdos generados
  qaResults.testDetails.forEach((test, index) => {
    if (test.error) return;

    const examplePath = path.join(outputsDir, `example-${test.id}.txt`);
    const content = `
TEST: ${test.name}
CONFIG: ${JSON.stringify(test.config)}
ESTRUCTURA: ${test.structure.detected}
CALIDAD: ${test.quality.pu0 ? 'PU-0' : test.quality.pu1 ? 'PU-1' : 'REQUIERE EDICIÓN'}

=== PRIMERA COPIA ===
${'primera' in test ? 'N/A' : 'Contenido generado'}

=== SEGUNDA COPIA ===
${'segunda' in test ? 'N/A' : 'Contenido generado'}
    `;

    fs.writeFileSync(examplePath, content);
  });

  console.log(`📁 Artefactos guardados en: ${outputsDir}`);
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 INICIANDO QA DE CONCUERDOS');
  console.log('==============================');

  // Ejecutar todas las pruebas
  for (const testCase of testCases) {
    for (const config of testConfigs) {
      await runTest(testCase, config);
    }
  }

  // Generar y mostrar reporte
  const report = generateReport();

  console.log('\n📊 REPORTE DE QA');
  console.log('================');
  console.log(`Total de pruebas: ${report.summary.totalTests}`);
  console.log(`Aprobadas: ${report.summary.passedTests}`);
  console.log(`Fallidas: ${report.summary.failedTests}`);
  console.log(`Tasa de aprobación: ${report.summary.passRate}`);
  console.log(`Distribución por estructura:`, JSON.stringify(report.structureDistribution));
  console.log(`Problemas de concordancias: ${report.issues.concordanciaIssues}`);
  console.log(`Problemas de templates: ${report.issues.templateIssues}`);

  console.log('\n📈 DESGLOSE DE CALIDAD');
  console.log(`PU-0 (sin edición): ${report.qualityBreakdown.pu0}`);
  console.log(`PU-1 (≤1 edición): ${report.qualityBreakdown.pu1}`);
  console.log(`Requiere edición: ${report.qualityBreakdown.needsEditing}`);

  // Guardar artefactos
  saveArtifacts(report);

  console.log('\n✅ QA COMPLETADO');
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runQA, testCases, testConfigs };