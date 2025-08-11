# 🔧 Configuración PostgreSQL - Notaría Segura

## ✅ Estado Actual

La configuración ya está preparada para PostgreSQL:
- ✅ **Schema Prisma**: Configurado para PostgreSQL (`backend/prisma/schema.prisma`)  
- ✅ **Variables de Entorno**: DATABASE_URL configurada (`backend/.env`)
- ✅ **Migraciones**: Limpiadas para evitar conflictos
- ✅ **Scripts**: Disponibles en package.json

## 🚀 Pasos para Completar la Configuración

### 1. Instalar/Iniciar PostgreSQL

**Opción A - Docker (Recomendado)**
```bash
# Desde el directorio raíz del proyecto
docker-compose up -d postgres
```

**Opción B - Windows** 
```cmd
# Descargar e instalar desde https://www.postgresql.org/download/windows/
# Luego crear la base de datos:
psql -U postgres -c "CREATE DATABASE notaria_segura;"
```

**Opción C - Ubuntu/WSL2**
```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE DATABASE notaria_segura;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### 2. Configurar Base de Datos

```bash
cd backend

# Crear esquema en PostgreSQL
npx prisma db push --force-reset

# Generar cliente Prisma
npx prisma generate

# Poblar con usuarios de la notaría  
npm run db:seed
```

### 3. Verificar Configuración

```bash
# Verificar conexión
npx prisma studio

# Ejecutar servidor
npm run dev
```

## 📊 Usuarios del Sistema

Una vez poblada, la base de datos tendrá estos usuarios:

| Email | Contraseña | Rol | Nombre |
|-------|------------|-----|--------|
| admin@notaria.com | Notaria123. | ADMIN | Jose Luis Zapata |
| cindy.pazmino@notaria.com | Notaria123. | CAJA | Cindy Pazmiño |
| mayra.corella@notaria.com | Notaria123. | MATRIZADOR | Mayra Corella |
| karolrecepcion@notaria.com | Notaria123. | RECEPCION | Karol Velastegui |
| maria.diaz@notaria.com | Notaria123. | ARCHIVO | Maria Diaz |

## 🔧 Scripts Disponibles

```bash
# Base de datos
npm run db:generate    # Generar cliente Prisma
npm run db:migrate     # Crear migraciones
npm run db:deploy      # Aplicar migraciones
npm run db:studio      # Abrir Prisma Studio
npm run db:seed        # Poblar datos iniciales

# Servidor
npm run dev            # Desarrollo
npm start              # Producción
```

## 🚨 Resolución de Problemas

**Error P1001: Can't reach database server**
- Verificar que PostgreSQL esté corriendo
- Verificar puerto 5432 disponible  
- Para WSL2, puede necesitar IP del host Windows

**Docker no disponible**
- Habilitar WSL2 integration en Docker Desktop
- O instalar PostgreSQL nativo

**Errores de migración**
- Las migraciones se limpiaron, usar `db push` inicialmente
- Luego `db migrate` para cambios incrementales

## 🎯 Próximos Pasos

1. Completar configuración PostgreSQL
2. Ejecutar poblado de datos
3. Iniciar servidor de desarrollo
4. Probar login con usuarios del sistema
5. Deploy a Railway cuando esté listo