# OLA B — Multi-Tenant: Ejecucion en Produccion

> **Fecha inicio**: 2026-03-05
> **Estado Global**: EN PROGRESO
> **Entorno de prueba**: gondola.proxy.rlwy.net:39316 (copia de produccion)
> **Produccion**: switchback.proxy.rlwy.net:25513
> **Estrategia**: Cada fase se ejecuta primero en test DB, se verifica, y luego en produccion.

---

## Contexto

OLA A (controller hardening) esta ~90% completa. OLA B agrega la columna `notary_id` a las tablas tenant-scoped, hace backfill, y activa RLS en PostgreSQL.

**Regla de oro**: Todos los cambios son ADITIVOS y NULLABLE primero. No se rompe nada existente.

---

## Fase 1: Tabla `notaries` — COMPLETADA

- [x] Crear tabla `notaries` via SQL directo (sin Prisma migration aun)
- [x] Insertar Notaria N18 (id=1)
- [x] Verificar en test DB y produccion
- [x] Backup de produccion: `backups/production-backup-2026-03-05.dump`

**SQL ejecutado:**
```sql
CREATE TABLE IF NOT EXISTS notaries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  number INT NOT NULL,
  city TEXT DEFAULT 'Quito',
  province TEXT DEFAULT 'Pichincha',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);
INSERT INTO notaries (name, number) VALUES ('Notaria Decima Octava del Canton Quito', 18);
```

---

## Fase 2: Agregar `notary_id` nullable — COMPLETADA

> Agregar columna `notary_id` (INT, nullable, FK a notaries) a las tablas tenant-scoped.
> **No rompe nada** porque es nullable — el sistema sigue funcionando sin cambios en controllers.

### Tablas a modificar (prioridad):
1. `users` — Usuarios del sistema
2. `documents` — Documentos notariales (tabla core)
3. `document_events` — Historial de eventos
4. `invoices` — Facturas
5. `whatsapp_notifications` — Notificaciones
6. `pending_receivables` — Cartera de cobros (CxC)

### Tablas secundarias (siguiente iteracion):
7. `whatsapp_templates`
8. `escrituras_qr`
9. `protocolos_uafe`
10. `formulario_uafe_asignaciones`
11. `import_logs`
12. `mensajes_internos`
13. `encuestas_satisfaccion`
14. `consultas_lista_control`

### SQL para Fase 2:
```sql
-- Ejecutar en orden, uno por uno
ALTER TABLE users ADD COLUMN IF NOT EXISTS notary_id INT REFERENCES notaries(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notary_id INT REFERENCES notaries(id);
ALTER TABLE document_events ADD COLUMN IF NOT EXISTS notary_id INT REFERENCES notaries(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notary_id INT REFERENCES notaries(id);
ALTER TABLE whatsapp_notifications ADD COLUMN IF NOT EXISTS notary_id INT REFERENCES notaries(id);
ALTER TABLE pending_receivables ADD COLUMN IF NOT EXISTS notary_id INT REFERENCES notaries(id);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_users_notary_id ON users(notary_id);
CREATE INDEX IF NOT EXISTS idx_documents_notary_id ON documents(notary_id);
CREATE INDEX IF NOT EXISTS idx_document_events_notary_id ON document_events(notary_id);
CREATE INDEX IF NOT EXISTS idx_invoices_notary_id ON invoices(notary_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_notary_id ON whatsapp_notifications(notary_id);
CREATE INDEX IF NOT EXISTS idx_pending_receivables_notary_id ON pending_receivables(notary_id);
```

### Verificacion:
```sql
SELECT table_name, column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema='public' AND column_name='notary_id';
```

---

## Fase 3: Backfill `notary_id = 1` — COMPLETADA

> Asignar todos los registros existentes a Notaria N18 (id=1).
> Ejecutar en batches para no bloquear la DB.

