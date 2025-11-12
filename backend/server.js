import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { closePrismaClient, db } from './src/db.js'
import { getConfig, isConfigurationComplete, validateConfigurationComplete, debugConfiguration } from './src/config/environment.js'
import xmlWatcherService from './src/services/xml-watcher-service.js'
import cache from './src/services/cache-service.js'
// import { log } from './src/utils/logger.js'
// import { requestLogger } from './src/middleware/request-logger.js'
// import {
//   noSqlSanitizer,
//   hppProtection,
//   xssSanitizer,
//   validateContentType,
//   sanitizeSensitiveFields
// } from './src/middleware/sanitization.js'

// Importar rutas implementadas
import authRoutes from './src/routes/auth-routes.js'
// import passwordRecoveryRoutes from './src/routes/password-recovery-routes.js'
// import profileRoutes from './src/routes/profile-routes.js'
import documentRoutes from './src/routes/document-routes.js'
import notificationsRoutes from './src/routes/notifications-routes.js'
import adminRoutes from './src/routes/admin-routes.js'
import archivoRoutes from './src/routes/archivo-routes.js'
import receptionRoutes from './src/routes/reception-routes.js'
import alertasRoutes from './src/routes/alertas-routes.js'
import concuerdoRoutes from './src/routes/concuerdo-routes.js'
import escriturasQRRoutes from './src/routes/escrituras-qr-routes.js'
import pdfProxyRoutes from './src/routes/pdf-proxy-routes.js'

// Cargar variables de entorno
dotenv.config({ path: './.env' })

// Validar configuración de entorno
const config = getConfig()
debugConfiguration(config)

// Verificar configuración completa
const validationResult = validateConfigurationComplete(config)

if (!validationResult.isComplete) {
  console.error('💥 CONFIGURACIÓN INCOMPLETA DETECTADA')

  if (!validationResult.critical.complete) {
    console.error('❌ VARIABLES CRÍTICAS FALTANTES:');
    validationResult.critical.missing.forEach(v => console.error(`   • ${v}`));
  }

  if (!validationResult.optional.complete) {
    console.warn('⚠️ SERVICIOS OPCIONALES NO CONFIGURADOS:');
    validationResult.optional.warnings.forEach(w => console.warn(`   • ${w}`));
  }

  if (validationResult.recommendations.length > 0) {
    console.log('💡 RECOMENDACIONES:');
    validationResult.recommendations.forEach(r => console.log(`   • ${r}`));
  }

  // En producción, solo fallar por variables críticas
  if (config.NODE_ENV === 'production' && !validationResult.critical.complete) {
    console.error('💥 La aplicación no puede iniciar en producción con configuración crítica faltante');
    process.exit(1);
  }

  if (config.NODE_ENV !== 'production') {
    console.warn('⚠️ La aplicación continuará en modo desarrollo, pero algunas funciones pueden no estar disponibles');
  }
} else {
  console.log('✅ CONFIGURACIÓN COMPLETA - Todos los servicios están listos');
}

const app = express()
const PORT = process.env.PORT || process.env.RAILWAY_PORT || config.PORT || 3001
const HOST = '0.0.0.0'

// ============================================================================
// LIVENESS Y READINESS - DEFINIDOS ANTES DE CUALQUIER MIDDLEWARE
// ============================================================================

// Liveness simple: siempre 200, no depende de DB ni auth
app.get('/health', (_req, res) => {
  console.info('[HEALTH] /health hit', new Date().toISOString());
  res.status(200).json({ ok: true, ts: Date.now() })
})

// Duplicado defensivo por si algún middleware/proxy toca /health
app.get('/healthz', (_req, res) => {
  console.info('[HEALTH] /healthz hit', new Date().toISOString());
  res.status(200).json({ ok: true, ts: Date.now() })
})

// Readiness: refleja estado de dependencias (DB)
let isReady = false
app.get('/ready', (_req, res) => {
  if (isReady) return res.status(200).json({ ready: true, ts: Date.now() })
  return res.status(503).json({ ready: false, ts: Date.now() })
})

// Configurar trust proxy de forma segura (evita ERR_ERL_PERMISSIVE_TRUST_PROXY)
// En Railway/producción confiamos solo en el primer proxy; en desarrollo no confiamos en proxies
if (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging') {
  app.set('trust proxy', 1)
} else {
  app.set('trust proxy', false)
}

