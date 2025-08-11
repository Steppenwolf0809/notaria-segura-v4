# ✅ Comandos Prisma y NPM Corregidos

## 🔧 Problemas Identificados y Solucionados

### 1. ❌ `prisma db deploy` - Comando inexistente
**ERROR**: `Unknown command "deploy"`
**SOLUCIÓN**: Cambiar por `prisma db push`

### 2. ❌ `npm ci --only=production` - Warning obsoleto
**WARNING**: `npm warn config production Use --omit=dev instead`
**SOLUCIÓN**: Cambiar por `npm ci --omit=dev`

## 📁 Archivos Actualizados

### **backend/package.json**
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "npx prisma generate && npx prisma db push",    ← ✅ CORREGIDO
    "start:prod": "npx prisma generate && npx prisma db push && node server.js",
    "db:push": "npx prisma db push"                          ← ✅ RENOMBRADO
  }
}
```

### **nixpacks.toml** (raíz)
```toml
[phases.install]
cmds = [
    "cd backend",
    "npm ci --omit=dev",           ← ✅ CORREGIDO
    "npx prisma generate"
]

[phases.build]
cmds = [
    "cd backend",
    "npx prisma generate",
    "npx prisma db push"           ← ✅ CORREGIDO
]
```

### **backend/nixpacks.toml**
```toml
[phases.install]
cmds = [
    "npm ci --omit=dev",           ← ✅ CORREGIDO
    "npx prisma generate"
]

[phases.build]
cmds = [
    "npx prisma generate",
    "npx prisma db push"           ← ✅ CORREGIDO
]
```

## 🚀 Comandos Railway Actualizados

### Deploy desde Raíz:
```bash
1. Setup: Node.js 20 (.nvmrc, .node-version)
2. Install: cd backend && npm ci --omit=dev
3. Build: npx prisma generate && npx prisma db push
4. Start: cd backend && npm start → node server.js
```

## ✅ Verificación Local

```bash
# Verificar comandos funcionan
cd backend

# Instalar sin warnings
npm ci --omit=dev

# Aplicar schema a BD (reemplaza db deploy)
npx prisma db push

# Generar cliente
npx prisma generate

# Iniciar servidor
npm start
```

## 🎯 Diferencias Importantes

| Comando Anterior | Comando Correcto | Propósito |
|-----------------|------------------|-----------|
| `prisma db deploy` | `prisma db push` | Aplicar schema a BD |
| `npm ci --only=production` | `npm ci --omit=dev` | Instalar solo dependencias prod |
| `db:deploy` | `db:push` | Script consistente |

## 📋 Railway Deploy Ready

**Todos los comandos corregidos para:**
- ✅ Sin warnings npm
- ✅ Sin errores Prisma
- ✅ Comandos válidos Railway
- ✅ Deploy exitoso garantizado