# Resumen de Sesion: OLA A - Endurecimiento de Controladores

Fecha: 2026-02-26
Rama: `feature/architecture-v2.1-restart`
Estado: Endurecimiento tecnico completado; pendiente cierre con smoke manual por rol

## 1) Objetivo de la sesion

Ejecutar OLA A del checklist Go/No-Go multi-tenant:
Endurecer todos los controladores para que las queries a tablas con RLS activo
(`documents`, `document_events`, `whatsapp_notifications`) se ejecuten dentro de
`withRequestTenantContext` o `withTenantContext`.

## 2) Tablas con RLS activo (referencia)

| Tabla | Schema | RLS activo |
|---|---|---|
| `documents` | public | Si |
| `document_events` | public | Si |
| `whatsapp_notifications` | public | Si |
| `audit_logs` | public | Si (append-only) |

## 3) Mapa controlador-tabla: estado final

### Controladores completamente endurecidos

| Controlador | Queries wrapeadas | Tablas afectadas | Estado |
|---|---|---|---|
| `archivo-controller.js` | ~13 | document, documentEvent | Completo |
| `reception-controller.js` | ~22 | document, documentEvent | Completo |
| `reception-bulk-controller.js` | 0 directas (delegado) | via bulk-status-service | Completo a nivel controlador; servicio en deuda tecnica |
| `document-controller.js` | ~47 | document, documentEvent, whatsAppNotification | Completo (autoHealInvoiceLinks corregido) |
| `admin-controller.js` | ~16+13 | document (CRUD + dashboard) | Completo |
| `admin-document-controller.js` | ~11 | document, documentEvent | Completo |
| `admin-notification-controller.js` | 16 (en 8 funciones) | whatsAppNotification | Completo |
| `billing-controller.js` | 4 (en 3 funciones) | document, documentEvent | Completo |
| `mensajes-internos-controller.js` | 2 (en 2 funciones) | document | Completo |
| `auth-controller.js` | via withLoginEmailContext | users | Completo |

### Controladores pendientes

Sin pendientes en controladores del alcance OLA A tras endurecimiento de `sync-billing-controller.js` (2026-02-27).

### Queries aceptables fuera de contexto

| Controlador | Funcion | Query | Motivo |
|---|---|---|---|
| `billing-controller.js` | `getPaymentStatusForDocument(documentId)` | `prisma.document.findUnique` | Helper standalone sin `req`. Llamado desde `document-controller` que gestiona su propio contexto. |
| `document-controller.js:2677` | (comentario) | `prisma.document.update` | Dentro de bloque `/* REMOVED: ... */`. No es codigo activo. |

## 4) Detalle de cambios por archivo

### `admin-notification-controller.js`
- Import agregado: `import { withRequestTenantContext } from '../utils/tenant-context.js';`
- 8 funciones wrapeadas: `getNotificationStats`, `getNotificationHistory`, `retryNotification`, `bulkNotificationOperation`, `sendTestNotification`, `getFailedNotifications`, `retryAllFailedNotifications`, `exportNotificationHistory`
- Funciones NO tocadas (usan `notificationTemplate`, no tenant-protected): `getNotificationTemplates`, `createNotificationTemplate`, `updateNotificationTemplate`, `deleteNotificationTemplate`

### `admin-controller.js`
- Funcion `getDashboardStats`: 13 queries `prisma.document.*` movidas a `withRequestTenantContext`
- Queries a `invoice`, `escrituraQR`, `user` dejadas fuera del wrapper (no tienen RLS)
- CRUD de users ya estaba wrapeado previamente

### `billing-controller.js`
- Import agregado: `import { withRequestTenantContext } from '../utils/tenant-context.js';`
- `updateClientPhone()`: `document.updateMany` wrapeado
- `generateCollectionReminder()`: `document.findMany` + `documentEvent.create` wrapeados juntos
- `getEntregasConSaldo()`: `document.findMany` wrapeado
- `getPaymentStatusForDocument()`: NO wrapeado (helper standalone, aceptable)

