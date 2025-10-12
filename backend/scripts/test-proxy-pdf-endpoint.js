/**
 * 🧪 SCRIPT DE PRUEBA: Endpoint Proxy PDF
 * 
 * Verifica que el endpoint /api/proxy-pdf esté funcionando correctamente
 * 
 * Uso:
 * node backend/scripts/test-proxy-pdf-endpoint.js
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_PDF_URL = 'https://www.notaria18quito.com.ec/fotos-escrituras/Saq163wu.pdf';

console.log('🧪 INICIANDO PRUEBAS DEL PROXY PDF');
console.log('='.repeat(50));
console.log(`📡 Base URL: ${BASE_URL}`);
console.log(`📄 URL de prueba: ${TEST_PDF_URL}`);
console.log('='.repeat(50));

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  console.log('\n✅ TEST 1: Health Check');
  console.log('-'.repeat(50));
  
  try {
    const response = await fetch(`${BASE_URL}/api/proxy-pdf/health`);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Health check exitoso');
      return true;
    } else {
      console.log('❌ Health check falló');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en health check:', error.message);
    return false;
  }
}

/**
 * Test 2: Proxy PDF válido
 */
async function testProxyPDF() {
  console.log('\n✅ TEST 2: Proxy PDF válido');
  console.log('-'.repeat(50));
  
  try {
    const url = `${BASE_URL}/api/proxy-pdf?url=${encodeURIComponent(TEST_PDF_URL)}`;
    console.log(`📡 Petición: ${url}`);
    
    const response = await fetch(url);
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Length: ${response.headers.get('content-length')} bytes`);
    
    if (response.status === 200) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/pdf')) {
        console.log('✅ PDF obtenido exitosamente');
        return true;
      } else {
        console.log('❌ Content-Type incorrecto');
        return false;
      }
    } else if (response.status === 401) {
      console.log('❌ ERROR 401: Endpoint requiere autenticación (NO DEBERÍA)');
      const body = await response.text();
      console.log('Response body:', body);
      return false;
    } else {
      console.log(`❌ Error HTTP ${response.status}`);
      const body = await response.text();
      console.log('Response body:', body);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en proxy PDF:', error.message);
    return false;
  }
}

/**
 * Test 3: Validación de dominio
 */
async function testDomainValidation() {
  console.log('\n✅ TEST 3: Validación de dominio');
  console.log('-'.repeat(50));
  
  try {
    const invalidUrl = 'https://example.com/test.pdf';
    const url = `${BASE_URL}/api/proxy-pdf?url=${encodeURIComponent(invalidUrl)}`;
    console.log(`📡 Petición con dominio inválido: ${invalidUrl}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 403) {
      console.log('✅ Validación de dominio funcionando correctamente');
      return true;
    } else {
      console.log('❌ Debería rechazar dominios no permitidos');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en validación de dominio:', error.message);
    return false;
  }
}

/**
 * Test 4: Validación de extensión
 */
async function testExtensionValidation() {
  console.log('\n✅ TEST 4: Validación de extensión');
  console.log('-'.repeat(50));
  
  try {
    const invalidUrl = 'https://www.notaria18quito.com.ec/fotos-escrituras/archivo.txt';
    const url = `${BASE_URL}/api/proxy-pdf?url=${encodeURIComponent(invalidUrl)}`;
    console.log(`📡 Petición con extensión inválida: ${invalidUrl}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 400) {
      console.log('✅ Validación de extensión funcionando correctamente');
      return true;
    } else {
      console.log('❌ Debería rechazar archivos no-PDF');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en validación de extensión:', error.message);
    return false;
  }
}

/**
 * Test 5: URL faltante
 */
async function testMissingURL() {
  console.log('\n✅ TEST 5: URL faltante');
  console.log('-'.repeat(50));
  
  try {
    const url = `${BASE_URL}/api/proxy-pdf`;
    console.log(`📡 Petición sin parámetro URL`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 400) {
      console.log('✅ Validación de URL faltante funcionando correctamente');
      return true;
    } else {
      console.log('❌ Debería rechazar peticiones sin URL');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en validación de URL faltante:', error.message);
    return false;
  }
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
  console.log('\n🚀 EJECUTANDO TODAS LAS PRUEBAS');
  console.log('='.repeat(50));
  
  const results = [];
  
  results.push({ name: 'Health Check', passed: await testHealthCheck() });
  results.push({ name: 'Proxy PDF válido', passed: await testProxyPDF() });
  results.push({ name: 'Validación de dominio', passed: await testDomainValidation() });
  results.push({ name: 'Validación de extensión', passed: await testExtensionValidation() });
  results.push({ name: 'URL faltante', passed: await testMissingURL() });
  
  console.log('\n');
  console.log('='.repeat(50));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(50));
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.name}`);
  });
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log('\n');
  console.log(`📊 Total: ${passedTests}/${totalTests} pruebas pasadas`);
  
  if (passedTests === totalTests) {
    console.log('✅ TODAS LAS PRUEBAS PASARON');
  } else {
    console.log('❌ ALGUNAS PRUEBAS FALLARON');
  }
  
  console.log('='.repeat(50));
}

// Ejecutar pruebas
runAllTests().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
