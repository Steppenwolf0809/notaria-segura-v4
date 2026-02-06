# INSTRUCCIONES PARA CURSOR: Tabla CXC + Sync Automático desde Koinor

## 🎯 OBJETIVO

Implementar el módulo de **Cuentas por Cobrar (CXC)** con dos cambios:

1. **Nueva tabla `pending_receivables`** en Railway/PostgreSQL para almacenar TODA la cartera pendiente (incluye deudas anteriores a noviembre 2025 que `invoices` no conoce)
2. **Nuevo endpoint** en Railway que reciba datos de CXC del Sync Agent
3. **Endpoints de consulta** para que el frontend pueda mostrar la cartera completa

### ¿Por qué tabla separada?

| Tabla | Propósito | Fuente |
|-------|-----------|--------|
| `invoices` + `payments` | Registro contable de transacciones reales | Sync Agent (pagos) |
| `pending_receivables` | Foto actualizada de saldos pendientes | Sync Agent (CXC) |

**Dato clave:** Hay **125 facturas con $21,326 de deuda** anteriores a noviembre 2025 que Notaría Segura NO conoce. Solo existen en Koinor.

---

## 🔴 ARCHIVOS DE CONTEXTO CRÍTICOS

```
backend/prisma/schema.prisma              # Agregar modelo PendingReceivable
backend/src/controllers/sync-controller.js # Agregar método syncCxc
backend/src/routes/sync-routes.js          # Agregar ruta POST /api/sync/cxc
backend/src/controllers/billing-controller.js # Agregar consultas de cartera
backend/src/routes/billing-routes.js       # Agregar rutas de consulta
```

## 🟡 ARCHIVOS IMPORTANTES

```
backend/src/db.js                          # Instancia Prisma singleton
backend/src/middleware/api-key-middleware.js # Autenticación del Sync Agent
backend/src/middleware/auth-middleware.js   # Autenticación JWT para consultas
backend/src/utils/billing-utils.js         # Utilidades de normalización
```

## 🟢 OPCIONALES

```
backend/src/utils/logger.js               # Para logging consistente
frontend/src/components/billing/CarteraCobros.jsx  # UI existente a adaptar
frontend/src/components/billing/Reportes.jsx       # Reportes existentes
frontend/src/services/billing-service.js           # Servicios frontend
```

---

## 🗄️ FASE 1: MIGRACIÓN DE BASE DE DATOS

### 1.1 Agregar modelo en `backend/prisma/schema.prisma`

Agregar al final del archivo, ANTES de cerrar:

```prisma
// ============================================
// CUENTAS POR COBRAR (CXC) - CARTERA PENDIENTE
// Tabla separada de invoices.
// Almacena la foto completa de saldos pendientes
// sincronizada automáticamente desde Koinor.
// Incluye deudas históricas que invoices no conoce.
// ============================================

model PendingReceivable {
  id                String   @id @default(uuid())
  
  // === IDENTIFICACIÓN DEL CLIENTE ===
  clientTaxId       String                        // Cédula/RUC del cliente
  clientName        String                        // Nombre del cliente
  
  // === IDENTIFICACIÓN DE LA FACTURA ===
  invoiceNumberRaw  String   @unique              // Número factura original (ej: "001002-00124369")
  invoiceNumber     String?                       // Número normalizado (ej: "001-002-000124369")
  
  // === MONTOS ===
  totalAmount       Decimal  @db.Decimal(12, 2)   // Valor original de la factura
  balance           Decimal  @db.Decimal(12, 2)   // Saldo pendiente actual
  totalPaid         Decimal  @db.Decimal(12, 2) @default(0)  // Monto total pagado
  
  // === FECHAS ===
  issueDate         DateTime?                     // Fecha de emisión de la factura
  dueDate           DateTime?                     // Fecha de vencimiento
  lastPaymentDate   DateTime?                     // Fecha del último pago recibido
  
  // === ESTADO ===
  status            String   @default("PENDING")  // PENDING, PARTIAL, PAID, OVERDUE, CANCELLED
  daysOverdue       Int      @default(0)          // Días de mora (calculado en cada sync)
  hasCreditNote     Boolean  @default(false)      // Tiene nota de crédito aplicada
  
  // === METADATA DE SINCRONIZACIÓN ===
  lastSyncAt        DateTime @default(now())      // Última vez que se actualizó desde Koinor
  syncSource        String   @default("SYNC_AGENT") // SYNC_AGENT o MANUAL_XLS
  
  // === TIMESTAMPS ===
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // === ÍNDICES ===
  @@index([clientTaxId])
  @@index([status])
  @@index([balance])
  @@index([dueDate])
  @@index([lastSyncAt])
  @@map("pending_receivables")
}
```

