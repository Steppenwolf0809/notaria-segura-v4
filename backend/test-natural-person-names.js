/**
 * Comprehensive Test Suite for Natural Person Name Processing
 * Testing the cleanPersonNames() function and otorgantes extraction logic
 * Focus: Spanish naming conventions, edge cases, and natural vs juridical person distinction
 */

// Import the service to test
import PdfExtractorService from './src/services/pdf-extractor-service.js';

// Test utilities
const testCases = [];
const bugReports = [];

function addTestCase(name, input, expectedOutput, description) {
  testCases.push({ name, input, expectedOutput, description });
}

function runTest(testCase) {
  const { name, input, expectedOutput, description } = testCase;
  console.log(`\n=== Testing: ${name} ===`);
  console.log(`Description: ${description}`);
  console.log(`Input: "${input}"`);
  console.log(`Expected: ${JSON.stringify(expectedOutput)}`);
  
  try {
    const result = PdfExtractorService.cleanPersonNames(input);
    console.log(`Actual:   ${JSON.stringify(result)}`);
    
    // Deep comparison
    const passed = JSON.stringify(result) === JSON.stringify(expectedOutput);
    console.log(`Status:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passed) {
      bugReports.push({
        testName: name,
        severity: determineSeverity(name, expectedOutput, result),
        input,
        expected: expectedOutput,
        actual: result,
        description,
        impact: analyzeImpact(name, expectedOutput, result)
      });
    }
    
    return passed;
  } catch (error) {
    console.log(`Error:    ${error.message}`);
    console.log(`Status:   ❌ ERROR`);
    
    bugReports.push({
      testName: name,
      severity: 'Critical',
      input,
      expected: expectedOutput,
      actual: null,
      error: error.message,
      description,
      impact: 'Function throws unexpected error'
    });
    
    return false;
  }
}

function determineSeverity(testName, expected, actual) {
  if (!actual || actual.length === 0) return 'High';
  if (expected.length !== actual.length) return 'Medium';
  if (testName.includes('Security') || testName.includes('Edge')) return 'High';
  return 'Low';
}

function analyzeImpact(testName, expected, actual) {
  if (!actual || actual.length === 0) {
    return 'Complete extraction failure - names not recognized';
  }
  if (expected.length !== actual.length) {
    return 'Partial extraction - some names missing or extra names detected';
  }
  return 'Name format issues - incorrect ordering or cleaning';
}

// Test Cases for Natural Person Names

// 1. Basic Natural Person Names
addTestCase(
  'Basic Two Names',
  'NATURAL JUAN CARLOS POR SUS PROPIOS',
  ['JUAN CARLOS'],
  'Simple natural person with two names'
);

addTestCase(
  'Basic Four Names',
  'NATURAL JUAN CARLOS PEREZ GOMEZ POR SUS PROPIOS',
  ['JUAN CARLOS PEREZ GOMEZ'],
  'Natural person with two first names and two surnames'
);

// 2. Name Reordering Tests (APELLIDOS NOMBRES → NOMBRES APELLIDOS)
addTestCase(
  'Reorder Two Names',
  'NATURAL PEREZ JUAN POR SUS PROPIOS',
  ['JUAN PEREZ'],
  'Should reorder surname-name to name-surname'
);

addTestCase(
  'Reorder Four Names',
  'NATURAL PEREZ GOMEZ JUAN CARLOS POR SUS PROPIOS',
  ['JUAN CARLOS PEREZ GOMEZ'],
  'Should reorder two surnames and two names correctly'
);

// 3. Compound Surnames with Particles
addTestCase(
  'Compound Surname DE LA',
  'NATURAL DE LA TORRE MARIA POR SUS PROPIOS',
  ['MARIA DE LA TORRE'],
  'Natural person with compound surname using "DE LA"'
);

addTestCase(
  'Compound Surname DEL',
  'NATURAL DEL VALLE JOSE ANTONIO POR SUS PROPIOS',
  ['JOSE ANTONIO DEL VALLE'],
  'Natural person with compound surname using "DEL"'
);

addTestCase(
  'Multiple Particles',
  'NATURAL DE LOS SANTOS MARIA DE LA LUZ POR SUS PROPIOS',
  ['MARIA DE LA LUZ DE LOS SANTOS'],
  'Natural person with multiple particles in surname'
);

addTestCase(
  'Complex Particle Names',
  'NATURAL SAN MIGUEL DE LA CRUZ PEDRO JOSE POR SUS PROPIOS',
  ['PEDRO JOSE SAN MIGUEL DE LA CRUZ'],
  'Natural person with complex compound surname'
);

// 4. Special Characters and Variations
addTestCase(
  'Name with Accents',
  'NATURAL JOSÉ MARÍA HERNÁNDEZ LÓPEZ POR SUS PROPIOS',
  ['JOSÉ MARÍA HERNÁNDEZ LÓPEZ'],
  'Natural person name with Spanish accents'
);

addTestCase(
  'Mixed Case Input',
  'Natural Juan Carlos Pérez Gómez por sus propios',
  ['JUAN CARLOS PÉREZ GÓMEZ'],
  'Mixed case input should be normalized to uppercase'
);

// 5. Table Format Extraction Tests
addTestCase(
  'Table Format Names/Razón Social',
  'NOMBRES/RAZÓN SOCIAL: JUAN CARLOS PEREZ TIPO NATURAL',
  ['JUAN CARLOS PEREZ'],
  'Extract from table format with NOMBRES/RAZÓN SOCIAL label'
);

addTestCase(
  'Table Format Apellidos y Nombres',
  'APELLIDOS Y NOMBRES: PEREZ GOMEZ JUAN CARLOS DOCUMENTO',
  ['JUAN CARLOS PEREZ GOMEZ'],
  'Extract and reorder from APELLIDOS Y NOMBRES format'
);

// 6. Multiple Natural Persons
addTestCase(
  'Multiple Natural Persons',
  'NATURAL JUAN CARLOS PEREZ POR SUS PROPIOS NATURAL MARIA ELENA RODRIGUEZ POR SUS PROPIOS',
  ['JUAN CARLOS PEREZ', 'MARIA ELENA RODRIGUEZ'],
  'Extract multiple natural persons from same text'
);

// 7. Natural vs Juridical Person Distinction
addTestCase(
  'Mixed Natural and Juridical',
  'NATURAL JUAN PEREZ POR SUS PROPIOS JURIDICA EMPRESA S.A. REPRESENTADO',
  ['JUAN PEREZ', 'EMPRESA S.A.'],
  'Should handle both natural and juridical persons correctly'
);

addTestCase(
  'Company Names Should Not Reorder',
  'NOMBRES/RAZÓN SOCIAL: CONSTRUCTORA DEL VALLE S.A.',
  ['CONSTRUCTORA DEL VALLE S.A.'],
  'Company names should not be reordered like person names'
);

// 8. Edge Cases and Error Conditions
addTestCase(
  'Empty Input',
  '',
  [],
  'Empty string should return empty array'
);

addTestCase(
  'No Valid Names',
  'POR SUS PROPIOS DERECHOS ECUATORIANO',
  [],
  'Text with no actual names should return empty array'
);

addTestCase(
  'Names with Numbers',
  'NATURAL JUAN123 PEREZ POR SUS PROPIOS',
  [],
  'Names containing numbers should be filtered out'
);

// 9. Real-world Spanish Naming Patterns
addTestCase(
  'Common Spanish Female Names',
  'NATURAL MARÍA JOSÉ FERNÁNDEZ LÓPEZ POR SUS PROPIOS',
  ['MARÍA JOSÉ FERNÁNDEZ LÓPEZ'],
  'Common Spanish female compound names'
);

addTestCase(
  'Common Spanish Male Names',
  'NATURAL JOSÉ ANTONIO GARCÍA MARTÍNEZ POR SUS PROPIOS',
  ['JOSÉ ANTONIO GARCÍA MARTÍNEZ'],
  'Common Spanish male compound names'
);

addTestCase(
  'Regional Spanish Surnames',
  'NATURAL ECHEVERRÍA JOSÉ LUIS POR SUS PROPIOS',
  ['JOSÉ LUIS ECHEVERRÍA'],
  'Regional Spanish surnames like Basque origins'
);

// 10. Complex Otorgantes Extraction Tests
addTestCase(
  'Otorgantes Section',
  'OTORGADO POR: NATURAL JUAN CARLOS PEREZ GOMEZ POR SUS PROPIOS A FAVOR DE',
  ['JUAN CARLOS PEREZ GOMEZ'],
  'Extract from OTORGADO POR section'
);

addTestCase(
  'Otorgantes Multiple Format',
  'OTORGANTES: NATURAL JUAN PEREZ POR SUS PROPIOS Y NATURAL MARIA RODRIGUEZ POR SUS PROPIOS',
  ['JUAN PEREZ', 'MARIA RODRIGUEZ'],
  'Multiple otorgantes in single section'
);

// 11. Advanced Edge Cases
addTestCase(
  'Name with Hyphen',
  'NATURAL GARCÍA-LÓPEZ MARÍA POR SUS PROPIOS',
  ['MARÍA GARCÍA-LÓPEZ'],
  'Names with hyphens in surnames'
);

addTestCase(
  'Very Long Names',
  'NATURAL FERNÁNDEZ RODRÍGUEZ DE LA TORRE MARÍA DEL CARMEN ESPERANZA POR SUS PROPIOS',
  ['MARÍA DEL CARMEN ESPERANZA FERNÁNDEZ RODRÍGUEZ DE LA TORRE'],
  'Very long names with multiple components'
);

// 12. Noise and Header Filtering
addTestCase(
  'Name with Header Noise',
  'PERSONA NATURAL DOCUMENTO JUAN CARLOS PEREZ IDENTIFICACIÓN ECUATORIANO POR SUS PROPIOS',
  ['JUAN CARLOS PEREZ'],
  'Should filter out header tokens and metadata'
);

addTestCase(
  'Name with Location Noise',
  'NATURAL JUAN PEREZ QUITO PICHINCHA IÑAQUITO POR SUS PROPIOS',
  ['JUAN PEREZ'],
  'Should filter out location information'
);

// Run all tests
console.log('='.repeat(80));
console.log('COMPREHENSIVE TEST SUITE FOR NATURAL PERSON NAME PROCESSING');
console.log('='.repeat(80));

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
  if (runTest(testCase)) {
    passedTests++;
  }
}

// Test reorderName function specifically
console.log('\n' + '='.repeat(60));
console.log('TESTING reorderName() FUNCTION SPECIFICALLY');
console.log('='.repeat(60));

const reorderTests = [
  { input: 'PEREZ JUAN', expected: 'JUAN PEREZ', desc: 'Basic two names' },
  { input: 'PEREZ GOMEZ JUAN CARLOS', expected: 'JUAN CARLOS PEREZ GOMEZ', desc: 'Four names' },
  { input: 'DE LA TORRE MARIA', expected: 'MARIA DE LA TORRE', desc: 'Compound surname' },
  { input: 'EMPRESA S.A.', expected: 'EMPRESA S.A.', desc: 'Company should not reorder' },
  { input: 'VON BRAUN WERNER', expected: 'WERNER VON BRAUN', desc: 'Foreign particle' },
  { input: 'MARÍA JOSÉ FERNÁNDEZ', expected: 'MARÍA JOSÉ FERNÁNDEZ', desc: 'Already in correct order' }
];

for (const test of reorderTests) {
  console.log(`\nTesting reorderName: ${test.desc}`);
  console.log(`Input: "${test.input}"`);
  console.log(`Expected: "${test.expected}"`);
  
  const result = PdfExtractorService.reorderName(test.input);
  console.log(`Actual: "${result}"`);
  console.log(`Status: ${result === test.expected ? '✅ PASS' : '❌ FAIL'}`);
  
  if (result !== test.expected) {
    bugReports.push({
      testName: `reorderName: ${test.desc}`,
      severity: 'Medium',
      input: test.input,
      expected: test.expected,
      actual: result,
      description: test.desc,
      impact: 'Incorrect name ordering in output'
    });
  }
}

// Summary Report
console.log('\n' + '='.repeat(80));
console.log('TEST EXECUTION SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

// Bug Analysis Report
console.log('\n' + '='.repeat(80));
console.log('BUG ANALYSIS REPORT');
console.log('='.repeat(80));

if (bugReports.length === 0) {
  console.log('🎉 No bugs detected! All tests passed.');
} else {
  console.log(`Total Bugs Found: ${bugReports.length}`);
  
  const severityCount = bugReports.reduce((acc, bug) => {
    acc[bug.severity] = (acc[bug.severity] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nBugs by Severity:');
  Object.entries(severityCount).forEach(([severity, count]) => {
    console.log(`  ${severity}: ${count}`);
  });
  
  console.log('\nDetailed Bug Reports:');
  console.log('-'.repeat(60));
  
  bugReports.forEach((bug, index) => {
    console.log(`\n[Bug #${index + 1}] ${bug.testName}`);
    console.log(`Severity: ${bug.severity}`);
    console.log(`Description: ${bug.description}`);
    console.log(`Impact: ${bug.impact}`);
    console.log(`Input: "${bug.input}"`);
    console.log(`Expected: ${JSON.stringify(bug.expected)}`);
    console.log(`Actual: ${JSON.stringify(bug.actual)}`);
    if (bug.error) {
      console.log(`Error: ${bug.error}`);
    }
  });
}

// Recommendations
console.log('\n' + '='.repeat(80));
console.log('RECOMMENDATIONS FOR IMPROVEMENT');
console.log('='.repeat(80));

const recommendations = [
  '1. Improve reorderName() logic to better handle compound surnames with particles',
  '2. Add more comprehensive particle detection (VON, DA, DI, etc.)',
  '3. Enhance company vs. person detection to avoid incorrect reordering',
  '4. Improve regex patterns for extracting names from table formats',
  '5. Add validation for minimum/maximum name length constraints',
  '6. Implement better noise filtering for header tokens and metadata',
  '7. Add support for names with apostrophes and special characters',
  '8. Enhance multi-person extraction from complex text formats'
];

recommendations.forEach(rec => console.log(rec));

console.log('\n' + '='.repeat(80));
console.log('TEST EXECUTION COMPLETED');
console.log('='.repeat(80));