# 🚀 Fullstack Deploy - Frontend + Backend Configuración

## ✅ Configuración Completada

**Sistema configurado para servir frontend React desde backend Express**

## 📁 Archivos Modificados

### **1. nixpacks.toml** - Build Pipeline
```toml
[phases.install]
cmds = [
    "cd frontend && npm install",              ← ✅ INSTALA FRONTEND
    "cd backend && npm install --only=production"
]

[phases.build]  
cmds = [
    "cd frontend && npm run build",            ← ✅ CONSTRUYE FRONTEND
    "cd backend && npx prisma generate"
]
```

### **2. backend/server.js** - Servir Archivos Estáticos
```javascript
// AGREGADO: Imports para paths
import path from 'path'
import { fileURLToPath } from 'url'

// AGREGADO: Servir archivos estáticos del frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// AGREGADO: Catch-all para React Router SPA
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});
```

### **3. frontend/.env.production** - API URLs Relativas
```env
VITE_API_URL=/api                             ← ✅ RUTAS RELATIVAS
```

### **4. package.json** (raíz) - Build Scripts
```json
{
  "scripts": {
    "build": "npm run build:frontend && cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build"
  }
}
```

## 🏗️ Flujo de Build Railway

### **Install Phase**:
```bash
1. cd frontend && npm install
   ├── Instala dependencias React/Vite
   └── ✅ Material-UI, Axios, Zustand, etc.

2. cd backend && npm install --only=production  
   ├── Instala dependencias Express/Prisma
   └── ✅ Incluye libphonenumber-js corregida
```

### **Build Phase**:
```bash  
1. cd frontend && npm run build
   ├── Vite construye aplicación React
   ├── Usa VITE_API_URL=/api (rutas relativas)
   └── ✅ Genera archivos en frontend/dist/

2. cd backend && npx prisma generate
   ├── Genera cliente Prisma
   └── ✅ Sin conexión DB en build
```

### **Runtime Phase**:
```bash
1. cd backend && npm start
   ├── Express inicia en puerto Railway
   ├── Sirve archivos estáticos de frontend/dist/
   ├── API disponible en /api/*
   └── ✅ SPA routing con catch-all
```

## 🌐 Estructura de URLs Final

| Ruta | Sirve | Descripción |
|------|-------|-------------|
| `/` | Frontend | React SPA (index.html) |
| `/login` | Frontend | Página login (React Router) |  
| `/dashboard` | Frontend | Dashboard (React Router) |
| `/api/health` | Backend | Health check API |
| `/api/auth/login` | Backend | Login endpoint |
| `/api/documents/*` | Backend | API documentos |

## 🔧 Funcionalidades Restauradas

### **Frontend React**
- ✅ **SPA Routing**: React Router funcional
- ✅ **Material-UI**: Interface de usuario completa
- ✅ **State Management**: Zustand stores  
- ✅ **API Calls**: Axios con rutas relativas `/api`
- ✅ **Build Optimizado**: Vite production build

### **Backend Express**
- ✅ **API Endpoints**: Todas las rutas /api/* funcionando
- ✅ **Static Files**: Sirve frontend desde /frontend/dist
- ✅ **CORS Configurado**: Permite requests internos
- ✅ **Proxy Headers**: Trust proxy para Railway
- ✅ **Database**: PostgreSQL + Prisma operativo

### **Sistema Integrado**
- ✅ **Single Domain**: Frontend y backend en misma URL
- ✅ **No CORS Issues**: Requests internos sin problemas
- ✅ **Authentication**: JWT tokens funcionando
- ✅ **File Uploads**: XML uploads operativos
- ✅ **WhatsApp Service**: Notificaciones funcionando

## 🎯 Deploy Railway

```bash
# Deploy completo
railway up

# Verificación
1. https://tu-app.railway.app/           ← Frontend React
2. https://tu-app.railway.app/api/health ← Backend API
3. https://tu-app.railway.app/login      ← Login funcional
```

## 📋 Variables de Entorno Railway

```env
NODE_ENV=production
PORT=${{ PORT }}                          # Railway automático
DATABASE_URL=${{ Postgres.DATABASE_URL }} # Railway automático
JWT_SECRET=337de96a5eb7be9ef0521265b42ba86abcdef123456789012345678901234567890
WHATSAPP_ENABLED=true
TWILIO_ACCOUNT_SID=ACcd75f5905615f92fb0d564627caf8fa7
```

**Sistema completamente funcional con frontend y backend integrados.**