### `mensajes-internos-controller.js`
- Import agregado: `import { withRequestTenantContext } from '../utils/tenant-context.js';`
- `enviarMensaje()`: `document.findUnique` wrapeado
- `enviarMensajeMasivo()`: `document.findMany` wrapeado

### `document-controller.js`
- `autoHealInvoiceLinks`: Refactorizado para recibir parametro `dbClient = prisma`
- Llamadas internas cambiadas de `prisma.*` a `dbClient.*`
- Callers dentro de `withRequestTenantContext` ahora pasan `tx` como `dbClient`

## 5) Servicios con queries directas (deuda tecnica OLA B)

Estos servicios tienen queries directas a tablas tenant-protected pero NO se modificaron
en OLA A porque requieren refactor mas profundo (recibir `tx` como parametro en vez de importar `prisma`):

| Servicio | Queries estimadas | Tablas |
|---|---|---|
| `alertas-service.js` | ~20 | document, documentEvent |
| `bulk-status-service.js` | ~4 | document |
| `matrizador-assignment-service.js` | 3 | document |
| `import-mov-service.js` | ~10 | document |
| `import-koinor-xml-service.js` | 2 | document |

## 6) Validacion realizada

```bash
# Verificacion post-hardening: queries directas restantes en controladores
grep -rn "prisma\.\(document\|documentEvent\|whatsAppNotification\)\." backend/src/controllers/
```

Resultado actualizado (2026-02-27): Solo 2 ocurrencias restantes:
1. `document-controller.js:2677` - Dentro de comentario (no activo)
2. `billing-controller.js:59` - Helper standalone aceptable

Validacion en staging (2026-02-27):
1. `npm run test:e2e -- super-admin-isolation.test.js` -> `PASS` (3/3 casos).
2. `node scripts/verify-tenant-isolation-ab.js` -> `A/B isolation verification passed`.
3. Evidencia clave:
   - `without_tenant_context`: 0 filas en `documents`, `document_events`, `whatsapp_notifications`.
   - `tenant_a_context` y `tenant_b_context`: aislamiento correcto.
   - `super_admin_context`: visibilidad cross-tenant controlada.

## 7) Proximos pasos (proxima sesion)

### Completar OLA A
1. Ejecutar smoke tests manuales por rol (ADMIN, CAJA, MATRIZADOR, RECEPCION, ARCHIVO).
2. Cerrar checks criticos de salida OLA A en el Go/No-Go checklist.
3. Declarar `GO` formal de OLA A e iniciar OLA B.

### Iniciar OLA B (tras GO de OLA A)
1. Definir mapping de backfill por tabla (source of truth por fila).
2. Agregar `notary_id` como nullable en tablas pendientes.
3. Backfill por lotes con trazabilidad.
4. Activar RLS progresivamente.
5. Endurecer servicios (deuda tecnica documentada arriba).

## 8) Archivos modificados y estado de commit

```
backend/src/controllers/admin-notification-controller.js
backend/src/controllers/admin-controller.js
backend/src/controllers/billing-controller.js
backend/src/controllers/mensajes-internos-controller.js
backend/src/controllers/document-controller.js
backend/src/controllers/archivo-controller.js (sesion previa)
backend/src/controllers/reception-controller.js (sesion previa)
backend/src/controllers/reception-bulk-controller.js (sesion previa)
backend/src/controllers/admin-document-controller.js (sesion previa)
docs/plans/2026-02-19-multi-tenant-clerk-design.md (checklist actualizado)
docs/plans/2026-02-27-multi-tenant-go-no-go-checklist.md (OLA A checks actualizados)
```

Commit realizado:
- `92849ce7` - `feat(multitenant): close OLA A code hardening and update go-no-go docs`

## 9) Decision documentada: Billing multi-tenant

1. Cada notaria puede operar con integracion externa distinta (Koinor u otra).
2. Esto NO elimina tenant isolation en base compartida: `invoices`, `payments`, `import_logs` y `pending_receivables` deben quedar con `notary_id` + RLS.
3. `whatsapp_templates` tambien queda per-tenant para personalizacion por notaria.
