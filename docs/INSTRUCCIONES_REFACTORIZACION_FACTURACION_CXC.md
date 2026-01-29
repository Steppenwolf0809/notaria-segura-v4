# INSTRUCCIONES PARA CURSOR: Refactorización del Módulo de Facturación

## 🎯 OBJETIVO PRINCIPAL

Reorganizar el módulo de facturación para separar **dos fuentes de datos distintas** que actualmente se mezclan incorrectamente:

| Fuente | Propósito | Tabla Destino | Formato |
|--------|-----------|---------------|---------|
| **XML de Pagos** (estado de cuenta) | Transacciones reales de pagos | `payments` + `invoices` | XML (ya funciona) |
| **Reporte CXC** (cartera por cobrar) | Fotografía de saldos pendientes | `pending_receivables` (NUEVA) | **XLS** (cambiar de XML) |

---

## 📋 RESUMEN EJECUTIVO

### ¿Por qué este cambio?

1. **Problema con XML de CXC:** Tags dinámicos (`<cxc_20260128_row>`), caracteres sin escapar (`&`), errores de encoding
2. **Mezcla de responsabilidades:** CXC y Pagos afectan las mismas tablas pero tienen propósitos diferentes
3. **Duplicación de datos:** Importar CXC sobre las mismas tablas de Invoice crea conflictos

### Solución:

```
┌─────────────────────────────────────────────────────────────┐
│  ANTES (Problemático):                                      │
│                                                             │
│  XML Pagos ──┬──► invoices                                 │
│              └──► payments                                  │
│                                                             │
│  XML CXC ────┬──► invoices  ← CONFLICTO!                   │
│              └──► (mezcla estados y montos)                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DESPUÉS (Correcto):                                        │
│                                                             │
│  XML Pagos ──┬──► invoices  (transacciones reales)         │
│              └──► payments                                  │
│                                                             │
│  XLS CXC ────────► pending_receivables (foto de saldos)    │
│                                                             │
│  REPORTES ───────► Consultan AMBAS tablas con JOINs        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔴 ARCHIVOS DE CONTEXTO CRÍTICOS

```
backend/prisma/schema.prisma              # Modelos actuales Invoice, Payment
backend/src/services/import-koinor-service.js  # Servicio actual (ya tiene XML pagos)
backend/src/services/cxc-import-service.js     # Servicio CXC a deprecar
backend/src/services/xml-cxc-parser.js         # Parser XML CXC a deprecar
backend/src/controllers/billing-controller.js  # Controlador con getCarteraPorCobrar
backend/src/utils/billing-utils.js             # Utilidades de normalización
frontend/src/components/billing/Reportes.jsx   # UI de reportes
frontend/src/components/billing/ImportarDatos.jsx  # UI de importación
```

## 🟡 ARCHIVOS IMPORTANTES

```
backend/src/routes/billing-routes.js      # Rutas de facturación
backend/src/db.js                         # Instancia de Prisma
frontend/src/services/billing-service.js  # Servicios frontend
```

## 🟢 ARCHIVOS OPCIONALES

```
backend/src/middleware/auth-middleware.js  # Autenticación
backend/src/utils/logger.js               # Logging
```

---

## 🗄️ FASE 1: MIGRACIÓN DE BASE DE DATOS

### 1.1 Nueva Tabla: `pending_receivables`

**Agregar al final de `backend/prisma/schema.prisma`:**

```prisma
// ============================================
// TABLA SEPARADA PARA REPORTE CXC (CARTERA POR COBRAR)
// Esta tabla almacena la "foto" del saldo pendiente
// importada desde el reporte XLS de Koinor
// ============================================

