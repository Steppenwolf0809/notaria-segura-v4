#!/usr/bin/env node

/**
 * Script de diagnóstico para Railway
 * Verifica configuración, conectividad y estado del sistema
 */

import dotenv from 'dotenv';
import { getConfig, validateConfigurationComplete } from '../src/config/environment.js';
import cache from '../src/services/cache-service.js';
import prisma from '../src/db.js';

// Cargar variables de entorno
dotenv.config({ path: './.env' });

console.log('🔍 DIAGNÓSTICO RAILWAY - NOTARÍA SEGURA');
console.log('=====================================');

async function runDiagnostics() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: {},
    recommendations: []
  };

  try {
    // 1. Verificar configuración
    console.log('\n📋 Verificando configuración...');
    const config = getConfig();
    const validation = validateConfigurationComplete(config);

    results.checks.configuration = {
      status: validation.isComplete ? '✅' : '❌',
      critical: validation.critical,
      optional: validation.optional,
      recommendations: validation.recommendations
    };

    if (!validation.isComplete) {
      results.recommendations.push(...validation.recommendations);
    }

    // 2. Verificar conexión a base de datos
    console.log('🗄️ Verificando conexión a PostgreSQL...');
    try {
      await prisma.$connect();
      const userCount = await prisma.user.count();
      results.checks.database = {
        status: '✅',
        connection: 'OK',
        userCount: userCount
      };
      console.log(`✅ Conexión BD OK - ${userCount} usuarios encontrados`);
    } catch (dbError) {
      results.checks.database = {
        status: '❌',
        error: dbError.message
      };
      results.recommendations.push('Verificar DATABASE_URL y conectividad PostgreSQL');
      console.log(`❌ Error BD: ${dbError.message}`);
    }

    // 3. Verificar caché
    console.log('⚡ Verificando sistema de caché...');
    try {
      const cacheConnected = await cache.connectRedisIfConfigured();
      results.checks.cache = {
        status: cacheConnected ? '✅' : '⚠️',
        type: cacheConnected ? 'Redis' : 'Memory',
        message: cacheConnected ? 'Conectado a Redis' : 'Usando memoria local'
      };
      console.log(`✅ Caché OK - ${cacheConnected ? 'Redis' : 'Memoria'}`);
    } catch (cacheError) {
      results.checks.cache = {
        status: '❌',
        error: cacheError.message
      };
      console.log(`❌ Error caché: ${cacheError.message}`);
    }

    // 4. Verificar feature flags
    console.log('🚩 Verificando feature flags...');
    const featureFlags = {
      VITE_UI_ACTIVOS_ENTREGADOS: process.env.VITE_UI_ACTIVOS_ENTREGADOS || 'false',
      VITE_API_URL: process.env.VITE_API_URL || '/api',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    results.checks.featureFlags = {
      status: '✅',
      flags: featureFlags
    };

    console.log('✅ Feature flags:');
    Object.entries(featureFlags).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // 5. Verificar endpoints críticos
    console.log('🔗 Verificando endpoints críticos...');
    const criticalEndpoints = [
      { path: '/api/health', description: 'Health check básico' },
      { path: '/api/health/feature-flags', description: 'Verificación feature flags' },
      { path: '/api/auth/verify', description: 'Verificación de token' },
      { path: '/api/documents', description: 'Lista de documentos' },
      { path: '/api/reception', description: 'Lista de recepciones' }
    ];

    results.checks.endpoints = {
      status: '⏳',
      endpoints: []
    };

    // Nota: No podemos hacer requests HTTP desde este script sin iniciar el servidor
    // Solo verificamos que las rutas estén definidas
    results.checks.endpoints.message = 'Verificación manual requerida - usar curl o navegador';
    console.log('⏳ Endpoints requieren verificación manual con curl');

    // 6. Verificar archivos estáticos
    console.log('📁 Verificando archivos estáticos...');
    const fs = await import('fs');
    const path = await import('path');
    const frontendDist = path.join(process.cwd(), 'frontend', 'dist');

    try {
      const files = fs.readdirSync(frontendDist);
      const hasIndex = files.includes('index.html');
      const hasAssets = files.includes('assets');

      results.checks.staticFiles = {
        status: hasIndex && hasAssets ? '✅' : '❌',
        frontendDist: frontendDist,
        hasIndex: hasIndex,
        hasAssets: hasAssets,
        fileCount: files.length
      };

      console.log(`✅ Archivos estáticos: ${files.length} archivos encontrados`);
      if (!hasIndex) {
        results.recommendations.push('Falta index.html en frontend/dist');
      }
      if (!hasAssets) {
        results.recommendations.push('Falta directorio assets en frontend/dist');
      }
    } catch (fsError) {
      results.checks.staticFiles = {
        status: '❌',
        error: fsError.message
      };
      results.recommendations.push('Build del frontend faltante o incorrecto');
      console.log(`❌ Error archivos estáticos: ${fsError.message}`);
    }

    // 7. Verificar variables críticas de Railway
    console.log('🚂 Verificando variables Railway...');
    const railwayVars = {
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
      RAILWAY_ENVIRONMENT_ID: process.env.RAILWAY_ENVIRONMENT_ID
    };

    results.checks.railway = {
      status: railwayVars.RAILWAY_PUBLIC_DOMAIN ? '✅' : '⚠️',
      variables: railwayVars,
      isRailway: !!railwayVars.RAILWAY_PUBLIC_DOMAIN
    };

    console.log(`✅ Railway: ${railwayVars.RAILWAY_PUBLIC_DOMAIN ? 'Detectado' : 'No detectado'}`);

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    results.error = error.message;
  }

  // Resultado final
  console.log('\n📊 RESULTADO DEL DIAGNÓSTICO');
  console.log('============================');

  const criticalErrors = Object.values(results.checks).filter(check =>
    check.status === '❌' && check !== results.checks.endpoints
  ).length;

  if (criticalErrors === 0) {
    console.log('✅ SISTEMA OPERATIVO - Todo parece estar bien');
  } else {
    console.log(`❌ ${criticalErrors} ERRORES CRÍTICOS DETECTADOS`);
  }

  if (results.recommendations.length > 0) {
    console.log('\n💡 RECOMENDACIONES:');
    results.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }

  // Guardar resultado en archivo
  try {
    const fs = await import('fs');
    const outputPath = './railway-diagnostic.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Resultado guardado en: ${outputPath}`);
  } catch (saveError) {
    console.warn('⚠️ No se pudo guardar el resultado:', saveError.message);
  }

  return results;
}

// Ejecutar diagnóstico
runDiagnostics()
  .then(() => {
    console.log('\n🏁 Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal en diagnóstico:', error);
    process.exit(1);
  });