// Configuración CORS mejorada para desarrollo y producción
const corsOptions = {
  origin: function (origin, callback) {
    // En producción, usar orígenes específicos del .env
    if (process.env.NODE_ENV === 'production') {
      const productionOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
        : [process.env.FRONTEND_URL || 'https://notaria-segura.com'];
      
      // Auto-detectar URL de Railway para permitir requests desde la misma aplicación
      if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        const railwayUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
        if (!productionOrigins.includes(railwayUrl)) {
          productionOrigins.push(railwayUrl);
        }
      }
      
      // Agregar dominio personalizado de la notaría (con y sin www)
      const notariaOrigins = [
        'https://www.notaria18quito.com.ec',
        'https://notaria18quito.com.ec'
      ];
      notariaOrigins.forEach(url => {
        if (!productionOrigins.includes(url)) {
          productionOrigins.push(url);
        }
      });
      
      // Permitir requests sin origin (API calls) o desde orígenes permitidos
      if (!origin || productionOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS: Origin no permitido en producción: ${origin}`);
        console.warn(`📋 Orígenes permitidos: ${productionOrigins.join(', ')}`);
        callback(new Error('No permitido por CORS'));
      }
    } else {
      // En desarrollo, usar lista combinada de orígenes permitidos
      const developmentOrigins = process.env.ALLOWED_ORIGINS_DEV 
        ? process.env.ALLOWED_ORIGINS_DEV.split(',').map(url => url.trim())
        : [
            'http://localhost:5173',  // Frontend principal (Vite)
            'http://localhost:5174',  // Frontend backup
            'http://127.0.0.1:5173',  // Variante local
            'http://127.0.0.1:5174',  // Variante local backup
          ];

      // Agregar FRONTEND_URL si no está en la lista
      if (process.env.FRONTEND_URL && !developmentOrigins.includes(process.env.FRONTEND_URL)) {
        developmentOrigins.push(process.env.FRONTEND_URL);
      }

      // En desarrollo, permitir sin origin (herramientas como Postman/curl) o orígenes permitidos
      if (!origin || developmentOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS: Origin no permitido en desarrollo: ${origin}`);
        console.log(`📋 Orígenes permitidos: ${developmentOrigins.join(', ')}`);
        callback(new Error('No permitido por CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: [
    'X-RateLimit-Policy', 
    'X-Security-Info',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

// ============================================================================
// MIDDLEWARES DE SEGURIDAD Y OPTIMIZACIÓN
// ============================================================================

// Helmet - Headers de seguridad HTTP mejorados
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "'unsafe-inline'", "http://localhost:3001", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
      childSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null
    },
  },
  crossOriginEmbedderPolicy: false, // Permitir embedding para notificaciones WhatsApp
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  frameguard: { action: 'deny' }
}));

// Compression - Optimizar respuestas
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1000
}));

app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ============================================================================
// MIDDLEWARES DE SANITIZACIÓN Y SEGURIDAD ADICIONALES - TEMPORALMENTE DESHABILITADOS
// ============================================================================

// // Validar Content-Type
// app.use(validateContentType)

// // Protección contra NoSQL injection
// app.use(noSqlSanitizer)

// // Protección contra HTTP Parameter Pollution
// app.use(hppProtection)

// // Sanitización XSS
// app.use(xssSanitizer)

// // Sanitización de campos sensibles
// app.use(sanitizeSensitiveFields)

// // Request logger con Winston
// app.use(requestLogger)

// Performance logger: registra requests lentas (>500ms)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      const end = process.hrtime.bigint();
      const ms = Number((end - start) / 1000000n);
      const threshold = parseInt(process.env.SLOW_REQUEST_MS || '500', 10);
      if (ms > threshold) {
        console.log(`🐢 Slow ${req.method} ${req.originalUrl} → ${ms}ms`);
      }
    } catch (error) {
      // Ignore errors in performance logger
    }
  });
  next();
});

// ============================================================================
// RUTAS IMPLEMENTADAS - SISTEMA COMPLETO
// ============================================================================

