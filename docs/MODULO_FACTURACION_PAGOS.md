# 📊 MÓDULO DE FACTURACIÓN Y PAGOS
## Sistema de Trazabilidad Notarial - Notaría 18 Quito

---

## 📋 REGISTRO DE PROGRESO

### Estado Actual: Sprint 2 Completado ✅
**Última actualización:** 2026-01-17
**Rama Git:** `feature/billing-module-sprint1`

#### Resumen Sprint 1:
- ✅ Modelos Prisma: `Invoice`, `Payment`, `ImportLog` + enums
- ✅ Migración ejecutada en Railway PostgreSQL

#### Resumen Sprint 2:
- ✅ Servicio de importación: 2,789 filas procesadas
- ✅ 1,181 facturas + 1,585 pagos importados
- ✅ Idempotencia verificada (0 duplicados en 2da ejecución)
- ✅ Vinculación automática Invoice ↔ Document funcionando
- ⏭️ **Próximo:** Sprint 3 - API y Consultas

### Leyenda de Estados
- ⬜ **Pendiente** - No iniciado
- 🔄 **En Progreso** - Trabajando actualmente
- ✅ **Completado** - Terminado y probado
- ⚠️ **Bloqueado** - Requiere acción/decisión
- 🔴 **Crítico** - Prioridad máxima

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo
Implementar un sistema de sincronización de facturación desde Koinor (sistema contable existente) hacia el Sistema de Trazabilidad Notarial, permitiendo:

1. **Visibilidad de estado de pago** en tiempo real
2. **Bloqueo/desbloqueo automático** de entrega de documentos según estado de pago
3. **Trazabilidad completa** de pagos (quién, cuándo, cuánto, recibo)
4. **Reportes financieros** para gestión

### Fuente de Datos
- **Archivo:** POR_COBRAR26.xls (exportado de Koinor)
- **Contenido:** Facturas (FC) y Abonos/Pagos (AB) mezclados
- **Frecuencia de carga:** Múltiples veces al día (idempotente)

### Arquitectura
```
┌─────────────────────┐     ┌─────────────────────┐
│   Sistema Koinor    │     │   XML Notarial      │
│   (Contabilidad)    │     │   (Documentos)      │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           │ Exporta CSV/XLS           │ Importa
           ▼                           ▼
┌──────────────────────────────────────────────────┐
│         SISTEMA DE TRAZABILIDAD NOTARIAL         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │  Facturas   │←→│   Pagos     │  │Documentos│  │
│  │  (Invoice)  │  │  (Payment)  │  │(Document)│  │
│  └─────────────┘  └─────────────┘  └──────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 📊 ANÁLISIS DE DATOS FUENTE

### Archivo POR_COBRAR26.xls - Estructura

| Columna | Tipo | Descripción | Uso |
|---------|------|-------------|-----|
| `codcli` | int64 | Código/Cédula del cliente | Identificador único cliente |
| `nomcli` | string | Nombre del cliente | Referencia visual |
| `tipdoc` | string | Tipo: 'FC' (Factura) o 'AB' (Abono) | **Discriminador clave** |
| `numdoc` | string | Número de recibo (solo en AB) | ID único del pago |
| `numtra` | string | Número de factura (001002-00123341) | **ID único factura** |
| `valcob` | float | Monto de la transacción | Valor factura o pago |
| `fecemi` | datetime | **Fecha del registro actual** | En FC: fecha factura. En AB: fecha del pago |
| `fectra` | datetime | **Fecha de la FACTURA ORIGINAL** | Siempre es la fecha de emisión de la factura |
| `fecven` | datetime | Fecha de vencimiento | Para reportes de mora |
| `concep` | string | Concepto/descripción | Referencia del pago |
| `codapu` | string | Apunte contable (FC+numtra) | Vinculación interna |
| `numcco` | string | Número comprobante contable | Referencia Koinor |
| `sigdoc` | string | Signo: '+' (débito) o '-' (crédito) | Dirección del movimiento |

### ⚠️ IMPORTANTE: Interpretación de Fechas

Las fechas tienen **significado diferente** según el tipo de documento:

**Para FACTURAS (tipdoc = 'FC'):**
| Campo | Significado |
|-------|-------------|
| `fecemi` | Fecha de emisión de la factura |
| `fectra` | Igual a fecemi (es la misma transacción) |
| `fecven` | Fecha de vencimiento |

**Para PAGOS (tipdoc = 'AB'):**
| Campo | Significado |
|-------|-------------|
| `fecemi` | **Fecha del PAGO** (cuando se recibió el dinero) |
| `fectra` | **Fecha de la FACTURA ORIGINAL** (puede ser meses antes) |
| `fecven` | Generalmente igual a fecemi |

**Ejemplo Real:**
```
Registro tipo AB (Pago):
├── numtra: 001002-00119478 (la factura)
├── fectra: 2025-07-08 ← Factura emitida en JULIO 2025
├── fecemi: 2026-01-07 ← Pago recibido en ENERO 2026
└── concep: "PAGO FACT 119478 05/09"

Interpretación: Factura de julio 2025, pagada 6 meses después en enero 2026
```

**Implicación para el Sistema:**
- Al crear facturas LEGACY (desde pagos huérfanos), usar `fectra` como `issueDate`
- Al crear pagos, usar `fecemi` como `paymentDate`

### Archivo CXC_20260114.xls - Estructura (Solo pendientes)

| Columna | Tipo | Descripción | Uso |
|---------|------|-------------|-----|
| `numtra` | string | Número de factura | ID único |
| `valcob` | float | Valor original factura | Monto total |
| `abomes` | float | Abono acumulado | Total pagado |
| `saldo` | float | Saldo pendiente | valcob - abomes |
| `dircli` | string | Dirección del cliente | Dato adicional |
| `telcli` | string | Teléfono del cliente | Dato adicional |

### Normalización de Números de Factura

```
Koinor (numtra):     001002-00123341
Sistema Notaría:     001-002-000123341

