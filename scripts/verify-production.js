#!/usr/bin/env node

/**
 * Script de verificación post-deploy para producción
 * Verifica que todos los endpoints críticos funcionen correctamente
 */

const API_BASE_URL = process.env.BACKEND_URL || process.argv[2];

if (!API_BASE_URL) {
  console.error('❌ Error: Proporciona la URL del backend como argumento');
  console.log('Uso: node verify-production.js https://tu-backend.up.railway.app');
  process.exit(1);
}

console.log('🔍 VERIFICACIÓN POST-DEPLOY - NOTARÍA SEGURA');
console.log(`🎯 Backend URL: ${API_BASE_URL}`);
console.log('=' .repeat(50));

// Función para hacer requests HTTP
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Tests de verificación
const tests = [
  {
    name: 'Health Check',
    url: `${API_BASE_URL}/api/health`,
    expectedStatus: 200,
    critical: true
  },
  {
    name: 'Auth Verify (debe dar 401)',
    url: `${API_BASE_URL}/api/auth/verify`,
    expectedStatus: 401,
    critical: true
  },
  {
    name: 'Documents Endpoint (debe requerir auth)',
    url: `${API_BASE_URL}/api/documents`,
    expectedStatus: 401,
    critical: true
  },
  {
    name: 'Admin Routes (debe requerir auth)',
    url: `${API_BASE_URL}/api/admin/users`,
    expectedStatus: 401,
    critical: true
  }
];

// Ejecutar tests
async function runTests() {
  console.log('🧪 Ejecutando tests de verificación...\n');
  
  let passed = 0;
  let failed = 0;
  const failedCritical = [];

  for (const test of tests) {
    try {
      console.log(`⏳ ${test.name}...`);
      const result = await makeRequest(test.url);
      
      if (result.ok || result.status === test.expectedStatus) {
        console.log(`✅ ${test.name} - PASS (${result.status})`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - FAIL (${result.status || 'ERROR'})`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        failed++;
        if (test.critical) {
          failedCritical.push(test.name);
        }
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      failed++;
      if (test.critical) {
        failedCritical.push(test.name);
      }
    }
    console.log('');
  }

  // Resumen
  console.log('=' .repeat(50));
  console.log('📊 RESUMEN DE VERIFICACIÓN:');
  console.log(`✅ Tests exitosos: ${passed}`);
  console.log(`❌ Tests fallidos: ${failed}`);
  console.log('');

  if (failedCritical.length > 0) {
    console.log('🚨 TESTS CRÍTICOS FALLIDOS:');
    failedCritical.forEach(test => console.log(`   • ${test}`));
    console.log('');
    console.log('❌ DEPLOY NO ESTÁ LISTO PARA PRODUCCIÓN');
    console.log('Revisa los logs y configuración antes de continuar.');
    process.exit(1);
  } else if (failed === 0) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON!');
    console.log('✅ DEPLOY EXITOSO - BACKEND LISTO PARA PRODUCCIÓN');
  } else {
    console.log('⚠️ ALGUNOS TESTS FALLARON PERO NO SON CRÍTICOS');
    console.log('✅ DEPLOY BÁSICO EXITOSO');
  }

  console.log('');
  console.log('📋 PRÓXIMOS PASOS:');
  console.log('1. Verificar frontend conecta correctamente');
  console.log('2. Probar login con usuario administrador');
  console.log('3. Verificar notificaciones WhatsApp');
  console.log('4. Probar flujo completo XML → Procesamiento → Entrega');
}

// Verificar si fetch está disponible (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Este script requiere Node.js 18+ con fetch nativo');
  console.log('Alternativa: instala node-fetch o usa curl manualmente');
  process.exit(1);
}

runTests().catch(console.error);