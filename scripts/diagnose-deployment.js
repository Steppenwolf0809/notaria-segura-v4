#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar el estado del deployment en Railway
 * Ejecutar con: node scripts/diagnose-deployment.js
 */

import fetch from 'node-fetch';
import { execSync } from 'child_process';

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001';

console.log('🔍 DIAGNÓSTICO DE DEPLOYMENT - Notaría Segura');
console.log('='.repeat(60));

// 1. Verificar variables de entorno
console.log('\n📋 1. VARIABLES DE ENTORNO:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   VITE_API_URL: ${process.env.VITE_API_URL || 'undefined'}`);
console.log(`   VITE_UI_ACTIVOS_ENTREGADOS: ${process.env.VITE_UI_ACTIVOS_ENTREGADOS || 'undefined'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '[CONFIGURADO]' : 'undefined'}`);

// 2. Verificar archivos del build
console.log('\n📁 2. ARCHIVOS DEL BUILD:');
try {
  const files = execSync('find frontend/dist -name "*.js" -o -name "*.html" | head -10', { encoding: 'utf8' });
  console.log('   Archivos encontrados:');
  files.split('\n').filter(f => f).forEach(file => {
    console.log(`   • ${file}`);
  });
} catch (error) {
  console.log('   ❌ Error al verificar archivos del build');
}

// 3. Verificar health check del backend
console.log('\n🏥 3. HEALTH CHECK BACKEND:');
try {
  const response = await fetch(`${API_BASE}/api/health`);
  const health = await response.json();
  console.log(`   Status: ${response.status}`);
  console.log(`   Environment: ${health.environment}`);
  console.log(`   Features: ${health.features?.length || 0} features`);
} catch (error) {
  console.log(`   ❌ Error en health check: ${error.message}`);
}

// 4. Verificar feature flags
console.log('\n🚩 4. FEATURE FLAGS:');
try {
  const response = await fetch(`${API_BASE}/api/health/feature-flags`);
  const flags = await response.json();
  console.log(`   Status: ${response.status}`);
  console.log(`   VITE_UI_ACTIVOS_ENTREGADOS: ${flags.featureFlags?.VITE_UI_ACTIVOS_ENTREGADOS}`);
  console.log(`   VITE_API_URL: ${flags.featureFlags?.VITE_API_URL}`);
  console.log(`   NODE_ENV: ${flags.featureFlags?.NODE_ENV}`);
} catch (error) {
  console.log(`   ❌ Error al verificar feature flags: ${error.message}`);
}

// 5. Verificar endpoints nuevos
console.log('\n🔗 5. ENDPOINTS NUEVOS:');
const endpointsToCheck = [
  '/api/documents?tab=ACTIVOS&page=1&pageSize=25',
  '/api/documents/counts',
  '/api/reception?tab=ACTIVOS&page=1&pageSize=25',
  '/api/reception/counts'
];

for (const endpoint of endpointsToCheck) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`   ${endpoint}: ❌ Error - ${error.message}`);
  }
}

// 6. Verificar archivos estáticos
console.log('\n📄 6. ARCHIVOS ESTÁTICOS:');
try {
  const response = await fetch(`${API_BASE}/`);
  console.log(`   / (index.html): ${response.status} ${response.statusText}`);
  const contentType = response.headers.get('content-type');
  console.log(`   Content-Type: ${contentType}`);

  if (contentType?.includes('text/html')) {
    const html = await response.text();
    const hasNewUI = html.includes('DocumentCenter') || html.includes('ReceptionCenter');
    console.log(`   Contiene nueva UI: ${hasNewUI ? '✅' : '❌'}`);
  }
} catch (error) {
  console.log(`   ❌ Error al verificar archivos estáticos: ${error.message}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ DIAGNÓSTICO COMPLETADO');
console.log('\n💡 RECOMENDACIONES:');
console.log('   • Si VITE_UI_ACTIVOS_ENTREGADOS es "false", configúralo como "true" en Railway');
console.log('   • Si los endpoints devuelven 404, verifica que los archivos estén en la rama correcta');
console.log('   • Si no contiene nueva UI, fuerza un rebuild completo en Railway');
console.log('   • Verifica que la rama feature/ui-activos-entregados-busqueda-global esté seleccionada');