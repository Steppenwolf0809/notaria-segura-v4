# 🚀 GUÍA COMPLETA DE DEPLOY A RAILWAY - SISTEMA NOTARÍA SEGURA

## ✅ PREREQUISITOS COMPLETADOS

### Archivos de Configuración Creados:
- `backend/nixpacks.toml` - Configuración de build backend
- `frontend/nixpacks.toml` - Configuración de build frontend
- `backend/package.json` - Scripts optimizados para producción
- `prisma/schema.prisma` - Actualizado a PostgreSQL

## 📋 CHECKLIST COMPLETO DE DEPLOY

### **FASE 1: PREPARACIÓN DE RAILWAY**

#### 1.1 Crear Cuenta y Proyecto
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login a Railway
railway login
```

#### 1.2 Crear Proyecto Railway
1. Ve a [railway.app](https://railway.app)
2. Crear nuevo proyecto: "notaria-segura"
3. Selecciona "Deploy from GitHub repo" o "Empty Project"

### **FASE 2: CONFIGURAR BASE DE DATOS POSTGRESQL**

#### 2.1 Agregar PostgreSQL al Proyecto
1. En Railway dashboard: Add Service → Database → PostgreSQL
2. Esperar que se cree la instancia
3. Copiar la DATABASE_URL generada

#### 2.2 Configurar Variables de Entorno
En Railway Dashboard → Variables:

**VARIABLES CRÍTICAS BACKEND:**
```env
# Base de datos (auto-generada por Railway)
DATABASE_URL=postgresql://usuario:password@host:puerto/database

# Autenticación JWT
JWT_SECRET=tu_jwt_secret_super_seguro_minimo_32_caracteres

# Configuración del servidor
NODE_ENV=production
PORT=3001

# Twilio WhatsApp (CRÍTICO para notificaciones)
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+1234567890
WHATSAPP_ENABLED=true

# Configuración Notaría
NOTARIA_NOMBRE=NOTARÍA DECIMO OCTAVA DEL CANTÓN QUITO
NOTARIA_DIRECCION=Azuay E2-231 y Av Amazonas, Quito
NOTARIA_HORARIO=Lunes a Viernes 8:00-17:00
```

**VARIABLES FRONTEND:**
```env
NODE_ENV=production
VITE_API_URL=https://tu-backend-railway.up.railway.app/api
```

### **FASE 3: DEPLOY BACKEND**

#### 3.1 Deploy Backend
```bash
# En carpeta backend/
cd backend/

# Conectar con Railway
railway link

# Deploy inicial
railway up

# O mediante GitHub (recomendado)
# Conecta tu repo de GitHub en Railway dashboard
```

#### 3.2 Verificar Deploy Backend
1. Revisar logs: `railway logs`
2. Verificar que Prisma aplicó migraciones
3. Comprobar endpoints:
   - `https://tu-backend.up.railway.app/api/health` (crear si no existe)
   - `https://tu-backend.up.railway.app/api/auth/verify` (debería dar 401)

### **FASE 4: DEPLOY FRONTEND**

#### 4.1 Configurar Frontend para Producción
1. Crear nuevo servicio en Railway para frontend
2. Configurar variables de entorno
3. Deploy frontend

```bash
# En carpeta frontend/
cd ../frontend/

# Railway link al servicio frontend
railway link

# Deploy
railway up
```

### **FASE 5: CONFIGURACIÓN FINAL**

#### 5.1 Configurar CORS Backend
Verificar que en `server.js` el CORS esté configurado correctamente:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://tu-frontend.up.railway.app', // AGREGAR URL FRONTEND
  ],
  credentials: true
};
```

#### 5.2 Configurar Dominios Personalizados (Opcional)
1. En Railway dashboard → Settings → Networking
2. Agregar dominio personalizado si tienes uno

### **FASE 6: TESTING POST-DEPLOY**

## 🧪 CHECKLIST DE VERIFICACIÓN POST-DEPLOY

### **6.1 Tests Críticos Backend API**
```bash
# Test 1: Salud del servidor
curl https://tu-backend.up.railway.app/api/health

# Test 2: Base de datos conectada
curl https://tu-backend.up.railway.app/api/documents

