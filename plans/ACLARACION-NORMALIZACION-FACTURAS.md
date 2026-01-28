# ⚠️ ACLARACIÓN CRÍTICA: Normalización de Números de Factura

**Fecha:** 28 de enero de 2026  
**Contexto:** Parser XML Koinor - Estrategia de búsqueda de facturas

---

## 🎯 PROBLEMA IDENTIFICADO

El plan inicial podía generar confusión sobre cómo buscar facturas al procesar pagos del XML.

---

## ✅ ESTRATEGIA CORRECTA

### Formatos en el Sistema

| Fuente/Campo | Formato | Ejemplo | Uso |
|--------------|---------|---------|-----|
| **XML Koinor** `<numtra>` | RAW (sin guiones intermedios) | `001002-00123341` | Formato original del sistema Koinor |
| **Invoice.invoiceNumberRaw** | RAW (igual al XML) | `001002-00123341` | Para búsquedas desde importaciones |
| **Invoice.invoiceNumber** | Normalizado (con guiones) | `001-002-000123341` | Para vinculación con Document |
| **Document.numeroFactura** | Normalizado (con guiones) | `001-002-000123676` | Número factura SRI |

### Conversión de Formatos

```javascript
// Formato RAW → Normalizado
const raw = "001002-00123341";  // Del XML
const normalized = normalizeInvoiceNumber(raw);
// normalized = "001-002-000123341"

// La función normalizeInvoiceNumber() en billing-utils.js hace:
// "001002-00123341" → "001-002-000123341"
//  ^^^^^^-^^^^^^^^      ^^^-^^^-^^^^^^^^^
//  6dígitos-8dígitos    3-3-9 (agrega cero al inicio del secuencial)
```

---

## 🔍 BÚSQUEDA DE FACTURAS AL PROCESAR PAGOS

### ❌ INCORRECTO

```javascript
// NO hacer esto - más lento y puede fallar
const numtraXML = "001002-00123341"; // Del XML
const normalized = normalizeInvoiceNumber(numtraXML);

const invoice = await prisma.invoice.findFirst({
  where: { 
    invoiceNumber: normalized // "001-002-000123341"
  }
});
```

**Por qué es incorrecto:**
- Requiere normalizar en cada búsqueda
- El campo `invoiceNumber` puede tener índice diferente
- Agrega complejidad innecesaria

### ✅ CORRECTO

```javascript
// Buscar directamente por invoiceNumberRaw
const numtraXML = "001002-00123341"; // Del XML <numtra>

const invoice = await prisma.invoice.findFirst({
  where: { 
    invoiceNumberRaw: numtraXML // Tal cual del XML
  },
  include: { document: true }
});
```

**Por qué es correcto:**
- Búsqueda directa sin conversiones
- `invoiceNumberRaw` está indexado (línea 627 schema.prisma)
- Mantiene formato original del sistema fuente
- Más eficiente

---

## 📊 FLUJO COMPLETO DE DATOS

```
┌─────────────────────────────────────────────────────────────┐
│ 1. XML KOINOR                                               │
│    <numtra>001002-00123341</numtra>                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PARSER XML                                               │
│    const numtraRaw = "001002-00123341"  // Sin normalizar  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BÚSQUEDA EN BD                                           │
│    Invoice.findFirst({                                      │
│      where: { invoiceNumberRaw: "001002-00123341" }        │
│    })                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RESULTADO                                                │
│    Invoice {                                                │
│      invoiceNumberRaw: "001002-00123341"   // RAW          │
│      invoiceNumber: "001-002-000123341"    // Normalizado  │
│      documentId: "uuid..."                                  │
│      document: {                                            │
│        numeroFactura: "001-002-000123341"  // Match!       │
│      }                                                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 VINCULACIÓN INVOICE ↔ DOCUMENT

### Cómo se Vinculan

La vinculación entre `Invoice` y `Document` se hace por el campo **normalizado**:

```javascript
// Al crear Invoice (desde XLS o XML)
const raw = "001002-00123341"; // Del sistema fuente
const normalized = normalizeInvoiceNumber(raw);
// normalized = "001-002-000123341"

// Buscar documento con ese número de factura
const document = await prisma.document.findFirst({
  where: { 
    numeroFactura: normalized // "001-002-000123341"
  }
});