### SQL para Fase 3:
```sql
-- Backfill en batches (si hay muchos registros, usar WHERE notary_id IS NULL LIMIT 1000)
UPDATE users SET notary_id = 1 WHERE notary_id IS NULL;
UPDATE documents SET notary_id = 1 WHERE notary_id IS NULL;
UPDATE document_events SET notary_id = 1 WHERE notary_id IS NULL;
UPDATE invoices SET notary_id = 1 WHERE notary_id IS NULL;
UPDATE whatsapp_notifications SET notary_id = 1 WHERE notary_id IS NULL;
UPDATE pending_receivables SET notary_id = 1 WHERE notary_id IS NULL;
```

### Verificacion:
```sql
-- Debe retornar 0 filas para cada tabla
SELECT 'users' as t, COUNT(*) FROM users WHERE notary_id IS NULL
UNION ALL
SELECT 'documents', COUNT(*) FROM documents WHERE notary_id IS NULL
UNION ALL
SELECT 'document_events', COUNT(*) FROM document_events WHERE notary_id IS NULL
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE notary_id IS NULL
UNION ALL
SELECT 'whatsapp_notifications', COUNT(*) FROM whatsapp_notifications WHERE notary_id IS NULL
UNION ALL
SELECT 'pending_receivables', COUNT(*) FROM pending_receivables WHERE notary_id IS NULL;
```

---

## Fase 4: Hacer `notary_id` NOT NULL (opcional) — PENDIENTE

> Solo despues de verificar que el backfill es 100% completo.
> **Riesgo**: Si algun INSERT no incluye notary_id, fallara. Requiere que TODOS los controllers lo envien.

**Decisión**: Mantener nullable hasta que OLA A este 100% completa y todos los controllers inyecten notary_id automaticamente.

---

## Fase 5: Activar RLS — COMPLETADA

> PostgreSQL Row-Level Security como safety net (Opcion C: FORCE + fallback).

### Estrategia implementada (Opcion C):
- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` en 13 tablas tenant-scoped
- Politica `tenant_isolation` con fallback: si `app.current_notary_id` no esta seteado, permite acceso
- Si esta seteado, filtra por `notary_id = current_setting('app.current_notary_id')::INT`
- `postgres` (superusuario) bypasa RLS automaticamente (para migraciones/admin)
- Rol `app_runtime_rls` (NOLOGIN, NOBYPASSRLS) para uso con `SET LOCAL ROLE`

### Tablas con RLS activo (13):
documents, document_events, invoices, whatsapp_notifications, pending_receivables,
whatsapp_templates, escrituras_qr, protocolos_uafe, formulario_uafe_asignaciones,
import_logs, mensajes_internos, encuestas_satisfaccion, consultas_lista_control

### Tabla SIN RLS:
- `users` — acceso cross-tenant para login, admin, etc.

### Codigo agregado:
- `src/db.js`: `withTenantTransaction(fn, opts)` — wrappea en `$transaction` con `SET LOCAL ROLE app_runtime_rls` + `SET LOCAL app.current_notary_id`
- `src/middleware/tenant-context.js`: `getCurrentIsSuperAdmin()` + almacena `isSuperAdmin` en AsyncLocalStorage

### Politica SQL:
```sql
CREATE POLICY tenant_isolation ON <table>
  FOR ALL
  USING (
    current_setting('app.current_notary_id', true) IS NULL
    OR current_setting('app.current_notary_id', true) = ''
    OR notary_id = current_setting('app.current_notary_id', true)::INT
  )
  WITH CHECK (
    current_setting('app.current_notary_id', true) IS NULL
    OR current_setting('app.current_notary_id', true) = ''
    OR notary_id = current_setting('app.current_notary_id', true)::INT
  );