### 1.2 Crear y ejecutar migración

```bash
cd backend
npx prisma migrate dev --name add_pending_receivables_table
```

### 1.3 SQL equivalente (si se necesita aplicar manualmente en Railway)

```sql
CREATE TABLE "pending_receivables" (
  "id" TEXT NOT NULL,
  "clientTaxId" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "invoiceNumberRaw" TEXT NOT NULL,
  "invoiceNumber" TEXT,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL,
  "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "issueDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "lastPaymentDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "daysOverdue" INTEGER NOT NULL DEFAULT 0,
  "hasCreditNote" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "syncSource" TEXT NOT NULL DEFAULT 'SYNC_AGENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pending_receivables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_receivables_invoiceNumberRaw_key" ON "pending_receivables"("invoiceNumberRaw");
CREATE INDEX "pending_receivables_clientTaxId_idx" ON "pending_receivables"("clientTaxId");
CREATE INDEX "pending_receivables_status_idx" ON "pending_receivables"("status");
CREATE INDEX "pending_receivables_balance_idx" ON "pending_receivables"("balance");
CREATE INDEX "pending_receivables_dueDate_idx" ON "pending_receivables"("dueDate");
CREATE INDEX "pending_receivables_lastSyncAt_idx" ON "pending_receivables"("lastSyncAt");
```

### ⚠️ Decisión de diseño: `invoiceNumberRaw` es UNIQUE

A diferencia del plan original que usaba `@@unique([invoiceNumberRaw, reportDate])`, aquí usamos `@unique` solo en `invoiceNumberRaw` porque:
- El Sync Agent envía datos en tiempo real, no "reportes" con fecha
- Cada factura pendiente es un registro vivo que se actualiza (upsert)
- Cuando una factura se paga completamente, su `status` cambia a PAID y `balance` a 0
- No necesitamos múltiples "fotos" históricas, solo el estado actual

---

## 🔧 FASE 2: ENDPOINT PARA RECIBIR CXC DEL SYNC AGENT

### 2.1 Agregar en `backend/src/controllers/sync-controller.js`

Agregar un nuevo método `syncCxc` que:

1. Reciba array de facturas con saldo pendiente desde el Sync Agent
2. Para cada factura haga **UPSERT** por `invoiceNumberRaw`:
   - Si no existe → CREATE
   - Si existe → UPDATE (balance, totalPaid, status, daysOverdue, lastPaymentDate, etc.)
3. **Marcar como PAID** las facturas que ya no vienen en el array (fueron pagadas en Koinor)
   - Buscar facturas en `pending_receivables` con `status != 'PAID'` que NO están en el lote actual
   - Solo marcar como PAID si `lastSyncAt` es anterior a la sync actual (evitar falsos positivos)
   - IMPORTANTE: Solo hacer esto si el Sync Agent envía flag `fullSync: true` (indica que mandó TODA la cartera, no solo un delta)
4. Retornar resumen de la operación

**Estructura del payload que recibirá:**

