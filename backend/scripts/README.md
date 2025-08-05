# Scripts de Mantenimiento de Base de Datos

Scripts para gestionar la base de datos de Notaría Segura de manera segura y conservadora.

## 🔍 check-database-status.js

**Propósito**: Verificar el estado actual de la base de datos sin hacer cambios.

**Uso**:
```bash
cd backend
node scripts/check-database-status.js
```

**Funcionalidades**:
- ✅ Muestra estadísticas de todas las tablas
- ✅ Lista usuarios y sus roles
- ✅ Agrupa documentos por estado y tipo
- ✅ Muestra últimos eventos de auditoría
- ✅ Proporciona diagnóstico general
- ✅ **NO MODIFICA** ningún dato

## 🧹 reset-documents.js

**Propósito**: Limpiar documentos y notificaciones manteniendo usuarios intactos.

**Uso**:
```bash
cd backend
node scripts/reset-documents.js
```

**Funcionalidades**:
- ⚠️  Elimina TODOS los documentos
- ⚠️  Elimina TODOS los grupos de documentos
- ⚠️  Elimina TODOS los eventos de auditoría
- ⚠️  Elimina datos de prueba
- ✅ **CONSERVA** todos los usuarios
- ✅ Solicita confirmación doble
- ✅ Muestra estado antes y después
- ✅ Ejecuta en transacción segura

**Seguridad**:
- Requiere confirmación manual ("CONFIRMAR" + "SI")
- Muestra estadísticas antes y después
- Usa transacciones para evitar estados inconsistentes
- Conserva integridad de usuarios

## 📝 reset-documents.sql

**Propósito**: Script SQL directo para limpieza manual.

**Uso**:
- Solo para administradores de base de datos
- Ejecutar con herramientas SQL directas
- **USAR CON EXTREMA PRECAUCIÓN**

## 🚀 Flujo Recomendado para Reset

1. **Verificar estado actual**:
   ```bash
   node scripts/check-database-status.js
   ```

2. **Realizar limpieza**:
   ```bash
   node scripts/reset-documents.js
   ```

3. **Confirmar resultado**:
   ```bash
   node scripts/check-database-status.js
   ```

## ⚠️ Precauciones Importantes

### ANTES de ejecutar reset-documents.js:

1. **Confirmar entorno**: Asegúrate de estar en desarrollo/testing
2. **Backup**: Considera hacer backup si tienes datos importantes
3. **Usuarios**: Los usuarios NO se eliminan, pero sus documentos asociados SÍ
4. **Confirmación**: El script requiere confirmación manual doble

### Qué se ELIMINA:
- ❌ Todos los documentos (`documents`)
- ❌ Todos los grupos (`DocumentGroup`)
- ❌ Todos los eventos de auditoría (`document_events`)
- ❌ Datos de prueba (`test_connection`)
- ❌ Notificaciones simuladas (frontend corregido)

### Qué se CONSERVA:
- ✅ Todos los usuarios (`users`)
- ✅ Estructura de la base de datos
- ✅ Configuraciones del sistema
- ✅ Migraciones aplicadas

## 📋 Estados Post-Reset

Después de ejecutar la limpieza exitosamente:

- Base de datos lista para documentos reales
- Usuarios pueden seguir logueándose normalmente
- Sistema funcional para nuevas cargas de documentos
- Historial de auditoría limpio

## 🛠️ Troubleshooting

**Error "User not found"**:
- Los usuarios se conservan, verifica con check-database-status.js

**Error de permisos**:
- Asegúrate de que la base de datos no esté en uso
- Verifica conexión en DATABASE_URL

**Proceso interrumpido**:
- Las transacciones previenen estados inconsistentes
- Re-ejecutar el script es seguro