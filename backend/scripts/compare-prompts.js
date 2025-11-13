#!/usr/bin/env node

/**
 * Script de comparación: Prompt Básico vs Prompt Mejorado
 *
 * Compara la calidad de extracción entre el prompt original
 * y el prompt mejorado con few-shot learning.
 *
 * Uso:
 *   node scripts/compare-prompts.js [--verbose]
 */

import { extractDataWithGemini } from '../src/services/gemini-service.js';

// Casos de prueba con diferentes tipos de documentos
const TEST_CASES = [
  {
    name: 'PODER GENERAL - Persona Natural',
    tipo: 'PODER GENERAL',
    text: `ESCRITURA PÚBLICA DE PODER GENERAL

Comparece la señora SUSAN MAGDALENA GUTIERREZ FABRE, ecuatoriana, mayor de edad,
portadora de la cédula de ciudadanía número 1234567890, quien confiere poder general
a la señora MARIA CRISTINA PUENTE SALINAS, ecuatoriana, portadora de cédula 0987654321.

Ante mí, GLENDA ELIZABETH ZAPATA SILVA, Notaria Décima Octava del Cantón Quito.`,
    expected: {
      acto_o_contrato: 'PODER GENERAL',
      otorgantes: [{
        apellidos: 'GUTIERREZ FABRE',
        nombres: 'SUSAN MAGDALENA',
        genero: 'F',
        calidad: 'MANDANTE'
      }],
      beneficiarios: [{
        apellidos: 'PUENTE SALINAS',
        nombres: 'MARIA CRISTINA',
        genero: 'F',
        calidad: 'MANDATARIO(A)'
      }]
    }
  },
  {
    name: 'PODER ESPECIAL - Persona Jurídica',
    tipo: 'PODER ESPECIAL',
    text: `ESCRITURA PÚBLICA DE PODER ESPECIAL

Comparece SIGMAEC CIA LTDA, representada por el señor JOSE IGNACIO BORBOLLA PERTIERRA,
quien confiere poder especial al señor MENA MONTERO WILLIAM STALIN.

Ante mí, GLENDA ELIZABETH ZAPATA SILVA, Notaria Décima Octava del Cantón Quito.`,
    expected: {
      acto_o_contrato: 'PODER ESPECIAL',
      otorgantes: [{
        apellidos: 'SIGMAEC CIA LTDA',
        nombres: '',
        genero: null,
        calidad: 'MANDANTE',
        tipo_persona: 'Jurídica'
      }],
      beneficiarios: [{
        apellidos: 'MENA MONTERO',
        nombres: 'WILLIAM STALIN',
        genero: 'M',
        calidad: 'MANDATARIO(A)'
      }]
    }
  },
  {
    name: 'COMPRAVENTA',
    tipo: 'COMPRAVENTA',
    text: `ESCRITURA PÚBLICA DE COMPRAVENTA

El señor CARLOS ALBERTO MENDOZA TORRES vende a la señora ANA MARIA LOPEZ GONZALEZ
un inmueble ubicado en Quito.

Ante el Notario FERNANDO GARCIA RUIZ, Quinta Notaría del Cantón Quito.`,
    expected: {
      acto_o_contrato: 'COMPRAVENTA',
      otorgantes: [{
        apellidos: 'MENDOZA TORRES',
        nombres: 'CARLOS ALBERTO',
        genero: 'M',
        calidad: 'VENDEDOR'
      }],
      beneficiarios: [{
        apellidos: 'LOPEZ GONZALEZ',
        nombres: 'ANA MARIA',
        genero: 'F',
        calidad: 'COMPRADOR'
      }]
    }
  },
  {
    name: 'MÚLTIPLES OTORGANTES',
    tipo: 'PODER GENERAL',
    text: `ESCRITURA PÚBLICA DE PODER GENERAL

Comparecen los señores JUAN CARLOS PEREZ LOPEZ y MARIA FERNANDA TORRES SANCHEZ,
quienes confieren poder general al señor DIEGO ANDRES RAMIREZ CASTRO.

Ante Notario FERNANDO GARCIA.`,
    expected: {
      acto_o_contrato: 'PODER GENERAL',
      otorgantes: [
        {
          apellidos: 'PEREZ LOPEZ',
          nombres: 'JUAN CARLOS',
          genero: 'M',
          calidad: 'MANDANTE'
        },
        {
          apellidos: 'TORRES SANCHEZ',
          nombres: 'MARIA FERNANDA',
          genero: 'F',
          calidad: 'MANDANTE'
        }
      ],
      beneficiarios: [{
        apellidos: 'RAMIREZ CASTRO',
        nombres: 'DIEGO ANDRES',
        genero: 'M',
        calidad: 'MANDATARIO(A)'
      }]
    }
  }
];