```javascript
{
  type: "cxc",           // Diferenciador vs "billing" (pagos)
  fullSync: true,        // true = envió toda la cartera, false = solo cambios
  timestamp: "ISO date",
  data: [
    {
      invoiceNumberRaw: "001002-00124369",
      clientTaxId: "1703601532",
      clientName: "JUAN PÉREZ",
      totalAmount: 150.00,
      totalPaid: 100.00,
      balance: 50.00,
      status: "PARCIAL",         // PAGADA, PARCIAL, PENDIENTE, ANULADA
      issueDate: "2025-08-04",
      dueDate: "2025-08-05",
      lastPaymentDate: "2025-12-15",  // null si nunca ha pagado
      hasCreditNote: false,
      daysOverdue: 184                // Calculado por el Sync Agent
    }
  ]
}
```

**Mapeo de estados Koinor → PendingReceivable:**

| Koinor `estado_pago` | PendingReceivable `status` |
|----------------------|---------------------------|
| PAGADA | PAID |
| PARCIAL | PARTIAL |
| PENDIENTE + vencida | OVERDUE |
| PENDIENTE + no vencida | PENDING |
| ANULADA | CANCELLED |

**Lógica de upsert:**

```
Para cada factura en data[]:
  1. prisma.pendingReceivable.upsert({
       where: { invoiceNumberRaw },
       create: { ...todos los campos, syncSource: 'SYNC_AGENT' },
       update: { ...campos actualizables, lastSyncAt: new Date() }
     })

Si fullSync === true:
  2. prisma.pendingReceivable.updateMany({
       where: {
         invoiceNumberRaw: { notIn: [lista de invoiceNumberRaw recibidos] },
         status: { notIn: ['PAID', 'CANCELLED'] }
       },
       data: {
         status: 'PAID',
         balance: 0,
         lastSyncAt: new Date()
       }
     })
```

**Respuesta esperada:**

```javascript
{
  success: true,
  message: "CXC sincronizada",
  data: {
    received: 569,
    created: 45,
    updated: 524,
    markedAsPaid: 3,    // Solo si fullSync=true
    errors: 0,
    syncedAt: "ISO date"
  }
}
```

### 2.2 Agregar ruta en `backend/src/routes/sync-routes.js`

```
POST /api/sync/cxc
```

- Autenticación: API Key (mismo middleware `api-key-middleware.js` que usa `/api/sync/billing`)
- Controlador: `syncCxc`

---

## 📊 FASE 3: ENDPOINTS DE CONSULTA PARA FRONTEND

### 3.1 Agregar en `backend/src/controllers/billing-controller.js`

#### Endpoint 1: Cartera pendiente (detalle)

```
GET /api/billing/cartera-pendiente
```

- Autenticación: JWT (roles ADMIN, CAJA, RECEPCION)
- Query params:
  - `page` (default 1)
  - `limit` (default 20)
  - `status` (filtro: PENDING, PARTIAL, OVERDUE, PAID, CANCELLED)
  - `search` (buscar por clientName o clientTaxId)
  - `sortBy` (balance, daysOverdue, dueDate, clientName) default: balance
  - `sortOrder` (asc, desc) default: desc
- Retorna: Lista paginada de facturas pendientes con totales

**Respuesta:**

```javascript
{
  success: true,
  data: {
    receivables: [
      {
        id: "uuid",
        invoiceNumberRaw: "001002-00120202",
        clientTaxId: "1704483492",
        clientName: "JUAN IGNACIO MALO ALVAREZ",
        totalAmount: 3990.63,
        totalPaid: 0,
        balance: 3990.63,
        status: "OVERDUE",
        daysOverdue: 184,
        issueDate: "2025-08-04",
        dueDate: "2025-08-05",
        lastPaymentDate: null,
        lastSyncAt: "2026-02-05T..."
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 569,
      totalPages: 29
    },
    summary: {
      totalBalance: 58557.30,
      totalOverdue: 21326.23,
      countPending: 439,
      countPartial: 130,
      countOverdue: 125
    }
  }
}
```

#### Endpoint 2: Resumen por cliente

```
GET /api/billing/cartera-pendiente/resumen
```

- Autenticación: JWT (roles ADMIN, CAJA)
- Query params:
  - `page` (default 1)
  - `limit` (default 20)
  - `search` (buscar por nombre o cédula)
  - `sortBy` (totalBalance, invoicesCount, maxDaysOverdue) default: totalBalance
  - `sortOrder` (asc, desc) default: desc
