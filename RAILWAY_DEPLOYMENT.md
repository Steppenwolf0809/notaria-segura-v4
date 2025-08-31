# Railway Deployment Guide - Notaría Segura

Este archivo documenta la configuración para el despliegue en Railway como un **servicio único** que sirve el frontend desde el backend.

## 📋 Configuración Actual

### Framework: **Vite** (React)
- ✅ Frontend construido con Vite
- ✅ Backend sirve estáticos desde `../frontend/dist`
- ✅ Variables de entorno: `VITE_*` para frontend
- ✅ Single Page App (SPA) routing configurado

### Estructura del Proyecto
```
notaria-segura/
├── frontend/          # React + Vite
├── backend/           # Express + Prisma
└── package.json       # Scripts Railway
```

## 🚀 Scripts Railway Configurados

### Build Pipeline (package.json raíz):
```json
{
  "build": "npm --prefix frontend ci && npm --prefix frontend run build && npm --prefix backend ci",
  "start": "node backend/server.js"
}
```

### Frontend Scripts (frontend/package.json):
```json
{
  "build": "vite build",
  "preview": "vite preview --host 0.0.0.0 --port $PORT"
}
```

## 🔧 Variables de Entorno para Railway

### Variables Requeridas en Railway:
```bash
# Base de datos
DATABASE_URL=postgresql://...

# Entorno
NODE_ENV=production
PORT=3000

# CORS y seguridad
RAILWAY_PUBLIC_DOMAIN=your-app.railway.app
ALLOWED_ORIGINS=https://your-app.railway.app

# JWT
JWT_SECRET=your-jwt-secret-here

# Features (según UX v1.2)
VITE_DOCS_MATRIZADOR_TABS=true
VITE_DOCS_ARCHIVO_TABS=true
VITE_DOCS_RECEPCION_GROUPED=true
VITE_DOCS_LAZY_DELIVERED=true
VITE_DOCS_WINDOWING=true
VITE_DOCS_SEARCH_SMART_SCOPE=true
VITE_DOCS_SEARCH_TOGGLE_RECEPCION=true

# WhatsApp (opcional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## 📦 Proceso de Deploy

### 1. Preparación Local
```bash
# Verificar que todo funciona
npm run build
npm start

# Verificar frontend compilado
ls frontend/dist/
```

### 2. Configuración Railway
1. Crear nuevo proyecto en Railway
2. Conectar repositorio GitHub
3. Configurar variables de entorno (ver arriba)
4. Railway ejecutará automáticamente:
   - `npm run build` (instala deps + compila frontend + backend)
   - `npm start` (inicia server.js que sirve todo)

### 3. Verificación Post-Deploy
- ✅ `https://your-app.railway.app/api/health` → API funcional
- ✅ `https://your-app.railway.app/` → Frontend cargado
- ✅ Login funcional
- ✅ Rutas SPA funcionan (refresh en `/documentos`)

## 🔄 Pasos de Re-deploy

### Deploy Automático (recomendado):
1. Push cambios a branch `main`
2. Railway detecta y redespliega automáticamente
3. Verificar `/api/health` post-deploy

### Deploy Manual desde CLI:
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login y deploy
railway login
railway link
railway deploy
```

### Deploy Manual desde Dashboard:
1. Ir a Railway dashboard
2. Seleccionar proyecto
3. Click "Deploy" en la pestaña de Deployments

## 🛠️ Troubleshooting

### Si el frontend no carga:
1. Verificar que `frontend/dist/` existe y tiene contenido
2. Comprobar que backend sirve archivos estáticos:
   ```js
   app.use(express.static(path.resolve(__dirname, "../frontend/dist")));
   ```
3. Verificar variables `VITE_*` en Railway

### Si la API no responde:
1. Verificar `DATABASE_URL` en Railway
2. Comprobar logs de Railway para errores de conexión
3. Verificar que Prisma migrations se ejecutan:
   ```bash
   npx prisma migrate deploy
   ```

### Si CORS falla:
1. Verificar `RAILWAY_PUBLIC_DOMAIN` y `ALLOWED_ORIGINS`
2. Comprobar que el backend permite el dominio de Railway

## 📊 Monitoreo

### URLs importantes:
- Health check: `https://your-app.railway.app/api/health`
- API docs: `https://your-app.railway.app/api/`
- Frontend: `https://your-app.railway.app/`

### Logs en Railway:
```bash
railway logs
railway logs --follow
```

## 🎯 Features UX v1.2 Implementadas

### Feature Flags Activadas:
- ✅ `VITE_DOCS_MATRIZADOR_TABS=true` - Tabs para Matrizador
- ✅ `VITE_DOCS_ARCHIVO_TABS=true` - Tabs para Archivo  
- ✅ `VITE_DOCS_RECEPCION_GROUPED=true` - Grupos para Recepción
- ✅ `VITE_DOCS_LAZY_DELIVERED=true` - Lazy load Entregados
- ✅ `VITE_DOCS_WINDOWING=true` - Scroll infinito
- ✅ `VITE_DOCS_SEARCH_SMART_SCOPE=true` - Búsqueda inteligente
- ✅ `VITE_DOCS_SEARCH_TOGGLE_RECEPCION=true` - Toggle Alt+A

### Funcionalidades:
- 🔍 SearchBar con atajo `/`
- 📑 Tabs por rol (Matrizador/Archivo)
- 📂 Grupos expandibles (Recepción)
- 🚀 Windowing + scroll infinito
- 📊 Telemetría TTFA/APM
- 💫 Comportamiento B (2-3s feedback)

---

**✅ Configuración completada para Railway deployment**
**🎯 Respeta UX v1.2: sidebar, paleta, tipografías preservadas**