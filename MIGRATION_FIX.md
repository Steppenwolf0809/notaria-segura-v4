# 🔧 Solución: Migración Fallida 20251117164900_add_formas_pago_array

## 📋 CONTEXTO DEL PROBLEMA

La migración `20251117164900_add_formas_pago_array` falló porque inicialmente se creó con sintaxis de **SQLite**, pero la base de datos en Railway es **PostgreSQL**.

**Error visto:**
```
ERROR: syntax error at or near "PRAGMA"
Position:
  0
  1 -- AlterTable
  2 -- Renombrar formaPago a formasPago (SQLite)
```

## ✅ SOLUCIÓN (3 Pasos)

### **Paso 1: Conectar a la base de datos PostgreSQL de Railway**

Desde tu terminal local:

```bash
# Opción A: Usando Railway CLI (recomendado)
railway login
railway link
railway run bash

# Opción B: Usando variables de entorno manualmente
# Copia DATABASE_URL de Railway dashboard y ejecuta:
cd backend
export DATABASE_URL="postgresql://postgres:password@host:port/railway"
```

---

### **Paso 2: Resolver la migración fallida**

Marca la migración fallida como **revertida**:

```bash
npx prisma migrate resolve --rolled-back 20251117164900_add_formas_pago_array
```

**Salida esperada:**
```
Migration 20251117164900_add_formas_pago_array marked as rolled back.
```

---

### **Paso 3: Aplicar la migración corregida (PostgreSQL)**

```bash
npx prisma migrate deploy
```

**Salida esperada:**
```
Applying migration `20251117164900_add_formas_pago_array`
Migration applied successfully
```

---

## 🧪 VERIFICACIÓN

Verifica que la migración se aplicó correctamente:

```bash
# Ver estructura de la tabla
npx prisma studio
# O consulta directa:
psql $DATABASE_URL -c "\d protocolos_uafe"
```

**Deberías ver:**
- ✅ Campo `formasPago` de tipo `JSONB` (nullable)
- ❌ Campo `formaPago` eliminado

---

## 🔍 QUÉ HACE LA MIGRACIÓN (PostgreSQL Correcta)

```sql
-- 1. Agregar nueva columna formasPago
ALTER TABLE "protocolos_uafe" ADD COLUMN "formasPago" JSONB;

-- 2. Migrar datos existentes de formato objeto a array
-- Antes: { "cheque": { "monto": 80000, "banco": "PICHINCHA" }, "efectivo": { "monto": 5000 } }
-- Después: [{ "tipo": "CHEQUE", "monto": 80000, "banco": "PICHINCHA" }, { "tipo": "EFECTIVO", "monto": 5000 }]
UPDATE "protocolos_uafe"
SET "formasPago" = (
  SELECT jsonb_agg(
    CASE
      WHEN key = 'cheque' THEN jsonb_build_object('tipo', 'CHEQUE', 'monto', (value->>'monto')::numeric, 'banco', value->>'banco')
      WHEN key = 'efectivo' THEN jsonb_build_object('tipo', 'EFECTIVO', 'monto', (value->>'monto')::numeric)
      WHEN key = 'transferencia' THEN jsonb_build_object('tipo', 'TRANSFERENCIA', 'monto', (value->>'monto')::numeric, 'banco', value->>'banco')
      WHEN key = 'tarjeta' THEN jsonb_build_object('tipo', 'TARJETA', 'monto', (value->>'monto')::numeric, 'banco', value->>'banco')
    END
  )
  FROM jsonb_each("formaPago")
)
WHERE "formaPago" IS NOT NULL;

-- 3. Eliminar columna antigua
ALTER TABLE "protocolos_uafe" DROP COLUMN "formaPago";
```

---

## ⚠️ ALTERNATIVA: Solución Manual (Si los comandos Prisma fallan)

Si `prisma migrate resolve` no funciona, ejecuta SQL directo:

```bash
# Conectar a PostgreSQL
psql $DATABASE_URL

-- Paso 1: Limpiar migración fallida de la tabla de control
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20251117164900_add_formas_pago_array';

-- Paso 2: Ejecutar SQL de migración manualmente
-- (Copia y pega el contenido de backend/prisma/migrations/20251117164900_add_formas_pago_array/migration.sql)

-- Paso 3: Marcar migración como aplicada
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid(),
  '3f8e9d1a2b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8',
  NOW(),
  '20251117164900_add_formas_pago_array',
  NULL,
  NULL,
  NOW(),
  1
);
```

---

## 🚀 DESPUÉS DE LA MIGRACIÓN

1. **Reinicia el servidor de Railway** (se reiniciará automáticamente al hacer deploy)
2. **Verifica el frontend**: Crea un nuevo protocolo con formas de pago
3. **Genera un PDF**: Verifica que las formas de pago se muestren correctamente

---

## 📞 SOPORTE

Si encuentras algún problema:
1. Revisa los logs de Railway: `railway logs`
2. Verifica la conexión a la BD: `npx prisma db pull`
3. Si persiste el error, contacta al equipo de desarrollo

---

**Actualizado:** 2025-11-17
**Commit:** fb5ab14
**Branch:** claude/optimize-uafe-pdf-payments-01B2ogsWwLsiciaq31j7mS8W
