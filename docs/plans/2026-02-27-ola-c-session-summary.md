# Resumen de Sesion: OLA C - Entitlements (modulos/planes)

Fecha: 2026-02-27  
Rama: `feature/architecture-v2.1-restart`  
Estado: En progreso (base tecnica implementada, pendiente validacion en staging)

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

1. Aplicar migracion OLA C en staging.
2. Smoke por roles en staging para rutas:
   - `/api/billing/*`
   - `/api/escrituras/*` (solo rutas protegidas)
   - `/api/mensajes-internos/*`
3. E2E A/B de modulo habilitado vs bloqueado (`403`) por notaria.
4. Definir y ejecutar flujo operativo para cambios de plan/override (runbook basico).