- Retorna: Cartera agrupada por cliente

**Lógica:** Agrupar `pending_receivables` por `clientTaxId` donde `balance > 0`:

```javascript
{
  success: true,
  data: {
    clients: [
      {
        clientTaxId: "1791369378001",
        clientName: "CTH S.A.",
        invoicesCount: 147,
        totalBalance: 7394.96,
        oldestDueDate: "2026-02-02",
        maxDaysOverdue: 3,
        invoices: [...]  // Solo si se pide con ?detail=true
      }
    ],
    pagination: { ... },
    summary: {
      totalClients: 250,
      totalBalance: 58557.30,
      totalOverdue: 21326.23
    }
  }
}
```

**Implementación:** Usar raw query o Prisma groupBy:

```
prisma.pendingReceivable.groupBy({
  by: ['clientTaxId', 'clientName'],
  where: { balance: { gt: 0 } },
  _sum: { balance: true },
  _count: { id: true },
  _min: { dueDate: true },
  _max: { daysOverdue: true },
  orderBy: { _sum: { balance: 'desc' } }
})
```

#### Endpoint 3: Estado de sync CXC

```
GET /api/billing/cartera-pendiente/sync-status
```

- Autenticación: JWT (roles ADMIN)
- Retorna: Información sobre la última sincronización

```javascript
{
  success: true,
  data: {
    lastSyncAt: "2026-02-05T10:30:00Z",
    totalRecords: 569,
    totalBalance: 58557.30,
    breakdown: {
      PENDING: 439,
      PARTIAL: 130,
      OVERDUE: 125,
      PAID: 147421  // Opcional, puede ser pesado
    }
  }
}
```

### 3.2 Agregar rutas en `backend/src/routes/billing-routes.js`

```javascript
// === CARTERA POR COBRAR (CXC) ===
router.get('/cartera-pendiente',
  authenticateToken,
  requireRole(['ADMIN', 'CAJA', 'RECEPCION']),
  getCarteraPendiente
);

router.get('/cartera-pendiente/resumen',
  authenticateToken,
  requireRole(['ADMIN', 'CAJA']),
  getCarteraPendienteResumen
);

router.get('/cartera-pendiente/sync-status',
  authenticateToken,
  requireRole(['ADMIN']),
  getCxcSyncStatus
);
```

---

## 🔧 FASE 4: AJUSTES AL SYNC AGENT (Instrucciones separadas)

El Sync Agent (proyecto independiente en el servidor local) necesita una segunda función de sincronización. **Esto se implementará por separado**, pero el endpoint en Railway debe estar listo para recibirla.

**Lo que el Sync Agent hará (para contexto):**

```
Cada 10 minutos:
  1. Sync Pagos (ya existe): 
     - Lee facturas con cambios recientes
     - POST /api/sync/billing
     
  2. Sync CXC (NUEVO):
     - Lee TODAS las facturas con saldo_pendiente > 0
     - Calcula días de mora
     - POST /api/sync/cxc con fullSync: true
```

**Query que el Sync Agent ejecutará contra la VIEW:**

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
    fecha_ultimo_pago,
    tiene_nota_credito,
    CASE 
        WHEN fecha_vencimiento < GETDATE() AND saldo_pendiente > 0 
        THEN DATEDIFF(DAY, fecha_vencimiento, GETDATE())
        ELSE 0
    END AS dias_mora