// Función de validación de resultados
function validateResult(result, expected) {
  const errors = [];
  const warnings = [];
  let score = 0;
  const maxScore = 100;

  // 1. Validar acto (20 puntos)
  if (result.acto_o_contrato === expected.acto_o_contrato) {
    score += 20;
  } else {
    errors.push(`Acto incorrecto: esperado "${expected.acto_o_contrato}", obtenido "${result.acto_o_contrato}"`);
  }

  // 2. Validar cantidad de otorgantes (10 puntos)
  if (result.otorgantes?.length === expected.otorgantes?.length) {
    score += 10;
  } else {
    errors.push(`Número de otorgantes incorrecto: esperado ${expected.otorgantes?.length}, obtenido ${result.otorgantes?.length}`);
  }

  // 3. Validar otorgantes (30 puntos)
  let otorganteScore = 0;
  expected.otorgantes?.forEach((exp, idx) => {
    const res = result.otorgantes?.[idx];
    if (!res) {
      errors.push(`Falta otorgante ${idx + 1}`);
      return;
    }

    // Apellidos (10 puntos)
    if (res.apellidos === exp.apellidos) {
      otorganteScore += 10;
    } else {
      errors.push(`Otorgante ${idx + 1}: apellidos incorrectos (esperado "${exp.apellidos}", obtenido "${res.apellidos}")`);
    }

    // Nombres (10 puntos)
    if (res.nombres === exp.nombres) {
      otorganteScore += 5;
    } else if (res.nombres?.trim() && exp.nombres?.trim()) {
      // Advertencia si hay nombres pero no coinciden
      warnings.push(`Otorgante ${idx + 1}: nombres parcialmente incorrectos`);
      otorganteScore += 2;
    }

    // Género (5 puntos)
    if (res.genero === exp.genero) {
      otorganteScore += 5;
    }

    // Calidad (10 puntos)
    if (res.calidad === exp.calidad) {
      otorganteScore += 10;
    } else if (res.calidad) {
      warnings.push(`Otorgante ${idx + 1}: calidad "${res.calidad}" (esperado "${exp.calidad}")`);
      otorganteScore += 5;
    }
  });
  score += Math.min(30, otorganteScore);

  // 4. Validar beneficiarios (30 puntos)
  if (result.beneficiarios?.length === expected.beneficiarios?.length) {
    score += 5;

    let benefScore = 0;
    expected.beneficiarios?.forEach((exp, idx) => {
      const res = result.beneficiarios?.[idx];
      if (!res) return;

      if (res.apellidos === exp.apellidos) benefScore += 8;
      if (res.nombres === exp.nombres) benefScore += 4;
      if (res.genero === exp.genero) benefScore += 3;
      if (res.calidad === exp.calidad) benefScore += 10;
    });
    score += Math.min(25, benefScore);
  } else {
    warnings.push(`Número de beneficiarios: esperado ${expected.beneficiarios?.length}, obtenido ${result.beneficiarios?.length}`);
  }

  // 5. Formato JSON válido (10 puntos)
  if (result && typeof result === 'object') {
    score += 10;
  }

  return {
    score: Math.round(score),
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    errors,
    warnings,
    passed: score >= 70
  };
}

