# Explicacion Simple de lo que hice (Staging)

Fecha: 2026-02-19  
Rama: `feature/architecture-v2.1-restart`  
Commit: `56e75a0`

## 1) Resumen corto

Se activo la base tecnica para multi-tenant en tablas core de documentos.
Esto significa que cada registro ahora queda asociado a una notaria (`notary_id`) y la base de datos ya bloquea acceso cruzado entre notarias con RLS.

No es un cambio visual de frontend; es un cambio de seguridad y arquitectura de datos.

## 2) Que se cambio en base de datos

Se aplicaron estas migraciones en staging:

1. `20260219143000_add_notary_id_core_document_tables`
2. `20260219160000_enable_rls_core_document_tables`

Cambios principales:

1. Se agrego `notary_id` en:
   - `documents`
   - `document_events`
   - `whatsapp_notifications`
2. Se hizo backfill de datos existentes.
3. Se activaron politicas RLS fail-closed:
   - `ENABLE ROW LEVEL SECURITY`
   - `FORCE ROW LEVEL SECURITY`
4. Se creo rol runtime `app_runtime_rls` sin `BYPASSRLS`.

## 3) Que se cambio en backend

Para que RLS funcione de verdad por request:

1. Se agrego contexto tenant por request con `AsyncLocalStorage`.
2. `auth-middleware` ahora guarda el tenant activo en ese contexto.
3. Rutas de sync (`/api/sync/...`) ahora tambien resuelven tenant.
4. En cada transaccion Prisma se setea:
   - `SET LOCAL ROLE app_runtime_rls`
   - `set_config('app.current_notary_id', ...)`
   - `set_config('app.is_super_admin', ...)`

## 4) Como entenderlo facil

Piensa que cada request ahora lleva una "etiqueta de notaria".

1. Si la etiqueta existe, solo ve/escribe datos de esa notaria.
2. Si no hay etiqueta valida, devuelve 0 filas (fail-closed).
3. Super admin puede cruzar tenant solo con contexto explicito.

## 5) Verificacion real en staging

Estado actual confirmado:

1. `documents`: `2270` filas, `0` con `notary_id` null.
2. `document_events`: `9341` filas, `0` con `notary_id` null.
3. `whatsapp_notifications`: `1308` filas, `0` con `notary_id` null.
4. RLS activo y forzado en las 3 tablas core.

Timestamps de migraciones en staging:

1. `20260219143000_add_notary_id_core_document_tables` -> `2026-02-19T19:32:57.764Z`
2. `20260219160000_enable_rls_core_document_tables` -> `2026-02-19T19:47:24.686Z`

Nota: hay un registro historico fallido de la segunda migracion (primer intento), pero luego quedo aplicada correctamente.

## 6) Que SI y que NO debes esperar ver

SI:

1. En DB ya existe `notary_id` en tablas core.
2. A nivel seguridad, ya hay aislamiento por tenant.

NO (todavia):

1. No hay pantalla nueva por este paso.
2. No hay cambio visual grande en staging por este bloque tecnico.

## 7) Siguiente paso recomendado

Crear una segunda notaria de prueba (Tenant B) y ejecutar test A/B de aislamiento para confirmar que A no puede leer datos de B.

## 8) Actualizacion (ya ejecutado)

Se ejecuto prueba A/B real en staging con script:

1. `backend/scripts/verify-tenant-isolation-ab.js`

Resultado:

1. Sin contexto tenant: `0` filas visibles.
2. Contexto Tenant A: solo datos de A.
3. Contexto Tenant B: solo datos de B.
4. Contexto super admin: ve A y B.

Importante:

1. La prueba se hizo en una transaccion con `ROLLBACK`.
2. No se dejaron datos de prueba persistidos en staging.
