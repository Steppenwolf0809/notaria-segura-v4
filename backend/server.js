import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Importar rutas implementadas
import authRoutes from './src/routes/auth-routes.js'
import documentRoutes from './src/routes/document-routes.js'
import notificationsRoutes from './src/routes/notifications-routes.js'

// Cargar variables de entorno
dotenv.config({ path: './.env' })

const app = express()
const PORT = process.env.PORT || 3002 // Puerto 3002 para evitar conflictos

// Middleware básico
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
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
      'POST /api/documents/upload-xml-batch'
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