Transformación:
001002-00123341 → 001-002-000123341
│││││  ││││││││
│││││  └───────── Número secuencial (8 dígitos → 9 dígitos con padding)
│││└───────────── Punto de emisión (3 dígitos)
└──────────────── Establecimiento (3 dígitos)
```

**Función de normalización:**
```javascript
// Koinor → Sistema Notaría
"001002-00123341" → "001-002-000123341"

// Regex: /^(\d{3})(\d{3})-(\d{8})$/
// Resultado: "$1-$2-0$3"
```

---

## 🗄️ MODELO DE DATOS (PRISMA)

### Diseño Simplificado

**Principio:** No duplicar datos que ya existen en `Document`. Los datos del cliente (nombre, cédula, teléfono) se leen directamente del documento vinculado.

```
┌─────────────────────────────────────────────────────────────┐
│                    MODELO SIMPLIFICADO                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Document (YA EXISTE)                                       │
│  ├── nombreCliente         ← Datos del cliente aquí        │
│  ├── identificacionCliente                                  │
│  ├── telefono                                               │
│  └── numeroFactura ────────┐                                │
│                            │ Vinculación automática         │
│                            ▼                                │
│  Invoice (NUEVA) ──────► Payment (NUEVA)                    │
│  ├── invoiceNumber        ├── receiptNumber                 │
│  ├── totalAmount          ├── amount                        │
│  └── documentId           └── invoiceId                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Nuevos Modelos a Crear

```prisma
// ========================================
// MODELO: FACTURA
// ========================================
model Invoice {
  id                String    @id @default(uuid())
  
  // Identificación (ÚNICO)
  invoiceNumber     String    @unique  // numtra normalizado: 001-002-000123341
  invoiceNumberRaw  String              // numtra original: 001002-00123341
  
  // Datos del cliente (desnormalizados del CSV, para facturas sin documento)
  clientTaxId       String              // codcli (cédula/RUC)
  clientName        String              // nomcli
  
  // Montos
  totalAmount       Decimal   @db.Decimal(12, 2)  // valcob de FC
  
  // Fechas
  issueDate         DateTime            // fecemi (en FC) o fectra (en AB para legacy)
  dueDate           DateTime?           // fecven
  
  // Referencia
  concept           String?             // concep
  
  // Estado y control
  status            InvoiceStatus @default(PENDING)
  isLegacy          Boolean       @default(false)  // Creada por pago huérfano
  
  // Vinculación con documento notarial (automática por numeroFactura)
  documentId        Int?
  document          Document?     @relation(fields: [documentId], references: [id])
  
  // Metadata de importación
  importedAt        DateTime  @default(now())
  lastSyncAt        DateTime  @updatedAt
  sourceFile        String?             // Nombre del archivo de origen
  
  // Relaciones
  payments          Payment[]
  
  @@map("invoices")
  @@index([invoiceNumber])
  @@index([clientTaxId])
  @@index([status])
  @@index([issueDate])
  @@index([documentId])
}

// ========================================
// MODELO: PAGO/ABONO
// ========================================
model Payment {
  id                String    @id @default(uuid())
  
  // Identificación (ÚNICO)
  receiptNumber     String    @unique  // numdoc: 001-2601000089
  
  // Monto
  amount            Decimal   @db.Decimal(12, 2)  // valcob de AB
  
  // Fechas
  paymentDate       DateTime            // fecemi
  
  // Referencias
  concept           String?             // concep (ej: "PAGO FACT 119478 05/09")
  accountingRef     String?             // numcco (comprobante contable)
  
  // Tipo de pago
  paymentType       PaymentType @default(CASH)
  
  // Factura asociada
  invoiceId         String
  invoice           Invoice   @relation(fields: [invoiceId], references: [id])
  
  // Metadata
  importedAt        DateTime  @default(now())
  sourceFile        String?
  
  @@map("payments")
  @@index([receiptNumber])
  @@index([invoiceId])
  @@index([paymentDate])
}

// ========================================
// ENUMS
// ========================================
enum InvoiceStatus {
  PENDING       // Pendiente de pago
  PARTIAL       // Pago parcial
  PAID          // Pagada completamente
  OVERDUE       // Vencida
  CANCELLED     // Anulada
}

enum PaymentType {
  CASH          // Efectivo
  TRANSFER      // Transferencia
  CHECK         // Cheque
  RETENTION     // Retención
  CREDIT_NOTE   // Nota de crédito
  OTHER         // Otro
}

// ========================================
// MODELO: LOG DE IMPORTACIÓN
// ========================================
model ImportLog {
  id                String    @id @default(uuid())
  
  // Información del archivo
  fileName          String
  fileType          String              // 'POR_COBRAR' o 'CXC'
  
  // Estadísticas
  totalRows         Int
  invoicesCreated   Int       @default(0)
  invoicesUpdated   Int       @default(0)
  paymentsCreated   Int       @default(0)
  paymentsSkipped   Int       @default(0)
  errors            Int       @default(0)
  
  // Rango de fechas procesado
  dateFrom          DateTime?
  dateTo            DateTime?
  
  // Estado
  status            ImportStatus @default(PROCESSING)
  errorDetails      Json?
  
  // Usuario que ejecutó
  executedBy        Int?
  executedByUser    User?     @relation(fields: [executedBy], references: [id])
  
  // Timestamps
  startedAt         DateTime  @default(now())
  completedAt       DateTime?
  
  @@map("import_logs")
  @@index([status])
  @@index([startedAt])
}

enum ImportStatus {
  PROCESSING
  COMPLETED
  COMPLETED_WITH_ERRORS
  FAILED
}
```

### Modificación al Modelo Document Existente

```prisma
// Agregar relación en el modelo Document existente
model Document {
  // ... campos existentes ...
  
  // NUEVO: Relación con facturas
  invoices          Invoice[]
  
  // NUEVO: Campo calculado para estado de pago
  // (Se calculará en el servicio, no en la BD)
}
```

