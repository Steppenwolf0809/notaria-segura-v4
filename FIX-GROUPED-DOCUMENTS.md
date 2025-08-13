# 🔧 CORRECCIÓN DOCUMENTOS CON ESTADO AGRUPADO

## 🚨 PROBLEMA
Los documentos que se agruparon anteriormente quedaron con estado `AGRUPADO` en lugar de mantener su estado original (`EN_PROCESO`, `LISTO`, etc.), causando que desaparezcan de las vistas normales.

## ✅ SOLUCIONES DISPONIBLES

### **OPCIÓN 1: Corrección Inteligente (RECOMENDADA)**
Analiza el estado del grupo y corrige automáticamente:

```bash
# En Railway (producción)
railway shell
cd backend && npm run fix:grouped

# En desarrollo local
cd backend && npm run fix:grouped
```

**Lógica inteligente:**
- Si grupo está `READY` → documentos a `LISTO`
- Si grupo está `IN_PROCESS` → documentos a `EN_PROCESO`  
- Si grupo está `DELIVERED` → documentos a `ENTREGADO`
- Sin grupo → documentos a `EN_PROCESO`

### **OPCIÓN 2: Corrección Forzada**
Establece todos los documentos agrupados a un estado específico:

```bash
# Forzar todos a EN_PROCESO (por defecto)
railway shell
cd backend && npm run fix:grouped-force

# Forzar todos a LISTO
railway shell
cd backend && node scripts/fix-grouped-documents-status.js force LISTO
```

### **OPCIÓN 3: SQL Directo**
Para casos específicos, ejecutar directamente en la base de datos:

```sql
-- Ver documentos con problema
SELECT id, protocolNumber, clientName, status, isGrouped 
FROM documents 
WHERE status = 'AGRUPADO';

-- Corregir todos a EN_PROCESO
UPDATE documents 
SET status = 'EN_PROCESO' 
WHERE status = 'AGRUPADO' AND isGrouped = true;

-- Corregir documentos de grupos listos
UPDATE documents 
SET status = 'LISTO' 
WHERE status = 'AGRUPADO' 
  AND documentGroupId IN (
    SELECT id FROM "DocumentGroup" WHERE status = 'READY'
  );
```

## 🎯 VERIFICACIÓN POST-CORRECCIÓN

Después de ejecutar la corrección:

1. **Verificar en la aplicación:**
   - Los documentos agrupados aparecen en sus vistas correspondientes
   - Mantienen el chip "⚡ Parte de un grupo"
   - Se pueden procesar normalmente

2. **Verificar en base de datos:**
   ```sql
   -- No debería devolver resultados
   SELECT COUNT(*) FROM documents WHERE status = 'AGRUPADO';
   
   -- Ver distribución de estados
   SELECT status, COUNT(*) as cantidad, SUM(CASE WHEN isGrouped THEN 1 ELSE 0 END) as agrupados
   FROM documents 
   GROUP BY status;
   ```

## 📋 COMANDOS AGREGADOS

Agregué estos comandos al `package.json`:

- `npm run fix:grouped` - Corrección inteligente basada en estado del grupo
- `npm run fix:grouped-force` - Forzar todos a EN_PROCESO

## 🔍 DETALLES TÉCNICOS

**El script de corrección:**
1. Busca documentos con `status = 'AGRUPADO'` y `isGrouped = true`
2. Analiza el estado del grupo asociado
3. Determina el estado correcto para cada documento
4. Actualiza solo el campo `status`, mantiene `isGrouped = true`
5. Genera reporte detallado de cambios

**Estados corregidos:**
- `AGRUPADO` → `EN_PROCESO` (caso más común)
- `AGRUPADO` → `LISTO` (si el grupo ya está listo)
- `AGRUPADO` → `ENTREGADO` (si el grupo ya fue entregado)

## ⚠️ IMPORTANTE

- **Backup**: Recomendado hacer backup antes de ejecutar
- **Testing**: Probar primero en ambiente de desarrollo si es posible
- **Monitoreo**: Verificar que las vistas funcionen correctamente después

## 🎉 RESULTADO ESPERADO

Después de la corrección:
- ✅ Los documentos agrupados reaparecen en las vistas EN_PROCESO/LISTO
- ✅ Mantienen su indicador de agrupación visual
- ✅ Se pueden procesar normalmente (cambios de estado, etc.)
- ✅ Las funcionalidades de agrupación siguen funcionando
- ✅ No se crean nuevos documentos con estado AGRUPADO