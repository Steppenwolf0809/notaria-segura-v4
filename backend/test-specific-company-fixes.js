/**
 * Specific tests for company detection fixes and improvements
 * Testing edge cases and specific bug fixes in company entity detection
 */

import PdfExtractorService from './src/services/pdf-extractor-service.js';

// Test cases specifically for company detection improvements
const companySpecificTests = [
  {
    name: 'S.A. Company Basic',
    input: 'JURIDICA COMERCIAL INTERNACIONAL S.A.',
    expected: ['COMERCIAL INTERNACIONAL S.A.'],
    severity: 'HIGH',
    bugFixed: true
  },
  {
    name: 'LTDA Company Basic',  
    input: 'PERSONA JURIDICA DISTRIBUIDORA NACIONAL LTDA.',
    expected: ['DISTRIBUIDORA NACIONAL LTDA.'],
    severity: 'HIGH',
    bugFixed: true
  },
  {
    name: 'CIA Company with Periods',
    input: 'JURIDICA SERVICIOS EMPRESARIALES CIA. LTDA.',
    expected: ['SERVICIOS EMPRESARIALES CIA. LTDA.'],
    severity: 'HIGH',
    bugFixed: true
  },
  {
    name: 'Company with CÍA Accent',
    input: 'NATURAL CONSULTORES TÉCNICOS CÍA. LTDA. POR SUS PROPIOS',
    expected: ['CONSULTORES TÉCNICOS CÍA. LTDA.'],
    severity: 'MEDIUM',
    bugFixed: true
  },
  {
    name: 'S.A.S Company Format',
    input: 'PERSONA JURIDICA DESARROLLO TECNOLÓGICO S.A.S REPRESENTADO',
    expected: ['DESARROLLO TECNOLÓGICO S.A.S'],
    severity: 'MEDIUM',
    bugFixed: true
  },
  {
    name: 'CORP Company Format',
    input: 'JURIDICA INTERNATIONAL SOLUTIONS CORP. TIPO INTERVINIENTE',
    expected: ['INTERNATIONAL SOLUTIONS CORP.'],
    severity: 'MEDIUM',
    bugFixed: true
  },
  {
    name: 'INC Company Format',
    input: 'NATURAL GLOBAL SERVICES INC. POR SUS PROPIOS DERECHOS',
    expected: ['GLOBAL SERVICES INC.'],
    severity: 'MEDIUM',
    bugFixed: true
  },
  {
    name: 'Complex Company with Particles',
    input: 'JURIDICA BANCO DE LA CIUDAD S.A. REPRESENTADO POR',
    expected: ['BANCO DE LA CIUDAD S.A.'],
    severity: 'HIGH',
    bugFixed: true
  },
  {
    name: 'Company in Table Format',
    input: 'NOMBRES/RAZÓN SOCIAL: CONSTRUCTORA PACÍFICO S.A. DOCUMENTO',
    expected: ['CONSTRUCTORA PACÍFICO S.A.'],
    severity: 'HIGH',
    bugFixed: true
  },
  {
    name: 'Short Company Name',
    input: 'JURIDICA ABC S.A. REPRESENTADO',
    expected: ['ABC S.A.'],
    severity: 'MEDIUM',
    bugFixed: true
  },
  {
    name: 'Company with Numbers (should filter)',
    input: 'NATURAL EMPRESA2024 S.A. POR SUS PROPIOS',
    expected: [],
    severity: 'LOW',
    bugFixed: true
  },
  {
    name: 'Company Name Order Preservation',
    input: 'JURIDICA PRIMERA EMPRESA COMERCIAL S.A.',
    expected: ['PRIMERA EMPRESA COMERCIAL S.A.'],
    severity: 'HIGH',
    bugFixed: true,
    description: 'Company names should not be reordered like person names'
  }
];

// Tests for specific bug scenarios that were previously failing
const previousBugTests = [
  {
    name: 'Bug: Company detected as person',
    input: 'NATURAL COMERCIAL BOLIVAR S.A. POR SUS PROPIOS DERECHOS',
    expected: ['COMERCIAL BOLIVAR S.A.'],
    previousResult: ['BOLIVAR COMERCIAL S.A.'], // What it used to return incorrectly
    severity: 'HIGH',
    bugType: 'INCORRECT_REORDERING'
  },
  {
    name: 'Bug: Company suffix lost',
    input: 'JURIDICA TEXTILES DEL NORTE LTDA. REPRESENTADO',
    expected: ['TEXTILES DEL NORTE LTDA.'],
    previousResult: ['TEXTILES DEL NORTE'], // Missing LTDA
    severity: 'HIGH',
    bugType: 'SUFFIX_LOSS'
  },
  {
    name: 'Bug: Mixed company and person extraction',
    input: 'JURIDICA EMPRESA MODELO S.A. REPRESENTADO POR JUAN PEREZ',
    expected: ['EMPRESA MODELO S.A.'],
    previousResult: ['MODELO EMPRESA S.A.', 'PEREZ JUAN'], // Wrong ordering
    severity: 'HIGH',
    bugType: 'MIXED_EXTRACTION'
  }
];

