# Diagnóstico: Factura No Actualiza con Pago

## Problema Reportado
La factura `001-002-000125027` (protocolo `2026T701018P00256`) aparece con saldo pendiente de $388.00 en el sistema, pero ya fue pagada según Koinor.

## Análisis de Logs

Los logs del sync agent muestran:
```
[sync-cxc] Error processing record 001002-00125027:
```

Este error indica que hay un problema al procesar específicamente esta factura durante la sincronización de CXC.

## Posibles Causas

### 1. Error de Validación
El registro puede estar fallando la validación en `validateCxcRecord()`:
- `invoiceNumberRaw` vacío o inválido
- `clientTaxId` vacío  
- `balance` no es un número válido

### 2. Error de Base de Datos
- Problema de constraint en Prisma
- Error de transacción
- Conflicto de clave única

### 3. Formato de Datos
- Fechas inválidas
- Valores numéricos fuera de rango
- Caracteres especiales en campos de texto

## Pasos de Diagnóstico

### Paso 1: Ejecutar Script de Diagnóstico

```bash
# En el servidor (staging o producción)
cd /app/backend
node scripts/diagnose-factura.js 001002-00125027
```

Este script verificará:
- Estado en `PendingReceivable` (tabla CXC)
- Estado en `Invoice` (tabla de facturas)
- Documento relacionado
- Logs de sincronización recientes

### Paso 2: Verificar Logs del Sync Agent

En el servidor donde corre el Sync Agent (Koinor):

```bash
# Ver logs recientes
tail -100 /ruta/al/sync-agent/logs/sync.log

# Buscar errores específicos de la factura
grep "00125027" /ruta/al/sync-agent/logs/sync.log
```

### Paso 3: Verificar Datos en Koinor

Ejecutar query directamente en SQL Server de Koinor:

```sql
SELECT 
    numero_factura,
    cliente_cedula,
    cliente_nombre,
    total_factura,
    total_pagado,
    saldo_pendiente,
    estado_pago,
    fecha_emision,
    fecha_vencimiento,
    fecha_ultimo_pago
FROM v_estado_facturas 
WHERE numero_factura LIKE '%00125027%'
```

### Paso 4: Forzar Sincronización Manual

Desde el servidor del Sync Agent:

```bash
cd /ruta/al/sync-agent
node src/index.js --once
```

Luego verificar los logs del backend en Railway para ver el error específico.

## Correcciones Aplicadas

### 1. Mejor Logging (Aplicado)
Se mejoró el logging en `sync-billing-controller.js` para capturar:
- Stack trace completo del error
- Código de error de Prisma
- Datos del registro que falla

### 2. Protección de Registros Fallidos (Aplicado)
Se modificó la lógica de `fullSync` para:
- Trackear registros que fallan en `failedInvoiceNumbers`
- Excluir registros fallidos del proceso de "marcar como PAID"
- Evitar que facturas con error se marquen incorrectamente como pagadas

## Cómo Verificar la Corrección

### 1. Después del Deploy

```bash
# Ejecutar diagnóstico nuevamente
node scripts/diagnose-factura.js 001002-00125027
```

### 2. Verificar en la UI
- Abrir el documento `2026T701018P00256`
- Verificar que el estado financiero muestre "Pagado" o balance 0
- Verificar que no aparezca más el badge "Pago pendiente"

### 3. Verificar en Reportes
- Cartera por Cobrar no debe incluir esta factura
- Cartera del matrizador no debe incluir esta factura

## Si el Problema Persiste

### Opción A: Sincronización Manual de la Factura

Crear un script para forzar la actualización:

```javascript
// scripts/force-update-factura.js
import { db as prisma } from '../backend/src/db.js';

async function forceUpdate() {
    const invoiceNumberRaw = '001002-00125027';
    
    // Obtener datos actualizados de Koinor (manualmente)
    // o actualizar directamente si se confirma el pago
    
    await prisma.pendingReceivable.update({
        where: { invoiceNumberRaw },
        data: {
            status: 'PAID',
            balance: 0,
            totalPaid: 388.00, // Monto total
            lastSyncAt: new Date()
        }
    });
    
    console.log('Factura actualizada manualmente');
}

forceUpdate();
```

### Opción B: Verificar Constraint de Base de Datos

```sql
-- En PostgreSQL, verificar si hay constraints violados
SELECT * FROM pending_receivables 
WHERE invoice_number_raw = '001002-00125027';

-- Verificar si el formato del número causa conflictos
SELECT * FROM pending_receivables 
WHERE invoice_number_raw LIKE '%125027%';
```

### Opción C: Recrear el Registro

```javascript
// Eliminar y recrear el registro
await prisma.pendingReceivable.deleteMany({
    where: {
        invoiceNumberRaw: { contains: '125027' }
    }
});

// Luego forzar re-sync desde Koinor
```

## Monitoreo Continuo

### Alertas Recomendadas

1. **Monitorear errores de sync:**
   ```bash
   # Alerta si hay más de 10 errores en un sync
   grep "\[sync-cxc\] Error processing" logs/backend.log | wc -l
   ```

2. **Verificar consistencia entre tablas:**
   ```sql
   -- Buscar facturas pagadas en Invoice pero no en PendingReceivable
   SELECT i.invoice_number, i.status, pr.status
   FROM invoices i
   LEFT JOIN pending_receivables pr ON i.invoice_number_raw = pr.invoice_number_raw
   WHERE i.status = 'PAID' 
   AND (pr.status != 'PAID' OR pr.status IS NULL);
   ```

3. **Dashboard de métricas:**
   - Tasa de éxito de sincronización
   - Número de facturas con error
   - Tiempo promedio de sincronización

## Contacto y Escalación

Si después de aplicar estas correcciones el problema persiste:

1. Recopilar:
   - Output del script de diagnóstico
   - Logs completos del sync agent
   - Captura de pantalla del estado en Koinor
   - Query results de SQL Server

2. Escalar a:
   - DevOps para verificar conectividad
   - DBA para verificar integridad de datos
   - Equipo de Koinor para verificar la view `v_estado_facturas`

---

**Fecha:** 2026-02-06  
**Autor:** Sistema de diagnóstico automático  
**Versión:** 1.0