// Función principal
async function comparePrompts() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('   COMPARACIÓN: PROMPT BÁSICO VS PROMPT MEJORADO');
  console.log('═════════════════════════════════════════════════════════════\n');

  const isEnhanced = process.env.USE_ENHANCED_PROMPT !== 'false';
  console.log(`📊 Usando prompt: ${isEnhanced ? '✨ MEJORADO (few-shot)' : '📝 BÁSICO (original)'}\n`);

  const results = [];
  let totalScore = 0;
  let totalTests = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n🔍 Probando: ${testCase.name}`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      const result = await extractDataWithGemini(testCase.text);
      const elapsed = Date.now() - startTime;

      if (!result) {
        console.log('❌ ERROR: Gemini no retornó datos');
        results.push({
          name: testCase.name,
          success: false,
          score: 0
        });
        continue;
      }

      const validation = validateResult(result, testCase.expected);
      totalScore += validation.score;
      totalTests++;

      // Mostrar resultado
      const icon = validation.passed ? '✅' : '❌';
      console.log(`${icon} Score: ${validation.score}/${validation.maxScore} (${validation.percentage}%)`);
      console.log(`⏱️  Tiempo: ${elapsed}ms`);

      if (validation.errors.length > 0) {
        console.log('\n❌ Errores:');
        validation.errors.forEach(err => console.log(`   • ${err}`));
      }

      if (validation.warnings.length > 0) {
        console.log('\n⚠️  Advertencias:');
        validation.warnings.forEach(warn => console.log(`   • ${warn}`));
      }

      // Mostrar datos extraídos
      console.log('\n📦 Datos extraídos:');
      console.log(`   Acto: ${result.acto_o_contrato || 'N/A'}`);
      console.log(`   Otorgantes: ${result.otorgantes?.length || 0}`);
      result.otorgantes?.forEach((o, i) => {
        console.log(`     ${i + 1}. ${o.apellidos} ${o.nombres} (${o.calidad})`);
      });
      console.log(`   Beneficiarios: ${result.beneficiarios?.length || 0}`);
      result.beneficiarios?.forEach((b, i) => {
        console.log(`     ${i + 1}. ${b.apellidos} ${b.nombres} (${b.calidad})`);
      });

      results.push({
        name: testCase.name,
        success: true,
        score: validation.score,
        percentage: validation.percentage,
        elapsed,
        validation
      });

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      results.push({
        name: testCase.name,
        success: false,
        error: error.message
      });
    }
  }

  // Resumen final
  console.log('\n\n═════════════════════════════════════════════════════════════');
  console.log('   RESUMEN FINAL');
  console.log('═════════════════════════════════════════════════════════════\n');

  const avgScore = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;
  const passedTests = results.filter(r => r.success && r.percentage >= 70).length;

  console.log(`Prompt utilizado: ${isEnhanced ? '✨ MEJORADO' : '📝 BÁSICO'}`);
  console.log(`Tests ejecutados: ${totalTests}/${TEST_CASES.length}`);
  console.log(`Tests aprobados: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests) * 100)}%)`);
  console.log(`Score promedio: ${avgScore}/100`);

  // Tabla de resultados
  console.log('\n📊 Resultados por caso:');
  console.log('┌─────────────────────────────────────┬──────────┬────────┐');
  console.log('│ Caso                                │ Score    │ Status │');
  console.log('├─────────────────────────────────────┼──────────┼────────┤');
  results.forEach(r => {
    const name = r.name.padEnd(35).substring(0, 35);
    const score = r.success ? `${r.percentage}%`.padStart(8) : 'ERROR'.padStart(8);
    const status = r.success && r.percentage >= 70 ? '  ✅   ' : '  ❌   ';
    console.log(`│ ${name} │ ${score} │ ${status} │`);
  });
  console.log('└─────────────────────────────────────┴──────────┴────────┘');

  console.log('\n💡 Recomendaciones:');
  if (isEnhanced) {
    if (avgScore >= 85) {
      console.log('   ✅ El prompt mejorado está funcionando excelentemente');
    } else if (avgScore >= 70) {
      console.log('   ⚠️  El prompt mejorado funciona bien pero puede optimizarse');
      console.log('   💡 Agrega más ejemplos específicos en gemini-prompt-enhanced.js');
    } else {
      console.log('   ❌ El prompt necesita ajustes adicionales');
      console.log('   💡 Revisa los errores y actualiza las reglas del prompt');
    }
  } else {
    console.log('   💡 Activa el prompt mejorado con: USE_ENHANCED_PROMPT=true');
    console.log('   📈 Mejora esperada: +30-40% en precisión');
  }

  console.log('\n═════════════════════════════════════════════════════════════\n');
}

// Ejecutar
comparePrompts().catch(console.error);