---

## 🔄 LÓGICA DE IMPORTACIÓN

### Flujo Principal (Simplificado)

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESO DE IMPORTACIÓN                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. VALIDACIÓN DEL ARCHIVO                                    │
│    • Verificar formato (XLS/CSV)                            │
│    • Verificar columnas requeridas                          │
│    • Crear registro en ImportLog                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PROCESAR FACTURAS (tipdoc = 'FC')                        │
│    • Filtrar filas con tipdoc === 'FC'                      │
│    • Normalizar numtra → invoiceNumber                      │
│    • Guardar clientTaxId y clientName del CSV               │
│    • Upsert en Invoice                                      │
│    • Buscar Document con mismo numeroFactura → vincular     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PROCESAR PAGOS (tipdoc = 'AB')                           │
│    • Filtrar filas con tipdoc === 'AB'                      │
│    • Verificar existencia de factura padre                  │
│    │                                                        │
│    ├─► SI existe factura:                                   │
│    │   • Crear pago vinculado                               │
│    │                                                        │
│    └─► NO existe factura (LEGACY):                          │
│        • Crear factura placeholder con isLegacy=true        │
│        • Usar fectra como fecha de factura                  │
│        • Luego crear pago vinculado                         │
│                                                             │
│    • Actualizar estado de factura (PARTIAL/PAID)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ACTUALIZAR ESTADOS DE FACTURAS                           │
│    • Calcular saldo: totalAmount - SUM(payments)            │
│    • Si saldo === 0 → PAID                                  │
│    • Si saldo > 0 && tiene pagos → PARTIAL                  │
│    • Si saldo > 0 && sin pagos → PENDING                    │
│    • Si vencida && saldo > 0 → OVERDUE                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. FINALIZAR IMPORTACIÓN                                     │
│    • Actualizar ImportLog con estadísticas                  │
│    • Registrar errores si los hubo                          │
│    • Marcar como COMPLETED o COMPLETED_WITH_ERRORS          │
└─────────────────────────────────────────────────────────────┘
```

### Manejo de Pagos "Huérfanos" (Facturas Legacy)

```javascript
// Pseudocódigo para Auto-Healing
async function processPayment(paymentRow, invoiceMap) {
  const invoiceNumberRaw = paymentRow.numtra;
  const invoiceNumber = normalizeInvoiceNumber(invoiceNumberRaw);
  
  // Buscar factura existente
  let invoice = invoiceMap.get(invoiceNumber) 
                || await prisma.invoice.findUnique({ 
                     where: { invoiceNumber } 
                   });
  
  // Si no existe, crear factura LEGACY
  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceNumberRaw,
        totalAmount: paymentRow.valcob, // Estimación (valor del pago)
        // ⚠️ IMPORTANTE: Usar fectra (fecha FACTURA), NO fecemi (fecha PAGO)
        issueDate: paymentRow.fectra,   // Fecha original de la factura
        isLegacy: true,
        status: 'PARTIAL',
        clientId: clientMap.get(paymentRow.codcli),
        concept: `[LEGACY] Factura histórica creada automáticamente`,
      }
    });
    
    console.log(`⚠️ Factura LEGACY creada: ${invoiceNumber} (fecha: ${paymentRow.fectra})`);
  }
  
  // Crear el pago
  // ⚠️ IMPORTANTE: Usar fecemi para la fecha del PAGO
  await prisma.payment.upsert({
    where: { receiptNumber: paymentRow.numdoc.trim() },
    create: {
      receiptNumber: paymentRow.numdoc.trim(),
      amount: paymentRow.valcob,
      paymentDate: paymentRow.fecemi,  // Fecha del pago (NO de la factura)
      concept: paymentRow.concep,
      invoiceId: invoice.id,
    },
    update: {} // No actualizar si ya existe
  });
}

/*
 * EJEMPLO REAL:
 * 
 * Registro de pago (AB):
 *   numtra: 001002-00119478
 *   fectra: 2025-07-08 (factura de julio)
 *   fecemi: 2026-01-07 (pago en enero)
 *   valcob: 72.88
 * 
 * Resultado:
 *   Invoice:
 *     - invoiceNumber: 001-002-000119478
 *     - issueDate: 2025-07-08 ✓ (fectra)
 *     - isLegacy: true
 *   
 *   Payment:
 *     - paymentDate: 2026-01-07 ✓ (fecemi)
 *     - amount: 72.88
 */
```

### Idempotencia - Múltiples Cargas por Día

```javascript
// El sistema usa UPSERT para garantizar idempotencia
// Subir el mismo archivo 10 veces = mismo resultado

await prisma.invoice.upsert({
  where: { invoiceNumber: normalized },  // Clave única
  create: { /* datos completos */ },
  update: { /* solo actualizar si hay cambios */ }
});

await prisma.payment.upsert({
  where: { receiptNumber: receiptNum },  // Clave única
  create: { /* datos completos */ },
  update: {} // Pagos no se actualizan, solo se crean
});
```

### Optimización: Carga Incremental por Fechas

```javascript
// Primera carga: Histórico completo
// Cargas siguientes: Solo nuevos registros

async function importWithDateFilter(file, dateFrom, dateTo) {
  const rows = parseFile(file);
  
  // Filtrar por rango de fechas
  const filteredRows = rows.filter(row => {
    const fecha = row.fecemi;
    return fecha >= dateFrom && fecha <= dateTo;
  });
  
  // Procesar solo registros filtrados
  // El upsert protege contra duplicados si hay solapamiento
  await processRows(filteredRows);
}
```

---

## 🎨 INTERFAZ DE USUARIO

### Nueva Sección en Menú (Rol: CAJA / ADMIN)

```
📊 Dashboard
📄 Documentos
👥 Usuarios
💰 Facturación  ← NUEVO
   ├─ 📤 Importar Datos
   ├─ 📋 Facturas
   ├─ 💵 Pagos
   └─ 📊 Reportes
