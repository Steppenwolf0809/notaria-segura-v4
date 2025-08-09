# 🚄 COMANDOS RAILWAY ESENCIALES

## 🔧 SETUP INICIAL

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login a Railway
railway login

# Crear proyecto nuevo
railway new

# O conectar proyecto existente
railway link [project-id]
```

## 📋 COMANDOS DE DEPLOY

```bash
# Deploy desde carpeta actual
railway up

# Deploy con detach (no esperar)
railway up --detach

# Deploy específico
railway deploy

# Ver estado del deploy
railway status
```

## 🔍 MONITOREO Y LOGS

```bash
# Ver logs en tiempo real
railway logs --tail

# Ver logs específicos
railway logs --service backend

# Ver logs con filtro
railway logs --filter "ERROR"

# Ver últimas 100 líneas
railway logs --lines 100
```

## ⚙️ GESTIÓN DE VARIABLES

```bash
# Ver todas las variables
railway variables

# Establecer variable
railway variables set JWT_SECRET=mi_secreto_super_seguro

# Establecer múltiples variables
railway variables set NODE_ENV=production PORT=3001

# Eliminar variable
railway variables delete VARIABLE_NAME
```

## 🗄️ BASE DE DATOS

```bash
# Conectar a PostgreSQL
railway connect postgres

# Ejecutar comandos en el contenedor
railway shell

# Dentro del shell - comandos útiles:
npx prisma generate
npx prisma db deploy
npx prisma db push
npx prisma studio
```

## 🔧 DEBUGGING

```bash
# Información del proyecto
railway info

# Ver servicios
railway list

# Abrir en browser
railway open

# Ver métricas
railway metrics

# Reiniciar servicio
railway restart
```

## 🌐 NETWORKING

```bash
# Ver dominios
railway domain

# Agregar dominio personalizado (vía CLI)
railway domain add tu-dominio.com

# Ver configuración de red
railway network info
```

## 📦 GESTIÓN DE SERVICIOS

```bash
# Listar servicios del proyecto
railway service list

# Crear nuevo servicio
railway service create

# Eliminar servicio
railway service delete [service-name]

# Cambiar a otro servicio
railway service switch [service-name]
```

## 🚨 COMANDOS DE EMERGENCIA

```bash
# Rollback al deploy anterior
railway rollback

# Parar servicio
railway service stop

# Iniciar servicio
railway service start

# Ver configuración completa
railway config
```

## 📊 COMANDOS DE VERIFICACIÓN POST-DEPLOY

```bash
# Verificar backend funcionando
curl $(railway url)/api/health

# Ver URLs del proyecto
railway url

# Test básico de conectividad
curl -I $(railway url)
```

## 🔄 FLUJO TÍPICO DE DEPLOY

```bash
# 1. Preparar el código
git add .
git commit -m "Ready for Railway deploy"

# 2. Deploy backend
cd backend/
railway link [backend-service-id]
railway up

# 3. Verificar backend
railway logs --tail
curl $(railway url)/api/health

# 4. Deploy frontend
cd ../frontend/
railway link [frontend-service-id]
railway variables set VITE_API_URL=https://tu-backend.up.railway.app/api
railway up

# 5. Verificar sistema completo
node ../scripts/verify-production.js $(railway url --service backend)
```

## 🎯 VARIABLES DE ENTORNO CRÍTICAS

### Backend:
```bash
railway variables set DATABASE_URL=postgresql://... # Auto-generada
railway variables set JWT_SECRET=tu_secreto_seguro_32_caracteres
railway variables set NODE_ENV=production
railway variables set TWILIO_ACCOUNT_SID=AC...
railway variables set TWILIO_AUTH_TOKEN=...
railway variables set TWILIO_PHONE_NUMBER=whatsapp:+...
railway variables set WHATSAPP_ENABLED=true
railway variables set ALLOWED_ORIGINS=https://tu-frontend.up.railway.app
```

### Frontend:
```bash
railway variables set NODE_ENV=production
railway variables set VITE_API_URL=https://tu-backend.up.railway.app/api
```

## 🚨 TROUBLESHOOTING COMÚN

```bash
# Build falló
railway logs --service [service] | grep -i error

# Base de datos no conecta
railway connect postgres  # Test conexión
railway shell
npx prisma db deploy  # Re-aplicar migraciones

# CORS errors
railway variables set ALLOWED_ORIGINS=https://nueva-url.com

# Variables no se aplicaron
railway restart  # Reiniciar después de cambiar variables

# Deploy atascado
railway up --detach  # Deploy sin esperar

# Ver uso de recursos
railway metrics

# Espacio insuficiente
railway info  # Ver límites actuales
```

## 📖 RECURSOS ÚTILES

- **Dashboard**: https://railway.app/dashboard
- **Docs**: https://docs.railway.app/
- **Status**: https://status.railway.app/
- **Community**: https://discord.gg/railway