model PendingReceivable {
  id                String   @id @default(uuid())
  
  // === IDENTIFICACIÓN DEL CLIENTE ===
  clientTaxId       String   // Cédula/RUC del cliente
  clientName        String   // Nombre del cliente
  
  // === IDENTIFICACIÓN DE LA FACTURA ===
  invoiceNumberRaw  String   // Número factura original (ej: "001002-00124369")
  invoiceNumber     String?  // Número normalizado (ej: "001-002-000124369")
  
  // === MONTOS ===
  totalAmount       Decimal  @db.Decimal(12, 2)  // Valor original de la factura
  balance           Decimal  @db.Decimal(12, 2)  // Saldo pendiente actual
  paidAmount        Decimal  @db.Decimal(12, 2) @default(0)  // Calculado: totalAmount - balance
  
  // === FECHAS ===
  issueDate         DateTime?  // Fecha de emisión de la factura
  dueDate           DateTime?  // Fecha de vencimiento
  
  // === ESTADO CALCULADO ===
  status            String   @default("PENDING")  // PENDING, PARTIAL, PAID, OVERDUE
  daysOverdue       Int      @default(0)          // Días de mora (calculado)
  
  // === METADATA DE IMPORTACIÓN ===
  importedAt        DateTime @default(now())      // Cuándo se importó
  sourceFile        String                        // Nombre del archivo XLS
  reportDate        DateTime                      // Fecha del reporte CXC
  
  // === ÍNDICES Y CONSTRAINTS ===
  @@unique([invoiceNumberRaw, reportDate])  // Evita duplicados del mismo reporte
  @@index([clientTaxId])
  @@index([dueDate])
  @@index([balance])
  @@index([status])
  @@index([reportDate])
  @@map("pending_receivables")
}
```

### 1.2 Ejecutar Migración

```bash
cd backend
npx prisma migrate dev --name add_pending_receivables_table
```

### 1.3 SQL Equivalente (para aplicar manualmente si es necesario)

```sql
-- Crear tabla pending_receivables
CREATE TABLE "pending_receivables" (
  "id" TEXT NOT NULL,
  "clientTaxId" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "invoiceNumberRaw" TEXT NOT NULL,
  "invoiceNumber" TEXT,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "issueDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "daysOverdue" INTEGER NOT NULL DEFAULT 0,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceFile" TEXT NOT NULL,
  "reportDate" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pending_receivables_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "pending_receivables_invoiceNumberRaw_reportDate_key" 
  ON "pending_receivables"("invoiceNumberRaw", "reportDate");
CREATE INDEX "pending_receivables_clientTaxId_idx" ON "pending_receivables"("clientTaxId");
CREATE INDEX "pending_receivables_dueDate_idx" ON "pending_receivables"("dueDate");
CREATE INDEX "pending_receivables_balance_idx" ON "pending_receivables"("balance");
CREATE INDEX "pending_receivables_status_idx" ON "pending_receivables"("status");
CREATE INDEX "pending_receivables_reportDate_idx" ON "pending_receivables"("reportDate");
```

---

## 📊 FASE 2: PARSER XLS PARA CXC

### 2.1 Crear Nuevo Servicio

**Archivo:** `backend/src/services/xls-cxc-parser.js`

**Propósito:** Leer archivos XLS exportados de Koinor con la cartera por cobrar

**Dependencia requerida:**
```bash
cd backend
npm install xlsx
```

**Estructura esperada del XLS:**

| Columna esperada | Campo destino | Descripción |
|------------------|---------------|-------------|
| `CODCLI` o `Código Cliente` | `clientTaxId` | Cédula/RUC |
| `NOMCLI` o `Cliente` | `clientName` | Nombre del cliente |
| `NUMTRA` o `Nº Factura` | `invoiceNumberRaw` | Número de factura |
| `VALCOB` o `Valor` | `totalAmount` | Monto total |
| `CSALDO` o `Saldo` | `balance` | Saldo pendiente |
| `FECEMI` o `F. Emisión` | `issueDate` | Fecha emisión |
| `FECVEN` o `F. Vencimiento` | `dueDate` | Fecha vencimiento |

**Lógica del parser:**

```
1. Leer archivo XLS con librería xlsx
2. Detectar hoja de datos (primera hoja o buscar por nombre)
3. Detectar fila de encabezados (puede no ser la primera)
4. Mapear columnas a campos estándar
5. Para cada fila de datos:
   a. Validar campos obligatorios (clientTaxId, invoiceNumberRaw, balance)
   b. Parsear montos (convertir a Decimal)
   c. Parsear fechas (múltiples formatos posibles)
   d. Calcular paidAmount = totalAmount - balance
   e. Calcular status basado en balance y dueDate
   f. Calcular daysOverdue si dueDate < hoy
6. Retornar array de objetos normalizados
```

**Estructura de salida:**

```javascript
{
  receivables: [
    {
      clientTaxId: "1703601532",
      clientName: "JUAN PÉREZ",
      invoiceNumberRaw: "001002-00124369",
      invoiceNumber: "001-002-000124369",  // Normalizado
      totalAmount: 150.00,
      balance: 50.00,
      paidAmount: 100.00,  // Calculado
      issueDate: Date,
      dueDate: Date,
      status: "PARTIAL",  // Calculado
      daysOverdue: 15     // Calculado si aplica
    }
  ],
  summary: {
    totalRecords: 500,
    totalBalance: 25000.00,
    totalOverdue: 8000.00,
    clientsCount: 120,
    processedAt: Date
  },
  warnings: [
    { row: 45, message: "Fecha inválida, se usó fecha actual" }
  ]
}
```

### 2.2 Mapeo de Columnas Flexible

El parser debe detectar automáticamente las columnas porque Koinor puede exportar con diferentes nombres. Usar esta lógica:

```javascript
const COLUMN_MAPPINGS = {
  clientTaxId: ['CODCLI', 'codcli', 'Código Cliente', 'CODIGO_CLIENTE', 'RUC', 'CEDULA'],
  clientName: ['NOMCLI', 'nomcli', 'Cliente', 'NOMBRE_CLIENTE', 'Nombre'],
  invoiceNumberRaw: ['NUMTRA', 'numtra', 'Nº Factura', 'NUM_FACTURA', 'Factura', 'FACTURA'],
  totalAmount: ['VALCOB', 'valcob', 'Valor', 'VALOR', 'Total', 'TOTAL'],
  balance: ['CSALDO', 'csaldo', 'Saldo', 'SALDO', 'POR_COBRAR'],
  issueDate: ['FECEMI', 'fecemi', 'F. Emisión', 'FECHA_EMISION', 'FechaEmision'],
  dueDate: ['FECVEN', 'fecven', 'F. Vencimiento', 'FECHA_VENCIMIENTO', 'Vencimiento']
};
```

---

## 🔧 FASE 3: SERVICIO DE IMPORTACIÓN CXC

### 3.1 Crear Nuevo Servicio

**Archivo:** `backend/src/services/cxc-xls-import-service.js`

**Propósito:** Importar datos del XLS a la tabla `pending_receivables`

**Lógica principal:**

```
1. Recibir archivo XLS
2. Parsear con xls-cxc-parser.js
3. Determinar reportDate (fecha del reporte, puede venir del nombre del archivo o se usa fecha actual)
4. Para cada receivable:
   a. Buscar si ya existe: invoiceNumberRaw + reportDate
   b. Si NO existe → CREATE
   c. Si existe → UPDATE (permite re-importar el mismo reporte)
5. Limpiar datos antiguos (opcional): eliminar registros con reportDate > 60 días
6. Retornar resumen de importación
```

**Estrategia de UPSERT:**

```javascript
// Usar upsert de Prisma para manejar duplicados
await prisma.pendingReceivable.upsert({
  where: {
    invoiceNumberRaw_reportDate: {
      invoiceNumberRaw: data.invoiceNumberRaw,
      reportDate: reportDate
    }
  },
  create: {
    ...data,
    reportDate,
    sourceFile
  },
  update: {
    ...data,
    importedAt: new Date()
  }
});
```

### 3.2 Cálculo de Estados

```javascript
function calculateStatus(balance, totalAmount, dueDate) {
  const today = new Date();
  
  if (balance <= 0) {
    return { status: 'PAID', daysOverdue: 0 };
  }
  
  if (balance < totalAmount) {
    const status = dueDate && dueDate < today ? 'OVERDUE' : 'PARTIAL';
    const daysOverdue = dueDate && dueDate < today 
      ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
      : 0;
    return { status, daysOverdue };
  }
  
  // balance === totalAmount (no se ha pagado nada)
  if (dueDate && dueDate < today) {
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    return { status: 'OVERDUE', daysOverdue };
  }
  
  return { status: 'PENDING', daysOverdue: 0 };
}
```

---

## 🛣️ FASE 4: CONTROLADOR Y RUTAS

### 4.1 Agregar Endpoint en billing-controller.js

**Nuevos métodos a agregar:**

```javascript
// POST /api/billing/import-cxc
// Importar archivo XLS de cartera por cobrar
export const importCxcXls = async (req, res) => { ... }

// GET /api/billing/cartera-pendiente
// Obtener reporte de cartera desde pending_receivables
export const getCarteraPendiente = async (req, res) => { ... }

// GET /api/billing/cartera-pendiente/resumen
// Resumen agregado por cliente
export const getCarteraPendienteResumen = async (req, res) => { ... }

// DELETE /api/billing/cartera-pendiente/limpiar
// Limpiar reportes antiguos (> 60 días)
export const limpiarCarteraAntigua = async (req, res) => { ... }
```

### 4.2 Agregar Rutas en billing-routes.js

```javascript
// === CARTERA POR COBRAR (CXC) - TABLA SEPARADA ===

// Importar XLS de CXC
router.post('/import-cxc', 
  authenticateToken,
  requireRole(['ADMIN', 'CAJA']),
  multer.single('file'),
  importCxcXls
);

// Obtener cartera pendiente (detalle)
router.get('/cartera-pendiente',
  authenticateToken,
  requireRole(['ADMIN', 'CAJA']),
  getCarteraPendiente
);

// Obtener resumen de cartera (agrupado por cliente)
router.get('/cartera-pendiente/resumen',
  authenticateToken,
  requireRole(['ADMIN', 'CAJA']),
  getCarteraPendienteResumen
);

// Limpiar datos antiguos
router.delete('/cartera-pendiente/limpiar',
  authenticateToken,
  requireRole(['ADMIN']),
  limpiarCarteraAntigua
);
```

---

## 🎨 FASE 5: ACTUALIZAR FRONTEND

### 5.1 Modificar ImportarDatos.jsx

**Cambios requeridos:**

1. Agregar pestaña/sección separada para "Importar CXC (XLS)"
2. Validar que el archivo sea .xls o .xlsx
3. Llamar al nuevo endpoint `/api/billing/import-cxc`
4. Mostrar resumen de importación diferenciado

**UI sugerida:**

```
┌─────────────────────────────────────────────────────────┐
│ IMPORTAR DATOS                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────┐  ┌─────────────────┐               │
│ │ 📄 PAGOS (XML)  │  │ 📊 CXC (XLS)    │               │
│ │ Estado Cuenta   │  │ Cartera Cobrar  │               │
│ └─────────────────┘  └─────────────────┘               │
│                                                         │
│ [Pestaña activa muestra uploader correspondiente]       │
│                                                         │
│ Para PAGOS: Acepta .xml                                │
│ Para CXC: Acepta .xls, .xlsx                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Modificar Reportes.jsx

**Cambios en el reporte de Cartera por Cobrar:**

1. Cambiar fuente de datos de `invoices` a `pending_receivables`
2. Llamar a `/api/billing/cartera-pendiente/resumen`
3. Mostrar información adicional: fecha del reporte, días de mora
4. Agregar filtros por estado (PENDING, PARTIAL, OVERDUE)

**Estructura de datos esperada:**

```javascript
// Respuesta de /api/billing/cartera-pendiente/resumen
{
  clientes: [
    {
      clientTaxId: "1703601532",
      clientName: "JUAN PÉREZ",
      totalBalance: 500.00,
      invoicesCount: 3,
      oldestDueDate: "2025-12-15",
      maxDaysOverdue: 45,
      invoices: [
        {
          invoiceNumberRaw: "001002-00124369",
          totalAmount: 200.00,
          balance: 150.00,
          issueDate: "2025-11-01",
          dueDate: "2025-12-15",
          status: "OVERDUE",
          daysOverdue: 45
        },
        // ... más facturas
      ]
    }
  ],
  resumen: {
    totalClientes: 120,
    totalBalance: 25000.00,
    totalOverdue: 8000.00,
    reportDate: "2026-01-28"
  }
}
```

### 5.3 Agregar billing-service.js

**Nuevas funciones:**

```javascript
// Importar CXC desde XLS
export const importarCxcXls = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/billing/import-cxc', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Obtener cartera pendiente
export const getCarteraPendiente = async (params) => {
  return api.get('/billing/cartera-pendiente', { params });
};

// Obtener resumen de cartera
export const getCarteraPendienteResumen = async () => {
  return api.get('/billing/cartera-pendiente/resumen');
};
```

---

## 🗑️ FASE 6: DEPRECAR IMPORTADOR XML DE CXC

### 6.1 Archivos a Renombrar (No Eliminar)

```bash
# Renombrar servicios XML de CXC
backend/src/services/cxc-import-service.js 
  → backend/src/services/cxc-import-service.legacy.js

backend/src/services/xml-cxc-parser.js 
  → backend/src/services/xml-cxc-parser.legacy.js
```

### 6.2 Comentar Rutas Antiguas

En `billing-routes.js`, comentar pero NO eliminar:

```javascript
// =============================================
// DEPRECADO: Importación CXC desde XML
// Mantener comentado por 30 días antes de eliminar
// =============================================
// router.post('/import-cxc-xml', 
//   authenticateToken,
//   requireRole(['ADMIN', 'CAJA']),
//   multer.single('file'),
//   importCxcXml  // Función del servicio legacy
// );
```

---

## ✅ FASE 7: TESTING

### 7.1 Casos de Prueba

| Caso | Input | Resultado Esperado |
|------|-------|-------------------|
| XLS válido | Archivo con todas las columnas | Importación exitosa, N registros creados |
| XLS con columnas diferentes | Nombres alternativos de columnas | Mapeo automático funciona |
| Re-importar mismo archivo | Mismo XLS 2 veces | Sin duplicados, actualiza existentes |
| Archivo vacío | XLS sin datos | Error amigable "No hay datos" |
| Columnas faltantes | XLS sin columna de saldo | Error indicando columna faltante |
| Fechas inválidas | Formatos de fecha variados | Warning pero continúa importación |
| Montos negativos | Balance < 0 | Status = PAID automáticamente |

### 7.2 Validar Separación de Datos

```sql
-- Verificar que pending_receivables NO afecta invoices
SELECT COUNT(*) FROM pending_receivables;  -- Tiene datos de CXC
SELECT COUNT(*) FROM invoices WHERE status = 'PENDING';  -- No debería cambiar por CXC

-- Verificar que un cliente puede estar en ambas tablas
SELECT pr.clientTaxId, pr.balance as cxc_balance, 
       i.totalAmount, i.paidAmount, i.status
FROM pending_receivables pr
LEFT JOIN invoices i ON pr.invoiceNumberRaw = i.invoiceNumberRaw
WHERE pr.clientTaxId = '1703601532';
```

---

## 📚 CONCEPTOS EDUCATIVOS

### ¿Por qué separar las tablas?

**Principio de Responsabilidad Única (SRP):**
- `invoices` + `payments` = **Registro contable** (transacciones reales)
- `pending_receivables` = **Reporte de gestión** (foto en un momento dado)

**Beneficios:**
1. **No hay conflictos:** Importar CXC no modifica estados de Invoice
2. **Idempotencia simple:** Re-importar CXC solo actualiza su tabla
3. **Auditoría clara:** Sabes exactamente de dónde viene cada dato
4. **Reportes independientes:** Puedes comparar CXC vs Pagos reales

### ¿Por qué XLS en lugar de XML?

1. **Estabilidad:** Excel no tiene problemas de encoding (`&`, tags dinámicos)
2. **Familiaridad:** El usuario ya sabe exportar a Excel
3. **Verificación:** El usuario puede abrir el XLS y verificar antes de importar
4. **Flexibilidad:** La librería `xlsx` maneja múltiples formatos (.xls, .xlsx, .csv)

---

## 🚀 ORDEN DE IMPLEMENTACIÓN (SEGUIR ESTRICTAMENTE)

### Sprint 1: Base de Datos (1-2 horas)
1. ✅ Agregar modelo `PendingReceivable` al schema
2. ✅ Ejecutar migración
3. ✅ Verificar tabla creada

### Sprint 2: Parser XLS (2-3 horas)
4. ✅ Instalar dependencia `xlsx`
5. ✅ Crear `xls-cxc-parser.js`
6. ✅ Probar parser con archivo de ejemplo

### Sprint 3: Servicio de Importación (2-3 horas)
7. ✅ Crear `cxc-xls-import-service.js`
8. ✅ Implementar lógica de upsert
9. ✅ Agregar cálculo de estados

### Sprint 4: API (1-2 horas)
10. ✅ Agregar métodos en `billing-controller.js`
11. ✅ Agregar rutas en `billing-routes.js`
12. ✅ Probar endpoints con Postman/Thunder Client

### Sprint 5: Frontend (2-3 horas)
13. ✅ Modificar `ImportarDatos.jsx` (nueva pestaña XLS)
14. ✅ Modificar `Reportes.jsx` (nueva fuente de datos)
15. ✅ Agregar funciones en `billing-service.js`

### Sprint 6: Deprecar y Limpiar (1 hora)
16. ✅ Renombrar servicios legacy
17. ✅ Comentar rutas antiguas
18. ✅ Documentar cambios

---

## ⚠️ NOTAS IMPORTANTES

1. **NO eliminar archivos legacy** hasta después de 30 días de pruebas en producción
2. **El XML de Pagos sigue funcionando** - Solo cambiamos CXC
3. **La tabla `pending_receivables` es independiente** - No tiene FK a `invoices`
4. **Cada importación de CXC es una "foto"** - Se guarda con su `reportDate`
5. **Los reportes pueden cruzar datos** si es necesario (JOIN por `invoiceNumberRaw`)

---

## 📋 CHECKLIST FINAL

### Backend:
- [ ] Modelo `PendingReceivable` agregado a schema.prisma
- [ ] Migración ejecutada exitosamente
- [ ] `xls-cxc-parser.js` creado y probado
- [ ] `cxc-xls-import-service.js` creado y probado
- [ ] Endpoints agregados al controlador
- [ ] Rutas configuradas
- [ ] Servicios legacy renombrados

### Frontend:
- [ ] ImportarDatos.jsx actualizado con pestaña XLS
- [ ] Reportes.jsx actualizado con nueva fuente
- [ ] billing-service.js con nuevas funciones
- [ ] Probado flujo completo de importación

### Testing:
- [ ] XLS válido importa correctamente
- [ ] Re-importar no crea duplicados
- [ ] Reporte de cartera muestra datos correctos
- [ ] Estados calculados correctamente (PENDING, PARTIAL, OVERDUE)

---

## 🔗 RELACIÓN CON DOCUMENTO ANTERIOR

Este documento **complementa** el archivo `INSTRUCCIONES_PARSER_XML_KOINOR.md`:

- **XML Koinor (Pagos):** Sigue vigente para importar transacciones de pago
- **XLS CXC (Cartera):** Este nuevo sistema para importar saldos pendientes

Ambos sistemas coexisten y alimentan reportes diferentes que pueden cruzarse cuando sea necesario.

---

**Última actualización:** Enero 2026
**Autor:** Claude (asistente de desarrollo)
**Proyecto:** Sistema de Trazabilidad Notarial - Notaría 18 Quito