⚙️ Configuración
```

### Pantalla: Importar Datos

```
┌─────────────────────────────────────────────────────────────┐
│ 📤 IMPORTAR DATOS DE KOINOR                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     📁 Arrastra el archivo aquí                    │   │
│  │        o haz clic para seleccionar                 │   │
│  │                                                     │   │
│  │     Formatos aceptados: .xls, .xlsx, .csv          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Filtro de fechas (opcional):                               │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Desde: 📅    │  │ Hasta: 📅    │  [Cargar última fecha] │
│  └──────────────┘  └──────────────┘                        │
│                                                             │
│  [        PROCESAR ARCHIVO        ]                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 📜 HISTORIAL DE IMPORTACIONES                               │
├─────────────────────────────────────────────────────────────┤
│ Fecha        │ Archivo           │ Estado    │ Detalles    │
│──────────────┼───────────────────┼───────────┼─────────────│
│ 17/01/2026   │ POR_COBRAR26.xls  │ ✅ OK     │ FC:45 AB:89 │
│ 16/01/2026   │ POR_COBRAR26.xls  │ ✅ OK     │ FC:12 AB:23 │
│ 15/01/2026   │ POR_COBRAR26.xls  │ ⚠️ Errores│ Ver log     │
└─────────────────────────────────────────────────────────────┘
```

### Pantalla: Lista de Facturas

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 FACTURAS                                    [+ Exportar] │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Buscar: [_______________] │ Estado: [Todos ▼] │ 📅 Rango │
├─────────────────────────────────────────────────────────────┤
│ Nº Factura        │ Cliente        │ Total   │ Saldo  │ Est│
│───────────────────┼────────────────┼─────────┼────────┼────│
│ 001-002-000123341 │ 360CORP S.A.   │ $76.98  │ $60.28 │ 🟡 │
│ 001-002-000123342 │ 360CORP S.A.   │ $80.29  │ $62.84 │ 🟡 │
│ 001-002-000123871 │ 360CORP S.A.   │ $70.82  │ $0.00  │ 🟢 │
│ 001-002-000119478 │ 360CORP S.A.   │ $72.88  │ $0.00  │ 🟢 │
│ ⚠️ LEGACY         │                │         │        │    │
└─────────────────────────────────────────────────────────────┘

Leyenda: 🟢 Pagada  🟡 Parcial  🔴 Pendiente  ⚫ Vencida
```

### Pantalla: Detalle de Factura

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 FACTURA 001-002-000123341                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cliente: 360CORP S.A. (1792890438001)                      │
│  Fecha Emisión: 01/12/2025                                  │
│  Fecha Vencimiento: 02/12/2025                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Total Factura:        $76.98                        │   │
│  │ Total Pagado:        -$16.70                        │   │
│  │ ──────────────────────────────                      │   │
│  │ Saldo Pendiente:      $60.28                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Estado: 🟡 PAGO PARCIAL                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 💵 HISTORIAL DE PAGOS                                       │
├─────────────────────────────────────────────────────────────┤
│ Fecha      │ Recibo          │ Monto  │ Concepto           │
│────────────┼─────────────────┼────────┼────────────────────│
│ 09/12/2025 │ 001-2512000152  │ $16.70 │ ABONO FACT 123341  │
│            │                 │        │                    │
│ (Sin más pagos registrados)                                │
└─────────────────────────────────────────────────────────────┘
```

### Integración con Vista de Documentos

En la vista de documento existente, agregar sección:

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 DOCUMENTO 20251701018D00531                              │
├─────────────────────────────────────────────────────────────┤
│ ...datos existentes del documento...                        │
├─────────────────────────────────────────────────────────────┤
│ 💰 ESTADO DE PAGO                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟡 SALDO PENDIENTE: $60.28                          │   │
│  │                                                     │   │
│  │ Factura: 001-002-000123341                          │   │
│  │ Total: $76.98  │  Pagado: $16.70                    │   │
│  │                                                     │   │
│  │ ℹ️ Informar al cliente sobre saldo pendiente        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Ver detalle de factura]                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [ENTREGAR DOCUMENTO]  ← SIN BLOQUEO (solo alerta)   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 MÓDULO FINANCIERO PARA MATRIZADORES

### Objetivo
Permitir a los matrizadores gestionar y dar seguimiento a los cobros de sus clientes, incluyendo envío de recordatorios por WhatsApp.

### Nueva Sección en Menú (Rol: MATRIZADOR)

```
📊 Dashboard
📄 Mis Documentos
💰 Cartera de Cobros  ← NUEVO
   ├─ 📋 Facturas Pendientes
   ├─ 📊 Resumen por Cliente
   └─ 📤 Enviar Recordatorios
⚙️ Configuración
```

### Pantalla: Cartera de Cobros (Matrizador)

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 MI CARTERA DE COBROS                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 RESUMEN                                                 │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Total Deuda  │ Vencido      │ Por Vencer   │            │
│  │ $2,450.00    │ $890.00      │ $1,560.00    │            │
│  │ 15 facturas  │ 5 facturas   │ 10 facturas  │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Filtros: [Todos ▼] [Vencidos] [Por vencer] [Mi cartera] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 360CORP S.A.                           Total: $316.05   ││
│ │ RUC: 1792890438001                                      ││
│ │ ──────────────────────────────────────────────────────  ││
│ │ • 001-002-000123341  $76.98   Saldo: $60.28   🟡 Parcial││
│ │ • 001-002-000123342  $80.29   Saldo: $62.84   🟡 Parcial││
│ │ • 001-002-000123871  $70.82   Saldo: $55.46   🔴 Pend.  ││
│ │                                                         ││
│ │ [📱 Enviar Recordatorio WhatsApp]  [📧 Ver Historial]   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ CONSTRUCTORA ABC S.A.                  Total: $450.00   ││
│ │ RUC: 1792345678001                                      ││
│ │ ──────────────────────────────────────────────────────  ││
│ │ • 001-002-000124100  $450.00  Saldo: $450.00  🔴 Pend.  ││
│ │                                         ⚠️ VENCIDA 15d  ││
│ │                                                         ││
│ │ [📱 Enviar Recordatorio WhatsApp]  [📧 Ver Historial]   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mensaje de Recordatorio de Cobro (wa.me)

```
📋 NOTARÍA 18 - RECORDATORIO DE PAGO

