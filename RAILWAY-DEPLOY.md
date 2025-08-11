# 🚂 Configuración Railway - Deploy Optimizado

## ✅ Configuración Completada

### 📁 Archivos de Configuración Railway
- ✅ **nixpacks.toml**: Node.js 20, comandos build/start optimizados
- ✅ **.nvmrc**: Especifica Node.js 20 explícitamente  
- ✅ **.node-version**: Alternativa para especificar versión
- ✅ **package.json**: Scripts `start` y `build` configurados
- ✅ **setup-production-data.js**: Población automática primera instalación

### 🔧 Scripts Configurados

```json
{
  "start": "node server.js",              // ✅ Comando start encontrado
  "build": "npx prisma generate && npx prisma db deploy",  // ✅ Build con Prisma
  "postbuild": "node prisma/seed.js"     // ✅ Población automática
}
```

### 🛠️ Configuración nixpacks.toml

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm-9_x", "openssl"]  # ✅ Node.js 20 específico

[phases.install]
cmds = [
    "npm ci --only=production",
    "npx prisma generate"
]

[phases.build] 
cmds = [
    "npx prisma generate",
    "npx prisma db deploy"
]

[start]
cmd = "npm start"  # ✅ Usa el script start de package.json

[variables]
NODE_ENV = "production"
```

## 🚀 Proceso de Deploy

### 1. Variables de Entorno Railway
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=${{ Postgres.DATABASE_URL }}
JWT_SECRET=337de96a5eb7be9ef0521265b42ba86abcdef123456789012345678901234567890
WHATSAPP_ENABLED=true
TWILIO_ACCOUNT_SID=ACcd75f5905615f92fb0d564627caf8fa7
TWILIO_AUTH_TOKEN=b7c842c958d32f59026d6d24f1b19be4
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 2. Flujo de Deploy Railway
```bash
1. Setup: Instala Node.js 20 + npm + openssl
2. Install: npm ci --only=production + prisma generate  
3. Build: prisma generate + prisma db deploy
4. PostBuild: Poblado automático usuarios (si BD vacía)
5. Start: npm start → node server.js
```

### 3. Verificación Deploy
- ✅ **Health Check**: `GET /api/health`
- ✅ **Database**: Conectividad PostgreSQL automática
- ✅ **Users**: Población automática primera vez
- ✅ **WhatsApp**: Configuración Twilio ready

## 📋 Usuarios del Sistema (Población Automática)

| Email | Rol | Nombre |
|-------|-----|--------|
| admin@notaria.com | ADMIN | Jose Luis Zapata |
| cindy.pazmino@notaria.com | CAJA | Cindy Pazmiño |
| mayra.corella@notaria.com | MATRIZADOR | Mayra Corella |
| karolrecepcion@notaria.com | RECEPCION | Karol Velastegui |
| maria.diaz@notaria.com | ARCHIVO | Maria Diaz |

**Contraseña temporal**: `Notaria123.`

## 🔍 Troubleshooting

### Error: "Command 'start' not found"
- ✅ **SOLUCIONADO**: Script start existe en package.json
- ✅ **SOLUCIONADO**: nixpacks.toml usa `npm start`

### Error: Node.js 18 instead of 20
- ✅ **SOLUCIONADO**: nixpacks.toml especifica `nodejs_20`
- ✅ **SOLUCIONADO**: .nvmrc y .node-version configurados

### Error: Prisma deployment failures
- ✅ **SOLUCIONADO**: Comandos build usan `npx prisma`
- ✅ **SOLUCIONADO**: Población automática con verificación

## 🎯 Deploy Commands Railway

```bash
# Conectar repositorio
railway link

# Deploy desde backend/
railway up --service backend

# Verificar logs
railway logs

# Verificar variables
railway variables
```

## ✨ Funcionalidades Ready

- 🔐 **Autenticación JWT** completa
- 👥 **Usuarios reales** poblados automáticamente  
- 📱 **WhatsApp** configurado con Twilio
- 📊 **Base de datos** PostgreSQL Railway
- 🔄 **Health checks** implementados
- 📝 **Logging** configurado para producción

Sistema completamente funcional y listo para uso inmediato tras el deploy.