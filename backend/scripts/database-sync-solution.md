# 🔧 SOLUCIÓN PARA ERROR DE ENUM AGRUPADO

## 🚨 PROBLEMA DETECTADO
```
Error occurred during query execution: ConnectorError(ConnectorError { 
  user_facing_error: None, 
  kind: QueryError(PostgresError { 
    code: "22P02", 
    message: "invalid input value for enum \"DocumentStatus\": \"AGRUPADO\"", 
    severity: "ERROR" 
  })
})
```

**Causa**: La base de datos PostgreSQL no tiene el valor `AGRUPADO` en el enum `DocumentStatus`, pero el código de la aplicación intenta usarlo.

## 🛠️ SOLUCIONES DISPONIBLES

### **SOLUCIÓN 1: Railway Production (RECOMENDADA)**
Si esto es un deploy en Railway:

```bash
# 1. Conectar a Railway
railway login
railway link

# 2. Ejecutar script de sincronización
railway shell
cd backend && node scripts/fix-agrupado-enum.js

# 3. O forzar sincronización de schema
railway shell
cd backend && npx prisma db push --accept-data-loss
```

### **SOLUCIÓN 2: SQL Directo en Base de Datos**
Conectar directamente a PostgreSQL y ejecutar:

```sql
-- Agregar valor AGRUPADO al enum DocumentStatus
ALTER TYPE "DocumentStatus" ADD VALUE 'AGRUPADO';

-- Verificar que se agregó correctamente
SELECT enumlabel 
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'DocumentStatus'
ORDER BY e.enumsortorder;
```

### **SOLUCIÓN 3: Desarrollo Local**
Para desarrollo local con Docker:

```bash
# 1. Asegurar que PostgreSQL esté corriendo
docker-compose up -d postgres

# 2. Corregir puerto en .env (cambiar 5433 a 5432 si usa Docker)
# 3. Ejecutar sincronización
cd backend && npx prisma db push

# 4. O ejecutar script específico
cd backend && node scripts/fix-agrupado-enum.js
```

### **SOLUCIÓN 4: Reset Completo de Base de Datos (ÚLTIMA OPCIÓN)**
⚠️ **ATENCIÓN**: Esto eliminará todos los datos!

```bash
# Solo en desarrollo - NUNCA en producción
cd backend && npx prisma migrate reset
```

## 🎯 PASOS INMEDIATOS PARA RESOLVER

### **Paso 1: Identificar Entorno**
```bash
# Verificar si es Railway
echo $RAILWAY_ENVIRONMENT

# Verificar DATABASE_URL
echo $DATABASE_URL
```

### **Paso 2: Aplicar Solución Según Entorno**

**Si es Railway Production:**
```bash
railway shell
cd backend && npx prisma db push --accept-data-loss
```

**Si es desarrollo local:**
```bash
# Verificar/corregir DATABASE_URL en .env
# Luego ejecutar:
cd backend && npx prisma db push
```

### **Paso 3: Verificar Corrección**
```bash
# Ejecutar script de verificación
cd backend && node scripts/fix-agrupado-enum.js

# O probar operación de agrupación directamente
curl -X POST your-api-url/api/documents/bulk-status-change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "documentIds": ["doc-id"],
    "fromStatus": "EN_PROCESO",
    "toStatus": "AGRUPADO"
  }'
```

## 🔍 VERIFICACIONES POST-CORRECCIÓN

1. **Enum actualizado**: Verificar que AGRUPADO existe en la base de datos
2. **Bulk operations funcionan**: Probar cambios masivos de estado
3. **Agrupación funciona**: Probar creación de grupos de documentos
4. **Vista Lista funciona**: Verificar que ListView.jsx carga sin errores

## 📋 VALORES ESPERADOS EN ENUM

El enum `DocumentStatus` debe contener:
- `PENDIENTE`
- `EN_PROCESO`  
- `AGRUPADO` ← **Este es el que falta**
- `LISTO`
- `ENTREGADO`

## 🚀 PREVENCIÓN FUTURA

Para evitar este problema en el futuro:

1. **Usar migraciones**: Crear migraciones formales en lugar de `prisma db push`
2. **Testing de schema**: Verificar cambios de schema en staging antes de producción
3. **Backup antes de cambios**: Siempre hacer backup antes de modificar enums
4. **Monitoreo**: Agregar verificaciones de salud de base de datos

## 📞 CONTACTO

Si ninguna solución funciona:
1. Revisar logs de Railway con `railway logs`
2. Verificar conexión a base de datos
3. Considerar rollback a versión anterior si es crítico