FROM v_estado_facturas
WHERE saldo_pendiente > 0
ORDER BY saldo_pendiente DESC
```

---

## ✅ VALIDACIONES REQUERIDAS

### En el endpoint POST /api/sync/cxc:
1. Verificar API Key válida
2. Verificar que `type` sea "cxc"
3. Verificar que `data` sea array no vacío
4. Para cada registro: validar campos obligatorios (`invoiceNumberRaw`, `clientTaxId`, `balance`)
5. Montos deben ser números >= 0
6. Log detallado de errores sin detener el procesamiento

### En endpoints de consulta:
1. Validar parámetros de paginación (page >= 1, limit <= 100)
2. Sanitizar `search` para prevenir inyección
3. Valores por defecto sensatos

---

## 🧪 CASOS DE PRUEBA

| Caso | Input | Resultado esperado |
|------|-------|-------------------|
| Primera sync (tabla vacía) | 569 facturas | 569 creadas, 0 actualizadas |
| Segunda sync (mismos datos) | 569 facturas | 0 creadas, 569 actualizadas |
| Factura nueva aparece | 570 facturas | 1 creada, 569 actualizadas |
| Factura pagada desaparece | 568 facturas + fullSync:true | 568 actualizadas, 1 marcada PAID |
| Consulta cartera con filtro | status=OVERDUE | Solo facturas vencidas |
| Resumen por cliente | Sin filtros | Agrupado por clientTaxId, ordenado por deuda |
| Búsqueda por nombre | search="MALO" | Encuentra "JUAN IGNACIO MALO ALVAREZ" |

---

## 📚 CONCEPTOS EDUCATIVOS

### UPSERT (Update + Insert)
Operación que intenta actualizar un registro existente. Si no existe, lo crea. Prisma lo soporta nativamente con `prisma.model.upsert()`. Es ideal para sincronización porque no necesitas saber de antemano si el registro existe.

### Separación de Responsabilidades (SRP)
`invoices` maneja el ciclo de vida contable (factura → pago → pagada). `pending_receivables` es una vista de gestión de cobranza. Mezclarlas causaba conflictos porque una factura antigua no existía en `invoices` pero sí debía aparecer en cobranza.

### Sync Incremental vs Full Sync
- **Incremental**: Solo envía lo que cambió (eficiente, pero puede perder eliminaciones)
- **Full Sync**: Envía todo (más pesado, pero permite detectar facturas que desaparecieron = fueron pagadas)
- Usamos `fullSync: true` para CXC porque son ~569 registros (manejable) y necesitamos detectar pagos completos

---

## 🚀 ORDEN DE IMPLEMENTACIÓN

1. ✅ Agregar modelo `PendingReceivable` al schema.prisma
2. ✅ Ejecutar migración
3. ✅ Crear método `syncCxc` en sync-controller.js
4. ✅ Agregar ruta POST /api/sync/cxc en sync-routes.js
5. ✅ Crear métodos de consulta en billing-controller.js (getCarteraPendiente, getCarteraPendienteResumen, getCxcSyncStatus)
6. ✅ Agregar rutas GET en billing-routes.js
7. ✅ Probar endpoint con datos de ejemplo (Postman/Thunder Client)
8. ✅ Deploy a Railway

### ⚠️ NO HACER EN ESTA FASE:
- NO modificar el frontend todavía (se hará después)
- NO tocar el endpoint existente POST /api/sync/billing (pagos)
- NO eliminar servicios legacy de CXC (se deprecarán después)
- NO modificar la tabla invoices

---

## 📋 CHECKLIST

### Backend:
- [ ] Modelo `PendingReceivable` agregado a schema.prisma
- [ ] Migración ejecutada exitosamente
- [ ] Método `syncCxc` en sync-controller.js
- [ ] Ruta POST /api/sync/cxc protegida con API Key
- [ ] Método `getCarteraPendiente` con paginación y filtros
- [ ] Método `getCarteraPendienteResumen` con agrupación por cliente
- [ ] Método `getCxcSyncStatus` con info de última sync
- [ ] Rutas GET en billing-routes.js protegidas con JWT
- [ ] Validaciones de input en todos los endpoints
- [ ] Logging de operaciones de sync

### Testing:
- [ ] POST /api/sync/cxc acepta y procesa datos correctamente
- [ ] Upsert funciona (crear + actualizar)
- [ ] fullSync marca como PAID facturas que desaparecen
- [ ] GET /cartera-pendiente retorna datos paginados
- [ ] GET /cartera-pendiente/resumen agrupa por cliente
- [ ] Filtros de búsqueda y estado funcionan
