/**
 * Comprehensive Test Suite for Company Entity Detection
 * Testing the cleanPersonNames() function improvements for corporate entity detection
 */

import PdfExtractorService from './src/services/pdf-extractor-service.js';

// Test data representing various company name formats found in PDF extracts
const testCases = [
  {
    name: 'Standard S.A. Company',
    input: 'NATURAL IMPORTADORA COMERCIAL INTERNACIONAL S.A. POR SUS PROPIOS DERECHOS',
    expected: ['IMPORTADORA COMERCIAL INTERNACIONAL S.A.'],
    category: 'company'
  },
  {
    name: 'LTDA Company',
    input: 'PERSONA JURIDICA DISTRIBUIDORA NACIONAL LTDA. REPRESENTADO POR JUAN CARLOS MARTINEZ',
    expected: ['DISTRIBUIDORA NACIONAL LTDA.'],
    category: 'company'
  },
  {
    name: 'CIA Company',
    input: 'NATURAL COMERCIALIZADORA ECUADOR CIA. LTDA. POR SUS PROPIOS',
    expected: ['COMERCIALIZADORA ECUADOR CIA. LTDA.'],
    category: 'company'
  },
  {
    name: 'Company with CÍA (accented)',
    input: 'JURIDICA SERVICIOS PROFESIONALES CÍA. LTDA. TIPO INTERVINIENTE',
    expected: ['SERVICIOS PROFESIONALES CÍA. LTDA.'],
    category: 'company'
  },
  {
    name: 'Complex S.A.S Company',
    input: 'NOMBRES/RAZÓN SOCIAL: TECNOLOGÍA Y DESARROLLO S.A.S TIPO DOCUMENTO',
    expected: ['TECNOLOGÍA Y DESARROLLO S.A.S'],
    category: 'company'
  },
  {
    name: 'CORP Company',
    input: 'PERSONA JURIDICA INTERNATIONAL BUSINESS CORP. REPRESENTADO',
    expected: ['INTERNATIONAL BUSINESS CORP.'],
    category: 'company'
  },
  {
    name: 'INC Company',
    input: 'NATURAL MANUFACTURING SOLUTIONS INC. POR SUS PROPIOS DERECHOS',
    expected: ['MANUFACTURING SOLUTIONS INC.'],
    category: 'company'
  },
  {
    name: 'Natural Person (should not be affected)',
    input: 'NATURAL JUAN CARLOS MENDOZA RODRIGUEZ POR SUS PROPIOS DERECHOS',
    expected: ['JUAN CARLOS MENDOZA RODRIGUEZ'],
    category: 'person'
  },
  {
    name: 'Multiple Companies in Same Text',
    input: 'JURIDICA EMPRESA UNO S.A. Y EMPRESA DOS LTDA. REPRESENTADO POR',
    expected: ['EMPRESA UNO S.A.', 'EMPRESA DOS LTDA.'],
    category: 'multiple'
  },
  {
    name: 'Company with Particles',
    input: 'NATURAL BANCO DE LA REPÚBLICA S.A. POR SUS PROPIOS',
    expected: ['BANCO DE LA REPÚBLICA S.A.'],
    category: 'company'
  },
  {
    name: 'Structured Table Format',
    input: 'NOMBRES/RAZÓN SOCIAL: CONSTRUCTORA DEL PACÍFICO S.A. DOCUMENTO NO 1234567890',
    expected: ['CONSTRUCTORA DEL PACÍFICO S.A.'],
    category: 'table'
  },
  {
    name: 'Edge Case - Very Short Company Name',
    input: 'JURIDICA XYZ S.A. REPRESENTADO POR MARIA LOPEZ',
    expected: ['XYZ S.A.'],
    category: 'edge'
  },
  {
    name: 'Company Name with Numbers (should be filtered)',
    input: 'NATURAL EMPRESA123 S.A. POR SUS PROPIOS',
    expected: [], // Should be filtered due to numbers
    category: 'filter'
  },
  {
    name: 'Mixed Case with Accents',
    input: 'APELLIDOS Y NOMBRES: MARÍA FERNÁNDEZ GONZÁLEZ DOCUMENTO',
    expected: ['MARÍA FERNÁNDEZ GONZÁLEZ'],
    category: 'person'
  },
  {
    name: 'Complex Multi-Word Company',
    input: 'JURIDICA COMPAÑÍA DE SEGUROS Y REASEGUROS DEL ECUADOR S.A. TIPO',
    expected: ['COMPAÑÍA DE SEGUROS Y REASEGUROS DEL ECUADOR S.A.'],
    category: 'company'
  }
];