# Test 3: Login funcional
curl -X POST https://tu-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"tu_password"}'
```

### **6.2 Tests Críticos Frontend**
1. ✅ **Carga la aplicación** - URL frontend abre correctamente
2. ✅ **Login funciona** - Puedes autenticarte
3. ✅ **Dashboard carga** - Cada rol ve su dashboard
4. ✅ **API calls funcionan** - Los servicios conectan con backend
5. ✅ **Drag & Drop Kanban** - Funciona el arrastre de documentos
6. ✅ **WhatsApp Notifications** - Se envían notificaciones (revisar logs)

### **6.3 Tests Específicos del Sistema Notarial**
1. **📄 Upload XML** - Subir documento XML funciona
2. **🏷️ Asignación** - Asignar documento a matrizador
3. **🔄 Estados** - Cambiar estados EN_PROCESO → LISTO → ENTREGADO
4. **📱 WhatsApp** - Notificaciones se envían al cambiar a LISTO
5. **🔗 Agrupación** - Agrupar documentos funciona
6. **📋 Entrega Grupal** - Entregar grupo completo
7. **📊 Dashboards** - Estadísticas se muestran correctamente

## 🚨 TROUBLESHOOTING COMÚN

### **Error: "Cannot connect to database"**
```bash
# Verificar DATABASE_URL
railway variables

# Ver logs de Prisma
railway logs --filter prisma

# Ejecutar migraciones manualmente
railway shell
npx prisma db deploy
```

### **Error: "CORS policy"**
- Verificar que la URL del frontend esté en corsOptions
- Redeploy backend después de cambios

### **Error: "Build failed"**
```bash
# Ver logs completos
railway logs

# Verificar nixpacks.toml
# Verificar package.json scripts
```

### **Error: "WhatsApp no funciona"**
```bash
# Verificar variables Twilio
railway variables | grep TWILIO

# Test WhatsApp manualmente
railway shell
node scripts/test-whatsapp.js
```

### **Error: "Prisma generate failed"**
- Verificar que `@prisma/client` esté en dependencies (no devDependencies)
- Verificar DATABASE_URL válida

## 📋 COMANDOS RAILWAY ÚTILES

```bash
# Ver estado del proyecto
railway status

# Ver logs en tiempo real
railway logs --tail

# Abrir shell en producción
railway shell

# Ver variables de entorno
railway variables

# Redeploy manual
railway up --detach

# Conectar a base de datos
railway connect postgres
```

## ✅ VERIFICACIÓN FINAL DE ÉXITO

### ✅ Backend Exitoso Si:
- [ ] Responde en URL Railway
- [ ] Base de datos conectada (no errores Prisma)
- [ ] Endpoints principales funcionan
- [ ] Variables de entorno configuradas
- [ ] Logs sin errores críticos

### ✅ Frontend Exitoso Si:
- [ ] Aplicación carga completamente
- [ ] Login funcional
- [ ] Conecta con backend sin CORS errors
- [ ] Todas las funcionalidades principales funcionan
- [ ] Notificaciones WhatsApp operativas

### ✅ Sistema Completo Funcionando Si:
- [ ] Flujo completo XML → Procesamiento → Notificación → Entrega funciona
- [ ] Todos los roles pueden usar sus dashboards
- [ ] Drag & drop kanban operativo
- [ ] Sistema de agrupación funcional
- [ ] WhatsApp notifications enviándose correctamente

## 🎯 URLs FINALES
- **Backend API**: `https://tu-backend-xxxxx.up.railway.app`
- **Frontend App**: `https://tu-frontend-xxxxx.up.railway.app`
- **Base de Datos**: Accesible via Railway dashboard

## 🔧 MANTENIMIENTO CONTINUO

### Monitoring Post-Deploy:
1. **Logs**: Revisar logs regularmente con `railway logs`
2. **Performance**: Monitorear uso de recursos en Railway dashboard
3. **Database**: Verificar crecimiento de BD y performance
4. **WhatsApp**: Monitorear envío de mensajes y errores Twilio
5. **Updates**: Deployar actualizaciones via GitHub integration

---

**📞 SOPORTE**: Si tienes problemas durante el deploy, revisa primero los logs con `railway logs` y verifica que todas las variables de entorno estén correctamente configuradas.