```

### Tests verificados:
- Sin SET ROLE (superuser): 2627 docs visibles (bypass correcto)
- Con SET ROLE + notary_id=1: 2627 docs visibles (N18)
- Con SET ROLE + notary_id=999: 0 docs (aislamiento total)
- Prisma ORM (document.count()) funciona igual
- INSERT con tenant no-coincidente: BLOQUEADO por RLS

### Rollback:
```sql
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- repetir para cada tabla...
```

### Siguiente paso:
Controllers pueden usar `withTenantTransaction()` de forma opt-in para activar RLS en operaciones criticas. El fallback (sin SET) mantiene compatibilidad total.

---

## Fase 6: Sincronizar Prisma Schema — COMPLETADA

> Actualizar `schema.prisma` para reflejar los cambios manuales en DB.
> Crear una Prisma migration "baseline" que registre el estado actual.

### Cambios en schema.prisma:
```prisma
model Notary {
  id        Int      @id @default(autoincrement())
  name      String
  number    Int
  city      String?  @default("Quito")
  province  String?  @default("Pichincha")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users                  User[]
  documents              Document[]
  documentEvents         DocumentEvent[]
  invoices               Invoice[]
  whatsappNotifications  WhatsAppNotification[]
  pendingReceivables     PendingReceivable[]

  @@map("notaries")
}

// En cada modelo tenant-scoped, agregar:
// notaryId  Int?
// notary    Notary? @relation(fields: [notaryId], references: [id])
```

---

## Tablas Cross-Tenant (NO modificar)

Estas tablas NO reciben `notary_id`:
- `personas_registradas` — Compartida entre notarias
- `formulario_uafe_respuestas` — Via PersonaRegistrada
- `sesiones_personales` — Via PersonaRegistrada
- `sesiones_formulario_uafe` — Via PersonaProtocolo
- `auditoria_personas` — Via PersonaRegistrada

## Tablas Globales (NO modificar)

- `notaries` — Es la tabla master
- `system_settings` — Config global
- `sync_logs` — Logs de sincronizacion
- `test_connection` — Testing

---

## Rollback

En caso de problemas, el rollback es simple porque todo es aditivo:
```sql
-- Fase 2 rollback: solo eliminar columnas (no afecta funcionalidad)
ALTER TABLE users DROP COLUMN IF EXISTS notary_id;
ALTER TABLE documents DROP COLUMN IF EXISTS notary_id;
-- etc.

-- Fase 5 rollback: desactivar RLS
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- etc.
```

---

## Historial de Ejecucion

| Fecha | Fase | Entorno | Estado | Notas |
|-------|------|---------|--------|-------|
| 2026-03-05 | 1 | Test + Prod | COMPLETADA | Tabla notaries + N18 insertada |
| 2026-03-05 | 2 | Test + Prod | COMPLETADA | notary_id nullable + indices en 6 tablas |
| 2026-03-05 | 3 | Test + Prod | COMPLETADA | Backfill notary_id=1: 14 users, 2627 docs, 13880 events, 19687 invoices, 1752 whatsapp, 919 receivables |
| | 4 | | PENDIENTE | Deferred until controllers inject notaryId |
| 2026-03-05 | 5 | Prod | COMPLETADA | RLS Opcion C: FORCE+fallback en 13 tablas, rol app_runtime_rls, politica tenant_isolation. withTenantTransaction() helper en db.js. Verificado: aislamiento funciona con SET ROLE. |
| 2026-03-05 | 6 | Test + Prod | COMPLETADA | schema.prisma synced, Notary model + notaryId on 6 models, migration 20260305_add_multi_tenant_notary, diff clean |
| 2026-03-05 | 2b | Test + Prod | COMPLETADA | notary_id + indexes + backfill on 8 secondary tables (whatsapp_templates, escrituras_qr, protocolos_uafe, formulario_uafe_asignaciones, import_logs, mensajes_internos, encuestas_satisfaccion, consultas_lista_control) |
| 2026-03-05 | 6b | Test + Prod | COMPLETADA | schema.prisma synced for all 14 tenant-scoped tables, migration 20260305_add_notary_id_secondary_tables, diff clean |
| 2026-03-05 | 7 | Local | COMPLETADA | Prisma middleware auto-injects notaryId on create/createMany/upsert. AsyncLocalStorage tenant context in auth-middleware + sync-api-key-middleware + encuesta public route. 6/6 tests passed. |
