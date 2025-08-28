#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Notaria Segura Backend
 * Tests PDF extraction, parsing, and controller logic without database dependencies
 */

import PdfExtractorService from './src/services/pdf-extractor-service.js';
import { previewConcuerdo } from './src/controllers/concuerdo-controller.js';

// Test Results Collector
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

function logTest(name, passed, details = '') {
  testResults.details.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: PASSED ${details ? `- ${details}` : ''}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: FAILED ${details ? `- ${details}` : ''}`);
  }
}

function logError(name, error) {
  testResults.errors.push({ name, error: error.message || String(error) });
  console.error(`💥 ${name}: ERROR - ${error.message || error}`);
}

// Mock response object for controller tests
function mockRes() {
  return {
    _status: 200,
    _json: null,
    _headers: {},
    set(key, value) { this._headers[key] = value; },
    status(code) { this._status = code; return this; },
    json(obj) { 
      this._json = obj; 
      return this; 
    }
  };
}

console.log('🧪 ═══════════════════════════════════════════════════════════');
console.log('🏛️  COMPREHENSIVE TEST SUITE - NOTARIA SEGURA BACKEND');
console.log('🧪 ═══════════════════════════════════════════════════════════');

// Test 1: PDF Extractor Service - cleanActType
console.log('\n📋 Testing PdfExtractorService.cleanActType...');
try {
  const testCases = [
    { input: 'PODER GENERAL FECHA 2023', expected: 'PODER GENERAL' },
    { input: 'COMPRAVENTA PERSONA NATURAL', expected: 'COMPRAVENTA' },
    { input: 'REVOCATORIA DE PODER OTORGADO POR JUAN', expected: 'REVOCATORIA DE PODER' },
    { input: '', expected: '' },
    { input: null, expected: '' },
    { input: undefined, expected: '' }
  ];
  
  for (const testCase of testCases) {
    const result = PdfExtractorService.cleanActType(testCase.input);
    const passed = result === testCase.expected;
    logTest(`cleanActType('${testCase.input}')`, passed, `Expected: '${testCase.expected}', Got: '${result}'`);
  }
} catch (error) {
  logError('cleanActType tests', error);
}

// Test 2: PDF Extractor Service - extractNotaryInfo
console.log('\n👨‍⚖️ Testing PdfExtractorService.extractNotaryInfo...');
try {
  const sampleTexts = [
    {
      text: 'NOTARIO (A) ABG. LUIS ALFARO\nNOTARÍA DÉCIMA OCTAVA DEL CANTON QUITO',
      expected: { 
        notarioNombre: 'LUIS ALFARO', 
        notariaNumero: 'DÉCIMA OCTAVA DEL CANTON QUITO',
        notariaNumeroDigit: '18',
        notarioSuplente: false
      }
    },
    {
      text: '(A) SUPLENTE DR. MARIA GONZALEZ\nNOTARIA QUINTA',
      expected: { 
        notarioNombre: 'MARIA GONZALEZ', 
        notariaNumero: 'QUINTA',
        notariaNumeroDigit: '5',
        notarioSuplente: true
      }
    },
    {
      text: '',
      expected: { 
        notarioNombre: undefined, 
        notariaNumero: undefined,
        notariaNumeroDigit: undefined,
        notarioSuplente: false
      }
    }
  ];
  
  for (let i = 0; i < sampleTexts.length; i++) {
    const sample = sampleTexts[i];
    const result = PdfExtractorService.extractNotaryInfo(sample.text);
    
    const passed = 
      result.notarioNombre === sample.expected.notarioNombre &&
      result.notariaNumero === sample.expected.notariaNumero &&
      result.notariaNumeroDigit === sample.expected.notariaNumeroDigit &&
      result.notarioSuplente === sample.expected.notarioSuplente;
    
    logTest(`extractNotaryInfo sample ${i + 1}`, passed, 
      `Expected: ${JSON.stringify(sample.expected)}, Got: ${JSON.stringify(result)}`);
  }
} catch (error) {
  logError('extractNotaryInfo tests', error);
}

// Test 3: PDF Extractor Service - cleanPersonNames
console.log('\n👥 Testing PdfExtractorService.cleanPersonNames...');
try {
  const testCases = [
    {
      input: 'NATURAL JUAN CARLOS PEREZ GOMEZ POR SUS PROPIOS DERECHOS',
      expected: ['JUAN CARLOS PEREZ GOMEZ']
    },
    {
      input: 'NOMBRES/RAZÓN SOCIAL: MARIA ELENA RODRIGUEZ TIPO INTERVINIENTE',
      expected: ['MARIA ELENA RODRIGUEZ']
    },
    {
      input: 'CONSTRUCTORA ABC S.A. REPRESENTADO POR PEDRO SANCHEZ',
      expected: ['CONSTRUCTORA ABC S.A.']
    },
    {
      input: '',
      expected: []
    }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = PdfExtractorService.cleanPersonNames(testCase.input);
    const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
    logTest(`cleanPersonNames case ${i + 1}`, passed, 
      `Expected: ${JSON.stringify(testCase.expected)}, Got: ${JSON.stringify(result)}`);
  }
} catch (error) {
  logError('cleanPersonNames tests', error);
}

// Test 4: PDF Extractor Service - parseSimpleData
console.log('\n📄 Testing PdfExtractorService.parseSimpleData...');
try {
  const sampleText = `
ACTO O CONTRATO: PODER GENERAL
OTORGADO POR: SUSAN MAGDALENA GUTIERREZ FABRE
A FAVOR DE: JUAN CARLOS PEREZ PEREZ
NOTARIO: (A) ABG. LUIS ALFREDO MORALES
`;

  const result = PdfExtractorService.parseSimpleData(sampleText);
  const passed = 
    result.tipoActo === 'PODER GENERAL' &&
    result.otorgantes.length > 0 &&
    result.beneficiarios.length > 0 &&
    result.notario === 'LUIS ALFREDO MORALES';
    
  logTest('parseSimpleData basic functionality', passed, 
    `Tipo: '${result.tipoActo}', Otorgantes: ${result.otorgantes.length}, Beneficiarios: ${result.beneficiarios.length}`);
} catch (error) {
  logError('parseSimpleData test', error);
}

// Test 5: PDF Extractor Service - parseAdvancedData
console.log('\n🔬 Testing PdfExtractorService.parseAdvancedData...');
try {
  const sampleText = `
ACTO O CONTRATO: PODER GENERAL y REVOCATORIA DE PODER
OTORGADO POR: SUSAN MAGDALENA GUTIERREZ FABRE
A FAVOR DE: JUAN CARLOS PEREZ PEREZ
NOTARIO: (A) ABG. LUIS ALFARO
NOTARÍA DÉCIMA OCTAVA DEL CANTON QUITO
`;

  const result = PdfExtractorService.parseAdvancedData(sampleText);
  const passed = result.acts && result.acts.length >= 1;
  logTest('parseAdvancedData basic functionality', passed, 
    `Found ${result.acts ? result.acts.length : 0} acts`);
    
  if (result.acts && result.acts.length > 0) {
    const firstAct = result.acts[0];
    const actValid = firstAct.tipoActo && firstAct.otorgantes && firstAct.beneficiarios;
    logTest('parseAdvancedData first act structure', actValid, 
      `Act: '${firstAct.tipoActo}', Has otorgantes: ${!!firstAct.otorgantes}, Has beneficiarios: ${!!firstAct.beneficiarios}`);
  }
} catch (error) {
  logError('parseAdvancedData test', error);
}

// Test 6: Concuerdo Controller - previewConcuerdo (without database)
console.log('\n🎯 Testing previewConcuerdo controller...');
try {
  const mockReq = {
    body: {
      acts: [
        {
          tipoActo: 'PODER GENERAL',
          otorgantes: ['SUSAN MAGDALENA GUTIERREZ FABRE'],
          beneficiarios: ['JUAN CARLOS PEREZ PEREZ']
        }
      ],
      notario: 'LUIS ALFARO',
      notariaNumero: 'DÉCIMA OCTAVA DEL CANTON QUITO',
      numeroCopias: 2
    }
  };
  
  const res = mockRes();
  await previewConcuerdo(mockReq, res);
  
  const passed = res._status === 200 && res._json && res._json.success === true;
  logTest('previewConcuerdo controller', passed, 
    `Status: ${res._status}, Success: ${res._json?.success}, Data exists: ${!!res._json?.data}`);
    
  if (res._json?.data?.previews) {
    const previewsValid = res._json.data.previews.length === 2;
    logTest('previewConcuerdo generates correct number of copies', previewsValid, 
      `Expected 2 previews, got ${res._json.data.previews.length}`);
  }
} catch (error) {
  logError('previewConcuerdo controller test', error);
}

// Test 7: Edge cases and error handling
console.log('\n🚨 Testing edge cases and error handling...');
try {
  // Test with empty input
  const emptyResult = PdfExtractorService.parseAdvancedData('');
  logTest('parseAdvancedData with empty input', emptyResult.acts.length === 0, 
    `Expected 0 acts, got ${emptyResult.acts.length}`);
  
  // Test with malformed input
  const malformedResult = PdfExtractorService.parseAdvancedData('RANDOM TEXT WITHOUT STRUCTURE');
  logTest('parseAdvancedData with malformed input', malformedResult.acts.length === 0, 
    `Expected 0 acts, got ${malformedResult.acts.length}`);
    
  // Test cleanActType with special characters
  const specialCharsResult = PdfExtractorService.cleanActType('PODER GENERAL ###@@@');
  logTest('cleanActType with special characters', specialCharsResult === 'PODER GENERAL ###@@@', 
    `Expected clean result, got '${specialCharsResult}'`);
    
} catch (error) {
  logError('edge cases tests', error);
}

// Test 8: Performance and stress testing
console.log('\n⚡ Testing performance...');
try {
  const largeText = 'ACTO O CONTRATO: PODER GENERAL\n'.repeat(1000) + 
    'OTORGADO POR: JUAN PEREZ\nA FAVOR DE: MARIA GONZALEZ';
  
  const startTime = Date.now();
  const performanceResult = PdfExtractorService.parseAdvancedData(largeText);
  const endTime = Date.now();
  
  const processingTime = endTime - startTime;
  const performanceAcceptable = processingTime < 1000; // Less than 1 second
  
  logTest('parseAdvancedData performance test', performanceAcceptable, 
    `Processing time: ${processingTime}ms (${performanceAcceptable ? 'acceptable' : 'too slow'})`);
} catch (error) {
  logError('performance test', error);
}

// Final Report
console.log('\n🏁 ═══════════════════════════════════════════════════════════');
console.log('📊 COMPREHENSIVE TEST RESULTS');
console.log('🏁 ═══════════════════════════════════════════════════════════');

console.log(`✅ Tests Passed: ${testResults.passed}`);
console.log(`❌ Tests Failed: ${testResults.failed}`);
console.log(`💥 Errors Encountered: ${testResults.errors.length}`);

if (testResults.failed > 0) {
  console.log('\n❌ Failed Tests:');
  testResults.details
    .filter(test => !test.passed)
    .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
}

if (testResults.errors.length > 0) {
  console.log('\n💥 Errors:');
  testResults.errors.forEach(error => 
    console.log(`   - ${error.name}: ${error.error}`));
}

const successRate = (testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(1);
console.log(`\n📈 Success Rate: ${successRate}%`);

if (testResults.failed === 0 && testResults.errors.length === 0) {
  console.log('🎉 ALL TESTS PASSED! The core functionality is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Review the issues above for debugging.');
}

process.exit(testResults.failed > 0 || testResults.errors.length > 0 ? 1 : 0);