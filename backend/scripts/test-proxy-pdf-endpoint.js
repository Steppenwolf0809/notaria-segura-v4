/**
 * Script de prueba: Verificar endpoint proxy-pdf
 * 
 * Verifica que el endpoint /api/proxy-pdf funcione correctamente
 * SIN autenticación JWT (debe ser público)
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function testProxyEndpoint() {
  console.log('🧪 TEST: Endpoint Proxy PDF (sin autenticación)\n');
  console.log('━'.repeat(60));
  
  // Test 1: Health check (debe funcionar sin token)
  console.log('\n📋 TEST 1: Health Check (sin autenticación)');
  try {
    const response = await fetch(`${API_BASE}/api/proxy-pdf/health`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    console.log(`   Service: ${data.service}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   FTP User: ${data.configuration?.ftpUser || 'N/A'}`);
    console.log(`   FTP Password: ${data.configuration?.ftpPassword || 'N/A'}`);
    
    if (data.status === 'ready') {
      console.log('   ✅ Credenciales FTP configuradas correctamente');
    } else {
      console.warn('   ⚠️ Credenciales FTP NO configuradas (se necesitan FTP_USER y FTP_PASSWORD)');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
  
  // Test 2: Proxy de PDF sin token (debe funcionar)
  console.log('\n📋 TEST 2: Proxy PDF (sin autenticación)');
  const testPdfUrl = 'https://www.notaria18quito.com.ec/fotos-escrituras/test.pdf';
  const proxyUrl = `${API_BASE}/api/proxy-pdf?url=${encodeURIComponent(testPdfUrl)}`;
  
  try {
    console.log(`   URL: ${proxyUrl}`);
    console.log('   Headers: (ninguno - sin Authorization)');
    
    const startTime = Date.now();
    const response = await fetch(proxyUrl);
    const duration = Date.now() - startTime;
    
    console.log(`   Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 401) {
      console.error('   ❌ ERROR 401: Unauthorized');
      console.error('   📝 Esto indica que el servidor FTP remoto requiere autenticación');
      console.error('   📝 Verifica que las variables FTP_USER y FTP_PASSWORD estén configuradas');
    } else if (response.status === 404) {
      console.warn('   ⚠️ ERROR 404: PDF no encontrado en el servidor remoto');
      console.warn('   📝 El archivo test.pdf no existe (esto es normal si es un test)');
    } else if (response.ok) {
      const contentLength = response.headers.get('content-length');
      console.log(`   ✅ PDF obtenido exitosamente (${contentLength} bytes)`);
    } else {
      console.error(`   ❌ ERROR ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
  
  // Test 3: Verificar que rechaza dominios no permitidos
  console.log('\n📋 TEST 3: Seguridad - Dominio no permitido (debe fallar)');
  const badUrl = 'https://evil.com/malicious.pdf';
  const badProxyUrl = `${API_BASE}/api/proxy-pdf?url=${encodeURIComponent(badUrl)}`;
  
  try {
    const response = await fetch(badProxyUrl);
    console.log(`   Status: ${response.status} ${response.status === 403 ? '✅' : '❌'}`);
    
    if (response.status === 403) {
      console.log('   ✅ Dominio no permitido rechazado correctamente (seguridad funciona)');
    } else {
      console.error('   ❌ FALLO DE SEGURIDAD: Dominio no permitido fue aceptado');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
  
  // Test 4: Verificar que rechaza archivos no-PDF
  console.log('\n📋 TEST 4: Seguridad - Archivo no-PDF (debe fallar)');
  const nonPdfUrl = 'https://www.notaria18quito.com.ec/fotos-escrituras/test.jpg';
  const nonPdfProxyUrl = `${API_BASE}/api/proxy-pdf?url=${encodeURIComponent(nonPdfUrl)}`;
  
  try {
    const response = await fetch(nonPdfProxyUrl);
    console.log(`   Status: ${response.status} ${response.status === 400 ? '✅' : '❌'}`);
    
    if (response.status === 400) {
      console.log('   ✅ Archivo no-PDF rechazado correctamente (seguridad funciona)');
    } else {
      console.error('   ❌ FALLO DE SEGURIDAD: Archivo no-PDF fue aceptado');
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log('✅ Tests completados\n');
}

// Ejecutar tests
testProxyEndpoint().catch(err => {
  console.error('💥 Error ejecutando tests:', err);
  process.exit(1);
});