Estimado cliente,

Le recordamos que tiene los siguientes valores pendientes:

📄 Factura: 001-002-000123341
   • Total: $76.98
   • Pagado: $16.70
   • Saldo: $60.28
   • Vencimiento: 02/12/2025

📄 Factura: 001-002-000123342
   • Total: $80.29
   • Saldo: $62.84

💰 TOTAL PENDIENTE: $123.12

Para su comodidad puede realizar el pago mediante:
• Transferencia bancaria
• Pago en efectivo en nuestras oficinas

Atentamente,
Notaría Décima Octava del Cantón Quito
📍 [Dirección]
📞 [Teléfono]
```

### Flujo de Envío de Recordatorio

```
Matrizador selecciona cliente
        │
        ▼
Click en "Enviar Recordatorio WhatsApp"
        │
        ▼
┌─────────────────────────────────────────┐
│ VISTA PREVIA DEL MENSAJE                │
│                                         │
│ [Mensaje auto-generado con facturas]    │
│                                         │
│ Teléfono: 0987654321                    │
│ ✏️ [Editar mensaje]                     │
│                                         │
│ [Cancelar]  [Abrir WhatsApp]            │
└─────────────────────────────────────────┘
        │
        ▼
Abre wa.me con mensaje pre-llenado
        │
        ▼
Registrar en historial de seguimiento

```

---

## ℹ️ SISTEMA DE ALERTAS (SIN BLOQUEO)

### Enfoque: Informativo, No Restrictivo

El sistema **NO bloqueará** entregas de documentos. En su lugar:

1. **Alerta visual** en recepción cuando hay saldo pendiente
2. **Mensaje preventivo** por WhatsApp al notificar documento listo
3. **Registro de auditoría** de entregas con saldo pendiente
4. **Herramientas de seguimiento** para matrizadores

### Función de Verificación de Saldo (Informativa)

### Función de Verificación de Saldo (Informativa)

```javascript
// Función para obtener estado de pago de un documento (INFORMATIVA, NO BLOQUEA)
async function getDocumentPaymentStatus(documentId) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      invoices: {
        include: {
          payments: true
        }
      }
    }
  });
  
  // Si no tiene facturas asociadas
  if (!document.invoices || document.invoices.length === 0) {
    return { 
      hasInvoice: false,
      status: 'NO_INVOICE',
      message: 'Sin factura asociada',
      totalDebt: 0
    };
  }
  
  // Calcular saldo total de todas las facturas
  let totalAmount = 0;
  let totalPaid = 0;
  const invoiceDetails = [];
  
  for (const invoice of document.invoices) {
    const paid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount), 0
    );
    const balance = Number(invoice.totalAmount) - paid;
    
    totalAmount += Number(invoice.totalAmount);
    totalPaid += paid;
    
    invoiceDetails.push({
      invoiceNumber: invoice.invoiceNumber,
      total: Number(invoice.totalAmount),
      paid: paid,
      balance: balance,
      status: balance <= 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING')
    });
  }
  
  const totalDebt = totalAmount - totalPaid;
  
  return {
    hasInvoice: true,
    status: totalDebt <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING'),
    message: totalDebt <= 0 
      ? 'Pagado completamente' 
      : `Saldo pendiente: $${totalDebt.toFixed(2)}`,
    totalAmount,
    totalPaid,
    totalDebt,
    invoices: invoiceDetails
  };
}
```

### Uso en Vista de Recepción

```javascript
// En el componente de entrega de documento
const paymentStatus = await getDocumentPaymentStatus(documentId);

// Mostrar alerta visual si hay saldo
if (paymentStatus.totalDebt > 0) {
  showAlert({
    type: 'warning',  // Amarillo, informativo
    title: 'Saldo Pendiente',
    message: `Este documento tiene un saldo de $${paymentStatus.totalDebt.toFixed(2)}`,
    action: 'Informar al cliente'
  });
}

// El botón ENTREGAR siempre está habilitado
// Solo se registra en auditoría si se entrega con saldo
```

### Integración con Mensaje WhatsApp de Documento Listo

Cuando se envía la notificación de "documento listo", incluir información de saldo:

```javascript
function buildDocumentoListoMessage(document, paymentStatus) {
  let message = `📄 NOTARÍA 18 - DOCUMENTO LISTO\n\n`;
  message += `Su documento está listo para retiro:\n`;
  message += `• Escritura: ${document.codigoBarras}\n`;
  message += `• Tipo: ${document.tipoActo}\n\n`;
  
  // Si tiene saldo pendiente, incluir información
  if (paymentStatus.hasInvoice && paymentStatus.totalDebt > 0) {
    message += `💰 INFORMACIÓN DE PAGO:\n`;
    message += `• Factura: ${paymentStatus.invoices[0].invoiceNumber}\n`;
    message += `• Total: $${paymentStatus.totalAmount.toFixed(2)}\n`;
    message += `• Pagado: $${paymentStatus.totalPaid.toFixed(2)}\n`;
    message += `• Saldo pendiente: $${paymentStatus.totalDebt.toFixed(2)}\n\n`;
    message += `⚠️ Por favor regularice su pago antes de retirar.\n\n`;
  }
  
  message += `📍 Horario: Lunes a Viernes 8:00-17:00`;
  
  return message;
}
```

---

## 📊 REPORTES

### Reporte 1: Cartera por Cobrar

```sql
SELECT 
  c.taxId AS "Cédula/RUC",
  c.name AS "Cliente",
  COUNT(i.id) AS "Facturas Pendientes",
  SUM(i.totalAmount) AS "Total Facturado",
  SUM(COALESCE(p.paid, 0)) AS "Total Pagado",
  SUM(i.totalAmount) - SUM(COALESCE(p.paid, 0)) AS "Saldo"
