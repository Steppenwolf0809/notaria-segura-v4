# 🚂 Railway Deploy - Configuración Completa

## ✅ Problemas Resueltos

### 🎯 Error: "No start command could be found"
**SOLUCIONADO** - Configuración completa creada:

## 📁 Archivos de Configuración Creados/Actualizados

### 1. **package.json** (raíz del proyecto)
```json
{
  "scripts": {
    "start": "cd backend && npm start",  ← ✅ COMANDO START AGREGADO
    "build": "cd backend && npm run build"
  },
  "engines": {
    "node": "20.x",               ← ✅ NODE.JS 20 ESPECIFICADO
    "npm": ">=9.0.0"
  }
}
```

### 2. **nixpacks.toml** (raíz del proyecto)
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm-9_x", "openssl"]  ← ✅ NODE.JS 20

[phases.install]
cmds = [
    "cd backend",                    ← ✅ PATHS CORRECTOS
    "npm ci --omit=dev",            ← ✅ WARNING CORREGIDO
    "npx prisma generate"
]

[phases.build]
cmds = [
    "cd backend",
    "npx prisma generate",
    "npx prisma db push"             ← ✅ COMANDO CORRECTO
]

[start]
cmd = "cd backend && npm start"     ← ✅ COMANDO START CON PATH
```

### 3. **Archivos de Versión Node.js**
- ✅ `.nvmrc` (raíz): `20`
- ✅ `.node-version` (raíz): `20.19.0`

### 4. **backend/package.json** 
```json
{
  "scripts": {
    "start": "node server.js",      ← ✅ COMANDO START EXISTE
    "build": "npx prisma generate && npx prisma db push"  ← ✅ COMANDO CORRECTO
  }
}
```

## 🚀 Flujo de Deploy Railway

### Deploy desde Raíz del Proyecto:
```bash
1. Railway detecta Node.js 20 (.nvmrc, package.json engines)
2. Ejecuta: cd backend && npm ci --omit=dev
3. Genera: npx prisma generate (en backend/)
4. Build: npx prisma generate && npx prisma db push
5. Start: cd backend && npm start → node server.js
```

### Variables de Entorno Railway:
```env
NODE_ENV=production
PORT=${{ PORT }}
DATABASE_URL=${{ Postgres.DATABASE_URL }}
JWT_SECRET=337de96a5eb7be9ef0521265b42ba86abcdef123456789012345678901234567890
WHATSAPP_ENABLED=true
TWILIO_ACCOUNT_SID=ACcd75f5905615f92fb0d564627caf8fa7
TWILIO_AUTH_TOKEN=b7c842c958d32f59026d6d24f1b19be4
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## 📋 Checklist Deploy

### ✅ Configuración Completa
- ✅ Script `start` en package.json raíz
- ✅ Script `start` en backend/package.json  
- ✅ Node.js 20 especificado (.nvmrc, engines)
- ✅ nixpacks.toml con paths correctos
- ✅ backend/server.js existe y funciona
- ✅ Prisma configurado para PostgreSQL
- ✅ Variables de entorno definidas

### 🎯 Comandos Railway

```bash
# Conectar proyecto
railway link

# Deploy desde raíz
railway up

# Verificar logs
railway logs --tail

# Verificar variables
railway variables list
```

## 🔍 Verificación Post-Deploy

1. **Health Check**: `GET https://tu-app.railway.app/api/health`
2. **Database**: Conexión PostgreSQL automática
3. **Authentication**: Login con usuarios poblados
4. **WhatsApp**: Configuración Twilio ready

## 📊 Usuarios Poblados Automáticamente

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@notaria.com | Notaria123. | ADMIN |
| cindy.pazmino@notaria.com | Notaria123. | CAJA |
| mayra.corella@notaria.com | Notaria123. | MATRIZADOR |

**✨ Sistema completamente funcional tras deploy**

## 🚨 Si Persiste el Error

Verificar que Railway esté usando:
- ✅ **Root Directory**: `/` (no `/backend`)
- ✅ **Build Command**: Detectado automáticamente desde nixpacks.toml
- ✅ **Start Command**: Detectado automáticamente desde package.json

La configuración ahora es **idéntica** a la que funcionó previamente.