// Additional edge case tests
const edgeCases = [
  {
    name: 'Empty Input',
    input: '',
    expected: [],
    category: 'edge'
  },
  {
    name: 'Null Input',
    input: null,
    expected: [],
    category: 'edge'
  },
  {
    name: 'Undefined Input',
    input: undefined,
    expected: [],
    category: 'edge'
  },
  {
    name: 'Only Headers',
    input: 'PERSONA TIPO DOCUMENTO NACIONALIDAD',
    expected: [],
    category: 'edge'
  },
  {
    name: 'Company with Special Characters',
    input: 'JURIDICA EMPRESA-MATRIZ S.A. REPRESENTADO',
    expected: ['EMPRESA-MATRIZ S.A.'],
    category: 'special'
  },
  {
    name: 'Company Name Split Across Lines',
    input: 'JURIDICA IMPORTADORA\nCOMERCIAL\nS.A. REPRESENTADO',
    expected: ['IMPORTADORA COMERCIAL S.A.'],
    category: 'multiline'
  }
];

// Test runner function
function runTests() {
  console.log('=== COMPREHENSIVE COMPANY ENTITY DETECTION TEST SUITE ===\n');
  
  const allTests = [...testCases, ...edgeCases];
  let passed = 0;
  let failed = 0;
  const failures = [];

  allTests.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    console.log(`Input: "${test.input}"`);
    
    try {
      const result = PdfExtractorService.cleanPersonNames(test.input);
      const success = arraysEqual(result, test.expected);
      
      if (success) {
        console.log(`✅ PASSED - Expected: [${test.expected.join(', ')}], Got: [${result.join(', ')}]`);
        passed++;
      } else {
        console.log(`❌ FAILED - Expected: [${test.expected.join(', ')}], Got: [${result.join(', ')}]`);
        failed++;
        failures.push({
          name: test.name,
          input: test.input,
          expected: test.expected,
          actual: result,
          category: test.category
        });
      }
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      failed++;
      failures.push({
        name: test.name,
        input: test.input,
        error: error.message,
        category: test.category
      });
    }
    
    console.log('');
  });

  // Summary
  console.log('=== TEST SUMMARY ===');
  console.log(`Total Tests: ${allTests.length}`);
  console.log(`Passed: ${passed} (${((passed / allTests.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed / allTests.length) * 100).toFixed(1)}%)`);

  if (failures.length > 0) {
    console.log('\n=== FAILURE ANALYSIS ===');
    const failuresByCategory = failures.reduce((acc, failure) => {
      acc[failure.category] = acc[failure.category] || [];
      acc[failure.category].push(failure);
      return acc;
    }, {});

    Object.entries(failuresByCategory).forEach(([category, categoryFailures]) => {
      console.log(`\n${category.toUpperCase()} Failures: ${categoryFailures.length}`);
      categoryFailures.forEach(failure => {
        console.log(`  - ${failure.name}`);
        if (failure.error) {
          console.log(`    Error: ${failure.error}`);
        } else {
          console.log(`    Expected: [${failure.expected.join(', ')}]`);
          console.log(`    Actual: [${failure.actual.join(', ')}]`);
        }
      });
    });
  }

  return { passed, failed, failures };
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  
  // Sort both arrays for comparison (order shouldn't matter for names)
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  
  return sortedA.every((val, index) => val === sortedB[index]);
}

// Performance test
function performanceTest() {
  console.log('\n=== PERFORMANCE TEST ===');
  const iterations = 1000;
  const testData = 'JURIDICA EMPRESA COMERCIAL INTERNACIONAL S.A. REPRESENTADO POR JUAN CARLOS MENDOZA RODRIGUEZ NATURAL MARIA FERNANDEZ LOPEZ POR SUS PROPIOS DERECHOS';
  
  const startTime = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    PdfExtractorService.cleanPersonNames(testData);
  }
  
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  
  console.log(`Processed ${iterations} iterations in ${duration.toFixed(2)}ms`);
  console.log(`Average time per extraction: ${(duration / iterations).toFixed(4)}ms`);
}

// Run the tests
const results = runTests();
performanceTest();

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);