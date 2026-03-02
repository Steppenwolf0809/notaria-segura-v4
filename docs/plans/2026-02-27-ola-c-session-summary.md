# Resumen de Sesion: OLA C - Entitlements (modulos/planes)

Fecha: 2026-02-27  
Rama: `feature/architecture-v2.1-restart`  
Estado: En progreso avanzado (base tecnica + validacion A/B en staging completadas)

## 1) Objetivo de la sesion

Implementar la base de habilitacion tecnica por notaria (sin cobro in-app) para:
1. Resolver modulos habilitados por plan + overrides.
2. Bloquear endpoints protegidos cuando el modulo no este habilitado.
3. Mantener aislamiento tenant con RLS en tablas tenant de entitlements.

## 2) Implementado en codigo

1. Migracion OLA C creada:
   - `backend/prisma/migrations/20260227173000_ola_c_entitlements_modules_plans/migration.sql`
2. Tablas agregadas:
   - `plans`
   - `modules`
   - `plan_modules`
   - `notary_subscriptions`
   - `notary_module_overrides`
3. Seed idempotente:
   - Modulos base: `DOCUMENTOS`, `FACTURACION`, `UAFE`, `WHATSAPP`, `ESCRITURAS_QR`, `MENSAJES_INTERNOS`.
   - Plan base: `PLAN_BASE_PILOTO`.
   - Suscripcion activa por defecto para notarías activas sin suscripcion vigente.
4. RLS aplicado (fail-closed) en:
   - `notary_subscriptions`
   - `notary_module_overrides`
5. Prisma schema actualizado con modelos/relaciones de entitlements:
   - `Plan`, `Module`, `PlanModule`, `NotarySubscription`, `NotaryModuleOverride`.
6. Servicio de resolucion implementado:
   - `backend/src/services/entitlement-service.js`
   - `getEnabledModulesForNotary()`
   - `isModuleEnabledForNotary()`
7. Middleware implementado:
   - `backend/src/middleware/require-module.js`
8. Integracion en rutas:
   - `backend/src/routes/billing-routes.js` -> `requireModule('FACTURACION')`
   - `backend/src/routes/escrituras-qr-routes.js` -> `requireModule('ESCRITURAS_QR')`
   - `backend/src/routes/mensajes-internos-routes.js` -> `requireModule('MENSAJES_INTERNOS')`

## 3) Pruebas ejecutadas

Comando:

```bash
cd backend
npm test -- tests/entitlement-service.test.js tests/require-module-middleware.test.js --runInBand
```

Resultado:
1. `PASS` `tests/entitlement-service.test.js`
2. `PASS` `tests/require-module-middleware.test.js`

Total: 11 tests en verde.

## 4) Pendientes inmediatos para cierre OLA C

1. Resolver drift de historial de migraciones en staging para volver a `prisma migrate deploy` sin excepciones.
   - Nota 2026-03-02: OLA C fue aplicada por SQL directo con `prisma db execute` debido a drift legacy.
2. Smoke por roles en staging para rutas reales:
   - `/api/billing/*`
   - `/api/escrituras/*` (solo rutas protegidas)
   - `/api/mensajes-internos/*`
3. Definir y ejecutar flujo operativo para cambios de plan/override (runbook basico).

## 5) Validacion staging ejecutada (2026-03-02)

1. Migracion OLA C aplicada en staging:
   - Comando: `npx prisma db execute --file prisma/migrations/20260227173000_ola_c_entitlements_modules_plans/migration.sql`
   - Resultado: `Script executed successfully`.
2. Verificacion de seed:
   - `plans=1`, `modules=6`, `plan_modules=6`, `active_subscriptions=3`.
3. Verificacion A/B de entitlements + gating:
   - Script: `backend/scripts/verify-entitlements-ab.js`
   - Resultado: `Entitlements A/B verification passed`.
   - Casos validados:
     - Sin contexto tenant => `0` visibilidad en `notary_subscriptions` y `notary_module_overrides`.
     - Tenant A con modulo `FACTURACION` activo => acceso permitido (`next()` en middleware).
     - Tenant B con override `FACTURACION=false` => bloqueado `403`.
     - Tenant C sin suscripcion activa => bloqueado `403`.
     - Contexto super admin con tenant context en sesion => visibilidad cross-tenant esperada.
4. Limpieza:
   - El script elimina datos temporales al finalizar (`c = 0` notarías de prueba remanentes).
