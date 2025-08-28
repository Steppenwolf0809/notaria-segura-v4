/**
 * Additional Test Suite for Otorgantes Extraction from PDF Text Formats
 * Testing parseSimpleData() and parseAdvancedData() functions specifically
 * Focus: Real-world PDF text formats and otorgantes section parsing
 */

import PdfExtractorService from './src/services/pdf-extractor-service.js';

console.log('='.repeat(80));
console.log('OTORGANTES EXTRACTION TEST SUITE');
console.log('='.repeat(80));

// Test realistic PDF text formats
const realWorldTests = [
  {
    name: 'Simple PDF Format - Single Natural Person',
    input: `EXTRACTO ESCRITURA N°: 123
ACTO O CONTRATO: PODER GENERAL
OTORGADO POR: NATURAL JUAN CARLOS PEREZ GOMEZ POR SUS PROPIOS DERECHOS
A FAVOR DE: NATURAL MARIA ELENA RODRIGUEZ LOPEZ POR SUS PROPIOS DERECHOS
NOTARIO (A): DR. FERNANDO SANTOS SILVA`,
    expected: {
      tipoActo: 'PODER GENERAL',
      otorgantes: ['JUAN CARLOS PEREZ GOMEZ'],
      beneficiarios: ['MARIA ELENA RODRIGUEZ LOPEZ']
    }
  },
  
  {
    name: 'Table Format - Natural Person with Headers',
    input: `PERSONA          NOMBRES/RAZÓN SOCIAL                    TIPO
NATURAL          JOSÉ ANTONIO GARCÍA MARTÍNEZ           POR SUS PROPIOS
                 DOCUMENTO: 1234567890
                 NACIONALIDAD: ECUATORIANA`,
    expected: {
      otorgantes: ['JOSÉ ANTONIO GARCÍA MARTÍNEZ']
    }
  },
  
  {
    name: 'Complex Table Format - Multiple Natural Persons',
    input: `OTORGANTES:
PERSONA     NOMBRES/RAZÓN SOCIAL                TIPO
NATURAL     JUAN CARLOS PEREZ GOMEZ            POR SUS PROPIOS
NATURAL     MARIA ELENA RODRIGUEZ LOPEZ        POR SUS PROPIOS
NATURAL     PEDRO JOSE FERNANDEZ SANTOS        POR SUS PROPIOS`,
    expected: {
      otorgantes: ['JUAN CARLOS PEREZ GOMEZ', 'MARIA ELENA RODRIGUEZ LOPEZ', 'PEDRO JOSE FERNANDEZ SANTOS']
    }
  },
  
  {
    name: 'Mixed Natural and Juridical Persons',
    input: `OTORGADO POR:
NATURAL JUAN PEREZ GOMEZ POR SUS PROPIOS DERECHOS
JURIDICA CONSTRUCTORA DEL VALLE S.A. REPRESENTADO POR MARIA RODRIGUEZ`,
    expected: {
      otorgantes: ['JUAN PEREZ GOMEZ', 'CONSTRUCTORA DEL VALLE S.A.']
    }
  },
  
  {
    name: 'Apellidos y Nombres Format',
    input: `APELLIDOS Y NOMBRES: PEREZ GOMEZ JUAN CARLOS
DOCUMENTO: 1234567890 NACIONALIDAD: ECUATORIANA
CALIDAD: POR SUS PROPIOS DERECHOS`,
    expected: {
      otorgantes: ['JUAN CARLOS PEREZ GOMEZ']
    }
  },
  
  {
    name: 'Compound Surnames with Particles',
    input: `NATURAL DE LA TORRE MARTINEZ MARIA DEL CARMEN POR SUS PROPIOS
NATURAL DEL VALLE RODRIGUEZ JOSE ANTONIO POR SUS PROPIOS`,
    expected: {
      otorgantes: ['MARIA DEL CARMEN DE LA TORRE MARTINEZ', 'JOSE ANTONIO DEL VALLE RODRIGUEZ']
    }
  },
  
  {
    name: 'Real PDF with Noise and Headers',
    input: `EXTRACTO NOTARIAL
ESCRITURA NUMERO: 456
FECHA: 15 DE ENERO DEL 2024
ACTO O CONTRATO: COMPRAVENTA
PERSONA     NOMBRES            DOCUMENTO    NACIONALIDAD
NATURAL     JUAN PEREZ         1234567      ECUATORIANA
            TIPO: OTORGANTE POR SUS PROPIOS DERECHOS
NATURAL     MARIA RODRIGUEZ    9876543      COLOMBIANA
            TIPO: BENEFICIARIO POR SUS PROPIOS DERECHOS`,
    expected: {
      tipoActo: 'COMPRAVENTA',
      otorgantes: ['JUAN PEREZ'],
      beneficiarios: ['MARIA RODRIGUEZ']
    }
  }
];