function runCompanySpecificTests() {
  console.log('=== COMPANY DETECTION SPECIFIC TESTS ===\n');
  
  let totalPassed = 0;
  let totalFailed = 0;
  const failures = [];

  // Test company-specific improvements
  console.log('--- Company Entity Detection Tests ---');
  companySpecificTests.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name} (Severity: ${test.severity})`);
    console.log(`Input: "${test.input}"`);
    
    try {
      const result = PdfExtractorService.cleanPersonNames(test.input);
      const success = arraysEqual(result, test.expected);
      
      if (success) {
        console.log(`✅ PASSED - Expected: [${test.expected.join(', ')}], Got: [${result.join(', ')}]`);
        totalPassed++;
      } else {
        console.log(`❌ FAILED - Expected: [${test.expected.join(', ')}], Got: [${result.join(', ')}]`);
        totalFailed++;
        failures.push({
          ...test,
          actual: result,
          testType: 'company_specific'
        });
      }
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      totalFailed++;
      failures.push({
        ...test,
        error: error.message,
        testType: 'company_specific'
      });
    }
    
    console.log('');
  });

  // Test previous bug fixes
  console.log('--- Previous Bug Fix Verification ---');
  previousBugTests.forEach((test, index) => {
    console.log(`Bug Test ${index + 1}: ${test.name} (${test.bugType})`);
    console.log(`Input: "${test.input}"`);
    
    try {
      const result = PdfExtractorService.cleanPersonNames(test.input);
      const success = arraysEqual(result, test.expected);
      const stillHasBug = arraysEqual(result, test.previousResult);
      
      if (success) {
        console.log(`✅ BUG FIXED - Expected: [${test.expected.join(', ')}], Got: [${result.join(', ')}]`);
        if (test.previousResult) {
          console.log(`   Previously returned: [${test.previousResult.join(', ')}]`);
        }
        totalPassed++;
      } else if (stillHasBug) {
        console.log(`❌ BUG NOT FIXED - Still returns old result: [${result.join(', ')}]`);
        console.log(`   Should return: [${test.expected.join(', ')}]`);
        totalFailed++;
        failures.push({
          ...test,
          actual: result,
          testType: 'bug_regression',
          status: 'NOT_FIXED'
        });
      } else {
        console.log(`❌ NEW ISSUE - Expected: [${test.expected.join(', ')}], Got: [${result.join(', ')}]`);
        console.log(`   Previously returned: [${test.previousResult.join(', ')}]`);
        totalFailed++;
        failures.push({
          ...test,
          actual: result,
          testType: 'bug_regression',
          status: 'NEW_ISSUE'
        });
      }
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      totalFailed++;
      failures.push({
        ...test,
        error: error.message,
        testType: 'bug_regression'
      });
    }
    
    console.log('');
  });

  return { totalPassed, totalFailed, failures };
}

function analyzeCompanyDetectionQuality() {
  console.log('=== COMPANY DETECTION QUALITY ANALYSIS ===\n');
  
  const qualityTests = [
    {
      input: 'JURIDICA BANCO CENTRAL DEL ECUADOR S.A.',
      expectedType: 'company',
      expectedTokens: ['BANCO', 'CENTRAL', 'DEL', 'ECUADOR', 'S.A.']
    },
    {
      input: 'NATURAL MARÍA JOSÉ RODRÍGUEZ LÓPEZ POR SUS PROPIOS',
      expectedType: 'person',
      expectedTokens: ['MARÍA', 'JOSÉ', 'RODRÍGUEZ', 'LÓPEZ']
    }
  ];

  qualityTests.forEach(test => {
    const result = PdfExtractorService.cleanPersonNames(test.input);
    console.log(`Input: ${test.input}`);
    console.log(`Result: [${result.join(', ')}]`);
    console.log(`Expected Type: ${test.expectedType}`);
    
    if (result.length > 0) {
      const hasCompanyTokens = result[0].match(/S\.A\.|LTDA|CIA|CORP|INC/i);
      const detectedType = hasCompanyTokens ? 'company' : 'person';
      console.log(`Detected Type: ${detectedType}`);
      console.log(`Correct Detection: ${detectedType === test.expectedType ? '✅' : '❌'}`);
    }
    console.log('');
  });
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  
  // Sort both arrays for comparison
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  
  return sortedA.every((val, index) => val === sortedB[index]);
}

// Generate bug fix report
function generateBugFixReport(results) {
  console.log('=== COMPANY DETECTION BUG FIX REPORT ===\n');
  
  const { totalPassed, totalFailed, failures } = results;
  const totalTests = totalPassed + totalFailed;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
  
  // Analyze by severity
  const bySeverity = failures.reduce((acc, failure) => {
    const severity = failure.severity || 'UNKNOWN';
    acc[severity] = acc[severity] || [];
    acc[severity].push(failure);
    return acc;
  }, {});
  
  console.log('\n--- Failures by Severity ---');
  Object.entries(bySeverity).forEach(([severity, severityFailures]) => {
    console.log(`${severity}: ${severityFailures.length} failures`);
    severityFailures.forEach(failure => {
      console.log(`  - ${failure.name}`);
    });
  });

  // Overall assessment
  console.log('\n--- Overall Assessment ---');
  const highSeverityFails = (bySeverity.HIGH || []).length;
  const criticalBugs = failures.filter(f => f.bugType && f.status === 'NOT_FIXED').length;
  
  if (highSeverityFails === 0 && criticalBugs === 0) {
    console.log('✅ HIGH SEVERITY BUG: RESOLVED');
    console.log('   Company entity detection is working correctly');
  } else if (highSeverityFails > 0) {
    console.log('❌ HIGH SEVERITY BUG: PARTIALLY RESOLVED');
    console.log(`   ${highSeverityFails} high severity issues remain`);
  } else {
    console.log('❌ HIGH SEVERITY BUG: NOT RESOLVED');
    console.log(`   ${criticalBugs} critical bugs still present`);
  }
}

// Run all tests
const results = runCompanySpecificTests();
analyzeCompanyDetectionQuality();
generateBugFixReport(results);

// Exit with appropriate code
process.exit(results.totalFailed > 0 ? 1 : 0);