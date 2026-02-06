# 🛠️ Guía de Solución de Problemas

## Índice
- [Problemas de Sincronización](#problemas-de-sincronización)
- [Problemas de Facturación y Pagos](#problemas-de-facturación-y-pagos)
- [Problemas de Documentos](#problemas-de-documentos)
- [Errores de Base de Datos](#errores-de-base-de-datos)
- [Scripts de Diagnóstico](#scripts-de-diagnóstico)

---

## Problemas de Sincronización

### ❌ El sync no actualiza las facturas

**Síntomas:**
- Facturas en Koinor muestran pago pero en el sistema siguen como PENDING
- CXC sync marca como PAID pero Invoice sigue como PENDING

**Causa probable:** 
El sync de Billing usa `koinorModifiedAt` para decidir si actualizar. Si el timestamp no es más reciente, no actualiza.

**Solución:**
```bash
# 1. Verificar desfases
node scripts/detect-invoice-desfase.js

# 2. Corregir desfases
node scripts/fix-all-invoice-desfase.js --apply

# 3. Forzar sync desde CXC
node scripts/sync-invoice-from-pending.js
```

**Verificación:**
```javascript
// En backend, verificar el endpoint
GET /billing/invoices/:invoiceNumber
// Debe mostrar status: "PAID" y paidAmount correcto
```

---

### ❌ "Sin factura" aparece en documentos que sí tienen factura

**Síntomas:**
- UI muestra "Sin factura" aunque la tabla Invoice tiene el registro
- El campo `numeroFactura` en Document está vacío

**Causa:**
El campo `numeroFactura` en la tabla Document no se actualizó cuando se creó la factura.

**Solución:**
```javascript
// Verificar en base de datos
SELECT d.id, d.numeroFactura, i.invoiceNumber 
FROM documents d 
LEFT JOIN invoices i ON i.documentId = d.id 
WHERE d.numeroFactura IS NULL AND i.id IS NOT NULL;

// Corregir
UPDATE documents 
SET numeroFactura = i.invoiceNumber 
FROM invoices i 
WHERE documents.id = i.documentId 
AND documents.numeroFactura IS NULL;
```

---

### ❌ CXC sync marca como PAID facturas que no deberían

**Síntomas:**
- Facturas se marcan como pagadas incorrectamente
- Registros con errores de procesamiento se marcan como PAID

**Causa:**
El sync de CXC (full sync) asume que si una factura no está en la lista de pendientes, está pagada. Pero si hubo errores al procesar registros, esos también se marcan incorrectamente.

**Solución implementada:**
```javascript
// En sync-billing-controller.js
const failedInvoiceNumbers = [];

// Al procesar cada registro...
if (error) {
  failedInvoiceNumbers.push(invoiceNumber);
  continue; // Saltar este registro
}

// Al marcar como PAID, excluir fallidos
const excludeFromMarkAsPaid = [
  ...receivedInvoiceNumbers,
  ...failedInvoiceNumbers
];
```

---

## Problemas de Facturación y Pagos

### ❌ Estado de pago no coincide con realidad

**Síntomas:**
- Cliente pagó pero sistema muestra "Pendiente de pago"
- Suma de pagos no coincide con total pagado mostrado

**Diagnóstico:**
```bash
node scripts/diagnose-factura.js <numero-factura>
```

**Causas comunes:**

1. **Pagos duplicados:** La factura tiene pagos en tabla `payments` Y `paidAmount` del sync
   
   **Solución:** Usar `Math.max()` para calcular total:
   ```javascript
   const paymentsTotal = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
   const syncedPaidAmount = Number(invoice.paidAmount || 0);
   const totalPaid = Math.max(paymentsTotal, syncedPaidAmount);
   ```

2. **Invoice no sincronizado con CXC:**
   
   **Solución:** 
   ```bash
   node scripts/sync-invoice-from-pending.js
   ```

---

### ❌ Historial no muestra fecha de pago

**Síntomas:**
- Documento pagado pero historial no muestra el evento de pago
- No se sabe cuándo se registró el pago

**Solución:**
El sistema ahora crea eventos automáticamente. Para documentos antiguos:

```bash
# Agregar eventos de pago al historial
node scripts/add-payment-events-to-history.js
```

Esto crea eventos `PAYMENT_REGISTERED` para todas las facturas pagadas.

---

### ❌ Factura muestra monto pagado incorrecto

**Síntomas:**
- `paidAmount` es 0 pero la factura está marcada como PAID
- El cliente pagó $100 pero sistema muestra $50

**Verificación:**
```sql
-- Verificar fuentes de pago
SELECT 
  i.invoiceNumber,
  i.totalAmount,
  i.paidAmount as syncedPaidAmount,
  i.status,
  COALESCE(SUM(p.amount), 0) as paymentsTotal
FROM invoices i
LEFT JOIN payments p ON p.invoiceId = i.id
WHERE i.invoiceNumber = '001-002-000123456'
GROUP BY i.id;
```

**Cálculo correcto:**
```javascript
// El total pagado es el máximo entre:
// - Suma de pagos en tabla payments
// - paidAmount sincronizado desde Koinor
const totalPaid = Math.max(paymentsTotal, syncedPaidAmount);
```

---

## Problemas de Documentos

### ❌ Documento no aparece en búsqueda

**Síntomas:**
- Buscar por nombre de cliente no encuentra el documento
- Búsqueda por protocolo no funciona

**Verificación:**
```sql
-- Verificar que el documento existe
SELECT id, clientName, protocolNumber, status 
FROM documents 
WHERE clientName ILIKE '%nombre%';

-- Verificar índices de búsqueda
SELECT * FROM pg_indexes WHERE tablename = 'documents';
```

---

### ❌ No se puede cambiar estado del documento

**Síntomas:**
- Botón de cambio de estado no responde
- Error al intentar actualizar documento

**Logs a revisar:**
```bash
# Backend logs
# Buscar errores de validación
ERROR: "Invalid state transition"
ERROR: "Document not found"
```

---

## Errores de Base de Datos

### ❌ Error de conexión a PostgreSQL

**Síntomas:**
```
Error: P1001: Can't reach database server
```

**Verificación:**
```bash
# Verificar variables de entorno
echo $DATABASE_URL

# Probar conexión
psql $DATABASE_URL -c "SELECT 1;"
```

---

### ❌ Error de codificación (caracteres especiales)

**Síntomas:**
- Nombres con tildes o ñ se guardan mal
- Caracteres extraños en la base de datos

**Solución:**
```javascript
// En Prisma client
const prisma = new PrismaClient();
await prisma.$executeRaw`SET client_encoding = 'UTF8'`;
```

---

## Scripts de Diagnóstico

### Lista completa de scripts disponibles

| Script | Descripción | Parámetros |
|--------|-------------|------------|
| `detect-invoice-desfase.js` | Detecta diferencias entre Invoice y PendingReceivable | `--verbose` |
| `fix-all-invoice-desfase.js` | Corrige desfases detectados | `--apply` (requerido para aplicar) |
| `sync-invoice-from-pending.js` | Sincroniza Invoice desde PendingReceivable | Ninguno |
| `diagnose-factura.js` | Diagnóstico detallado de una factura | `<invoiceNumber>` |
| `analyze-documents-without-invoice.js` | Analiza documentos sin factura | Ninguno |
| `add-payment-events-to-history.js` | Agrega eventos de pago al historial | `--dry-run` (opcional) |

### Uso típico de diagnóstico

```bash
# 1. Detectar problemas
node scripts/detect-invoice-desfase.js

# 2. Analizar documentos sin factura
node scripts/analyze-documents-without-invoice.js

# 3. Diagnóstico específico
node scripts/diagnose-factura.js 001-002-000123456

# 4. Corregir (si es seguro)
node scripts/fix-all-invoice-desfase.js --apply

# 5. Sincronizar si hay desfase
node scripts/sync-invoice-from-pending.js

# 6. Verificar resultado
node scripts/detect-invoice-desfase.js
```

---

## 📞 Escalación

Si el problema persiste después de seguir esta guía:

1. **Recolectar información:**
   - Número de factura/documento afectado
   - Screenshots del estado en UI
   - Logs del backend (últimas 50 líneas)
   - Resultado de scripts de diagnóstico

2. **Verificar estado de sync:**
   ```bash
   # Última sincronización
   node scripts/detect-invoice-desfase.js
   ```

3. **Documentar en:**
   - Crear issue en GitHub con template de bug
   - Incluir toda la información recolectada

---

*Última actualización: Febrero 2025*