FROM financial_clients c
JOIN invoices i ON c.id = i.clientId
LEFT JOIN (
  SELECT invoiceId, SUM(amount) as paid
  FROM payments
  GROUP BY invoiceId
) p ON i.id = p.invoiceId
WHERE i.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
GROUP BY c.id, c.taxId, c.name
ORDER BY "Saldo" DESC;
```

### Reporte 2: Pagos del Período

```sql
SELECT 
  p.paymentDate AS "Fecha",
  p.receiptNumber AS "Recibo",
  c.name AS "Cliente",
  i.invoiceNumber AS "Factura",
  p.amount AS "Monto",
  p.concept AS "Concepto"
FROM payments p
JOIN invoices i ON p.invoiceId = i.id
JOIN financial_clients c ON i.clientId = c.id
WHERE p.paymentDate BETWEEN :fechaInicio AND :fechaFin
ORDER BY p.paymentDate DESC;
```

### Reporte 3: Facturas Vencidas

```sql
SELECT 
  i.invoiceNumber AS "Factura",
  c.name AS "Cliente",
  i.issueDate AS "Emisión",
  i.dueDate AS "Vencimiento",
  DATEDIFF(CURRENT_DATE, i.dueDate) AS "Días Vencido",
  i.totalAmount - COALESCE(SUM(p.amount), 0) AS "Saldo"
FROM invoices i
JOIN financial_clients c ON i.clientId = c.id
LEFT JOIN payments p ON i.id = p.invoiceId
WHERE i.dueDate < CURRENT_DATE
  AND i.status != 'PAID'