// Ruta de salud del sistema
app.get('/api/health', (req, res) => {
  res.json({
    message: 'API Notaría Segura v4 funcionando ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: [
      'Autenticación JWT',
      'Procesamiento XML automático',
      'Asignación inteligente matrizadores',
      'Agrupación de documentos',
      'Sistema de auditoría',
      'Notificaciones WhatsApp',
      'Gestión completa por roles',
      'Sistema de alertas inteligentes'
    ]
  })
})

// Nota: liveness /health y readiness /ready se definen antes de middlewares

// Health check específico para verificar feature flags del frontend
// Útil para diagnosticar problemas de configuración en Railway
app.get('/api/health/feature-flags', (req, res) => {
  // Simular las variables de entorno que usa el frontend
  const featureFlags = {
    VITE_UI_ACTIVOS_ENTREGADOS: process.env.VITE_UI_ACTIVOS_ENTREGADOS || 'false',
    VITE_API_URL: process.env.VITE_API_URL || '/api',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };

  console.log('🔍 FEATURE FLAGS CHECK:', {
    timestamp: new Date().toISOString(),
    featureFlags,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection?.remoteAddress
  });

  res.json({
    status: 'ok',
    message: 'Feature flags check',
    timestamp: new Date().toISOString(),
    featureFlags,
    deployment: {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    }
  });
});

// RUTAS DE AUTENTICACIÓN (/api/auth/*)
app.use('/api/auth', authRoutes)

// RUTAS DE RECUPERACIÓN DE CONTRASEÑA (/api/password-recovery/*) - TEMPORALMENTE DESHABILITADAS
// app.use('/api/password-recovery', passwordRecoveryRoutes)

// RUTAS DE GESTIÓN DE PERFIL (/api/profile/*) - TEMPORALMENTE DESHABILITADAS
// app.use('/api/profile', profileRoutes)

// RUTAS DE DOCUMENTOS (/api/documents/*)
app.use('/api/documents', documentRoutes)

// RUTAS DE NOTIFICACIONES (/api/notifications/*)
app.use('/api/notifications', notificationsRoutes)

// RUTAS DE ADMINISTRACIÓN (/api/admin/*)
app.use('/api/admin', adminRoutes)

// RUTAS DE ARCHIVO (/api/archivo/*)
app.use('/api/archivo', archivoRoutes)

// RUTAS DE RECEPCIÓN (/api/reception/*)
app.use('/api/reception', receptionRoutes)

// RUTAS DE ALERTAS (/api/alertas/*)
app.use('/api/alertas', alertasRoutes)

// RUTAS DE CONCUERDOS (/api/concuerdos/*)
app.use('/api/concuerdos', concuerdoRoutes)

// RUTAS DE ESCRITURAS QR (/api/escrituras/* y /api/verify/*)
app.use('/api/escrituras', escriturasQRRoutes)
app.use('/api', escriturasQRRoutes) // Para la ruta pública /api/verify/:token

// RUTA PROXY PARA PDFs (/api/proxy-pdf)
app.use('/api', pdfProxyRoutes)

// ============================================================================
// SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos del frontend desde ../frontend/dist
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ============================================================================

// Catch-all handler: servir index.html para React Router (SPA)
app.get('*', (req, res) => {
  // Solo para requests que no sean API
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    // Para rutas API no encontradas, devolver 404 JSON
    res.status(404).json({ 
      success: false,
      error: 'Endpoint no encontrado',
      availableEndpoints: [
        'GET /api/health',
        'POST /api/auth/login',
        'GET /api/auth/verify',
        'GET /api/documents/my-documents',
        'POST /api/documents/upload-xml',
        'POST /api/documents/upload-xml-batch',
        'GET /api/admin/users (ADMIN only)',
        'POST /api/admin/users (ADMIN only)',
        'GET /api/archivo/dashboard (ARCHIVO only)',
        'GET /api/archivo/mis-documentos (ARCHIVO only)',
        'GET /api/reception/documentos/todos (RECEPCION only)',
        'POST /api/reception/documentos/:id/marcar-listo (RECEPCION only)'
      ]
    });
  }
});

