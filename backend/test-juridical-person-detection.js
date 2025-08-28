/**
 * Comprehensive Test Suite for Juridical Person Detection
 * Testing the cleanPersonNames() function for companies, corporations, and legal entities
 * Focus: Spanish legal entity patterns and naming conventions
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
  return 'Low';
}

function analyzeImpact(testName, expected, actual) {
  if (!actual || actual.length === 0) {
    return 'Complete extraction failure - juridical person not recognized';
  }
  if (expected.length !== actual.length) {
    return 'Partial extraction - some entities missing or extra entities detected';
  }
  return 'Entity name format issues - incorrect name extraction';
}

// Test Cases for Juridical Persons

// 1. Basic Juridical Person Patterns
addTestCase(
  'Basic Corporation S.A.',
  'JURIDICA CORPORACION HVQ S A REPRESENTADO POR RUC',
  ['CORPORACION HVQ S A'],
  'Basic corporation with S.A. designation'
);

addTestCase(
  'LTDA Company',
  'JURÍDICA CONSTRUCTORA DEL VALLE LTDA REPRESENTADO',
  ['CONSTRUCTORA DEL VALLE LTDA'],
  'Limited liability company with LTDA designation'
);

addTestCase(
  'CIA Company',
  'JURIDICA COMERCIAL MARTINEZ CIA. LTDA. DOCUMENTO',
  ['COMERCIAL MARTINEZ CIA. LTDA.'],
  'Company with CIA designation'
);

// 2. Persona Jurídica Format
addTestCase(
  'Persona Jurídica Format',
  'PERSONA JURIDICA EMPRESA ABC S.A. REPRESENTADO',
  ['EMPRESA ABC S.A.'],
  'Full "PERSONA JURIDICA" designation format'
);

addTestCase(
  'Persona Jurídica with Accents',
  'PERSONA JURÍDICA INVERSIONES XYZ LTDA TIPO',
  ['INVERSIONES XYZ LTDA'],
  'Persona Jurídica with accent marks'
);

// 3. Mixed Natural and Juridical
addTestCase(
  'Mixed Natural and Juridical',
  'NATURAL JUAN PEREZ POR SUS PROPIOS JURIDICA EMPRESA S.A. REPRESENTADO',
  ['JUAN PEREZ', 'EMPRESA S.A.'],
  'Both natural and juridical persons in same text'
);

addTestCase(
  'Multiple Juridical Persons',
  'JURIDICA EMPRESA A S.A. REPRESENTADO JURIDICA EMPRESA B LTDA REPRESENTADO',
  ['EMPRESA A S.A.', 'EMPRESA B LTDA'],
  'Multiple juridical persons in same text'
);

// 4. Company Name Variations
addTestCase(
  'Corporation with Numbers',
  'JURIDICA CONSTRUCTORA 123 S.A. REPRESENTADO',
  ['CONSTRUCTORA 123 S.A.'],
  'Company name with numbers'
);

addTestCase(
  'Long Company Name',
  'JURIDICA IMPORTADORA Y EXPORTADORA DE PRODUCTOS ALIMENTICIOS DEL ECUADOR S.A. REPRESENTADO',
  ['IMPORTADORA Y EXPORTADORA DE PRODUCTOS ALIMENTICIOS DEL ECUADOR S.A.'],
  'Very long company name with multiple words'
);

addTestCase(
  'Company with Ampersand',
  'JURIDICA RODRIGUEZ & ASOCIADOS CIA. LTDA. DOCUMENTO',
  ['RODRIGUEZ & ASOCIADOS CIA. LTDA.'],
  'Company name with ampersand'
);

addTestCase(
  'Company with Hyphen',
  'JURIDICA AGRO-INDUSTRIAL DEL PACIFICO S.A. REPRESENTADO',
  ['AGRO-INDUSTRIAL DEL PACIFICO S.A.'],
  'Company name with hyphen'
);

// 5. Table Format Extractions
addTestCase(
  'Table Format Razón Social',
  'NOMBRES/RAZÓN SOCIAL: CONSTRUCTORA DEL VALLE S.A. TIPO JURIDICA',
  ['CONSTRUCTORA DEL VALLE S.A.'],
  'Extract from table format with RAZÓN SOCIAL label'
);

addTestCase(
  'Table Format with Company Type',
  'RAZÓN SOCIAL: COMERCIAL ABC LTDA TIPO: JURIDICA REPRESENTADO',
  ['COMERCIAL ABC LTDA'],
  'Table format with company type specification'
);

// 6. Different Terminators
addTestCase(
  'Terminated by RUC',
  'JURIDICA TRANSPORTES DEL SUR S.A. RUC 1234567890001',
  ['TRANSPORTES DEL SUR S.A.'],
  'Company name terminated by RUC number'
);

addTestCase(
  'Terminated by REPRESENTADA',
  'JURIDICA FUNDACION AYUDA SOCIAL REPRESENTADA POR',
  ['FUNDACION AYUDA SOCIAL'],
  'Foundation terminated by REPRESENTADA (feminine form)'
);

addTestCase(
  'Terminated by TIPO',
  'JURIDICA COOPERATIVA DE AHORRO Y CREDITO TIPO FINANCIERA',
  ['COOPERATIVA DE AHORRO Y CREDITO'],
  'Cooperative terminated by TIPO'
);

// 7. Special Entity Types
addTestCase(
  'Foundation',
  'JURIDICA FUNDACION PARA EL DESARROLLO SOCIAL REPRESENTADO',
  ['FUNDACION PARA EL DESARROLLO SOCIAL'],
  'Non-profit foundation'
);

addTestCase(
  'Association',
  'JURIDICA ASOCIACION DE COMERCIANTES DEL CENTRO REPRESENTADO',
  ['ASOCIACION DE COMERCIANTES DEL CENTRO'],
  'Commercial association'
);

addTestCase(
  'Cooperative',
  'JURIDICA COOPERATIVA DE TRANSPORTE URBANO REPRESENTADO',
  ['COOPERATIVA DE TRANSPORTE URBANO'],
  'Transportation cooperative'
);

// 8. Edge Cases
addTestCase(
  'Company with Dots and Abbreviations',
  'JURIDICA ING. CONSTRUCTORES ASOCIADOS S.A. REPRESENTADO',
  ['ING. CONSTRUCTORES ASOCIADOS S.A.'],
  'Company with professional title abbreviation'
);

addTestCase(
  'Company with Location',
  'JURIDICA COMERCIAL QUITO DEL NORTE S.A. DOCUMENTO',
  ['COMERCIAL QUITO DEL NORTE S.A.'],
  'Company with geographic location in name'
);

// 9. Real-world Examples
addTestCase(
  'Real Example from Image',
  'Jurídica CORPORACION HVQ S A REPRESENTADO POR RUC 17927582700 01 ECUATORIANA MANDANTE',
  ['CORPORACION HVQ S A'],
  'Real example from user-provided image'
);

// 10. Mixed Case and Formatting
addTestCase(
  'Mixed Case Input',
  'jurídica Empresa del Valle S.A. representado por',
  ['EMPRESA DEL VALLE S.A.'],
  'Mixed case input should be normalized'
);

// Run all tests
console.log('='.repeat(80));
console.log('COMPREHENSIVE TEST SUITE FOR JURIDICAL PERSON DETECTION');
console.log('='.repeat(80));

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
  if (runTest(testCase)) {
    passedTests++;
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
  '1. Add support for more company type suffixes (CORP., INC., etc.)',
  '2. Improve detection of foundations, associations, and cooperatives',
  '3. Handle company names with special characters and professional titles',
  '4. Add validation for typical company name patterns',
  '5. Improve regex patterns for different terminator words',
  '6. Add support for international company formats',
  '7. Enhance detection of non-profit and government entities',
  '8. Improve mixed-case input normalization'
];

recommendations.forEach(rec => console.log(rec));

console.log('\n' + '='.repeat(80));
console.log('JURIDICAL PERSON DETECTION TEST COMPLETED');
console.log('='.repeat(80));