GROUP BY i.id
ORDER BY "Días Vencido" DESC;
```

---

## 🚀 SPRINTS DE DESARROLLO

---

### 📦 SPRINT 1: FUNDAMENTOS (3-4 días)
**Objetivo:** Establecer la base de datos y estructura del módulo

#### Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.1 | Crear migración Prisma con modelos: `Invoice`, `Payment`, `ImportLog` | ✅ | Sin FinancialClient (usa datos de Document) |
| 1.2 | Agregar relación `invoices` al modelo `Document` existente | ✅ | |
| 1.3 | Ejecutar migración en ambiente de desarrollo | ✅ | Railway PostgreSQL |
| 1.4 | Crear utilidad de normalización de número de factura | ✅ | `001002-00123341` → `001-002-000123341` |
| 1.5 | Crear utilidad de parsing de fechas (Excel serial → Date) | ✅ | |
| 1.6 | Configurar rutas base: `/api/billing/*` | ✅ | Health check funcionando |
| 1.7 | Probar migración en staging | ✅ | 2,790 filas Excel verificadas |

#### Criterios de Aceptación
- [x] Modelos creados y migración ejecutada sin errores
- [x] Índices creados para campos de búsqueda frecuente
- [x] Utilidades de transformación probadas con datos reales

---

### 📦 SPRINT 2: SERVICIO DE IMPORTACIÓN (4-5 días) ✅ COMPLETADO
**Objetivo:** Implementar lógica completa de importación idempotente

**Resultados del Test (2026-01-17):**
- Primera ejecución: 2,789 filas → 1,181 facturas + 1,585 pagos
- Segunda ejecución: 0 nuevos registros (idempotencia verificada)
- 4 errores menores (pagos sin numdoc)

#### Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 2.1 | Instalar dependencias: `xlsx`, `csv-parser` | ✅ | xlsx ya instalado en Sprint 1 |
| 2.2 | Crear servicio `import-koinor-service.js` | ✅ | |
| 2.3 | Implementar parsing de archivo XLS/CSV | ✅ | |
| 2.4 | Implementar función de normalización de número de factura | ✅ | En billing-utils.js (Sprint 1) |
| 2.5 | Implementar procesamiento de facturas FC (upsert) | ✅ | |
| 2.6 | Implementar procesamiento de pagos AB (upsert) | ✅ | |
| 2.7 | Implementar lógica de "Auto-Healing" para facturas legacy | ✅ | Usa `fectra` para fecha |
| 2.8 | Implementar cálculo y actualización de estados de factura | ✅ | |
| 2.9 | **Implementar vinculación automática Invoice ↔ Document** | ✅ | Por `numeroFactura` |
| 2.10 | Implementar registro en `ImportLog` | ✅ | |
| 2.11 | Crear endpoint `POST /api/billing/import` | ✅ | Con multer upload |
| 2.12 | Pruebas con archivo real `POR_COBRAR26.xls` | ✅ | 2,789 filas |
| 2.13 | Pruebas de idempotencia (cargar mismo archivo 3 veces) | ✅ | 0 duplicados |
| 2.14 | Verificar vinculación correcta con documentos existentes | ✅ | Funcionando |

#### Criterios de Aceptación
- [x] Importación procesa correctamente facturas y pagos
- [x] Pagos de facturas anteriores crean facturas legacy automáticamente
- [x] Múltiples cargas del mismo archivo no duplican datos
- [x] Estados de factura se calculan correctamente
- [x] Log de importación registra estadísticas

---

### 📦 SPRINT 3: API Y CONSULTAS (3-4 días)
**Objetivo:** Crear endpoints para consultar y gestionar datos financieros

#### Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 3.1 | Crear controlador `billing-controller.js` | ⬜ | |
| 3.2 | Endpoint: `GET /api/billing/invoices` (lista con filtros) | ⬜ | |
| 3.3 | Endpoint: `GET /api/billing/invoices/:id` (detalle) | ⬜ | |
| 3.4 | Endpoint: `GET /api/billing/invoices/:id/payments` | ⬜ | |
| 3.5 | Endpoint: `GET /api/billing/payments` (lista con filtros) | ⬜ | |
| 3.6 | Endpoint: `GET /api/billing/clients` | ⬜ | |
| 3.7 | Endpoint: `GET /api/billing/clients/:taxId/balance` | ⬜ | |
| 3.8 | Endpoint: `GET /api/billing/import-logs` | ⬜ | |
| 3.9 | Función: `getDocumentPaymentStatus(documentId)` | ⬜ | |
| 3.10 | Integrar estado de pago en `GET /api/documents/:id` | ⬜ | |

#### Criterios de Aceptación
- [ ] Todos los endpoints responden correctamente
- [ ] Filtros funcionan (por estado, fecha, cliente)
- [ ] Paginación implementada
- [ ] Estado de pago visible en detalle de documento

---

### 📦 SPRINT 4: INTERFAZ DE USUARIO (4-5 días)
**Objetivo:** Crear las pantallas del módulo de facturación

#### Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 4.1 | Agregar sección "Facturación" al menú lateral | ⬜ | Roles: CAJA, ADMIN |
| 4.2 | Crear página `ImportarDatos.jsx` | ⬜ | |
| 4.3 | Implementar componente de upload con drag & drop | ⬜ | |
| 4.4 | Implementar filtro de fechas para importación | ⬜ | |
| 4.5 | Mostrar historial de importaciones | ⬜ | |
| 4.6 | Crear página `ListaFacturas.jsx` | ⬜ | |
| 4.7 | Implementar filtros y búsqueda de facturas | ⬜ | |
| 4.8 | Crear página `DetalleFactura.jsx` | ⬜ | |
| 4.9 | Mostrar historial de pagos en detalle | ⬜ | |
| 4.10 | Crear página `ListaPagos.jsx` | ⬜ | |
| 4.11 | Crear servicio `billing-service.js` (frontend) | ⬜ | |

#### Criterios de Aceptación
- [ ] Navegación funcional desde menú
- [ ] Importación de archivo funciona desde UI
- [ ] Lista de facturas muestra estados correctos
- [ ] Detalle de factura muestra pagos asociados

---

### 📦 SPRINT 5: ALERTAS Y NOTIFICACIONES (2-3 días)
**Objetivo:** Mostrar estado de pago en documentos y en mensajes WhatsApp (SIN bloqueo)

#### Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 5.1 | Crear componente `EstadoPago.jsx` | ⬜ | Widget informativo (alerta visual) |
| 5.2 | Integrar `EstadoPago` en vista de documento (recepción) | ⬜ | Solo informativo, sin bloquear |
| 5.3 | Implementar función `getDocumentPaymentStatus()` | ⬜ | Retorna info de saldo |
| 5.4 | Modificar mensaje WhatsApp "documento listo" | ⬜ | Incluir info de saldo pendiente |
| 5.5 | Registrar en auditoría entregas con saldo pendiente | ⬜ | Para reportes posteriores |
| 5.6 | Agregar indicador visual en lista de documentos | ⬜ | 🟢🟡🔴 según estado de pago |

#### Enfoque
- ✅ **Alertas informativas** - Recepción ve el saldo pero puede entregar
- ✅ **Mensaje preventivo** - WhatsApp incluye saldo para que cliente pague antes
- ❌ **Sin bloqueo** - No se impide la entrega por saldo pendiente

#### Criterios de Aceptación
- [ ] Estado de pago visible en detalle de documento
- [ ] Mensaje WhatsApp incluye información de saldo si existe
- [ ] Entregas con saldo quedan registradas en auditoría
- [ ] No se bloquea ninguna entrega por motivos de pago

---

### 📦 SPRINT 6: MÓDULO CARTERA MATRIZADORES (3-4 días)
**Objetivo:** Herramientas para que matrizadores gestionen cobros de sus clientes

#### Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 6.1 | Agregar sección "Cartera de Cobros" al menú de matrizador | ⬜ | |
| 6.2 | Crear página `CarteraCobros.jsx` | ⬜ | Vista principal |
| 6.3 | Implementar endpoint `/api/billing/my-portfolio` | ⬜ | Facturas de documentos del matrizador |
| 6.4 | Vista de resumen por cliente (agrupado) | ⬜ | Total deuda por cliente |
| 6.5 | Implementar "Enviar Recordatorio WhatsApp" | ⬜ | Usa wa.me con mensaje pre-generado |
| 6.6 | Crear función `buildCollectionReminderMessage()` | ⬜ | Genera mensaje de cobro |
| 6.7 | Registrar historial de recordatorios enviados | ⬜ | Para seguimiento |
| 6.8 | Filtros: Vencidas, Por vencer, Mi cartera | ⬜ | |

#### Criterios de Aceptación
- [ ] Matrizador ve facturas pendientes de sus documentos
- [ ] Puede enviar recordatorio WhatsApp con un clic
- [ ] Mensaje incluye detalle de facturas y montos
- [ ] Historial de recordatorios enviados disponible

---

### 📦 SPRINT 7: REPORTES Y POLISH (3-4 días)
**Objetivo:** Agregar reportes y pulir la experiencia

#### Tareas

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 7.1 | Crear página `Reportes.jsx` | ⬜ | |
| 7.2 | Implementar reporte: Cartera por Cobrar | ⬜ | |
| 7.3 | Implementar reporte: Pagos del Período | ⬜ | |
| 7.4 | Implementar reporte: Facturas Vencidas | ⬜ | |
| 7.5 | Implementar reporte: Entregas con Saldo Pendiente | ⬜ | De auditoría |
| 7.6 | Agregar exportación a Excel | ⬜ | |
| 7.7 | Agregar indicadores en Dashboard principal | ⬜ | |
| 7.8 | Optimizar consultas con índices adicionales | ⬜ | |
| 7.9 | Documentar API en README | ⬜ | |
| 7.10 | Pruebas de usuario final | ⬜ | |

#### Criterios de Aceptación
- [ ] Reportes generan información correcta
- [ ] Exportación a Excel funciona
- [ ] Dashboard muestra resumen financiero
- [ ] Sistema probado por usuario final

---

## 📅 CRONOGRAMA ESTIMADO

| Sprint | Duración | Inicio | Fin | Descripción |
|--------|----------|--------|-----|-------------|
| Sprint 1: Fundamentos | 3-4 días | Día 1 | Día 4 | Base de datos y estructura |
| Sprint 2: Importación | 4-5 días | Día 5 | Día 10 | Servicio de carga de datos |
| Sprint 3: API | 3-4 días | Día 11 | Día 14 | Endpoints de consulta |
| Sprint 4: UI Caja/Admin | 4-5 días | Día 15 | Día 20 | Interfaz de importación y facturas |
| Sprint 5: Alertas | 2-3 días | Día 21 | Día 23 | Estado de pago en documentos |
| Sprint 6: Cartera Matrizadores | 3-4 días | Día 24 | Día 28 | Seguimiento de cobros |
| Sprint 7: Reportes | 3-4 días | Día 29 | Día 32 | Reportes y polish |

**Total estimado: 5 semanas**

### Cambios vs versión anterior:
- ✅ **Modelo simplificado** - Sin tabla FinancialClient (usa datos de Document)
- ✅ **Sin bloqueo de entregas** - Solo alertas informativas
- ✅ **Nuevo Sprint 6** - Módulo de cartera para matrizadores
- ✅ **Mensajes WhatsApp** - Incluyen saldo en notificación + recordatorios de cobro

---

## 🔧 CONFIGURACIÓN Y VARIABLES DE ENTORNO

```env
# Nuevas variables para el módulo de facturación
# (Agregar a .env existente)

# Configuración de importación
BILLING_IMPORT_MAX_FILE_SIZE=10485760  # 10MB
BILLING_IMPORT_ALLOWED_EXTENSIONS=.xls,.xlsx,.csv

# Configuración de bloqueo de entrega
BILLING_BLOCK_DELIVERY_ON_DEBT=true
BILLING_ALLOW_SUPERVISOR_OVERRIDE=true

# Retención de logs de importación (días)
BILLING_IMPORT_LOG_RETENTION_DAYS=90
```

---

## 📝 NOTAS TÉCNICAS IMPORTANTES

### 1. Sobre la Vinculación Factura ↔ Documento

**✅ VINCULACIÓN AUTOMÁTICA CONFIRMADA**

El modelo `Document` ya tiene el campo `numeroFactura` con formato `001-002-000119478`, que coincide exactamente con el `invoiceNumber` normalizado del sistema Koinor.

**Lógica de vinculación (en el proceso de importación):**

```javascript
// Después de crear/actualizar la factura
async function linkInvoiceToDocument(invoice) {
  // Buscar documento con el mismo número de factura
  const document = await prisma.document.findFirst({
    where: { 
      numeroFactura: invoice.invoiceNumber // 001-002-000119478
    }
  });
  
  if (document) {
    // Vincular factura al documento
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { documentId: document.id }
    });
    
    console.log(`✅ Factura ${invoice.invoiceNumber} vinculada a documento ID ${document.id}`);
  }
  // Si no encuentra documento, la factura queda sin vincular (normal para facturas legacy)
}
```

**Ejemplo real:**
```
Factura importada: 001-002-000119478
         ↓
Busca en Document: WHERE numeroFactura = '001-002-000119478'
         ↓
Encuentra: Escritura 20251701018P01517 (Declaración Juramentada)
         ↓
Vincula: Invoice.documentId = Document.id
         ↓
Resultado: Estado de pago visible en el documento ✓
```

**Casos especiales:**
- **Factura sin documento:** Facturas de servicios generales, no vinculadas a escrituras
- **Factura LEGACY:** Puede que el documento ya no esté en el sistema (anterior a noviembre 2025)
- **Múltiples facturas por documento:** El modelo soporta relación 1:N

### 3. Sobre Múltiples Facturas por Documento

Un documento notarial podría tener múltiples facturas (ej: honorarios + IVA):
- El modelo permite relación 1:N (Document → Invoice[])
- La lógica de bloqueo suma saldos de todas las facturas

### 4. Sobre Rendimiento

Para archivos grandes (>10,000 filas):
- Considerar procesamiento en chunks
- Usar transacciones Prisma para atomicidad
- Implementar progress bar en UI

---

## ✅ CHECKLIST FINAL DE IMPLEMENTACIÓN

### Backend
- [ ] Migración Prisma ejecutada en producción
- [ ] Servicio de importación probado con datos reales
- [ ] Endpoints de API documentados
- [ ] Lógica de bloqueo integrada en entrega
- [ ] Logs y auditoría funcionando

### Frontend
- [ ] Sección de Facturación accesible
- [ ] Importación de archivos funcional
- [ ] Listas con filtros y paginación
- [ ] Estado de pago visible en documentos
- [ ] Reportes generando correctamente

### Integración
- [ ] Vinculación factura-documento operativa
- [ ] Bloqueo de entrega funcionando
- [ ] Dashboard con indicadores financieros

### Documentación
- [ ] README actualizado
- [ ] Manual de usuario para caja
- [ ] Procedimiento de importación documentado

---

## 📞 SOPORTE Y CONTACTO

Para dudas sobre este módulo:
- Revisar logs de importación en `/api/billing/import-logs`
- Verificar formato de archivo antes de importar
- Contactar al desarrollador si hay errores recurrentes

---

*Documento creado: Enero 2026*
*Última actualización: [FECHA]*
*Versión: 1.0*
