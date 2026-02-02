# Facturas Legacy - Sistema de Importación XML

## ¿Qué son las Facturas Legacy?

Las **facturas legacy** son facturas que se crean automáticamente cuando el sistema encuentra un pago (AB) en el XML de Koinor para una factura que **no existe** en la base de datos del sistema.

## ¿Por qué se crean automáticamente?

Esto ocurre típicamente en dos escenarios:

### 1. Facturas Pre-Sistema
Facturas emitidas **antes** de la implementación del sistema notarial (antes de Nov 2025). Estas facturas no fueron migradas al sistema nuevo, pero Koinor tiene registro de sus pagos.

**Ejemplo:**
- Factura `001002-00120000` emitida en Agosto 2025
- Sistema notarial implementado en Noviembre 2025
- XML de Koinor incluye pago de esa factura en Enero 2026
- Sistema crea factura legacy automáticamente para registrar el pago

### 2. Importación de Cuentas por Cobrar Histórico
Cuando importas un reporte de "Cuentas por Cobrar" histórico de Koinor que incluye facturas antiguas con saldos pendientes, el sistema creará facturas legacy para poder aplicar los pagos posteriores.

## Características de las Facturas Legacy

### Campos Automáticos
```javascript
{
  invoiceNumber: "001002-00120000",     // Normalizado
  invoiceNumberRaw: "001002-00120000",  // Formato XML
  clientName: "JUAN PEREZ",             // Del pago en XML
  clientTaxId: "1234567890",            // Del pago en XML
  issueDate: "2026-01-15",              // Fecha del pago (aproximación)
  totalAmount: 156.50,                  // Monto del pago
  paidAmount: 0,                        // Se actualiza al procesar pago
  status: "PENDING",                    // Estado inicial
  isLegacy: true,                       // ⚠️ Marca especial
  sourceFile: "112025-012026 (1).xml"  // Archivo origen
}
```

### Diferencias con Facturas Normales

| Característica | Factura Normal | Factura Legacy |
|---|---|---|
| `documentId` | ✅ Tiene (vinculada a documento) | ❌ Null (sin documento) |
| `isLegacy` | `false` o `null` | ✅ `true` |
| Creación | Por importación XLS/CSV | Automática al procesar XML |
| Fecha emisión | Real del Koinor | Aproximada (fecha del pago) |
| Total factura | Exacto del Koinor | Aproximado (suma de pagos) |

## ¿Cómo Identificarlas en Reportes?

Las facturas legacy aparecen en todos los reportes existentes, pero puedes filtrarlas:

### Query SQL
```sql
-- Solo facturas legacy
SELECT * FROM invoices WHERE "isLegacy" = true;

-- Solo facturas del sistema
SELECT * FROM invoices WHERE "isLegacy" IS NOT true;

-- Facturas legacy con saldo pendiente
SELECT * FROM invoices 
WHERE "isLegacy" = true 
  AND "paidAmount" < "totalAmount";
```

### En la UI (Frontend)
```javascript
// Ejemplo de cómo mostrar badge
{invoice.isLegacy && (
  <Chip label="Pre-sistema" size="small" color="info" />
)}
```

## Flujo Completo

### Escenario: Pago de Factura Pre-Sistema

```
1. Usuario importa XML Koinor (112025-012026.xml)
   └─ XML contiene: AB (Pago) de factura 001002-00122743

2. Sistema busca factura 001002-00122743 en BD
   └─ ❌ No encontrada

3. Sistema crea factura legacy automáticamente:
   └─ invoiceNumberRaw: "001002-00122743"
   └─ isLegacy: true
   └─ totalAmount: $156.50 (del pago)
   └─ status: PENDING

4. Sistema crea Payment vinculado a factura legacy
   └─ amount: $156.50
   └─ receiptNumber: "001-2601000305"

5. Sistema actualiza factura legacy:
   └─ paidAmount: $156.50
   └─ status: PAID

6. Resultado:
   ✅ Pago registrado correctamente
   ✅ Factura legacy en sistema para reportes
   ✅ Histórico de cobros completo
```

## Estadísticas de Importación

Cuando se crean facturas legacy, verás en el resultado:

```json
{
  "success": true,
  "stats": {
    "paymentsCreated": 1944,
    "invoicesCreatedLegacy": 432,  // ← Facturas legacy creadas
    "invoicesUpdated": 1512,
    "notasCreditoProcessed": 19
  },
  "info": [
    "432 facturas legacy creadas automáticamente (pagos de facturas pre-sistema)"
  ]
}
```

## Casos de Uso

### 1. Reporte de Cobros Completo
```sql
-- Total cobrado incluyendo facturas legacy
SELECT 
  SUM("paidAmount") as total_cobrado,
  COUNT(*) FILTER (WHERE "isLegacy" = true) as facturas_legacy,
  COUNT(*) as total_facturas
FROM invoices;
```

### 2. Análisis Pre vs Post Sistema
```sql
-- Comparar rendimiento antes y después
SELECT 
  CASE WHEN "isLegacy" THEN 'Pre-Sistema' ELSE 'Post-Sistema' END as periodo,
  COUNT(*) as facturas,
  SUM("totalAmount") as facturado,
  SUM("paidAmount") as cobrado,
  SUM("totalAmount" - "paidAmount") as pendiente
FROM invoices
GROUP BY "isLegacy";
```

### 3. Facturas Legacy con Saldo Pendiente
```sql
-- Para seguimiento de cobros antiguos
SELECT 
  "invoiceNumberRaw",
  "clientName",
  "totalAmount",
  "paidAmount",
  ("totalAmount" - "paidAmount") as saldo
FROM invoices
WHERE "isLegacy" = true
  AND "paidAmount" < "totalAmount"
ORDER BY saldo DESC;
```

## Ventajas del Sistema

✅ **Automatización**: No necesitas crear facturas legacy manualmente  
✅ **Histórico completo**: Todos los pagos quedan registrados  
✅ **Reportes unificados**: Un solo lugar para todas las facturas  
✅ **Auditoría**: Puedes distinguir facturas legacy con `isLegacy`  
✅ **Sin módulos extra**: Todo en el sistema existente  

## Limitaciones

⚠️ **Datos aproximados**: La fecha de emisión y total pueden no ser exactos  
⚠️ **Sin documento**: Las facturas legacy no están vinculadas a documentos notariales  
⚠️ **Cliente aproximado**: Datos del cliente vienen del pago, no de la factura original  

## Recomendaciones

1. **Ejecuta importación de XML periódicamente** para mantener pagos actualizados
2. **Revisa facturas legacy** en reportes para identificar cobros pendientes antiguos
3. **Documenta facturas legacy** que necesiten seguimiento especial
4. **No modifiques** el campo `isLegacy` manualmente

---

**Última actualización**: 2026-01-28  
**Versión**: 1.0