// Run tests with both parseSimpleData and parseAdvancedData
for (const test of realWorldTests) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${test.name}`);
  console.log(`${'='.repeat(60)}`);
  
  console.log('\n--- Using parseSimpleData() ---');
  try {
    const simpleResult = PdfExtractorService.parseSimpleData(test.input);
    console.log('Result:', JSON.stringify(simpleResult, null, 2));
    
    if (test.expected.tipoActo) {
      console.log(`Tipo Acto: ${simpleResult.tipoActo === test.expected.tipoActo ? '✅' : '❌'} Expected: "${test.expected.tipoActo}", Got: "${simpleResult.tipoActo}"`);
    }
    if (test.expected.otorgantes) {
      console.log(`Otorgantes: ${JSON.stringify(simpleResult.otorgantes) === JSON.stringify(test.expected.otorgantes) ? '✅' : '❌'}`);
      console.log(`  Expected: ${JSON.stringify(test.expected.otorgantes)}`);
      console.log(`  Got:      ${JSON.stringify(simpleResult.otorgantes)}`);
    }
    if (test.expected.beneficiarios) {
      console.log(`Beneficiarios: ${JSON.stringify(simpleResult.beneficiarios) === JSON.stringify(test.expected.beneficiarios) ? '✅' : '❌'}`);
      console.log(`  Expected: ${JSON.stringify(test.expected.beneficiarios)}`);
      console.log(`  Got:      ${JSON.stringify(simpleResult.beneficiarios)}`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
  
  console.log('\n--- Using parseAdvancedData() ---');
  try {
    const advancedResult = PdfExtractorService.parseAdvancedData(test.input);
    console.log('Result:', JSON.stringify(advancedResult, null, 2));
    
    if (advancedResult.acts && advancedResult.acts.length > 0) {
      const firstAct = advancedResult.acts[0];
      
      if (test.expected.tipoActo) {
        console.log(`Tipo Acto: ${firstAct.tipoActo === test.expected.tipoActo ? '✅' : '❌'} Expected: "${test.expected.tipoActo}", Got: "${firstAct.tipoActo}"`);
      }
      if (test.expected.otorgantes) {
        console.log(`Otorgantes: ${JSON.stringify(firstAct.otorgantes) === JSON.stringify(test.expected.otorgantes) ? '✅' : '❌'}`);
        console.log(`  Expected: ${JSON.stringify(test.expected.otorgantes)}`);
        console.log(`  Got:      ${JSON.stringify(firstAct.otorgantes)}`);
      }
      if (test.expected.beneficiarios) {
        console.log(`Beneficiarios: ${JSON.stringify(firstAct.beneficiarios) === JSON.stringify(test.expected.beneficiarios) ? '✅' : '❌'}`);
        console.log(`  Expected: ${JSON.stringify(test.expected.beneficiarios)}`);
        console.log(`  Got:      ${JSON.stringify(firstAct.beneficiarios)}`);
      }
    } else {
      console.log('❌ No acts detected');
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

// Test specific cleanPersonNames edge cases that were failing
console.log(`\n${'='.repeat(80)}`);
console.log('SPECIFIC EDGE CASE ANALYSIS');
console.log(`${'='.repeat(80)}`);

const edgeCases = [
  {
    name: 'Already Ordered Names Being Reordered Incorrectly',
    input: 'NATURAL JUAN CARLOS PEREZ GOMEZ POR SUS PROPIOS',
    issue: 'Names that are already in correct order (NOMBRES APELLIDOS) are being reordered incorrectly'
  },
  {
    name: 'Compound Particles Not Handled',
    input: 'NATURAL DE LA TORRE SANTOS MARIA DEL CARMEN POR SUS PROPIOS',
    issue: 'Multiple particles (DE LA, DEL) in both surnames and names not handled correctly'
  },
  {
    name: 'Header Tokens Not Filtered',
    input: 'PERSONA NATURAL DOCUMENTO JUAN PEREZ IDENTIFICACIÓN 1234567890 POR SUS PROPIOS',
    issue: 'Header tokens like DOCUMENTO, IDENTIFICACIÓN are not being filtered out'
  }
];

for (const edge of edgeCases) {
  console.log(`\n--- ${edge.name} ---`);
  console.log(`Issue: ${edge.issue}`);
  console.log(`Input: "${edge.input}"`);
  
  const result = PdfExtractorService.cleanPersonNames(edge.input);
  console.log(`Output: ${JSON.stringify(result)}`);
  
  // Analyze the specific issue
  if (result.length > 0) {
    const name = result[0];
    const tokens = name.split(' ');
    console.log(`Analysis: Found ${tokens.length} tokens`);
    
    // Check for header tokens
    const headerTokens = ['DOCUMENTO', 'IDENTIFICACIÓN', 'NATURAL', 'PERSONA'];
    const hasHeaderTokens = tokens.some(token => headerTokens.includes(token));
    if (hasHeaderTokens) {
      console.log('❌ Still contains header tokens');
    } else {
      console.log('✅ Header tokens filtered correctly');
    }
    
    // Check name order
    const commonNames = ['JUAN', 'CARLOS', 'MARIA', 'JOSE', 'ANTONIO'];
    const firstToken = tokens[0];
    const isFirstTokenName = commonNames.includes(firstToken);
    console.log(`Name order: First token "${firstToken}" is ${isFirstTokenName ? 'a name' : 'likely a surname'}`);
  } else {
    console.log('❌ No names extracted');
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log('OTORGANTES EXTRACTION TESTS COMPLETED');
console.log(`${'='.repeat(80)}`);