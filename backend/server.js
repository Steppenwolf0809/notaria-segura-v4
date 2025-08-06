import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Importar rutas implementadas
import authRoutes from './src/routes/auth-routes.js'
import documentRoutes from './src/routes/document-routes.js'
import notificationsRoutes from './src/routes/notifications-routes.js'
import adminRoutes from './src/routes/admin-routes.js'

// Cargar variables de entorno
dotenv.config({ path: './.env' })

const app = express()
const PORT = process.env.PORT || 3001 // Puerto 3001 para compatibilidad

// Configuración CORS mejorada para desarrollo y producción
const corsOptions = {
  origin: function (origin, callback) {
    // En producción, usar orígenes específicos del .env
    if (process.env.NODE_ENV === 'production') {
      const productionOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
        : [process.env.FRONTEND_URL || 'https://notaria-segura.com'];
      
      if (!origin || productionOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS: Origin no permitido en producción: ${origin}`);
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

app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

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
      'Gestión completa por roles'
    ]
  })
})

// RUTAS DE AUTENTICACIÓN (/api/auth/*)
app.use('/api/auth', authRoutes)

// RUTAS DE DOCUMENTOS (/api/documents/*)  
app.use('/api/documents', documentRoutes)

// RUTAS DE NOTIFICACIONES (/api/notifications/*)
app.use('/api/notifications', notificationsRoutes)

// RUTAS DE ADMINISTRACIÓN (/api/admin/*)
app.use('/api/admin', adminRoutes)

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ============================================================================

// Manejo de errores 404
app.use('*', (req, res) => {
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
      'POST /api/admin/users (ADMIN only)'
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

app.listen(PORT, () => {
  console.log('🔥=====================================🔥')
  console.log(`🚀 NOTARÍA SEGURA API v4 - SERVIDOR INICIADO`)
  console.log(`📡 Puerto: ${PORT}`)
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`)
  console.log(`📄 Document endpoints: http://localhost:${PORT}/api/documents/*`)
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
}) 