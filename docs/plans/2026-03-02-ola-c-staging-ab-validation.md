# OLA C - Validacion Staging A/B (2026-03-02)

Rama: `feature/architecture-v2.1-restart`  
Entorno: Staging Railway (PostgreSQL proxy)

## 1) Migracion aplicada

Debido a drift legacy en el historial de Prisma de staging, la migracion OLA C se aplico por SQL directo:

```bash
cd backend
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20260227173000_ola_c_entitlements_modules_plans/migration.sql
```

Resultado: `Script executed successfully`.

## 2) Verificacion estructural

Tablas presentes:
1. `plans`
2. `modules`
3. `plan_modules`
4. `notary_subscriptions`
5. `notary_module_overrides`

Seed confirmado:
1. Modulos base: `DOCUMENTOS`, `FACTURACION`, `UAFE`, `WHATSAPP`, `ESCRITURAS_QR`, `MENSAJES_INTERNOS`.
2. Conteo: `plans=1`, `modules=6`, `plan_modules=6`, `active_subscriptions=3`.

## 3) Verificacion A/B de entitlements y gating

Script ejecutado:

```bash
cd backend
node scripts/verify-entitlements-ab.js
```

Resultado: `Entitlements A/B verification passed`.

Casos validados:
1. RLS fail-closed en tablas de entitlements:
   - Sin tenant context: visibilidad `0`.
2. Aislamiento por tenant:
   - Tenant A solo ve su suscripcion.
   - Tenant B solo ve su suscripcion/override.
3. Super admin context:
   - Visibilidad cross-tenant esperada.
4. Gating de modulo `FACTURACION` con middleware `requireModule`:
   - Tenant A (modulo activo): permitido.
   - Tenant B (override disabled): bloqueado `403`.
   - Tenant C (sin suscripcion): bloqueado `403`.

## 4) Limpieza

Los datos temporales de prueba se eliminaron al finalizar la ejecucion.