// Manejo de errores 404 para APIs (fallback)
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/auth/verify', 
      'GET /api/documents/my-documents',
      'POST /api/documents/upload-xml',
      'POST /api/documents/upload-xml-batch',
      'GET /api/admin/users (ADMIN only)',
      'POST /api/admin/users (ADMIN only)',
      'GET /api/archivo/dashboard (ARCHIVO only)',
      'GET /api/archivo/mis-documentos (ARCHIVO only)',
      'GET /api/reception/documentos/todos (RECEPCION only)',
      'POST /api/reception/documentos/:id/marcar-listo (RECEPCION only)'
    ]
  })
})

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('💥 Error del servidor:', error)
  
  // Error de validación de Prisma
  if (error.code === 'P2002') {
    return res.status(400).json({ 
      success: false,
      error: 'Ya existe un registro con esos datos únicos' 
    })
  }
  
  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      success: false,
      error: 'Token JWT inválido' 
    })
  }
  
  // Error genérico
  res.status(500).json({ 
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  })
})

// ============================================================================
// INICIO DEL SERVIDOR
// ============================================================================

const server = app.listen(PORT, HOST, () => {
  console.log('🔥=====================================🔥')
  console.log(`🚀 NOTARÍA SEGURA API v4 - SERVIDOR INICIADO`)
  console.log(`📡 Puerto: ${PORT} en ${HOST}`)
  console.log(`🌐 Health check (liveness): http://localhost:${PORT}/health`)
  console.log(`🩺 Readiness: http://localhost:${PORT}/ready`)
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`)
  console.log(`📄 Document endpoints: http://localhost:${PORT}/api/documents/*`)
  console.log(`📂 Archivo endpoints: http://localhost:${PORT}/api/archivo/*`)
  console.log(`📞 Reception endpoints: http://localhost:${PORT}/api/reception/*`)
  console.log(`🏷️  Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log('🔥=====================================🔥')
  
  // Verificar conexión a Prisma en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 Backend completamente funcional con:')
    console.log('   ✅ Autenticación JWT')
    console.log('   ✅ Procesamiento XML automático')
    console.log('   ✅ Asignación inteligente')
    console.log('   ✅ Agrupación de documentos')
    console.log('   ✅ Sistema de auditoría')
    console.log('   ✅ Notificaciones WhatsApp')
  }

  // Iniciar watcher XML si está habilitado
  try {
    xmlWatcherService.start()
  } catch (e) {
    console.error('❌ No se pudo iniciar XML Watcher:', e)
  }

  // Intentar conexión a Redis si está configurado (fallback a memoria si falla)
  cache.connectRedisIfConfigured()
    .then((connected) => {
      if (connected) {
        console.log('⚡ Caché: conectado a Redis');
      } else {
        console.log('⚡ Caché: usando almacenamiento en memoria');
      }
    })
    .catch(() => console.log('⚠️ Caché: uso de memoria por defecto'))
})

// Chequeo de readiness: intentar query ligera a la base de datos
;(async function initReadiness() {
  try {
    console.log('[READY] Verificando conexión a base de datos...')
    await db.$queryRaw`SELECT 1`
    isReady = true
    console.log('[READY] Base de datos OK, servicio listo')
  } catch (e) {
    isReady = false
    console.error('[READY] Falla en verificación de base de datos:', e?.message || e)
    // No arrojamos excepción: el contenedor sigue vivo y /ready reporta 503 hasta estar OK
  }
})()

// ============================================================================
// SHUTDOWN HANDLERS PARA CIERRE ORDENADO
// ============================================================================

// Manejar SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\n🔄 Recibida señal SIGINT, cerrando servidor...')
  await gracefulShutdown()
})

// Manejar SIGTERM (terminación del proceso)
process.on('SIGTERM', async () => {
  console.log('\n🔄 Recibida señal SIGTERM, cerrando servidor...')
  await gracefulShutdown()
})

// Función de cierre ordenado
async function gracefulShutdown() {
  // Detener watcher primero
  try {
    await xmlWatcherService.stop()
  } catch (e) {
    console.warn('⚠️ Error deteniendo XML Watcher:', e)
  }
  console.log('📊 Cerrando conexión con base de datos...')
  await closePrismaClient()
  
  console.log('🛑 Cerrando servidor HTTP...')
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente')
    process.exit(0)
  })
  
  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('❌ Cierre forzado: timeout alcanzado')
    process.exit(1)
  }, 10000)
} 
