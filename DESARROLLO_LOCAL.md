# 🔧 Guía de Desarrollo Local - Notaría Segura

Esta guía te permitirá trabajar en desarrollo local sin afectar el deploy de Railway.

## 🚀 Inicio Rápido

### 1. Configuración Inicial (Solo la primera vez)

```bash
# Instalar todas las dependencias
npm run setup:dev

# Crear archivo de variables de entorno
cp backend/.env.example backend/.env
```

### 2. Configurar Variables de Entorno

Edita `backend/.env` con tus valores:

```env
# Mínimo requerido para funcionar
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="tu-clave-secreta-de-al-menos-32-caracteres"
FRONTEND_URL="http://localhost:5173"
WHATSAPP_ENABLED="false"
```

### 3. Iniciar Desarrollo

**Opción A: Comando único (recomendado)**
```bash
npm run dev
```

**Opción B: Scripts separados**
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend  
npm run dev:frontend
```

**Opción C: Scripts de conveniencia**
```bash
# Windows
start-dev.bat

# Linux/Mac
./start-dev.sh
```

## 🌐 URLs de Desarrollo

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **Prisma Studio**: `npm run db:studio` (desde backend/)

## 📊 Base de Datos Local

### SQLite (Por defecto - Recomendado)
- **Archivo**: `backend/prisma/dev.db`
- **No requiere instalación adicional**
- **Perfect para desarrollo**

### PostgreSQL (Opcional)
Si prefieres PostgreSQL local:

```bash
# Instalar PostgreSQL
# Windows: Descargar desde postgresql.org
# Mac: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Crear base de datos
createdb notaria_dev

# Actualizar .env
DATABASE_URL="postgresql://usuario:password@localhost:5432/notaria_dev"
```

## 🔄 Comandos Útiles

### Base de Datos
```bash
cd backend

# Generar cliente Prisma
npm run db:generate

# Aplicar cambios de schema
npm run db:push

# Resetear y poblar con datos de prueba
npm run db:seed

# Abrir Prisma Studio
npm run db:studio
```

### Usuarios de Prueba
```bash
cd backend

# Crear usuarios reales del sistema
npm run seed:users

# Verificar usuarios creados
npm run verify:users
```

## 🔒 Seguridad en Desarrollo

### Variables Críticas
- **JWT_SECRET**: Genera uno único para desarrollo
- **DATABASE_URL**: Usa SQLite local
- **TWILIO_***: Opcional, puedes deshabilitarlo

### Archivo .env
- ✅ Está en `.gitignore` - no se sube a Git
- ✅ No afecta el deploy de Railway
- ✅ Cada desarrollador tiene su configuración

## 🚨 Solución de Problemas Comunes

### Error: "Variables de entorno faltantes"
```bash
# Verifica que exists backend/.env
ls backend/.env

# Si no existe, cópialo desde el ejemplo
cp backend/.env.example backend/.env
```

### Error: "Puerto en uso"
```bash
# Cambiar puerto en backend/.env
PORT=3002

# O matar proceso en puerto 3001
# Windows: netstat -ano | findstr :3001
# Mac/Linux: lsof -ti:3001 | xargs kill
```

### Error: "Base de datos no conecta"
```bash
cd backend

# Regenerar base de datos
rm prisma/dev.db
npm run db:push
npm run db:seed
```

### Frontend no conecta con Backend
- Verifica que backend esté en puerto 3001
- Verifica `FRONTEND_URL` en `.env`
- Revisa CORS en configuración

## 🔄 Workflow de Desarrollo

### 1. Cambios en Backend
```bash
# Los cambios se aplican automáticamente con nodemon
# No necesitas reiniciar manualmente
```

### 2. Cambios en Frontend
```bash
# Hot reload automático con Vite
# Los cambios se ven inmediatamente
```

### 3. Cambios en Base de Datos
```bash
cd backend

# Editar prisma/schema.prisma
# Aplicar cambios
npm run db:push

# Opcional: Regenerar datos
npm run db:seed
```

## Watcher de XML (standalone)

- El watcher que sube XML automáticamente desde el PC de CAJA es un servicio externo ubicado en `xml-watcher-service/`.
- La API expone los endpoints `POST /api/documents/upload-xml` y `POST /api/documents/upload-xml-batch` que el watcher consume.
- Se removieron del backend módulos duplicados del watcher para evitar confusión.
- Para usarlo en local o producción de escritorio:
  - Configura `xml-watcher-service/config.json` con la URL de la API y credenciales de un usuario `CAJA`.
  - Construye/ejecuta según el README en `xml-watcher-service/`.

## 🚀 Deploy vs Desarrollo

### Desarrollo Local
- **Base de datos**: SQLite (`dev.db`)
- **Puerto**: 3001 (configurable)
- **Variables**: `backend/.env`
- **CORS**: Permite localhost

### Railway (Producción)
- **Base de datos**: PostgreSQL automático
- **Puerto**: Asignado por Railway
- **Variables**: Panel de Railway
- **CORS**: Dominio de producción

**✅ Ambos entornos son completamente independientes**

## 📝 Notas Importantes

1. **Conservador antes que innovador**: El sistema funciona, mantén la estabilidad
2. **Nunca subas .env**: Está en `.gitignore` por seguridad
3. **Railway no se afecta**: Usa su propia configuración
4. **SQLite es suficiente**: Para desarrollo local funciona perfecto
5. **WhatsApp opcional**: Puedes deshabilitarlo en desarrollo

## 🆘 ¿Necesitas ayuda?

Si tienes problemas:

1. Verifica que tengas `backend/.env` configurado
2. Revisa que los puertos no estén ocupados
3. Asegúrate de tener las dependencias instaladas
4. Consulta los logs en la terminal

¡El desarrollo local está configurado para ser simple y estable! 🎉