// Crear Invoice con ambos campos
await prisma.invoice.create({
  data: {
    invoiceNumberRaw: raw,          // "001002-00123341"
    invoiceNumber: normalized,      // "001-002-000123341"
    documentId: document?.id,       // Vinculación
    // ...
  }
});
```

**Por qué ambos campos:**
- `invoiceNumberRaw`: Para búsquedas desde importaciones (formato original)
- `invoiceNumber`: Para vinculación con Document (formato normalizado SRI)

---

## 📝 IMPLEMENTACIÓN EN EL PARSER XML

### En xml-koinor-parser.js

```javascript
export async function parseKoinorXML(fileBuffer, fileName) {
  // ...
  
  for (const group1 of groups) {
    if (group1.tipdoc === 'AB') {
      const payment = {
        receiptNumber: group1.numdoc.trim(),
        clientTaxId: group1.codcli.trim(),
        clientName: group1.nomcli.trim(),
        paymentDate: parseKoinorDate(group1.fecemi),
        type: 'AB',
        details: [
          {
            // ⚠️ NO normalizar aquí - mantener formato RAW
            invoiceNumberRaw: group1.numtra.trim(), // "001002-00123341"
            amount: parseFloat(group1.valcob)
          }
        ]
      };
      
      payments.push(payment);
    }
  }
  
  return { payments, summary };
}
```

### En import-koinor-xml-service.js

```javascript
async function processSinglePayment(payment, detail, sourceFile, stats) {
  // ✅ Buscar por invoiceNumberRaw directamente
  const invoice = await prisma.invoice.findFirst({
    where: { 
      invoiceNumberRaw: detail.invoiceNumberRaw // "001002-00123341"
    },
    include: { document: true }
  });
  
  if (!invoice) {
    stats.errors.push({
      invoiceNumberRaw: detail.invoiceNumberRaw,
      message: 'Factura no encontrada'
    });
    return;
  }
  
  // Continuar con creación de Payment...
}
```

---

## 🧪 CASOS DE PRUEBA

### Test: Búsqueda Correcta por Raw

```javascript
// Setup: Crear Invoice con ambos formatos
await prisma.invoice.create({
  data: {
    invoiceNumberRaw: "001002-00123341",
    invoiceNumber: "001-002-000123341",
    clientTaxId: "1703601532",
    clientName: "Test Cliente",
    totalAmount: 100.00
  }
});

// Test: Buscar por formato RAW (del XML)
const numtraXML = "001002-00123341";

const invoice = await prisma.invoice.findFirst({
  where: { invoiceNumberRaw: numtraXML }
});

expect(invoice).not.toBeNull();
expect(invoice.invoiceNumberRaw).toBe("001002-00123341");
expect(invoice.invoiceNumber).toBe("001-002-000123341");
```

### Test: Normalización Solo para Vinculación

```javascript
// Solo normalizar cuando necesites vincular con Document
const raw = "001002-00123341";
const normalized = normalizeInvoiceNumber(raw);

const document = await prisma.document.findFirst({
  where: { numeroFactura: normalized }
});

if (document) {
  // Vincular Invoice con Document
  await prisma.invoice.update({
    where: { invoiceNumberRaw: raw },
    data: { documentId: document.id }
  });
}
```

---

## 📋 CHECKLIST DE VALIDACIÓN

Al implementar el parser XML, verificar:

- [ ] El parser **NO normaliza** el `numtra` del XML
- [ ] La búsqueda de Invoice usa `invoiceNumberRaw` (no `invoiceNumber`)
- [ ] Solo se normaliza al vincular con Document
- [ ] Los tests verifican ambos formatos en la BD
- [ ] La documentación aclara la diferencia entre ambos campos

---

## 🔄 MIGRACIÓN DE DATOS EXISTENTES

Si hay Invoices creados antes que solo tienen `invoiceNumber`:

```javascript
// Script de migración (si es necesario)
const invoices = await prisma.invoice.findMany({
  where: { invoiceNumberRaw: { equals: null } }
});

for (const invoice of invoices) {
  // Denormalizar: "001-002-000123341" → "001002-00123341"
  const raw = denormalizeInvoiceNumber(invoice.invoiceNumber);
  
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { invoiceNumberRaw: raw }
  });
}
```

**Nota:** Verificar si este script es necesario revisando datos en producción.

---

## 🎓 RESUMEN PARA EL DESARROLLADOR

### 3 Reglas de Oro

1. **Del XML al código:** Mantener formato RAW sin normalizar
2. **Para buscar Invoice:** Usar `invoiceNumberRaw` siempre
3. **Para vincular con Document:** Normalizar y usar `invoiceNumber`

### Mnemotécnia

- **RAW** = **R**aw **A**s **W**ritten (tal como está escrito en XML)
- **Normalized** = Para el **Normative** SRI (formato estándar ecuatoriano)

---

**Última actualización:** 28 de enero de 2026  
**Revisado por:** Usuario que identificó la confusión en el plan inicial ✅
