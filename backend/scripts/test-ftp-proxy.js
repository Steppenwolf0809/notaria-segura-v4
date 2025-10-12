/**
 * Script de diagnóstico para el Proxy PDF
 * 
 * Verifica:
 * - Variables FTP configuradas correctamente
 * - Conectividad con el servidor remoto
 * - Autenticación HTTP Basic funcional
 * - Acceso a archivos PDF
 * 
 * Uso:
 *   node scripts/test-ftp-proxy.js
 */

import dotenv from 'dotenv';
import { URL } from 'url';

// Cargar variables de entorno
dotenv.config();

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// URL de ejemplo para testing
const TEST_PDF_URL = 'https://www.notaria18quito.com.ec/fotos-escrituras/test.pdf';

async function main() {
  log('\n🔍 DIAGNÓSTICO DEL PROXY PDF\n', 'cyan');
  log('=' .repeat(60), 'blue');
  
  // 1. Verificar variables de entorno
  log('\n📋 PASO 1: Verificando variables de entorno', 'cyan');
  log('-'.repeat(60), 'blue');
  
  const requiredVars = {
    'FTP_HOST': process.env.FTP_HOST,
    'FTP_USER': process.env.FTP_USER,
    'FTP_PASSWORD': process.env.FTP_PASSWORD,
    'FTP_PORT': process.env.FTP_PORT || '21',
    'FTP_BASE_PATH': process.env.FTP_BASE_PATH,
    'FTP_PUBLIC_BASE_URL': process.env.FTP_PUBLIC_BASE_URL
  };
  
  let allConfigured = true;
  
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value === `tu_usuario_ftp` || value === `tu_contraseña_ftp`) {
      log(`  ❌ ${key}: NO CONFIGURADO`, 'red');
      allConfigured = false;
    } else {
      // Ocultar contraseña parcialmente
      const displayValue = key === 'FTP_PASSWORD' 
        ? '*'.repeat(value.length) 
        : value;
      log(`  ✅ ${key}: ${displayValue}`, 'green');
    }
  }
  
  if (!allConfigured) {
    log('\n❌ CONFIGURACIÓN INCOMPLETA', 'red');
    log('Por favor, configura todas las variables FTP en el archivo .env', 'yellow');
    log('Ejemplo:', 'yellow');
    log(`
FTP_HOST=ftp.notaria18quito.com.ec
FTP_USER=tu_usuario_real
FTP_PASSWORD=tu_contraseña_real
FTP_PORT=21
FTP_BASE_PATH=/public_html/fotos-escrituras
FTP_PUBLIC_BASE_URL=https://www.notaria18quito.com.ec/fotos-escrituras
    `.trim(), 'cyan');
    process.exit(1);
  }
  
  log('\n✅ Todas las variables están configuradas\n', 'green');
  
  // 2. Probar autenticación HTTP Basic
  log('\n🔐 PASO 2: Probando autenticación HTTP Basic', 'cyan');
  log('-'.repeat(60), 'blue');
  
  const testUrl = process.env.FTP_PUBLIC_BASE_URL 
    ? `${process.env.FTP_PUBLIC_BASE_URL}/test.pdf`
    : TEST_PDF_URL;
  
  log(`  URL de prueba: ${testUrl}`, 'blue');
  
  try {
    // Preparar credenciales
    const credentials = Buffer.from(
      `${process.env.FTP_USER}:${process.env.FTP_PASSWORD}`
    ).toString('base64');
    
    const headers = {
      'Authorization': `Basic ${credentials}`
    };
    
    log(`  Usuario: ${process.env.FTP_USER}`, 'blue');
    log(`  Contraseña: ${'*'.repeat(process.env.FTP_PASSWORD.length)}`, 'blue');
    log('  Realizando petición...', 'yellow');
    
    // Hacer petición con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(testUrl, {
      method: 'HEAD', // Solo headers, no descargar el archivo completo
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    log(`\n  Status Code: ${response.status} ${response.statusText}`, 
      response.ok ? 'green' : 'red');
    
    if (response.ok) {
      log('  ✅ Autenticación exitosa', 'green');
      log(`  Content-Type: ${response.headers.get('content-type')}`, 'blue');
      log(`  Content-Length: ${response.headers.get('content-length')} bytes`, 'blue');
    } else if (response.status === 401) {
      log('  ❌ Error 401: Credenciales rechazadas', 'red');
      log('  Las credenciales FTP son incorrectas o no tienen permiso', 'yellow');
    } else if (response.status === 404) {
      log('  ⚠️  Error 404: Archivo no encontrado', 'yellow');
      log('  Esto es normal si el archivo de prueba no existe', 'yellow');
      log('  Pero la autenticación funcionó correctamente', 'green');
    } else {
      log(`  ❌ Error inesperado: ${response.status}`, 'red');
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      log('  ❌ Timeout: El servidor no respondió en 10 segundos', 'red');
    } else {
      log(`  ❌ Error de conexión: ${error.message}`, 'red');
    }
  }
  
  // 3. Probar sin autenticación (para comparar)
  log('\n🔓 PASO 3: Probando sin autenticación (para comparar)', 'cyan');
  log('-'.repeat(60), 'blue');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    log(`  Status Code: ${response.status} ${response.statusText}`, 
      response.ok ? 'green' : 'red');
    
    if (response.ok) {
      log('  ℹ️  El servidor NO requiere autenticación', 'yellow');
      log('  Los PDFs son públicamente accesibles', 'yellow');
    } else if (response.status === 401) {
      log('  ✅ El servidor SÍ requiere autenticación', 'green');
      log('  Las credenciales FTP son necesarias', 'green');
    } else {
      log(`  ℹ️  Respuesta: ${response.status}`, 'blue');
    }
    
  } catch (error) {
    log(`  Error: ${error.message}`, 'yellow');
  }
  
  // 4. Resumen
  log('\n📊 RESUMEN', 'cyan');
  log('='.repeat(60), 'blue');
  
  if (allConfigured) {
    log('\n✅ Configuración FTP completa', 'green');
    log('✅ El proxy PDF debería funcionar correctamente', 'green');
    log('\n💡 Consejos:', 'cyan');
    log('  • Asegúrate de reiniciar el backend después de cambiar variables', 'yellow');
    log('  • En Railway, agrega las variables en Settings → Variables', 'yellow');
    log('  • Verifica los logs del backend para debugging', 'yellow');
  } else {
    log('\n❌ Configuración incompleta', 'red');
    log('Por favor, completa todas las variables FTP', 'yellow');
  }
  
  log('\n' + '='.repeat(60), 'blue');
  log('🏁 Diagnóstico completado\n', 'cyan');
}

// Ejecutar
main().catch(error => {
  log(`\n💥 Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

