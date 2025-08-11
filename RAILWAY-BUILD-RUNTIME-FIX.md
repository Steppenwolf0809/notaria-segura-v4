# 🚂 Railway - Separación Build/Runtime CORREGIDA

## ❌ Problema Identificado
**ERROR**: `npx prisma db push` en fase de build sin acceso a DATABASE_URL

## ✅ Solución Aplicada
**Separar build (sin DB) de runtime (con DB)**

## 📁 Configuración Corregida

### **nixpacks.toml** (raíz del proyecto)
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm-9_x", "openssl"]

[phases.install]
cmds = [
    "cd backend",
    "npm ci --omit=dev",
    "npx prisma generate"
]

[phases.build]                    ← ✅ SIN DATABASE_URL
cmds = [
    "cd backend",
    "npx prisma generate"          ← ✅ Solo generar cliente
]

[start]                           ← ✅ CON DATABASE_URL
cmd = "cd backend && npm start"   ← ✅ Aquí se conecta a DB

[variables]
NODE_ENV = "production"
```

### **backend/package.json**
```json
{
  "scripts": {
    "start": "npx prisma db push && node server.js",  ← ✅ DB PUSH EN RUNTIME
    "build": "npx prisma generate",                   ← ✅ Solo generar en build
    "start:prod": "npx prisma generate && npx prisma db push && node server.js"
  }
}
```

## 🚀 Flujo de Deploy Corregido

### **BUILD PHASE** (Sin acceso a DATABASE_URL)
```bash
1. Setup: Install Node.js 20 + npm + openssl
2. Install: cd backend && npm ci --omit=dev
3. Generate: npx prisma generate (crear cliente)
4. Build: npx prisma generate (solo cliente, sin DB)
```

### **RUNTIME PHASE** (Con acceso a DATABASE_URL)
```bash
1. Start: cd backend && npm start
2. DB Push: npx prisma db push (aplicar schema)
3. Server: node server.js (iniciar aplicación)
```

## 📋 Separación de Responsabilidades

| Fase | Acceso DB | Comandos Permitidos |
|------|-----------|-------------------|
| **BUILD** | ❌ NO | `prisma generate`, `npm install` |
| **RUNTIME** | ✅ SÍ | `prisma db push`, `node server.js` |

## ✅ Ventajas de Esta Configuración

1. **Build Rápido**: Sin conexión DB innecesaria
2. **Runtime Seguro**: Migraciones al iniciar
3. **Error-Free**: No falla por DATABASE_URL faltante
4. **Railway Compatible**: Sigue el patrón estándar

## 🎯 Comandos Verificados

```bash
# Build (sin DATABASE_URL) - ✅ FUNCIONA
npx prisma generate

# Runtime (con DATABASE_URL) - ✅ FUNCIONA  
npx prisma db push && node server.js
```

## 🔍 Logs Esperados Railway

```bash
BUILD:
✅ npm ci --omit=dev
✅ npx prisma generate
✅ Build completed successfully

RUNTIME:
✅ Starting application...
✅ npx prisma db push (applying schema)
✅ Database synchronized
✅ Server listening on port 3001
```

**Deploy ahora funcionará sin errores de DATABASE_URL durante build.**